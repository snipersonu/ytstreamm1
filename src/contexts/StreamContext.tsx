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
}

interface StreamContextType {
  status: StreamStatus;
  config: StreamConfig;
  analytics: any[];
  logs: string[];
  updateConfig: (config: Partial<StreamConfig>) => void;
  startStream: () => void;
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
  });

  const [analytics, setAnalytics] = useState([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const websocket = new WebSocket('ws://localhost:3001');
    
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
      }
    };

    websocket.onclose = () => {
      addLog('Disconnected from streaming server');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${message}`]);
  };

  const updateConfig = (newConfig: Partial<StreamConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const startStream = () => {
    if (!ws) {
      addLog('ERROR: Not connected to streaming server');
      return;
    }

    // Validate required fields before sending to server
    if (!config.youtubeStreamKey || config.youtubeStreamKey.trim() === '') {
      addLog('ERROR: YouTube Stream Key is required. Please enter your stream key in Settings.');
      return;
    }

    if (!config.videoSource && !config.videoFile) {
      addLog('ERROR: Video source is required. Please select a video source.');
      return;
    }
    
    ws.send(JSON.stringify({
      type: 'start',
      config: config
    }));
    
    addLog('Starting stream...');
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