import React, { useState, useEffect } from 'react';
import StreamingDashboard from './components/StreamingDashboard';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import { Settings as SettingsIcon, BarChart3, Radio } from 'lucide-react';
import { StreamProvider } from './contexts/StreamContext';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Streaming', icon: Radio },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <StreamProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        {/* Navigation */}
        <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">YouTube Livestream System</h1>
              </div>
              
              <div className="flex space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && <StreamingDashboard />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </StreamProvider>
  );
}

export default App;