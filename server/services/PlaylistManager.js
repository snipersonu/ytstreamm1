import { EventEmitter } from 'events';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from '../utils/Database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PlaylistManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.currentPlaylist = null;
    this.currentItemIndex = 0;
    this.isPlaying = false;
    this.ffmpegProcess = null;
    this.shuffleMode = false;
    this.loopMode = true;
    this.playOrder = [];
    this.backgroundVideo = null; // Single video that loops throughout playlist
  }

  async loadPlaylist(playlistId, options = {}) {
    try {
      // Load playlist from database
      const playlist = Database.getPlaylist(playlistId);
      
      if (!playlist) {
        throw new Error(`Playlist with ID ${playlistId} not found`);
      }

      this.currentPlaylist = playlist;
      this.backgroundVideo = playlist.backgroundVideo; // Store background video
      this.shuffleMode = options.shuffle || false;
      this.loopMode = options.loop !== false;
      this.currentItemIndex = 0;

      this.generatePlayOrder();
      
      this.logger.info(`Loaded playlist: ${this.currentPlaylist.name} with ${this.currentPlaylist.items.length} audio items`);
      this.logger.info(`Background video: ${this.backgroundVideo ? this.backgroundVideo.name : 'None'}`);
      
      return this.currentPlaylist;
    } catch (error) {
      this.logger.error('Failed to load playlist:', error);
      throw error;
    }
  }

  generatePlayOrder() {
    if (!this.currentPlaylist) return;

    this.playOrder = this.currentPlaylist.items.map((_, index) => index);
    
    if (this.shuffleMode) {
      // Fisher-Yates shuffle
      for (let i = this.playOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.playOrder[i], this.playOrder[j]] = [this.playOrder[j], this.playOrder[i]];
      }
    }
  }

  getCurrentItem() {
    if (!this.currentPlaylist || !this.playOrder.length) return null;
    
    const actualIndex = this.playOrder[this.currentItemIndex];
    return this.currentPlaylist.items[actualIndex];
  }

  async startPlaylistStream(youtubeStreamKey, quality, bitrate, fps) {
    if (!this.currentPlaylist) {
      throw new Error('No playlist loaded');
    }

    if (!this.backgroundVideo) {
      throw new Error('No background video selected for playlist');
    }

    this.isPlaying = true;
    await this.playCurrentItem(youtubeStreamKey, quality, bitrate, fps);
  }

  async playCurrentItem(youtubeStreamKey, quality, bitrate, fps) {
    const currentAudioItem = this.getCurrentItem();
    if (!currentAudioItem) {
      this.logger.warn('No current audio item to play');
      return;
    }

    this.logger.info(`Playing audio item: ${currentAudioItem.name} with background video: ${this.backgroundVideo.name}`);
    
    this.emit('itemChanged', {
      currentItem: {
        ...currentAudioItem,
        backgroundVideo: this.backgroundVideo
      },
      index: this.currentItemIndex,
      total: this.currentPlaylist.items.length
    });

    try {
      await this.createLofiStream(currentAudioItem, youtubeStreamKey, quality, bitrate, fps);
    } catch (error) {
      this.logger.error('Error playing current item:', error);
      this.emit('error', error);
      
      // Try to play next item
      if (this.isPlaying) {
        setTimeout(() => this.nextItem(youtubeStreamKey, quality, bitrate, fps), 2000);
      }
    }
  }

  /**
   * Converts a relative URL path to an absolute file system path
   * @param {string} urlPath - The URL path (e.g., "/uploads/video/file.mp4")
   * @returns {string} - The absolute file system path
   */
  resolveFilePath(urlPath) {
    if (!urlPath) {
      throw new Error('URL path is required');
    }

    // Remove leading slash if present
    const relativePath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
    
    // Construct absolute path relative to the server directory
    // In Docker, the working directory is /app, so server files are at /app/server
    const absolutePath = path.join(process.cwd(), 'server', relativePath);
    
    this.logger.info(`Resolving file path: ${urlPath} -> ${absolutePath}`);
    
    // Verify the file exists
    if (!fs.existsSync(absolutePath)) {
      this.logger.error(`File not found at resolved path: ${absolutePath}`);
      
      // Log directory contents for debugging
      const parentDir = path.dirname(absolutePath);
      try {
        if (fs.existsSync(parentDir)) {
          const files = fs.readdirSync(parentDir);
          this.logger.info(`Files in directory ${parentDir}: ${JSON.stringify(files)}`);
        } else {
          this.logger.error(`Parent directory does not exist: ${parentDir}`);
        }
      } catch (dirError) {
        this.logger.error(`Error reading directory ${parentDir}:`, dirError);
      }
      
      throw new Error(`File not found: ${absolutePath}`);
    }
    
    return absolutePath;
  }

  async createLofiStream(audioItem, youtubeStreamKey, quality, bitrate, fps) {
    const resolution = quality === '1080p' ? '1920x1080' : '1280x720';
    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${youtubeStreamKey}`;

    // Validate inputs
    if (!this.backgroundVideo || !this.backgroundVideo.url) {
      throw new Error('Missing background video');
    }

    if (!audioItem.audio || !audioItem.audio.url) {
      throw new Error('Missing audio source');
    }

    // Resolve file paths
    let videoPath, audioPath;
    
    try {
      videoPath = this.resolveFilePath(this.backgroundVideo.url);
      audioPath = this.resolveFilePath(audioItem.audio.url);
    } catch (error) {
      this.logger.error('Failed to resolve file paths:', error);
      throw new Error(`Missing video or audio source: ${error.message}`);
    }

    this.logger.info(`Video path resolved: ${videoPath}`);
    this.logger.info(`Audio path resolved: ${audioPath}`);

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add background video input (loops infinitely)
      command = command.input(videoPath);
      command = command.inputOptions(['-stream_loop', '-1']); // Loop video infinitely

      // Add current audio input
      command = command.input(audioPath);
      // Don't loop audio - let it play once and then move to next item

      // Configure output
      command = command
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(bitrate)
        .fps(fps)
        .size(resolution)
        .audioFrequency(44100)
        .audioBitrate('128k');

      // Set up complex filter for combining background video with audio
      command = command.complexFilter([
        // Take video from background (input 0) and audio from current item (input 1)
        {
          filter: 'volume',
          options: audioItem.volume || 1.0,
          inputs: '1:a',
          outputs: 'adjusted_audio'
        }
      ]);
      
      command = command.outputOptions([
        '-map', '0:v',  // Video from background video
        '-map', '[adjusted_audio]',  // Audio from current item
      ]);

      command = command
        .outputOptions([
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-g', String(fps * 2),
          '-keyint_min', String(fps),
          '-sc_threshold', '0',
          '-bufsize', String(bitrate * 1.5) + 'k',
          '-maxrate', bitrate + 'k',
          '-threads', '0',
          '-profile:v', 'baseline',
          '-level', '3.1',
          '-pix_fmt', 'yuv420p',
          '-f', 'flv'
        ])
        .output(rtmpUrl)
        .on('start', (commandLine) => {
          this.logger.info('Lofi stream started:', commandLine);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error('Lofi stream error:', err);
          reject(err);
        })
        .on('end', () => {
          this.logger.info('Audio item finished, moving to next');
          if (this.isPlaying) {
            // Move to next audio item
            this.nextItem(youtubeStreamKey, quality, bitrate, fps);
          }
        });

      this.ffmpegProcess = command;
      command.run();
    });
  }

  async nextItem(youtubeStreamKey, quality, bitrate, fps) {
    if (!this.isPlaying) return;

    this.currentItemIndex++;
    
    if (this.currentItemIndex >= this.playOrder.length) {
      if (this.loopMode) {
        this.currentItemIndex = 0;
        this.logger.info('Playlist finished, looping back to start');
      } else {
        this.logger.info('Playlist finished');
        this.stop();
        return;
      }
    }

    // Small delay before starting next item
    setTimeout(() => {
      if (this.isPlaying) {
        this.playCurrentItem(youtubeStreamKey, quality, bitrate, fps);
      }
    }, 1000);
  }

  async previousItem(youtubeStreamKey, quality, bitrate, fps) {
    if (!this.isPlaying) return;

    this.currentItemIndex--;
    
    if (this.currentItemIndex < 0) {
      this.currentItemIndex = this.playOrder.length - 1;
    }

    this.stop();
    setTimeout(() => {
      if (this.isPlaying) {
        this.playCurrentItem(youtubeStreamKey, quality, bitrate, fps);
      }
    }, 1000);
  }

  stop() {
    this.isPlaying = false;
    
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    this.logger.info('Playlist stream stopped');
  }

  getStatus() {
    const currentItem = this.getCurrentItem();
    return {
      isPlaying: this.isPlaying,
      currentItem: currentItem ? {
        ...currentItem,
        backgroundVideo: this.backgroundVideo
      } : null,
      currentIndex: this.currentItemIndex,
      totalItems: this.currentPlaylist ? this.currentPlaylist.items.length : 0,
      shuffleMode: this.shuffleMode,
      loopMode: this.loopMode,
      playlistName: this.currentPlaylist ? this.currentPlaylist.name : null,
      backgroundVideo: this.backgroundVideo
    };
  }

  setShuffle(enabled) {
    this.shuffleMode = enabled;
    this.generatePlayOrder();
    this.logger.info(`Shuffle mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  setLoop(enabled) {
    this.loopMode = enabled;
    this.logger.info(`Loop mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}