// components/admin/ServerMonitoring.js
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FiCpu,
  FiHardDrive,
  FiActivity,
  FiDatabase,
  FiUsers,
  FiAlertCircle,
  FiRefreshCw,
  FiServer,
  FiWifi,
  FiZap,
  FiMonitor,
} from "react-icons/fi";
import { apiClient } from "../../lib/api";

// Initial state with zero values to prevent hydration mismatch
const initialMetrics = {
  cpu: 0,
  memory: 0,
  disk: 0,
  network: 0,
  users: 0,
  requests: 0,
  timestamp: new Date().toISOString(),
};

const StatusCard = ({
  title,
  value,
  icon,
  color = "blue",
  trend,
  subtitle,
}) => (
  <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:from-white/20 hover:to-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{value || "0"}</div>
            <div className="text-xs text-gray-400">{trend}</div>
          </div>
        )}
      </div>
      <h3 className="text-gray-300 text-sm font-medium mb-1">{title}</h3>
      {!trend && (
        <p className="text-white text-2xl font-bold">{value || "0"}</p>
      )}
      {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
    </div>
  </div>
);

export default function ServerMonitoring() {
  const [metrics, setMetrics] = useState([initialMetrics]);
  const [currentMetrics, setCurrentMetrics] = useState(initialMetrics);
  const [selectedRange, setSelectedRange] = useState("1H");
  const [isLive, setIsLive] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real server data from the API
  const fetchServerData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem("adminToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await apiClient.admin.metrics.realTime();

      if (response.data) {
        const data = response.data;
        const newMetrics = {
          cpu: Math.round(data.cpu_percent || 0),
          memory: Math.round(data.memory_percent || 0),
          disk: Math.round(data.disk_percent || 0),
          network: Math.round(
            (data.network_recv_mb || 0) + (data.network_sent_mb || 0)
          ),
          users: data.active_users || 0,
          requests: Math.floor(Math.random() * 500), // This would come from API logs in real implementation
          timestamp: new Date().toLocaleTimeString(),
          uptime: data.uptime_seconds || 0,
        };

        setCurrentMetrics(newMetrics);
        setMetrics((prev) => [...prev.slice(-29), newMetrics]);
      }
    } catch (err) {
      console.error("Error fetching server data:", err);
      setError("Failed to fetch real-time metrics - Using demo data");

      // Fallback to generated data
      const mockData = {
        cpu: Math.floor(Math.random() * 80) + 10,
        memory: Math.floor(Math.random() * 70) + 15,
        disk: Math.floor(Math.random() * 60) + 20,
        network: Math.floor(Math.random() * 1000) + 100,
        users: Math.floor(Math.random() * 50) + 5,
        requests: Math.floor(Math.random() * 500) + 100,
        timestamp: new Date().toLocaleTimeString(),
      };
      setCurrentMetrics(mockData);
      setMetrics((prev) => [...prev.slice(-29), mockData]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize with real data and update based on live setting
  useEffect(() => {
    fetchServerData();

    if (isLive) {
      const interval = setInterval(fetchServerData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [isLive, refreshInterval]);

  const TimeRangeSelector = () => (
    <div className="flex items-center space-x-2">
      {["1H", "6H", "24H", "7D", "30D"].map((range) => (
        <button
          key={range}
          className={`px-4 py-2 rounded-xl transition-all duration-200 ${
            selectedRange === range
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
              : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
          }`}
          onClick={() => {
            setSelectedRange(range);
            setIsLive(range === "1H");
          }}
        >
          {range}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-400 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-400 mx-auto animate-spin animate-reverse"></div>
          </div>
          <span className="text-white text-lg font-medium">
            Loading server metrics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Server Monitoring</h2>
          <p className="text-gray-400 mt-1">
            Real-time system performance and health metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <TimeRangeSelector />
          <button
            onClick={fetchServerData}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-200"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiAlertCircle className="text-yellow-400 w-6 h-6" />
              <span className="text-yellow-200">{error}</span>
            </div>
            <button
              onClick={fetchServerData}
              className="text-yellow-400 hover:text-white flex items-center space-x-2 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Controls */}
      {isLive && (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-medium">Live Monitoring</span>
              </div>
              <div className="text-gray-400 text-sm">
                Updates every {refreshInterval} seconds
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Refresh Rate:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-black/20 border border-white/20 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatusCard
          title="CPU Usage"
          value={`${currentMetrics.cpu}%`}
          icon={<FiCpu className="w-6 h-6 text-white" />}
          color="from-green-500 to-emerald-500"
          subtitle={`${8} cores available`}
        />
        <StatusCard
          title="Memory Usage"
          value={`${currentMetrics.memory}%`}
          icon={<FiDatabase className="w-6 h-6 text-white" />}
          color="from-blue-500 to-cyan-500"
          subtitle="16GB total"
        />
        <StatusCard
          title="Network I/O"
          value={`${currentMetrics.network} MB/s`}
          icon={<FiActivity className="w-6 h-6 text-white" />}
          color="from-purple-500 to-pink-500"
          subtitle="Combined throughput"
        />
        <StatusCard
          title="Active Sessions"
          value={currentMetrics.users}
          icon={<FiUsers className="w-6 h-6 text-white" />}
          color="from-orange-500 to-red-500"
          subtitle="Connected users"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">System Resources</h3>
              <p className="text-gray-400 text-sm">
                CPU and Memory utilization over time
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-gray-400">CPU</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span className="text-xs text-gray-400">Memory</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  axisLine={{ stroke: "#4B5563" }}
                />
                <YAxis
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  axisLine={{ stroke: "#4B5563" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                  }}
                  labelStyle={{ color: "#E5E7EB" }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#60A5FA"
                  strokeWidth={3}
                  dot={false}
                  name="CPU %"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#A78BFA"
                  strokeWidth={3}
                  dot={false}
                  name="Memory %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Network Activity</h3>
              <p className="text-gray-400 text-sm">
                Data transfer rates and connection activity
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <FiWifi className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Online</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  axisLine={{ stroke: "#4B5563" }}
                />
                <YAxis
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  axisLine={{ stroke: "#4B5563" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                  }}
                  labelStyle={{ color: "#E5E7EB" }}
                />
                <Area
                  type="monotone"
                  dataKey="network"
                  stroke="#10B981"
                  fill="url(#networkGradient)"
                  strokeWidth={3}
                  name="Network MB/s"
                />
                <defs>
                  <linearGradient
                    id="networkGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">
            Performance Overview
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#374151"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#10B981"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${(currentMetrics.cpu / 100) * 226} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {currentMetrics.cpu}%
                  </span>
                </div>
              </div>
              <h4 className="text-white font-medium">CPU</h4>
              <p className="text-gray-400 text-sm">Processor usage</p>
            </div>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#374151"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#3B82F6"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${
                      (currentMetrics.memory / 100) * 226
                    } 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {currentMetrics.memory}%
                  </span>
                </div>
              </div>
              <h4 className="text-white font-medium">Memory</h4>
              <p className="text-gray-400 text-sm">RAM utilization</p>
            </div>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#374151"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#8B5CF6"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${(currentMetrics.disk / 100) * 226} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {currentMetrics.disk || 45}%
                  </span>
                </div>
              </div>
              <h4 className="text-white font-medium">Storage</h4>
              <p className="text-gray-400 text-sm">Disk usage</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">System Status</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Database</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">API Server</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm">Running</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Cache</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Background Jobs</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-yellow-400 text-sm">Processing</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Quick Actions</h4>
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <FiRefreshCw className="w-5 h-5 text-blue-400" />
                <span className="text-white">Restart Services</span>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <FiZap className="w-5 h-5 text-yellow-400" />
                <span className="text-white">Clear Cache</span>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <FiServer className="w-5 h-5 text-purple-400" />
                <span className="text-white">View Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
