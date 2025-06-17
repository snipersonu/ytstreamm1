import React, { useRef, useState } from 'react';
import { useStream } from '../contexts/StreamContext';
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
} from 'lucide-react';

export default function StreamingDashboard() {
  const { status, config, logs, startStream, stopStream, restartStream, updateConfig } = useStream();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoSource, setVideoSource] = useState('file');
  const [isUploading, setIsUploading] = useState(false);

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
           (config.videoSource || config.videoFile);
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
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-white/10">
              {status.isStreaming ? (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white font-medium">Streaming Live</p>
                  <p className="text-gray-400 text-sm">{status.fps} FPS • {status.bitrate} kbps</p>
                </div>
              ) : (
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Stream Preview</p>
                </div>
              )}
            </div>
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
                onClick={startStream}
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

              {videoSource === 'file' ? (
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
    </div>
  );
}