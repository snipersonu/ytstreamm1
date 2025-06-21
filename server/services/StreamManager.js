import { EventEmitter } from 'events';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export class StreamManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.ffmpegProcess = null;
    this.isStreaming = false;
    this.config = null;
    this.ffmpegAvailable = null; // Cache FFmpeg availability
    this.isBrowserEnvironment = this.detectBrowserEnvironment();
    this.status = {
      isStreaming: false,
      health: 'offline',
      uptime: 0,
      bitrate: 0,
      fps: 0,
      resolution: '1280x720',
      errors: 0,
      lastRestart: null
    };
    this.startTime = null;
    this.uptimeInterval = null;
  }

  detectBrowserEnvironment() {
    // Check if we're running in a browser-based environment like WebContainer
    return typeof window !== 'undefined' || 
           process.env.WEBCONTAINER === 'true' ||
           process.platform === 'browser' ||
           !process.env.PATH ||
           process.env.NODE_ENV === 'webcontainer';
  }

  async checkFFmpegAvailability() {
    if (this.ffmpegAvailable !== null) {
      return this.ffmpegAvailable;
    }

    // If we're in a browser environment, FFmpeg won't be available
    if (this.isBrowserEnvironment) {
      this.logger.warn('Running in browser environment - FFmpeg not available');
      this.ffmpegAvailable = false;
      return false;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.error('FFmpeg availability check timed out');
        this.ffmpegAvailable = false;
        resolve(false);
      }, 5000);

      ffmpeg.getAvailableFormats((err, formats) => {
        clearTimeout(timeout);
        if (err) {
          this.logger.error('FFmpeg not available:', err.message);
          this.ffmpegAvailable = false;
          resolve(false);
        } else {
          this.logger.info('FFmpeg is available');
          this.ffmpegAvailable = true;
          resolve(true);
        }
      });
    });
  }

  async startStream(config) {
    if (this.isStreaming) {
      throw new Error('Stream is already running');
    }

    // Check FFmpeg availability first
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
      await this.initializeStream();
      this.startUptimeTracking();
      
      this.isStreaming = true;
      this.status.isStreaming = true;
      this.status.health = 'good';
      this.status.bitrate = config.bitrate;
      this.status.fps = config.fps;
      this.status.resolution = config.quality === '1080p' ? '1920x1080' : '1280x720';
      
      this.emit('statusChange', this.status);
      this.emit('log', 'Stream started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start stream:', error);
      this.status.errors++;
      this.emit('error', error);
      throw error;
    }
  }

  async stopStream() {
    if (!this.isStreaming) {
      throw new Error('No stream is currently running');
    }

    this.logger.info('Stopping stream');

    try {
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
        // Wait a moment before restarting
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
    // Check if config exists
    if (!config) {
      throw new Error('Stream configuration is required');
    }

    // Validate YouTube Stream Key
    if (!config.youtubeStreamKey || config.youtubeStreamKey.trim() === '') {
      throw new Error('YouTube Stream Key is required. Please enter your stream key in the Settings tab.');
    }

    // Validate stream key format (basic check)
    if (config.youtubeStreamKey.length < 10) {
      throw new Error('YouTube Stream Key appears to be invalid. Please check your stream key.');
    }

    // Validate video source
    if (!config.videoSource && !config.videoFile) {
      throw new Error('Video source or file is required');
    }

    // Validate video file exists if specified
    if (config.videoFile && config.videoFile.path) {
      this.logger.info(`Validating video file path: ${config.videoFile.path}`);
      
      if (!fs.existsSync(config.videoFile.path)) {
        this.logger.error(`Video file not found at path: ${config.videoFile.path}`);
        
        // Log directory contents for debugging
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

    // Validate quality settings
    if (!['720p', '1080p'].includes(config.quality)) {
      throw new Error('Invalid quality setting. Must be 720p or 1080p');
    }

    // Validate bitrate
    if (!config.bitrate || config.bitrate < 500 || config.bitrate > 10000) {
      throw new Error('Invalid bitrate. Must be between 500 and 10000 kbps');
    }

    // Validate fps
    if (!config.fps || ![24, 30, 60].includes(config.fps)) {
      throw new Error('Invalid frame rate. Must be 24, 30, or 60 fps');
    }
  }

  async initializeStream() {
    const { youtubeStreamKey, videoSource, videoFile, quality, bitrate, fps } = this.config;
    
    // Determine input source
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

    // Additional file existence check with detailed logging
    if (videoFile && videoFile.path) {
      this.logger.info(`Performing final file existence check for: ${inputSource}`);
      
      try {
        const fileStats = fs.statSync(inputSource);
        this.logger.info(`File stats - Size: ${fileStats.size} bytes, Modified: ${fileStats.mtime}`);
        
        // Check if file is readable
        fs.accessSync(inputSource, fs.constants.R_OK);
        this.logger.info(`File is readable: ${inputSource}`);
        
      } catch (accessError) {
        this.logger.error(`File access error: ${accessError.message}`);
        
        // Log current working directory and absolute path
        this.logger.info(`Current working directory: ${process.cwd()}`);
        this.logger.info(`Absolute path being used: ${path.resolve(inputSource)}`);
        
        // Try to list parent directory
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

    // Set resolution based on quality
    const resolution = quality === '1080p' ? '1920x1080' : '1280x720';
    
    // YouTube RTMP endpoint
    const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${youtubeStreamKey}`;

    this.logger.info(`Streaming ${inputSource} to ${rtmpUrl}`);
    this.logger.info(`Stream settings - Resolution: ${resolution}, Bitrate: ${bitrate}kbps, FPS: ${fps}`);

    return new Promise((resolve, reject) => {
      this.ffmpegProcess = ffmpeg(inputSource)
        .inputOptions([
          '-re', // Read input at native frame rate
          '-stream_loop', '-1' // Loop indefinitely
        ])
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(bitrate)
        .fps(fps)
        .size(resolution)
        .audioFrequency(44100)
        .audioBitrate('128k')
        .outputOptions([
          // Explicit stream mapping to ensure both video and audio are included
          '-map', '0:v:0',  // Map first video stream
          '-map', '0:a:0',  // Map first audio stream
          
          // CPU Optimization: Use ultrafast preset for minimal CPU usage
          '-preset', 'ultrafast',
          
          // Tune for zero latency streaming
          '-tune', 'zerolatency',
          
          // Optimize GOP (Group of Pictures) settings for streaming
          '-g', String(fps * 2), // Keyframe interval (2 seconds)
          '-keyint_min', String(fps), // Minimum keyframe interval
          '-sc_threshold', '0', // Disable scene change detection
          
          // Buffer settings optimized for streaming
          '-bufsize', String(bitrate * 1.5) + 'k', // Reduced buffer size
          '-maxrate', bitrate + 'k',
          
          // Additional CPU optimizations
          '-threads', '0', // Use all available CPU threads efficiently
          '-slices', '1', // Single slice for better compression
          '-refs', '1', // Reduce reference frames for faster encoding
          '-me_method', 'hex', // Faster motion estimation
          '-subq', '1', // Reduced subpixel motion estimation quality
          '-trellis', '0', // Disable trellis quantization
          '-aq-mode', '0', // Disable adaptive quantization
          
          // Profile and level settings for compatibility
          '-profile:v', 'baseline', // Use baseline profile for better compatibility and speed
          '-level', '3.1',
          
          // Pixel format
          '-pix_fmt', 'yuv420p',
          
          // Output format
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
          
          // Auto-restart if enabled
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
          // Update stream health based on progress
          if (progress.currentFps > 0) {
            this.status.health = 'excellent';
          }
          
          // Log progress periodically for monitoring
          if (Math.floor(Date.now() / 1000) % 30 === 0) { // Every 30 seconds
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
    
    this.logger.info('StreamManager cleaned up');
  }
}