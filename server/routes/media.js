import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { Database } from '../utils/Database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to determine media type from mimetype
const getMediaTypeFromMime = (mimetype) => {
  if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype.startsWith('audio/')) {
    return 'audio';
  }
  return null;
};

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaType = getMediaTypeFromMime(file.mimetype);
    const uploadPath = mediaType === 'audio' 
      ? path.join(__dirname, '../uploads/audio')
      : path.join(__dirname, '../uploads/video');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${timestamp}-${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { 
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const mediaType = getMediaTypeFromMime(file.mimetype);
    
    if (mediaType === 'video') {
      const allowedVideoTypes = [
        'video/mp4', 
        'video/webm', 
        'video/mov', 
        'video/avi', 
        'video/quicktime',
        'video/x-msvideo'
      ];
      if (allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid video file type. Only MP4, WebM, MOV, and AVI are allowed.'));
      }
    } else if (mediaType === 'audio') {
      const allowedAudioTypes = [
        'audio/mp3', 
        'audio/mpeg', 
        'audio/wav', 
        'audio/ogg',
        'audio/x-wav',
        'audio/wave'
      ];
      if (allowedAudioTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid audio file type. Only MP3, WAV, and OGG are allowed.'));
      }
    } else {
      cb(new Error('Invalid file type. Only video and audio files are allowed.'));
    }
  }
});

// Upload media file
router.post('/upload', authenticateToken, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mediaType = getMediaTypeFromMime(req.file.mimetype);
    
    if (!mediaType) {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    const mediaData = {
      id: Date.now().toString(),
      name: req.file.originalname,
      filename: req.file.filename,
      url: `/uploads/${mediaType}/${req.file.filename}`,
      type: mediaType,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    };

    // Save to database
    const success = Database.addMedia(mediaData);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to save media metadata' });
    }

    res.json({
      message: 'Media uploaded successfully',
      ...mediaData
    });

  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Get user's media library
router.get('/library', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    
    // Get media from database
    let media = Database.getMedia(req.user.id);
    
    // Filter by type if specified
    if (type) {
      media = media.filter(m => m.type === type);
    }

    // Check if files still exist and add duration/thumbnail info
    const validMedia = media.filter(item => {
      const filePath = path.join(__dirname, '..', item.url);
      return fs.existsSync(filePath);
    });

    res.json({ media: validMedia });

  } catch (error) {
    console.error('Error fetching media library:', error);
    res.status(500).json({ error: 'Failed to fetch media library' });
  }
});

// Delete media file
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get media item from database
    const mediaItem = Database.deleteMedia(id, req.user.id);
    
    if (!mediaItem) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete the actual file
    const filePath = path.join(__dirname, '..', mediaItem.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Media deleted successfully' });

  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;