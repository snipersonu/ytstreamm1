import React from 'react';
import { useStream } from '../contexts/StreamContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Users, Clock, AlertTriangle } from 'lucide-react';

export default function Analytics() {
  const { status, analytics } = useStream();

  // Mock data for demonstration
  const streamData = [
    { time: '00:00', bitrate: 2800, fps: 30, viewers: 145 },
    { time: '01:00', bitrate: 2950, fps: 30, viewers: 189 },
    { time: '02:00', bitrate: 2720, fps: 29, viewers: 234 },
    { time: '03:00', bitrate: 3100, fps: 30, viewers: 278 },
    { time: '04:00', bitrate: 2890, fps: 30, viewers: 312 },
    { time: '05:00', bitrate: 3050, fps: 30, viewers: 298 },
    { time: '06:00', bitrate: 2980, fps: 30, viewers: 356 },
  ];

  const errorData = [
    { day: 'Mon', errors: 2 },
    { day: 'Tue', errors: 1 },
    { day: 'Wed', errors: 0 },
    { day: 'Thu', errors: 3 },
    { day: 'Fri', errors: 1 },
    { day: 'Sat', errors: 0 },
    { day: 'Sun', errors: 2 },
  ];

  const qualityMetrics = [
    { name: 'Bitrate Stability', value: 94, color: 'green' },
    { name: 'Frame Rate Consistency', value: 98, color: 'blue' },
    { name: 'Connection Quality', value: 89, color: 'yellow' },
    { name: 'Audio Quality', value: 96, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Total Stream Time</p>
              <p className="text-2xl font-bold text-white">24h 36m</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-green-400 text-sm">+12% from last week</span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Average Viewers</p>
              <p className="text-2xl font-bold text-white">284</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-green-400 text-sm">+8% from last week</span>
              </div>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Stream Restarts</p>
              <p className="text-2xl font-bold text-white">{status.errors}</p>
              <div className="flex items-center mt-2">
                <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                <span className="text-red-400 text-sm">-3 from last week</span>
              </div>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Avg Bitrate</p>
              <p className="text-2xl font-bold text-white">2,943 kbps</p>
              <div className="flex items-center mt-2">
                <Activity className="w-4 h-4 text-blue-400 mr-1" />
                <span className="text-blue-400 text-sm">Stable</span>
              </div>
            </div>
            <Activity className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Streaming Metrics */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Streaming Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={streamData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="bitrate"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
              <Line
                type="monotone"
                dataKey="fps"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Viewer Analytics */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Viewer Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={streamData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="viewers"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Analytics */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Error Report</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={errorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="errors" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quality Metrics</h3>
          <div className="space-y-4">
            {qualityMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">{metric.name}</span>
                  <span className="text-white font-medium">{metric.value}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metric.color === 'green'
                        ? 'bg-green-500'
                        : metric.color === 'blue'
                        ? 'bg-blue-500'
                        : metric.color === 'yellow'
                        ? 'bg-yellow-500'
                        : 'bg-purple-500'
                    }`}
                    style={{ width: `${metric.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}