import { EventEmitter } from 'events';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { PlaylistManager } from './PlaylistManager.js';

export class StreamManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.config = null;
    this.ffmpegAvailable = null;
    this.isBrowserEnvironment = this.detectBrowserEnvironment();
    this.playlistManager = new PlaylistManager(logger);
    this.status = {
      isStreaming: false,
      health: 'offline',
      uptime: 0,
      bitrate: 0,
      fps: 0,
      resolution: '1280x720',
      errors: 0,
      lastRestart: null,
      streamType: 'single'
    };
    this.startTime = null;
    this.uptimeInterval = null;

    // Listen to playlist events
    this.playlistManager.on('itemChanged', (data) => {
      this.status.currentPlaylistItem = data.currentItem;
      this.status.playlistLength = data.total;
      this.emit('statusChange', this.status);
      this.emit('playlistUpdate', data);
    });

    this.playlistManager.on('error', (error) => {
      this.emit('error', error);
    });
  }

  detectBrowserEnvironment() {
    // Enhanced logging for environment detection
    const windowExists = typeof window !== 'undefined';
    const webcontainerEnv = process.env.WEBCONTAINER === 'true';
    const browserPlatform = process.platform === 'browser';
    const pathExists = !!process.env.PATH;
    const nodeEnv = process.env.NODE_ENV;
    
    this.logger.info('Environment Detection Details:', {
      windowExists,
      webcontainerEnv,
      browserPlatform,
      pathExists,
      nodeEnv,
      platform: process.platform,
      pathValue: process.env.PATH ? 'exists' : 'missing'
    });

    const isBrowser = windowExists || 
                     webcontainerEnv ||
                     browserPlatform ||
                     !pathExists ||
                     nodeEnv === 'webcontainer';

    this.logger.info(`Browser environment detected: ${isBrowser}`);
    
    return isBrowser;
  }

  async checkFFmpegAvailability() {
    if (this.ffmpegAvailable !== null) {
      this.logger.info(`FFmpeg availability cached: ${this.ffmpegAvailable}`);
      return this.ffmpegAvailable;
    }

    if (this.isBrowserEnvironment) {
      this.logger.warn('Running in browser environment - FFmpeg not available');
      this.ffmpegAvailable = false;
      return false;
    }

    this.logger.info('Checking FFmpeg availability...');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.error('FFmpeg availability check timed out after 5 seconds');
        this.ffmpegAvailable = false;
        resolve(false);
      }, 5000);

      ffmpeg.getAvailableFormats((err, formats) => {
        clearTimeout(timeout);
        if (err) {
          this.logger.error('FFmpeg not available - Error details:', {
            message: err.message,
            code: err.code,
            errno: err.errno,
            syscall: err.syscall,
            path: err.path,
            stack: err.stack
          });
          this.ffmpegAvailable = false;
          resolve(false);
        } else {
          this.logger.info('FFmpeg is available and working');
          this.logger.info(`FFmpeg formats available: ${Object.keys(formats || {}).length} formats detected`);
          this.ffmpegAvailable = true;
          resolve(true);
        }
      });
    });
  }

  // New method to get detailed FFmpeg status for API endpoint
  async getFFmpegStatus() {
    const status = {
      isBrowserEnvironment: this.isBrowserEnvironment,
      ffmpegAvailable: this.ffmpegAvailable,
      environmentDetails: {
        platform: process.platform,
        nodeVersion: process.version,
        hasPath: !!process.env.PATH,
        pathLength: process.env.PATH ? process.env.PATH.length : 0,
        nodeEnv: process.env.NODE_ENV,
        webcontainer: process.env.WEBCONTAINER,
        windowExists: typeof window !== 'undefined'
      }
    };

    // Test FFmpeg availability if not already checked
    if (this.ffmpegAvailable === null) {
      status.ffmpegAvailable = await this.checkFFmpegAvailability();
    }

    // Try to get FFmpeg version info
    try {
      await new Promise((resolve, reject) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            status.ffmpegError = {
              message: err.message,
              code: err.code,
              errno: err.errno
            };
            reject(err);
          } else {
            status.ffmpegFormats = Object.keys(formats || {}).length;
            resolve(formats);
          }
        });
      });
    } catch (error) {
      this.logger.error('Error getting FFmpeg formats:', error);
    }

    return status;
  }

  async startStream(config) {
    if (this.isStreaming) {
      throw new Error('Stream is already running');
    }

    const ffmpegAvailable = await this.checkFFmpegAvailability();
    if (!ffmpegAvailable) {
      let errorMessage;
      
      if (this.isBrowserEnvironment) {
        errorMessage = 
          'This application is running in a browser-based environment (WebContainer) which cannot execute native binaries like FFmpeg. ' +
          'To use this YouTube livestreaming system, you need to run it in a local environment where FFmpeg can be installed. ' +
          '\n\nTo run locally:\n' +
          '1. Clone this project to your local machine\n' +
          '2. Install FFmpeg on your system (see README.md for instructions)\n' +
          '3. Run "npm install" and "npm run dev" in your local environment\n' +
          '\nThis demo shows the interface, but streaming functionality requires a local setup with FFmpeg.';
      } else {
        errorMessage = 
          'FFmpeg is not installed or not accessible. This application requires FFmpeg to function. ' +
          'Please install FFmpeg on your system and ensure it is available in your PATH environment variable. ' +
          'For installation instructions, please refer to the README.md file.';
      }
      
      const error = new Error(errorMessage);
      this.emit('error', error);
      throw error;
    }

    this.config = config;
    this.logger.info('Starting stream with config:', config);

    try {
      await this.validateConfig(config);
      
      if (config.streamType === 'playlist') {
        await this.startPlaylistStream();
      } else {
        await this.initializeStream();
      }
      
      this.startUptimeTracking();
      
      this.isStreaming = true;
      this.status.isStreaming = true;
      this.status.health = 'good';
      this.status.bitrate = config.bitrate;
      this.status.fps = config.fps;
      this.status.resolution = config.quality === '1080p' ? '1920x1080' : '1280x720';
      this.status.streamType = config.streamType || 'single';
      
      this.emit('statusChange', this.status);
      this.emit('log', `Stream started successfully (${this.status.streamType} mode)`);
      
    } catch (error) {
      this.logger.error('Failed to start stream:', error);
      this.status.errors++;
      this.emit('error', error);
      throw error;
    }
  }

  async startPlaylistStream() {
    const { youtubeStreamKey, quality, bitrate, fps, playlistId, shufflePlaylist, loopPlaylist } = this.config;
    
    this.logger.info('Starting playlist stream with configuration:', {
      playlistId,
      shufflePlaylist,
      loopPlaylist,
      quality,
      bitrate,
      fps
    });
    
    // Load playlist
    await this.playlistManager.loadPlaylist(playlistId, {
      shuffle: shufflePlaylist,
      loop: loopPlaylist
    });

    // Start playlist streaming
    await this.playlistManager.startPlaylistStream(youtubeStreamKey, quality, bitrate, fps);
    
    this.logger.info('Playlist stream started successfully');
  }

  async stopStream() {
    if (!this.isStreaming) {
      throw new Error('No stream is currently running');
    }

    this.logger.info('Stopping stream');

    try {
      if (this.config?.streamType === 'playlist') {
        this.playlistManager.stop();
      }

      if (this.ffmpegProcess) {
        this.ffmpegProcess.kill('SIGTERM');
        this.ffmpegProcess = null;
      }

      if (this.uptimeInterval) {
        clearInterval(this.uptimeInterval);
        this.uptimeInterval = null;
      }

      this.isStreaming = false;
      this.status.isStreaming = false;
      this.status.health = 'offline';
      this.status.uptime = 0;
      this.status.streamType = 'single';
      this.status.currentPlaylistItem = null;
      this.status.playlistLength = null;
      this.startTime = null;

      this.emit('statusChange', this.status);
      this.emit('log', 'Stream stopped');

    } catch (error) {
      this.logger.error('Error stopping stream:', error);
      throw error;
    }
  }

  async restartStream() {
    this.logger.info('Restarting stream');
    
    try {
      if (this.isStreaming) {
        await this.stopStream();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (this.config) {
        await this.startStream(this.config);
        this.status.lastRestart = new Date();
        this.emit('log', 'Stream restarted successfully');
      } else {
        throw new Error('No configuration available for restart');
      }
    } catch (error) {
      this.logger.error('Failed to restart stream:', error);
      this.status.errors++;
      this.emit('error', error);
      throw error;
    }
  }

  async validateConfig(config) {
    if (!config) {
      throw new Error('Stream configuration is required');
    }

    if (!config.youtubeStreamKey || config.youtubeStreamKey.trim() === '') {
      throw new Error('YouTube Stream Key is required. Please enter your stream key in the Settings tab.');
    }

    if (config.youtubeStreamKey.length < 10) {
      throw new Error('YouTube Stream Key appears to be invalid. Please check your stream key.');
    }

    if (config.streamType === 'playlist') {
      if (!config.playlistId) {
        throw new Error('Playlist ID is required for playlist streaming');
      }
      this.logger.info('Validating playlist configuration:', {
        playlistId: config.playlistId,
        shufflePlaylist: config.shufflePlaylist,
        loopPlaylist: config.loopPlaylist
      });
    } else {
      if (!config.videoSource && !config.videoFile) {
        throw new Error('Video source or file is required');
      }

      if (config.videoFile && config.videoFile.path) {
        this.logger.info(`Validating video file path: ${config.videoFile.path}`);
        
        if (!fs.existsSync(config.videoFile.path)) {
          this.logger.error(`Video file not found at path: ${config.videoFile.path}`);
          
          const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
          this.logger.info(`Checking uploads directory: ${uploadsDir}`);
          
          try {
            if (fs.existsSync(uploadsDir)) {
              const files = fs.readdirSync(uploadsDir);
              this.logger.info(`Files in uploads directory: ${JSON.stringify(files)}`);
            } else {
              this.logger.error(`Uploads directory does not exist: ${uploadsDir}`);
            }
          } catch (dirError) {
            this.logger.error(`Error reading uploads directory: ${dirError.message}`);
          }
          
          throw new Error('Video file not found');
        } else {
          this.logger.info(`Video file found successfully at: ${config.videoFile.path}`);
        }
      }
    }

    if (!['720p', '1080p'].includes(config.quality)) {
      throw new Error('Invalid quality setting. Must be 720p or 1080p');
    }

    if (!config.bitrate || config.bitrate < 500 || config.bitrate > 10000) {
      throw new Error('Invalid bitrate. Must be between 500 and 10000 kbps');
    }

    if (!config.fps || ![24, 30, 60].includes(config.fps)) {
      throw new Error('Invalid frame rate. Must be 24, 30, or 60 fps');
    }
  }

  async initializeStream() {
    const { youtubeStreamKey, videoSource, videoFile, quality, bitrate, fps } = this.config;
    
    let inputSource;
    if (videoFile && videoFile.path) {
      inputSource = videoFile.path;
      this.logger.info(`Using video file as input source: ${inputSource}`);
    } else if (videoSource) {
      inputSource = videoSource;
      this.logger.info(`Using video URL as input source: ${inputSource}`);
    } else {
      throw new Error('No valid input source');
    }

    if (videoFile && videoFile.path) {
      this.logger.info(`Performing final file existence check for: ${inputSource}`);
      
      try {
        const fileStats = fs.statSync(inputSource);
        this.logger.info(`File stats - Size: ${fileStats.size} bytes, Modified: ${fileStats.mtime}`);
        
        fs.accessSync(inputSource, fs.constants.R_OK);
        this.logger.info(`File is readable: ${inputSource}`);
        
      } catch (accessError) {
        this.logger.error(`File access error: ${accessError.message}`);
        
        this.logger.info(`Current working directory: ${process.cwd()}`);
        this.logger.info(`Absolute path being used: ${path.resolve(inputSource)}`);
        
        const parentDir = path.dirname(inputSource);
        try {
          const parentFiles = fs.readdirSync(parentDir);
          this.logger.info(`Files in parent directory (${parentDir}): ${JSON.stringify(parentFiles)}`);
        } catch (parentError) {
          this.logger.error(`Cannot read parent directory: ${parentError.message}`);
        }
        
        throw new Error(`Cannot access video file: ${accessError.message}`);
      }
    }

    const resolution = quality === '1080p' ? '1920x1080' : '1280x720';
    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${youtubeStreamKey}`;

    this.logger.info(`Streaming ${inputSource} to ${rtmpUrl}`);
    this.logger.info(`Stream settings - Resolution: ${resolution}, Bitrate: ${bitrate}kbps, FPS: ${fps}`);

    return new Promise((resolve, reject) => {
      this.ffmpegProcess = ffmpeg(inputSource)
        .inputOptions([
          '-re',
          '-stream_loop', '-1'
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(bitrate)
        .fps(fps)
        .size(resolution)
        .audioFrequency(44100)
        .audioBitrate('128k')
        .outputOptions([
          '-map', '0:v:0',
          '-map', '0:a:0',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-g', String(fps * 2),
          '-keyint_min', String(fps),
          '-sc_threshold', '0',
          '-bufsize', String(bitrate * 1.5) + 'k',
          '-maxrate', bitrate + 'k',
          '-threads', '0',
          '-slices', '1',
          '-refs', '1',
          '-me_method', 'hex',
          '-subq', '1',
          '-trellis', '0',
          '-aq-mode', '0',
          '-profile:v', 'baseline',
          '-level', '3.1',
          '-pix_fmt', 'yuv420p',
          '-f', 'flv'
        ])
        .output(rtmpUrl)
        .on('start', (commandLine) => {
          this.logger.info('FFmpeg started with optimized command:', commandLine);
          resolve();
        })
        .on('error', (err) => {
          this.logger.error('FFmpeg error:', err);
          this.status.errors++;
          this.emit('error', err);
          
          if (this.config && this.config.autoRestart && this.isStreaming) {
            this.logger.info('Auto-restarting stream...');
            setTimeout(() => {
              this.restartStream().catch(error => {
                this.logger.error('Auto-restart failed:', error);
              });
            }, 5000);
          }
          
          reject(err);
        })
        .on('end', () => {
          this.logger.info('FFmpeg process ended');
          this.emit('log', 'Stream ended');
        })
        .on('progress', (progress) => {
          if (progress.currentFps > 0) {
            this.status.health = 'excellent';
          }
          
          if (Math.floor(Date.now() / 1000) % 30 === 0) {
            this.logger.info(`Stream progress - FPS: ${progress.currentFps}, Bitrate: ${progress.currentKbps}kbps`);
          }
        })
        .run();
    });
  }

  startUptimeTracking() {
    this.startTime = Date.now();
    this.uptimeInterval = setInterval(() => {
      if (this.startTime) {
        this.status.uptime = Math.floor((Date.now() - this.startTime) / 1000);
        this.emit('statusChange', this.status);
      }
    }, 1000);
  }

  getStatus() {
    return { ...this.status };
  }

  cleanup() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
    }
    
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
    }

    this.playlistManager.stop();
    
    this.logger.info('StreamManager cleaned up');
  }
}