import React, { useState, useEffect } from 'react';
import StreamingDashboard from './components/StreamingDashboard';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import PlaylistManager from './components/PlaylistManager';
import AuthForm from './components/AuthForm';
import { Settings as SettingsIcon, BarChart3, Radio, List, LogOut, User } from 'lucide-react';
import { StreamProvider } from './contexts/StreamContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Streaming', icon: Radio },
    { id: 'playlist', label: 'Playlist', icon: List },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  if (!user) {
    return <AuthForm />;
  }

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
              
              <div className="flex items-center space-x-4">
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
                
                <div className="flex items-center space-x-3 border-l border-white/20 pl-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{user.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && <StreamingDashboard />}
          {activeTab === 'playlist' && <PlaylistManager />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </StreamProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;