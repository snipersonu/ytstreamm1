# 24/7 YouTube Livestreaming System

A comprehensive, production-ready system for continuous YouTube livestreaming with professional monitoring, analytics, and automated error recovery.

## ⚠️ Important Notice

**This application requires FFmpeg to function and is designed to run in a local environment.** 

If you're viewing this in a browser-based environment (like WebContainer), the streaming functionality will not work because native binaries like FFmpeg cannot be executed. To use this system:

1. **Clone this project to your local machine**
2. **Install FFmpeg on your system** (see installation instructions below)
3. **Run the application locally** with `npm install` and `npm run dev`

The interface shown here demonstrates the features, but actual streaming requires a local setup.

## Features

### 🎥 Core Streaming
- **FFmpeg-powered video processing** with optimized settings for YouTube
- **Multiple input sources**: Local video files, URLs, RTMP streams
- **Quality options**: 720p/1080p with customizable bitrate and FPS
- **Continuous loop streaming** for 24/7 operation
- **Auto-restart mechanisms** for uninterrupted streaming

### 📊 Monitoring & Analytics
- **Real-time stream health monitoring** with color-coded status indicators
- **Live analytics dashboard** with bitrate, FPS, and viewer metrics
- **Historical data tracking** with interactive charts
- **Error logging and notification system**
- **Performance metrics** and quality assessments

### 🛠️ Management Interface
- **Modern React-based dashboard** with dark theme and glassmorphism effects
- **Drag-and-drop file uploads** for video content
- **Real-time WebSocket updates** for instant status changes
- **Comprehensive settings panel** for stream configuration
- **Professional responsive design** optimized for all devices

### 🔧 Technical Features
- **Node.js backend** with Express.js API
- **WebSocket real-time communication**
- **Robust error handling** and recovery systems
- **File upload management** with validation
- **Health monitoring** with automated alerts
- **Backup video failover** system

## Installation & Setup

### Prerequisites
- Node.js 18+ installed
- **FFmpeg installed on your system** (required for streaming)
- YouTube channel with streaming enabled
- YouTube Stream Key from YouTube Studio
- **Local environment** (not browser-based like WebContainer)

### FFmpeg Installation

**⚠️ Critical Requirement**: FFmpeg must be installed and accessible in your system PATH for this application to work.

#### Windows
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your system PATH environment variable
4. Restart your command prompt/terminal
5. Verify installation: `ffmpeg -version`

#### macOS
```bash
# Using Homebrew (recommended)
brew install ffmpeg

# Verify installation
ffmpeg -version
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg

# Verify installation
ffmpeg -version
```

#### Verification
After installation, verify FFmpeg is working:
```bash
ffmpeg -version
```
You should see FFmpeg version information. If you get "command not found", FFmpeg is not properly installed or not in your PATH.

### Project Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd youtube-livestream-system
npm install
```

2. **Create required directories:**
```bash
mkdir -p server/logs server/uploads
```

3. **Get your YouTube Stream Key:**
   - Go to [YouTube Studio](https://studio.youtube.com)
   - Navigate to Settings > Stream
   - Copy your Stream Key

4. **Start the development server:**
```bash
npm run dev
```

This will start both the React frontend (port 5173) and Node.js backend (port 3001).

## Configuration

### YouTube Setup
1. **Enable live streaming** on your YouTube channel
2. **Get your Stream Key** from YouTube Studio → Settings → Stream
3. **Enter the Stream Key** in the Settings tab of the application

### Video Sources
- **Local Files**: Upload MP4, AVI, MOV, or MKV files (up to 500MB)
- **URL Streams**: Enter HTTP/HTTPS URLs or RTMP streams
- **Backup Videos**: Configure fallback content for error recovery

### Stream Settings
- **Resolution**: 720p (1280x720) or 1080p (1920x1080)
- **Bitrate**: 1500-6000 kbps (recommended: 2500-4000 for 1080p)
- **Frame Rate**: 24, 30, or 60 FPS
- **Auto-Restart**: Enable automatic stream recovery

## Usage Guide

### Starting a Stream
1. **Configure YouTube Stream Key** in Settings
2. **Upload a video file** or enter a stream URL
3. **Set quality parameters** (resolution, bitrate, FPS)
4. **Click "Start Stream"** in the dashboard
5. **Monitor status** through the real-time interface

### Managing Streams
- **View live preview** and streaming metrics
- **Monitor health status** with color-coded indicators
- **Track analytics** including bitrate, FPS, and viewer count
- **Review logs** for debugging and monitoring
- **Configure alerts** for stream issues

### Error Recovery
- **Auto-restart** feature automatically recovers from disconnections
- **Backup video system** switches to fallback content during issues
- **Health monitoring** detects and alerts on quality problems
- **Manual restart** option available in the dashboard

## API Endpoints

### Stream Management
- `POST /api/upload` - Upload video files
- `GET /api/status` - Get current stream status
- `GET /api/logs` - Retrieve system logs
- `GET /api/analytics` - Get streaming analytics

### WebSocket Events
- `start` - Start streaming with configuration
- `stop` - Stop current stream
- `restart` - Restart stream with current settings
- `status` - Real-time status updates
- `analytics` - Live analytics data
- `log` - System log messages
- `error` - Error notifications

## Technical Specifications

### FFmpeg Configuration
- **Video Codec**: H.264 (libx264)
- **Audio Codec**: AAC
- **Preset**: Fast (optimized for live streaming)
- **Tune**: Zero latency
- **Keyframe Interval**: 2 seconds
- **Buffer Size**: 2x bitrate for stability

### System Requirements
- **CPU**: Multi-core processor (4+ cores recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: SSD recommended for video processing
- **Network**: Stable upload bandwidth (5+ Mbps for 1080p)
- **Environment**: Local machine with FFmpeg installed

### File Formats Supported
- **Video**: MP4, AVI, MOV, MKV, WebM
- **Streaming**: RTMP, HTTP/HTTPS URLs
- **Maximum file size**: 500MB per upload

## Production Deployment

### Environment Variables
```bash
PORT=3001                    # Server port
NODE_ENV=production          # Environment
LOG_LEVEL=info              # Logging level
UPLOAD_LIMIT=500MB          # File upload limit
```

### Process Management
Use PM2 for production deployment:
```bash
npm install -g pm2
pm2 start server/index.js --name youtube-stream
pm2 startup
pm2 save
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Common Issues

#### FFmpeg Not Found
**Error**: "FFmpeg is not installed or not accessible"

**Solutions**:
1. **Verify FFmpeg installation**: Run `ffmpeg -version` in terminal
2. **Check PATH**: Ensure FFmpeg is in your system PATH
3. **Restart terminal**: After installation, restart your terminal/command prompt
4. **Browser environment**: If running in WebContainer/browser, clone to local machine

#### Stream Key Errors
**Error**: "YouTube Stream Key is required" or "Stream Key appears to be invalid"

**Solutions**:
1. Get your stream key from YouTube Studio → Settings → Stream
2. Ensure the key is copied completely without extra spaces
3. Verify your YouTube channel has live streaming enabled

#### File Upload Failures
**Error**: File upload or processing errors

**Solutions**:
1. Check file size (max 500MB)
2. Verify supported formats (MP4, AVI, MOV, MKV)
3. Ensure sufficient disk space

#### Connection Issues
**Error**: Stream connection failures

**Solutions**:
1. Check internet connection stability
2. Verify firewall settings allow outbound RTMP connections
3. Test with lower bitrate settings

### Debug Mode
Enable detailed logging by setting `LOG_LEVEL=debug` in environment variables.

### Log Files
- **Error logs**: `server/logs/error.log`
- **Combined logs**: `server/logs/combined.log`
- **Real-time logs**: Available in the dashboard

## Environment Compatibility

### Supported Environments
- ✅ **Local Windows** (with FFmpeg installed)
- ✅ **Local macOS** (with FFmpeg installed)
- ✅ **Local Linux** (with FFmpeg installed)
- ✅ **VPS/Cloud servers** (with FFmpeg installed)

### Unsupported Environments
- ❌ **Browser-based environments** (WebContainer, CodeSandbox, etc.)
- ❌ **Serverless functions** (cannot run long-running FFmpeg processes)
- ❌ **Environments without native binary support**

## Security Considerations

- **Stream keys** are sensitive - never commit them to version control
- **File uploads** are validated for type and size
- **CORS** is configured for secure cross-origin requests
- **Helmet.js** provides security headers
- **Input validation** prevents malicious data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs for error details

---

**Note**: This system is designed for legitimate streaming purposes. Ensure you comply with YouTube's Terms of Service and community guidelines when using this software.