import React, { useRef, useState, useEffect } from 'react';
import { useStream } from '../contexts/StreamContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Play,
  Square,
  RotateCcw,
  Upload,
  Link,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Video,
  Users,
  Loader2,
  List,
  Music,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';

export default function StreamingDashboard() {
  const { status, config, logs, startStream, stopStream, restartStream, updateConfig } = useStream();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoSource, setVideoSource] = useState('playlist');
  const [isUploading, setIsUploading] = useState(false);
  const [showPlaylistSettings, setShowPlaylistSettings] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // Load available playlists when playlist settings modal opens
  useEffect(() => {
    if (showPlaylistSettings) {
      loadAvailablePlaylists();
    }
  }, [showPlaylistSettings]);

  const loadAvailablePlaylists = async () => {
    try {
      setIsLoadingPlaylists(true);
      const response = await fetch('/api/playlists', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailablePlaylists(data.playlists);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthBgColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-500/20 border-green-500/30';
      case 'good': return 'bg-blue-500/20 border-blue-500/30';
      case 'fair': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'poor': return 'bg-orange-500/20 border-orange-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/upload', {
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
      
      updateConfig({ 
        videoFile: { 
          name: result.filename, 
          path: result.path 
        },
        videoSource: '' // Clear video source when file is uploaded
      });

      console.log('File uploaded successfully:', result);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canStartStream = () => {
    return config.youtubeStreamKey && 
           config.youtubeStreamKey.trim().length > 10 && 
           (config.videoSource || config.videoFile || config.playlistId);
  };

  const startStreamWithPlaylist = async () => {
    if (videoSource === 'playlist' && config.playlistId) {
      // Start stream with playlist configuration
      await startStream({
        ...config,
        streamType: 'playlist',
        playlistId: config.playlistId,
      });
    } else {
      // Start regular stream
      await startStream();
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl border backdrop-blur-sm ${getHealthBgColor(status.health)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Stream Status</p>
              <p className={`text-2xl font-bold ${getHealthColor(status.health)} capitalize`}>
                {status.isStreaming ? status.health : 'Offline'}
              </p>
            </div>
            <Activity className={`w-8 h-8 ${getHealthColor(status.health)}`} />
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Uptime</p>
              <p className="text-2xl font-bold text-white">{formatUptime(status.uptime)}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Bitrate</p>
              <p className="text-2xl font-bold text-white">{status.bitrate} kbps</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Resolution</p>
              <p className="text-2xl font-bold text-white">{status.resolution}</p>
            </div>
            <Video className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-white/10 relative overflow-hidden">
              {status.isStreaming ? (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white font-medium">Streaming Live</p>
                  <p className="text-gray-400 text-sm">{status.fps} FPS • {status.bitrate} kbps</p>
                  {config.streamType === 'playlist' && (
                    <div className="mt-2 flex items-center justify-center space-x-2">
                      <List className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 text-sm">Playlist Mode</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Stream Preview</p>
                  {videoSource === 'playlist' && (
                    <p className="text-blue-400 text-sm mt-2">Lofi-style playlist streaming</p>
                  )}
                </div>
              )}
            </div>

            {/* Current Playing Info */}
            {status.isStreaming && config.streamType === 'playlist' && status.currentPlaylistItem && (
              <div className="mt-4 bg-black/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{status.currentPlaylistItem.name}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                      {status.currentPlaylistItem.video && (
                        <span className="flex items-center space-x-1">
                          <Video className="w-3 h-3" />
                          <span>{status.currentPlaylistItem.video.name}</span>
                        </span>
                      )}
                      {status.currentPlaylistItem.audio && (
                        <span className="flex items-center space-x-1">
                          <Music className="w-3 h-3" />
                          <span>{status.currentPlaylistItem.audio.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">
                      {status.currentPlaylistItem.order + 1} / {status.playlistLength}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {status.currentPlaylistItem.audio?.loop ? 'Looping' : 'Single play'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Stream Controls */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Stream Controls</h3>
            
            {/* Warning if requirements not met */}
            {!canStartStream() && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <p className="text-yellow-400 text-sm font-medium">Setup Required</p>
                </div>
                <p className="text-yellow-300 text-xs mt-1">
                  {!config.youtubeStreamKey || config.youtubeStreamKey.trim().length <= 10 
                    ? 'Enter YouTube Stream Key in Settings' 
                    : 'Select a video source below'}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={startStreamWithPlaylist}
                disabled={status.isStreaming || !canStartStream()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Start Stream</span>
              </button>
              
              <button
                onClick={stopStream}
                disabled={!status.isStreaming}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Square className="w-5 h-5" />
                <span>Stop Stream</span>
              </button>
              
              <button
                onClick={restartStream}
                disabled={!status.isStreaming}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Restart Stream</span>
              </button>
            </div>
          </div>

          {/* Video Source */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Video Source</h3>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setVideoSource('playlist')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    videoSource === 'playlist'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <List className="w-4 h-4 inline mr-2" />
                  Playlist
                </button>
                <button
                  onClick={() => setVideoSource('file')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    videoSource === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setVideoSource('url')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    videoSource === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  URL Stream
                </button>
              </div>

              {videoSource === 'playlist' ? (
                <div className="space-y-3">
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <List className="w-5 h-5 text-purple-400" />
                      <span className="text-purple-400 font-medium">Lofi-Style Streaming</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">
                      Stream with video backgrounds and looping audio tracks, perfect for lofi music streams.
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {config.playlistId ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400">Playlist configured</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No playlist selected</span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowPlaylistSettings(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                      >
                        <SettingsIcon className="w-3 h-3" />
                        <span>Configure</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : videoSource === 'file' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full border-2 border-dashed border-white/20 hover:border-white/40 disabled:border-white/10 disabled:cursor-not-allowed rounded-lg py-4 px-4 text-center transition-colors"
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                        <span className="text-gray-300 font-medium">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        {config.videoFile ? (
                          <div className="flex items-center justify-center space-x-2">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                            <div>
                              <p className="text-green-400 font-medium">{config.videoFile.name}</p>
                              <p className="text-gray-500 text-sm mt-1">Click to change file</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-300 font-medium">Upload Video File</p>
                            <p className="text-gray-500 text-sm mt-1">MP4, AVI, MOV supported (max 500MB)</p>
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    placeholder="Enter video URL or RTMP stream"
                    value={config.videoSource}
                    onChange={(e) => {
                      updateConfig({ 
                        videoSource: e.target.value,
                        videoFile: null // Clear video file when URL is entered
                      });
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                  {config.videoSource && (
                    <div className="mt-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">URL configured</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Stream Logs</h3>
        <div className="bg-black/50 rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`mb-1 ${log.includes('ERROR') ? 'text-red-400' : 'text-gray-300'}`}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Playlist Settings Modal */}
      {showPlaylistSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Playlist Settings</h3>
              <button
                onClick={() => setShowPlaylistSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Playlist
                </label>
                {isLoadingPlaylists ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin mr-2" />
                    <span className="text-gray-400">Loading playlists...</span>
                  </div>
                ) : (
                  <select
                    value={config.playlistId || ''}
                    onChange={(e) => updateConfig({ playlistId: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a playlist...</option>
                    {availablePlaylists.map((playlist: any) => (
                      <option key={playlist.id} value={playlist.id}>
                        {playlist.name} ({playlist.itemCount} items)
                      </option>
                    ))}
                  </select>
                )}
                
                {availablePlaylists.length === 0 && !isLoadingPlaylists && (
                  <p className="text-gray-400 text-sm mt-2">
                    No playlists found. Create a playlist in the Playlist tab first.
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Shuffle Mode</p>
                  <p className="text-gray-400 text-sm">Randomize playlist order</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.shufflePlaylist || false}
                    onChange={(e) => updateConfig({ shufflePlaylist: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Loop Playlist</p>
                  <p className="text-gray-400 text-sm">Restart from beginning when finished</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.loopPlaylist !== false}
                    onChange={(e) => updateConfig({ loopPlaylist: e.target.checked })}
                    className="sr-only peer" 
                    defaultChecked 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPlaylistSettings(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPlaylistSettings(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}