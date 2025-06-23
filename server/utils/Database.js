import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../db.json');

// Initialize database file if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ media: [], playlists: [] }, null, 2));
}

export class Database {
  static readData() {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database:', error);
      return { media: [], playlists: [] };
    }
  }

  static writeData(data) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing database:', error);
      return false;
    }
  }

  static addMedia(mediaItem) {
    const data = this.readData();
    data.media.push(mediaItem);
    return this.writeData(data);
  }

  static getMedia(userId = null) {
    const data = this.readData();
    if (userId) {
      return data.media.filter(item => item.uploadedBy === userId);
    }
    return data.media;
  }

  static deleteMedia(id, userId = null) {
    const data = this.readData();
    const index = data.media.findIndex(item => 
      item.id === id && (!userId || item.uploadedBy === userId)
    );
    
    if (index !== -1) {
      const deletedItem = data.media.splice(index, 1)[0];
      this.writeData(data);
      return deletedItem;
    }
    return null;
  }

  static addPlaylist(playlist) {
    const data = this.readData();
    data.playlists.push(playlist);
    return this.writeData(data);
  }

  static getPlaylists(userId = null) {
    const data = this.readData();
    if (userId) {
      return data.playlists.filter(playlist => playlist.userId === userId);
    }
    return data.playlists;
  }

  static getPlaylist(id, userId = null) {
    const data = this.readData();
    return data.playlists.find(playlist => 
      playlist.id === id && (!userId || playlist.userId === userId)
    );
  }

  static updatePlaylist(id, updates, userId = null) {
    const data = this.readData();
    const index = data.playlists.findIndex(playlist => 
      playlist.id === id && (!userId || playlist.userId === userId)
    );
    
    if (index !== -1) {
      data.playlists[index] = { ...data.playlists[index], ...updates, updatedAt: new Date() };
      this.writeData(data);
      return data.playlists[index];
    }
    return null;
  }

  static deletePlaylist(id, userId = null) {
    const data = this.readData();
    const index = data.playlists.findIndex(playlist => 
      playlist.id === id && (!userId || playlist.userId === userId)
    );
    
    if (index !== -1) {
      const deletedPlaylist = data.playlists.splice(index, 1)[0];
      this.writeData(data);
      return deletedPlaylist;
    }
    return null;
  }
}