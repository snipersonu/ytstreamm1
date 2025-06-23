import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Database } from '../utils/Database.js';

const router = express.Router();

// Create playlist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, items, backgroundVideo } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const playlistData = {
      id: Date.now().toString(),
      name,
      items: items || [],
      backgroundVideo: backgroundVideo || null, // Single video that loops in background
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to database
    const success = Database.addPlaylist(playlistData);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to save playlist' });
    }

    res.json({
      message: 'Playlist created successfully',
      playlist: playlistData
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Get user's playlists
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get playlists from database
    const playlists = Database.getPlaylists(req.user.id);
    
    // Add summary information
    const playlistSummaries = playlists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      itemCount: playlist.items ? playlist.items.length : 0,
      duration: playlist.items ? playlist.items.reduce((total, item) => total + (item.duration || 0), 0) : 0,
      backgroundVideo: playlist.backgroundVideo,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt
    }));

    res.json({ playlists: playlistSummaries });

  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get specific playlist
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get playlist from database
    const playlist = Database.getPlaylist(id, req.user.id);
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ playlist });

  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// Update playlist
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, items, backgroundVideo } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (items !== undefined) updates.items = items;
    if (backgroundVideo !== undefined) updates.backgroundVideo = backgroundVideo;
    
    const updatedPlaylist = Database.updatePlaylist(id, updates, req.user.id);
    
    if (!updatedPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ 
      message: 'Playlist updated successfully',
      playlist: updatedPlaylist
    });

  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete playlist
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedPlaylist = Database.deletePlaylist(id, req.user.id);
    
    if (!deletedPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({ message: 'Playlist deleted successfully' });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

export default router;