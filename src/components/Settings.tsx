import React from 'react';
import { useStream } from '../contexts/StreamContext';
import {
  Key,
  Video,
  Settings as SettingsIcon,
  Shield,
  Bell,
  Save,
  Youtube,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';

export default function Settings() {
  const { config, updateConfig } = useStream();

  const handleSave = () => {
    // Save configuration
    console.log('Saving configuration:', config);
  };

  const isStreamKeyValid = config.youtubeStreamKey && config.youtubeStreamKey.trim().length > 10;

  return (
    <div className="space-y-6">
      {/* YouTube Configuration */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Youtube className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-white">YouTube Configuration</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              YouTube Stream Key *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Enter your YouTube Stream Key"
                value={config.youtubeStreamKey}
                onChange={(e) => updateConfig({ youtubeStreamKey: e.target.value })}
                className={`w-full bg-white/10 border rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                  config.youtubeStreamKey && !isStreamKeyValid 
                    ? 'border-red-500' 
                    : isStreamKeyValid 
                    ? 'border-green-500' 
                    : 'border-white/20'
                }`}
              />
              {config.youtubeStreamKey && !isStreamKeyValid && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              )}
              {isStreamKeyValid && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              )}
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-gray-400 text-xs">
                Get your stream key from YouTube Studio → Settings → Stream
              </p>
              {config.youtubeStreamKey && !isStreamKeyValid && (
                <p className="text-red-400 text-xs flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Stream key appears to be invalid or too short</span>
                </p>
              )}
              {!config.youtubeStreamKey && (
                <p className="text-yellow-400 text-xs flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Stream key is required to start streaming</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Quality Settings */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Video className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-white">Video Quality Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution
            </label>
            <select
              value={config.quality}
              onChange={(e) => updateConfig({ quality: e.target.value as '720p' | '1080p' })}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="720p">720p (1280x720)</option>
              <option value="1080p">1080p (1920x1080)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Frame Rate
            </label>
            <select
              value={config.fps}
              onChange={(e) => updateConfig({ fps: parseInt(e.target.value) })}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
            >
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bitrate (kbps)
            </label>
            <input
              type="number"
              min="500"
              max="10000"
              step="100"
              value={config.bitrate}
              onChange={(e) => updateConfig({ bitrate: parseInt(e.target.value) })}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-gray-400 text-xs mt-1">
              Recommended: 2500-4000 for 1080p, 1500-3000 for 720p
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoRestart"
              checked={config.autoRestart}
              onChange={(e) => updateConfig({ autoRestart: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="autoRestart" className="text-sm font-medium text-gray-300">
              Enable Auto-Restart
            </label>
          </div>
        </div>
      </div>

      {/* Backup Configuration */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <HardDrive className="w-6 h-6 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Backup Configuration</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Backup Video URL
            </label>
            <input
              type="url"
              placeholder="Enter backup video URL or file path"
              value={config.backupVideo}
              onChange={(e) => updateConfig({ backupVideo: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-gray-400 text-xs mt-1">
              This video will play if the primary source fails
            </p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Stream Disconnection Alerts</p>
              <p className="text-gray-400 text-sm">Get notified when stream goes offline</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Quality Drop Warnings</p>
              <p className="text-gray-400 text-sm">Alert when stream quality drops below threshold</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Auto-Restart Notifications</p>
              <p className="text-gray-400 text-sm">Notify when stream automatically restarts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isStreamKeyValid}
          className={`font-medium py-3 px-6 rounded-lg flex items-center space-x-2 transition-colors ${
            isStreamKeyValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-5 h-5" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
}