import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { StreamManager } from './services/StreamManager.js';
import { HealthMonitor } from './services/HealthMonitor.js';
import { Logger } from './utils/Logger.js';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import playlistRoutes from './routes/playlists.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize services
const logger = new Logger();

logger.info(`Environment PORT value: ${process.env.PORT}`);
logger.info(`Environment NODE_ENV value: ${process.env.NODE_ENV}`);

const streamManager = new StreamManager(logger);
const healthMonitor = new HealthMonitor(logger);

// Create upload directories
const uploadDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads/video'),
  path.join(__dirname, 'uploads/audio'),
  path.join(__dirname, 'uploads/video/thumbnails')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Always serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/playlists', playlistRoutes);

// Multer configuration for file uploads (legacy support)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  logger.info('Client connected');
  
  // Send current status
  ws.send(JSON.stringify({
    type: 'status',
    payload: streamManager.getStatus()
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'start':
          await streamManager.startStream(data.config);
          broadcast({
            type: 'log',
            message: `Stream started successfully (${data.config.streamType || 'single'} mode)`
          });
          break;
          
        case 'stop':
          await streamManager.stopStream();
          broadcast({
            type: 'log',
            message: 'Stream stopped'
          });
          break;
          
        case 'restart':
          await streamManager.restartStream();
          broadcast({
            type: 'log',
            message: 'Stream restarted'
          });
          break;
          
        default:
          logger.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    logger.info('Client disconnected');
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// Legacy upload endpoint
app.post('/api/upload', authenticateToken, upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: req.file.path
    });
    
    logger.info(`File uploaded: ${req.file.filename}`);
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/status', (req, res) => {
  res.json(streamManager.getStatus());
});

app.get('/api/logs', authenticateToken, (req, res) => {
  res.json({ logs: logger.getLogs() });
});

app.get('/api/analytics', authenticateToken, (req, res) => {
  res.json({ analytics: healthMonitor.getAnalytics() });
});

// Health monitoring
healthMonitor.on('statusUpdate', (status) => {
  broadcast({
    type: 'status',
    payload: status
  });
});

healthMonitor.on('alert', (alert) => {
  broadcast({
    type: 'alert',
    payload: alert
  });
  logger.warn(`Health Alert: ${alert.message}`);
});

// Start monitoring
healthMonitor.start();

// Stream manager events
streamManager.on('statusChange', (status) => {
  broadcast({
    type: 'status',
    payload: status
  });
});

streamManager.on('error', (error) => {
  broadcast({
    type: 'error',
    message: error.message
  });
  logger.error('Stream error:', error);
});

streamManager.on('log', (message) => {
  broadcast({
    type: 'log',
    message
  });
});

streamManager.on('playlistUpdate', (data) => {
  broadcast({
    type: 'playlistUpdate',
    payload: data
  });
});

// Always serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Express error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Use port 3001 internally (will be mapped to 3000 by docker-compose)
const PORT = process.env.PORT || 3001;

logger.info(`Final PORT value being used: ${PORT}`);

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`🚀 YouTube Livestream System running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  streamManager.cleanup();
  healthMonitor.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});