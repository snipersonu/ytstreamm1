import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create playlist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, items } = req.body;
    
    if (!name || !items) {
      return res.status(400).json({ error: 'Name and items are required' });
    }

    const playlistData = {
      id: Date.now().toString(),
      name,
      items,
      userId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, save to database
    // const playlist = await db.playlists.create(playlistData);

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
    // In a real implementation, fetch from database
    // const playlists = await db.playlists.findAll({
    //   where: { userId: req.user.id }
    // });

    // Mock data for demonstration
    const mockPlaylists = [
      {
        id: 'default',
        name: 'Default Lofi Playlist',
        itemCount: 5,
        duration: 1200,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: 'custom1',
        name: 'My Custom Playlist',
        itemCount: 3,
        duration: 800,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-20')
      }
    ];

    res.json({ playlists: mockPlaylists });

  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get specific playlist
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, fetch from database
    // const playlist = await db.playlists.findOne({
    //   where: { id, userId: req.user.id },
    //   include: ['items']
    // });

    // Mock data for demonstration
    const mockPlaylist = {
      id,
      name: 'Default Lofi Playlist',
      items: [
        {
          id: '1',
          name: 'Lofi Scene 1',
          video: {
            id: 'v1',
            name: 'City Rain',
            url: '/uploads/video/lofi-city-rain.mp4',
            duration: 300
          },
          audio: {
            id: 'a1',
            name: 'Chill Beats 1',
            url: '/uploads/audio/chill-beats-1.mp3',
            duration: 180,
            loop: true,
            volume: 0.8
          },
          duration: 300,
          order: 0
        }
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15')
    };

    res.json({ playlist: mockPlaylist });

  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// Update playlist
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, items } = req.body;
    
    // In a real implementation, update in database
    // const playlist = await db.playlists.findOne({
    //   where: { id, userId: req.user.id }
    // });
    
    // if (!playlist) {
    //   return res.status(404).json({ error: 'Playlist not found' });
    // }
    
    // await playlist.update({ name, items, updatedAt: new Date() });

    res.json({ message: 'Playlist updated successfully' });

  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete playlist
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, delete from database
    // const playlist = await db.playlists.findOne({
    //   where: { id, userId: req.user.id }
    // });
    
    // if (!playlist) {
    //   return res.status(404).json({ error: 'Playlist not found' });
    // }
    
    // await playlist.destroy();

    res.json({ message: 'Playlist deleted successfully' });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

export default router;