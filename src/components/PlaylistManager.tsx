import React, { useState, useRef, useEffect } from 'react';
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
  Loader2,
  Image,
  FileVideo,
  FileAudio,
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

interface AudioPlaylistItem {
  id: string;
  name: string;
  audio: MediaItem;
  duration: number;
  order: number;
  volume: number;
}

export default function PlaylistManager() {
  const { user } = useAuth();
  const [audioItems, setAudioItems] = useState<AudioPlaylistItem[]>([]);
  const [backgroundVideo, setBackgroundVideo] = useState<MediaItem | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [currentItem, setCurrentItem] = useState<AudioPlaylistItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadType, setUploadType] = useState<'video' | 'audio'>('video');
  const [isUploading, setIsUploading] = useState(false);
  const [draggedItem, setDraggedItem] = useState<AudioPlaylistItem | null>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('My Lofi Playlist');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'audios'>('videos');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load media library and playlists on component mount
  useEffect(() => {
    loadMediaLibrary();
    loadPlaylists();
  }, []);

  const loadMediaLibrary = async () => {
    try {
      const response = await fetch('/api/media/library', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMediaLibrary(data.media.map(item => ({
          ...item,
          volume: 1.0,
          loop: item.type === 'audio',
          enabled: true,
        })));
      }
    } catch (error) {
      console.error('Error loading media library:', error);
    }
  };

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/playlists', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Load the first playlist if available
        if (data.playlists.length > 0) {
          await loadPlaylist(data.playlists[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlaylist = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAudioItems(data.playlist.items || []);
        setBackgroundVideo(data.playlist.backgroundVideo || null);
        setPlaylistName(data.playlist.name);
        setCurrentPlaylistId(playlistId);
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('media', file);

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
        type: result.type,
        name: result.name,
        url: result.url,
        duration: result.duration || 0,
        thumbnail: result.thumbnail,
        volume: 1.0,
        loop: result.type === 'audio',
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

  const createAudioItem = () => {
    const newItem: AudioPlaylistItem = {
      id: Date.now().toString(),
      name: `Audio Track ${audioItems.length + 1}`,
      audio: null,
      duration: 0,
      order: audioItems.length,
      volume: 1.0,
    };
    
    setAudioItems(prev => [...prev, newItem]);
  };

  const updateAudioItem = (itemId: string, updates: Partial<AudioPlaylistItem>) => {
    setAudioItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  const deleteAudioItem = (itemId: string) => {
    setAudioItems(prev => prev.filter(item => item.id !== itemId));
    if (currentItem?.id === itemId) {
      setCurrentItem(null);
      setIsPlaying(false);
    }
  };

  const reorderAudioItems = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = audioItems[dragIndex];
    const newItems = [...audioItems];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    
    // Update order numbers
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      order: index,
    }));
    
    setAudioItems(reorderedItems);
  };

  const playItem = (item: AudioPlaylistItem) => {
    setCurrentItem(item);
    setIsPlaying(true);
    
    // Load background video if available
    if (backgroundVideo && videoRef.current) {
      videoRef.current.src = backgroundVideo.url;
      videoRef.current.load();
      videoRef.current.play();
    }
    
    // Load audio
    if (item.audio && audioRef.current) {
      audioRef.current.src = item.audio.url;
      audioRef.current.volume = item.volume;
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
    const currentIndex = audioItems.findIndex(item => item.id === currentItem.id);
    const nextIndex = (currentIndex + 1) % audioItems.length;
    playItem(audioItems[nextIndex]);
  };

  const previousItem = () => {
    if (!currentItem) return;
    const currentIndex = audioItems.findIndex(item => item.id === currentItem.id);
    const prevIndex = currentIndex === 0 ? audioItems.length - 1 : currentIndex - 1;
    playItem(audioItems[prevIndex]);
  };

  const savePlaylist = async () => {
    try {
      setIsSaving(true);
      
      const playlistData = {
        name: playlistName,
        items: audioItems,
        backgroundVideo: backgroundVideo,
      };

      let response;
      if (currentPlaylistId) {
        // Update existing playlist
        response = await fetch(`/api/playlists/${currentPlaylistId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(playlistData),
        });
      } else {
        // Create new playlist
        response = await fetch('/api/playlists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(playlistData),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save playlist');
      }

      const result = await response.json();
      
      if (!currentPlaylistId) {
        setCurrentPlaylistId(result.playlist.id);
      }

      alert('Playlist saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  const videoLibrary = mediaLibrary.filter(item => item.type === 'video');
  const audioLibrary = mediaLibrary.filter(item => item.type === 'audio');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="text-white">Loading playlist manager...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">Lofi Playlist Manager</h2>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-lg font-medium focus:outline-none focus:border-blue-500"
            placeholder="Playlist name"
          />
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMediaUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Media</span>
          </button>
          <button
            onClick={createAudioItem}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Audio</span>
          </button>
          <button
            onClick={savePlaylist}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Playlist'}</span>
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
              {!backgroundVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No background video selected</p>
                    <p className="text-gray-500 text-sm">Select a video from your library</p>
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
                    value={currentItem?.volume || 1}
                    onChange={(e) => {
                      const volume = parseFloat(e.target.value);
                      if (audioRef.current) audioRef.current.volume = volume;
                      if (currentItem) {
                        updateAudioItem(currentItem.id, { volume });
                      }
                    }}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Current Playing Info */}
              <div className="text-center">
                {backgroundVideo && (
                  <div className="mb-2">
                    <p className="text-blue-400 text-sm flex items-center justify-center space-x-1">
                      <Video className="w-4 h-4" />
                      <span>Background: {backgroundVideo.name}</span>
                    </p>
                  </div>
                )}
                {currentItem && (
                  <div>
                    <p className="text-white font-medium">{currentItem.name}</p>
                    {currentItem.audio && (
                      <p className="text-gray-400 text-sm flex items-center justify-center space-x-1 mt-1">
                        <Music className="w-4 h-4" />
                        <span>{currentItem.audio.name}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Media Library */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Media Library</h3>
          
          {/* Tab Selector */}
          <div className="flex bg-white/10 rounded-lg p-1 mb-4">
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <FileVideo className="w-4 h-4 inline mr-2" />
              Videos ({videoLibrary.length})
            </button>
            <button
              onClick={() => setActiveTab('audios')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === 'audios'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <FileAudio className="w-4 h-4 inline mr-2" />
              Audios ({audioLibrary.length})
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeTab === 'videos' ? (
              <>
                {videoLibrary.map((media) => (
                  <div
                    key={media.id}
                    className={`bg-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors border-2 ${
                      backgroundVideo?.id === media.id ? 'border-blue-500 bg-blue-500/20' : 'border-transparent'
                    }`}
                    onClick={() => setBackgroundVideo(media)}
                  >
                    <div className="flex items-center space-x-3">
                      <Video className="w-5 h-5 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{media.name}</p>
                        <p className="text-gray-400 text-xs">Background Video</p>
                      </div>
                      {backgroundVideo?.id === media.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
                
                {videoLibrary.length === 0 && (
                  <div className="text-center py-8">
                    <Video className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No videos uploaded</p>
                    <p className="text-gray-500 text-sm">Upload videos for backgrounds</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {audioLibrary.map((media) => (
                  <div
                    key={media.id}
                    className="bg-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('audio', JSON.stringify(media));
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Music className="w-5 h-5 text-green-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{media.name}</p>
                        <p className="text-gray-400 text-xs">Drag to playlist</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {audioLibrary.length === 0 && (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No audio files uploaded</p>
                    <p className="text-gray-500 text-sm">Upload audio for playlist</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Background Video Selection */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Background Video</h3>
        
        {backgroundVideo ? (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Video className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-white font-medium">{backgroundVideo.name}</p>
                  <p className="text-blue-400 text-sm">This video will loop continuously during the stream</p>
                </div>
              </div>
              <button
                onClick={() => setBackgroundVideo(null)}
                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center">
            <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">No Background Video Selected</p>
            <p className="text-gray-500 text-sm mt-2">
              Select a video from your library to use as the looping background
            </p>
          </div>
        )}
      </div>

      {/* Audio Playlist */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Audio Playlist ({audioItems.length} tracks)</h3>
        
        <div className="space-y-2">
          {audioItems.map((item, index) => (
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
                  const dragIndex = audioItems.findIndex(p => p.id === draggedItem.id);
                  reorderAudioItems(dragIndex, index);
                  setDraggedItem(null);
                }
                
                // Handle audio drop
                const audioData = e.dataTransfer.getData('audio');
                if (audioData) {
                  const audio: MediaItem = JSON.parse(audioData);
                  updateAudioItem(item.id, { 
                    audio,
                    name: audio.name,
                    duration: audio.duration || 0
                  });
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
                      onChange={(e) => updateAudioItem(item.id, { name: e.target.value })}
                      className="bg-transparent text-white font-medium border-none outline-none flex-1"
                    />
                  </div>
                  
                  {/* Audio Slot */}
                  <div className={`border-2 border-dashed rounded-lg p-3 ${
                    item.audio ? 'border-green-500 bg-green-500/10' : 'border-gray-500'
                  }`}>
                    {item.audio ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Music className="w-4 h-4 text-green-400" />
                          <span className="text-white text-sm truncate">{item.audio.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Volume2 className="w-3 h-3 text-gray-400" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={item.volume}
                            onChange={(e) => updateAudioItem(item.id, { volume: parseFloat(e.target.value) })}
                            className="w-16"
                          />
                          <button
                            onClick={() => updateAudioItem(item.id, { audio: null })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Music className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-gray-400 text-xs">Drop audio here</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => playItem(item)}
                    disabled={!item.audio || !backgroundVideo}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4 text-white" />
                  </button>
                  
                  <button
                    onClick={() => deleteAudioItem(item.id)}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {audioItems.length === 0 && (
            <div className="text-center py-12">
              <Plus className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No audio tracks</p>
              <p className="text-gray-500">Add audio tracks to create your lofi playlist</p>
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
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
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