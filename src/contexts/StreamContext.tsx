import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface StreamStatus {
  isStreaming: boolean;
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  uptime: number;
  bitrate: number;
  fps: number;
  resolution: string;
  errors: number;
  lastRestart: Date | null;
  streamType?: 'single' | 'playlist';
  currentPlaylistItem?: any;
  playlistLength?: number;
}

interface StreamConfig {
  youtubeStreamKey: string;
  videoSource: string;
  videoFile: { name: string; path: string; } | null;
  quality: '720p' | '1080p';
  bitrate: number;
  fps: number;
  autoRestart: boolean;
  backupVideo: string;
  streamType?: 'single' | 'playlist';
  playlistId?: string;
  shufflePlaylist?: boolean;
  loopPlaylist?: boolean;
}

interface StreamContextType {
  status: StreamStatus;
  config: StreamConfig;
  analytics: any[];
  logs: string[];
  updateConfig: (config: Partial<StreamConfig>) => void;
  startStream: (customConfig?: any) => void;
  stopStream: () => void;
  restartStream: () => void;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export function StreamProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StreamStatus>({
    isStreaming: false,
    health: 'offline',
    uptime: 0,
    bitrate: 0,
    fps: 0,
    resolution: '1280x720',
    errors: 0,
    lastRestart: null,
  });

  const [config, setConfig] = useState<StreamConfig>({
    youtubeStreamKey: '',
    videoSource: '',
    videoFile: null,
    quality: '1080p',
    bitrate: 3000,
    fps: 30,
    autoRestart: true,
    backupVideo: '',
    streamType: 'single',
    loopPlaylist: true,
  });

  const [analytics, setAnalytics] = useState([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('streamConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      } catch (error) {
        console.error('Failed to load saved config:', error);
      }
    }

    // Get WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    // Initialize WebSocket connection
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('Connected to streaming server');
      addLog('Connected to streaming server');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'status':
          setStatus(prev => ({ ...prev, ...data.payload }));
          break;
        case 'analytics':
          setAnalytics(prev => [...prev.slice(-99), data.payload]);
          break;
        case 'log':
          addLog(data.message);
          break;
        case 'error':
          addLog(`ERROR: ${data.message}`);
          break;
        case 'playlistUpdate':
          setStatus(prev => ({
            ...prev,
            currentPlaylistItem: data.payload.currentItem,
            playlistLength: data.payload.totalItems,
          }));
          break;
      }
    };

    websocket.onclose = () => {
      addLog('Disconnected from streaming server');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addLog('WebSocket connection error');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  // Save configuration to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('streamConfig', JSON.stringify(config));
  }, [config]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${message}`]);
  };

  const updateConfig = (newConfig: Partial<StreamConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const startStream = (customConfig?: any) => {
    if (!ws) {
      addLog('ERROR: Not connected to streaming server');
      return;
    }

    const streamConfig = customConfig || config;

    // Validate required fields before sending to server
    if (!streamConfig.youtubeStreamKey || streamConfig.youtubeStreamKey.trim() === '') {
      addLog('ERROR: YouTube Stream Key is required. Please enter your stream key in Settings.');
      return;
    }

    if (streamConfig.streamType === 'playlist') {
      if (!streamConfig.playlistId) {
        addLog('ERROR: Playlist is required for playlist streaming mode.');
        return;
      }
    } else {
      if (!streamConfig.videoSource && !streamConfig.videoFile) {
        addLog('ERROR: Video source is required. Please select a video source.');
        return;
      }
    }
    
    ws.send(JSON.stringify({
      type: 'start',
      config: streamConfig
    }));
    
    if (streamConfig.streamType === 'playlist') {
      addLog('Starting playlist stream...');
    } else {
      addLog('Starting stream...');
    }
  };

  const stopStream = () => {
    if (!ws) return;
    
    ws.send(JSON.stringify({
      type: 'stop'
    }));
    
    addLog('Stopping stream...');
  };

  const restartStream = () => {
    if (!ws) return;

    // Validate required fields before restarting
    if (!config.youtubeStreamKey || config.youtubeStreamKey.trim() === '') {
      addLog('ERROR: Cannot restart - YouTube Stream Key is required. Please enter your stream key in Settings.');
      return;
    }
    
    ws.send(JSON.stringify({
      type: 'restart'
    }));
    
    addLog('Restarting stream...');
    setStatus(prev => ({ ...prev, lastRestart: new Date() }));
  };

  return (
    <StreamContext.Provider value={{
      status,
      config,
      analytics,
      logs,
      updateConfig,
      startStream,
      stopStream,
      restartStream,
    }}>
      {children}
    </StreamContext.Provider>
  );
}

export function useStream() {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
}