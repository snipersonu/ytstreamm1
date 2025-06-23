import { EventEmitter } from 'events';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { Database } from '../utils/Database.js';

export class PlaylistManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.currentPlaylist = null;
    this.currentItemIndex = 0;
    this.isPlaying = false;
    this.ffmpegProcess = null;
    this.audioProcess = null;
    this.videoProcess = null;
    this.shuffleMode = false;
    this.loopMode = true;
    this.playOrder = [];
  }

  async loadPlaylist(playlistId, options = {}) {
    try {
      // Load playlist from database
      const playlist = Database.getPlaylist(playlistId);
      
      if (!playlist) {
        throw new Error(`Playlist with ID ${playlistId} not found`);
      }

      this.currentPlaylist = playlist;
      this.shuffleMode = options.shuffle || false;
      this.loopMode = options.loop !== false;
      this.currentItemIndex = 0;

      this.generatePlayOrder();
      
      this.logger.info(`Loaded playlist: ${this.currentPlaylist.name} with ${this.currentPlaylist.items.length} items`);
      
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

    this.isPlaying = true;
    await this.playCurrentItem(youtubeStreamKey, quality, bitrate, fps);
  }

  async playCurrentItem(youtubeStreamKey, quality, bitrate, fps) {
    const currentItem = this.getCurrentItem();
    if (!currentItem) {
      this.logger.warn('No current item to play');
      return;
    }

    this.logger.info(`Playing playlist item: ${currentItem.name}`);
    
    this.emit('itemChanged', {
      currentItem,
      index: this.currentItemIndex,
      total: this.currentPlaylist.items.length
    });

    try {
      await this.createLofiStream(currentItem, youtubeStreamKey, quality, bitrate, fps);
    } catch (error) {
      this.logger.error('Error playing current item:', error);
      this.emit('error', error);
      
      // Try to play next item
      if (this.isPlaying) {
        setTimeout(() => this.nextItem(youtubeStreamKey, quality, bitrate, fps), 2000);
      }
    }
  }

  async createLofiStream(item, youtubeStreamKey, quality, bitrate, fps) {
    const resolution = quality === '1080p' ? '1920x1080' : '1280x720';
    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${youtubeStreamKey}`;

    // Create complex filter for combining video and audio
    const videoInput = item.video ? item.video.url : null;
    const audioInput = item.audio ? item.audio.url : null;

    if (!videoInput && !audioInput) {
      throw new Error('No video or audio source available');
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add video input
      if (videoInput) {
        // Convert relative URL to absolute file path
        const videoPath = videoInput.startsWith('/uploads/') 
          ? path.join(process.cwd(), 'server', videoInput)
          : videoInput;
        
        command = command.input(videoPath);
        if (item.video.loop) {
          command = command.inputOptions(['-stream_loop', '-1']);
        }
      }

      // Add audio input
      if (audioInput) {
        // Convert relative URL to absolute file path
        const audioPath = audioInput.startsWith('/uploads/') 
          ? path.join(process.cwd(), 'server', audioInput)
          : audioInput;
        
        command = command.input(audioPath);
        if (item.audio.loop) {
          command = command.inputOptions(['-stream_loop', '-1']);
        }
      }

      // Configure output
      command = command
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(bitrate)
        .fps(fps)
        .size(resolution)
        .audioFrequency(44100)
        .audioBitrate('128k');

      // Set up complex filter for audio mixing if needed
      if (videoInput && audioInput) {
        command = command.complexFilter([
          // Mix video and audio
          {
            filter: 'amix',
            options: {
              inputs: 2,
              duration: 'longest',
              dropout_transition: 0
            },
            inputs: ['0:a', '1:a'],
            outputs: 'mixed_audio'
          }
        ]);
        
        command = command.outputOptions([
          '-map', '0:v',  // Video from first input
          '-map', '[mixed_audio]',  // Mixed audio
        ]);
      } else if (videoInput) {
        command = command.outputOptions(['-map', '0:v', '-map', '0:a']);
      } else {
        // Audio only - create a static image or color background
        command = command
          .input('color=c=black:s=' + resolution + ':r=' + fps)
          .inputOptions(['-f', 'lavfi'])
          .outputOptions([
            '-map', '0:v',  // Color background
            '-map', '1:a'   // Audio
          ]);
      }

      // Apply volume if specified
      if (item.audio && item.audio.volume !== 1.0) {
        command = command.audioFilters(`volume=${item.audio.volume}`);
      }

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
          this.logger.info('Lofi stream item ended');
          if (this.isPlaying) {
            // Move to next item
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
    return {
      isPlaying: this.isPlaying,
      currentItem: this.getCurrentItem(),
      currentIndex: this.currentItemIndex,
      totalItems: this.currentPlaylist ? this.currentPlaylist.items.length : 0,
      shuffleMode: this.shuffleMode,
      loopMode: this.loopMode,
      playlistName: this.currentPlaylist ? this.currentPlaylist.name : null
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