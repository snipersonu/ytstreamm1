import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Upload,
  Music,
  Video,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Shuffle,
  Repeat,
  Trash2,
  Edit3,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  Save,
  X,
} from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'video' | 'audio';
  name: string;
  url: string;
  duration: number;
  thumbnail?: string;
  volume: number;
  loop: boolean;
  enabled: boolean;
}

interface PlaylistItem {
  id: string;
  video: MediaItem | null;
  audio: MediaItem | null;
  duration: number;
  name: string;
  order: number;
}

export default function PlaylistManager() {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [currentItem, setCurrentItem] = useState<PlaylistItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadType, setUploadType] = useState<'video' | 'audio'>('video');
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<PlaylistItem | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('type', uploadType);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      const newMediaItem: MediaItem = {
        id: result.id,
        type: uploadType,
        name: result.name,
        url: result.url,
        duration: result.duration || 0,
        thumbnail: result.thumbnail,
        volume: 1.0,
        loop: uploadType === 'audio',
        enabled: true,
      };

      setMediaLibrary(prev => [...prev, newMediaItem]);
      setShowMediaUpload(false);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const createPlaylistItem = () => {
    const newItem: PlaylistItem = {
      id: Date.now().toString(),
      video: null,
      audio: null,
      duration: 0,
      name: `Item ${playlist.length + 1}`,
      order: playlist.length,
    };
    
    setPlaylist(prev => [...prev, newItem]);
    setEditingItem(newItem);
  };

  const updatePlaylistItem = (itemId: string, updates: Partial<PlaylistItem>) => {
    setPlaylist(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  const deletePlaylistItem = (itemId: string) => {
    setPlaylist(prev => prev.filter(item => item.id !== itemId));
    if (currentItem?.id === itemId) {
      setCurrentItem(null);
      setIsPlaying(false);
    }
  };

  const reorderPlaylist = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = playlist[dragIndex];
    const newPlaylist = [...playlist];
    newPlaylist.splice(dragIndex, 1);
    newPlaylist.splice(hoverIndex, 0, draggedItem);
    
    // Update order numbers
    const reorderedPlaylist = newPlaylist.map((item, index) => ({
      ...item,
      order: index,
    }));
    
    setPlaylist(reorderedPlaylist);
  };

  const playItem = (item: PlaylistItem) => {
    setCurrentItem(item);
    setIsPlaying(true);
    
    // Load video if available
    if (item.video && videoRef.current) {
      videoRef.current.src = item.video.url;
      videoRef.current.load();
      videoRef.current.play();
    }
    
    // Load audio if available
    if (item.audio && audioRef.current) {
      audioRef.current.src = item.audio.url;
      audioRef.current.volume = item.audio.volume;
      audioRef.current.loop = item.audio.loop;
      audioRef.current.load();
      audioRef.current.play();
    }
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
  };

  const resumePlayback = () => {
    setIsPlaying(true);
    if (videoRef.current) videoRef.current.play();
    if (audioRef.current) audioRef.current.play();
  };

  const nextItem = () => {
    if (!currentItem) return;
    const currentIndex = playlist.findIndex(item => item.id === currentItem.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    playItem(playlist[nextIndex]);
  };

  const previousItem = () => {
    if (!currentItem) return;
    const currentIndex = playlist.findIndex(item => item.id === currentItem.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playItem(playlist[prevIndex]);
  };

  const savePlaylist = async () => {
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: 'My Playlist',
          items: playlist,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save playlist');
      }

      alert('Playlist saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save playlist');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Playlist Manager</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMediaUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Media</span>
          </button>
          <button
            onClick={createPlaylistItem}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
          <button
            onClick={savePlaylist}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Playlist</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview Player */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Preview Player</h3>
            
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-lg mb-4 relative overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                loop
                muted={false}
                onEnded={nextItem}
              />
              {!currentItem?.video && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No video selected</p>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Player (Hidden) */}
            <audio ref={audioRef} onEnded={nextItem} />

            {/* Player Controls */}
            <div className="bg-black/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={previousItem}
                    disabled={!currentItem}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <SkipBack className="w-5 h-5 text-white" />
                  </button>
                  
                  {isPlaying ? (
                    <button
                      onClick={pausePlayback}
                      className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <Pause className="w-6 h-6 text-white" />
                    </button>
                  ) : (
                    <button
                      onClick={() => currentItem ? resumePlayback() : null}
                      disabled={!currentItem}
                      className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </button>
                  )}
                  
                  <button
                    onClick={nextItem}
                    disabled={!currentItem}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <SkipForward className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <Volume2 className="w-5 h-5 text-white" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentItem?.audio?.volume || 1}
                    onChange={(e) => {
                      const volume = parseFloat(e.target.value);
                      if (audioRef.current) audioRef.current.volume = volume;
                      if (currentItem?.audio) {
                        updatePlaylistItem(currentItem.id, {
                          audio: { ...currentItem.audio, volume }
                        });
                      }
                    }}
                    className="w-20"
                  />
                </div>
              </div>

              {currentItem && (
                <div className="text-center">
                  <p className="text-white font-medium">{currentItem.name}</p>
                  <div className="flex items-center justify-center space-x-4 mt-2 text-sm text-gray-400">
                    {currentItem.video && (
                      <span className="flex items-center space-x-1">
                        <Video className="w-4 h-4" />
                        <span>{currentItem.video.name}</span>
                      </span>
                    )}
                    {currentItem.audio && (
                      <span className="flex items-center space-x-1">
                        <Music className="w-4 h-4" />
                        <span>{currentItem.audio.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Library */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Media Library</h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mediaLibrary.map((media) => (
              <div
                key={media.id}
                className="bg-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('media', JSON.stringify(media));
                }}
              >
                <div className="flex items-center space-x-3">
                  {media.type === 'video' ? (
                    <Video className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Music className="w-5 h-5 text-green-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{media.name}</p>
                    <p className="text-gray-400 text-xs">{media.type}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {media.loop && <Repeat className="w-3 h-3 text-yellow-400" />}
                    {!media.enabled && <EyeOff className="w-3 h-3 text-gray-500" />}
                  </div>
                </div>
              </div>
            ))}
            
            {mediaLibrary.length === 0 && (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No media files uploaded</p>
                <p className="text-gray-500 text-sm">Upload videos and audio to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playlist */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Playlist ({playlist.length} items)</h3>
        
        <div className="space-y-2">
          {playlist.map((item, index) => (
            <div
              key={item.id}
              className={`bg-white/10 rounded-lg p-4 border-2 border-transparent hover:border-white/20 transition-all ${
                currentItem?.id === item.id ? 'border-blue-500 bg-blue-500/20' : ''
              }`}
              draggable
              onDragStart={() => setDraggedItem(item)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedItem) {
                  const dragIndex = playlist.findIndex(p => p.id === draggedItem.id);
                  reorderPlaylist(dragIndex, index);
                  setDraggedItem(null);
                }
                
                // Handle media drop
                const mediaData = e.dataTransfer.getData('media');
                if (mediaData) {
                  const media: MediaItem = JSON.parse(mediaData);
                  const updates: Partial<PlaylistItem> = {};
                  
                  if (media.type === 'video') {
                    updates.video = media;
                  } else {
                    updates.audio = media;
                  }
                  
                  updatePlaylistItem(item.id, updates);
                }
              }}
            >
              <div className="flex items-center space-x-4">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-white font-medium">{item.order + 1}.</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updatePlaylistItem(item.id, { name: e.target.value })}
                      className="bg-transparent text-white font-medium border-none outline-none flex-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Video Slot */}
                    <div className={`border-2 border-dashed rounded-lg p-3 ${
                      item.video ? 'border-blue-500 bg-blue-500/10' : 'border-gray-500'
                    }`}>
                      {item.video ? (
                        <div className="flex items-center space-x-2">
                          <Video className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm truncate">{item.video.name}</span>
                          <button
                            onClick={() => updatePlaylistItem(item.id, { video: null })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Video className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                          <p className="text-gray-400 text-xs">Drop video here</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Audio Slot */}
                    <div className={`border-2 border-dashed rounded-lg p-3 ${
                      item.audio ? 'border-green-500 bg-green-500/10' : 'border-gray-500'
                    }`}>
                      {item.audio ? (
                        <div className="flex items-center space-x-2">
                          <Music className="w-4 h-4 text-green-400" />
                          <span className="text-white text-sm truncate">{item.audio.name}</span>
                          <button
                            onClick={() => updatePlaylistItem(item.id, { audio: null })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Music className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                          <p className="text-gray-400 text-xs">Drop audio here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => playItem(item)}
                    disabled={!item.video && !item.audio}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4 text-white" />
                  </button>
                  
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-white" />
                  </button>
                  
                  <button
                    onClick={() => deletePlaylistItem(item.id)}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {playlist.length === 0 && (
            <div className="text-center py-12">
              <Plus className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No playlist items</p>
              <p className="text-gray-500">Add items to create your lofi-style stream</p>
            </div>
          )}
        </div>
      </div>

      {/* Media Upload Modal */}
      {showMediaUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Media</h3>
              <button
                onClick={() => setShowMediaUpload(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setUploadType('video')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    uploadType === 'video'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Video className="w-4 h-4 inline mr-2" />
                  Video
                </button>
                <button
                  onClick={() => setUploadType('audio')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    uploadType === 'audio'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Music className="w-4 h-4 inline mr-2" />
                  Audio
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadType === 'video' ? 'video/*' : 'audio/*'}
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full border-2 border-dashed border-white/20 hover:border-white/40 disabled:border-white/10 disabled:cursor-not-allowed rounded-lg py-8 px-4 text-center transition-colors"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-300 font-medium">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 font-medium">
                      Upload {uploadType === 'video' ? 'Video' : 'Audio'} File
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {uploadType === 'video' 
                        ? 'MP4, WebM, MOV supported' 
                        : 'MP3, WAV, OGG supported'
                      }
                    </p>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}