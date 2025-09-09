// components/admin/ServerMonitoringEnhanced.js
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
} from "react-icons/fi";
import { apiClient } from "../../lib/api";

const StatusCard = ({
  title,
  value,
  icon,
  color = "blue",
  status = "normal",
}) => (
  <div className="bg-[#4A3222] p-4 rounded-lg">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[#D9B799] text-sm">{title}</div>
        <div className="text-2xl font-bold text-white">{value || "0"}</div>
        {status !== "normal" && (
          <div
            className={`text-xs mt-1 ${
              status === "warning"
                ? "text-yellow-400"
                : status === "critical"
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        )}
      </div>
      <div
        className={`h-12 w-12 rounded-full bg-opacity-20 flex items-center justify-center ${
          color === "green"
            ? "bg-green-500"
            : color === "blue"
            ? "bg-blue-500"
            : color === "purple"
            ? "bg-purple-500"
            : color === "red"
            ? "bg-red-500"
            : "bg-yellow-500"
        }`}
      >
        {icon}
      </div>
    </div>
  </div>
);

export default function ServerMonitoringEnhanced() {
  const [metrics, setMetrics] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    users: 0,
    requests: 0,
    timestamp: new Date().toISOString(),
  });
  const [selectedRange, setSelectedRange] = useState("1H");
  const [isLive, setIsLive] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchServerData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("No admin token found");
      }

      const headers = { Authorization: `Bearer ${token}` };

      const response = await apiClient.admin.server.monitoring();

      if (response.data) {
        const { current, historical, health } = response.data;

        // Update current metrics
        const newMetrics = {
          cpu: current.cpu_percent || 0,
          memory: current.memory_percent || 0,
          disk: current.disk_percent || 0,
          network: current.network_recv_mb || 0,
          users: current.active_users || 0,
          requests: Math.floor(Math.random() * 500), // This would come from API logs
          timestamp: new Date().toLocaleTimeString(),
          uptime: current.uptime_seconds || 0,
        };

        setCurrentMetrics(newMetrics);

        // Update historical data
        if (historical && historical.metrics) {
          const formattedMetrics = historical.metrics
            .slice(-30)
            .map((metric) => ({
              cpu: metric.cpu_percent || 0,
              memory: metric.memory_percent || 0,
              disk: metric.disk_percent || 0,
              network: metric.network_recv_mb || 0,
              users: metric.active_users || 0,
              timestamp: new Date(metric.timestamp).toLocaleTimeString(),
            }));
          setMetrics(formattedMetrics);
        } else {
          // Add current metrics to history
          setMetrics((prev) => [...prev.slice(-29), newMetrics]);
        }

        // Update system health
        setSystemHealth(health);
        setLastUpdate(new Date().toLocaleString());
      }
    } catch (err) {
      console.error("Error fetching server data:", err);
      setError(`Failed to fetch server monitoring data: ${err.message}`);

      // Fallback to mock data when API fails
      const mockData = {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100),
        network: Math.floor(Math.random() * 1000),
        users: Math.floor(Math.random() * 100),
        requests: Math.floor(Math.random() * 500),
        timestamp: new Date().toLocaleTimeString(),
      };

      setCurrentMetrics(mockData);
      setMetrics((prev) => [...prev.slice(-29), mockData]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerData();

    if (isLive) {
      const interval = setInterval(fetchServerData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [isLive, refreshInterval]);

  const getStatusColor = (value, type) => {
    if (type === "cpu" || type === "memory" || type === "disk") {
      if (value > 80) return "red";
      if (value > 60) return "yellow";
      return "green";
    }
    return "blue";
  };

  const getStatus = (value, type) => {
    if (type === "cpu" || type === "memory" || type === "disk") {
      if (value > 80) return "critical";
      if (value > 60) return "warning";
      return "normal";
    }
    return "normal";
  };

  const TimeRangeSelector = () => (
    <div className="flex items-center space-x-4">
      {["1H", "6H", "24H", "7D", "30D"].map((range) => (
        <button
          key={range}
          className={`px-3 py-1 rounded ${
            selectedRange === range
              ? "bg-[#D9B799] text-[#2D1F14]"
              : "bg-[#2D1F14] text-[#D9B799] hover:bg-[#6A4E3D]"
          }`}
          onClick={() => {
            setSelectedRange(range);
            fetchServerData(); // Refresh data for new range
          }}
        >
          {range}
        </button>
      ))}
    </div>
  );

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D9B799]"></div>
        <span className="ml-2 text-[#D9B799]">Loading server metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <FiServer className="text-[#D9B799] text-2xl" />
          <div>
            <h2 className="text-xl font-bold text-[#D9B799]">
              Server Monitoring
            </h2>
            {lastUpdate && (
              <p className="text-sm text-[#8C6A58]">
                Last updated: {lastUpdate}
              </p>
            )}
          </div>
        </div>
        {systemHealth && (
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${
                systemHealth.status_color === "green"
                  ? "bg-green-500"
                  : systemHealth.status_color === "yellow"
                  ? "bg-yellow-500"
                  : systemHealth.status_color === "orange"
                  ? "bg-orange-500"
                  : "bg-red-500"
              }`}
            ></div>
            <span className="text-[#D9B799]">{systemHealth.status}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <FiAlertCircle className="text-yellow-400 mr-2" />
            <span className="text-yellow-200">{error}</span>
          </div>
          <button
            onClick={fetchServerData}
            className="text-[#D9B799] hover:text-white flex items-center"
          >
            <FiRefreshCw className="mr-1" /> Retry
          </button>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <TimeRangeSelector />
        <div className="flex items-center space-x-4">
          <label className="flex items-center text-[#D9B799]">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
              className="mr-2 accent-[#D9B799]"
            />
            Live Monitoring
          </label>
          {isLive && (
            <div className="flex items-center space-x-2">
              <span className="text-[#D9B799] text-sm">Refresh:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-[#2D1F14] text-[#D9B799] border border-[#6A4E3D] rounded px-2 py-1 text-sm"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
              </select>
            </div>
          )}
          <button
            onClick={fetchServerData}
            className="text-[#D9B799] hover:text-white flex items-center"
          >
            <FiRefreshCw className="mr-1" /> Refresh
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          title="CPU Usage"
          value={`${currentMetrics.cpu.toFixed(1)}%`}
          icon={<FiCpu className="text-white" />}
          color={getStatusColor(currentMetrics.cpu, "cpu")}
          status={getStatus(currentMetrics.cpu, "cpu")}
        />
        <StatusCard
          title="Memory Usage"
          value={`${currentMetrics.memory.toFixed(1)}%`}
          icon={<FiDatabase className="text-white" />}
          color={getStatusColor(currentMetrics.memory, "memory")}
          status={getStatus(currentMetrics.memory, "memory")}
        />
        <StatusCard
          title="Disk Usage"
          value={`${currentMetrics.disk.toFixed(1)}%`}
          icon={<FiHardDrive className="text-white" />}
          color={getStatusColor(currentMetrics.disk, "disk")}
          status={getStatus(currentMetrics.disk, "disk")}
        />
        <StatusCard
          title="Active Users"
          value={currentMetrics.users}
          icon={<FiUsers className="text-white" />}
          color="blue"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#4A3222] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#D9B799] text-sm">Network Traffic</span>
            <FiActivity className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {currentMetrics.network.toFixed(1)} MB/s
          </div>
        </div>
        <div className="bg-[#4A3222] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#D9B799] text-sm">System Uptime</span>
            <FiServer className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {currentMetrics.uptime
              ? formatUptime(currentMetrics.uptime)
              : "Unknown"}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#4A3222] p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[#D9B799]">
            CPU & Memory Usage Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#6A4E3D" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: "#D9B799", fontSize: 12 }}
                  tickFormatter={(value) =>
                    value.split(":").slice(0, 2).join(":")
                  }
                />
                <YAxis tick={{ fill: "#D9B799" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2D1F14",
                    border: "1px solid #6A4E3D",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#D9B799" }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#D9B799"
                  strokeWidth={2}
                  name="CPU %"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#8C6A58"
                  strokeWidth={2}
                  name="Memory %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#4A3222] p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[#D9B799]">
            Network Traffic
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#6A4E3D" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: "#D9B799", fontSize: 12 }}
                  tickFormatter={(value) =>
                    value.split(":").slice(0, 2).join(":")
                  }
                />
                <YAxis tick={{ fill: "#D9B799" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2D1F14",
                    border: "1px solid #6A4E3D",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#D9B799" }}
                />
                <Area
                  type="monotone"
                  dataKey="network"
                  stroke="#D9B799"
                  fill="#D9B799"
                  fillOpacity={0.3}
                  name="Network MB/s"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Health Details */}
      {systemHealth && (
        <div className="bg-[#4A3222] p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-[#D9B799]">
            System Health & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#D9B799]">Health Score</span>
                  <span className="text-2xl font-bold text-white">
                    {systemHealth.health_score}%
                  </span>
                </div>
                <div className="w-full bg-[#2D1F14] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      systemHealth.health_score >= 80
                        ? "bg-green-500"
                        : systemHealth.health_score >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${systemHealth.health_score}%` }}
                  ></div>
                </div>
              </div>

              {systemHealth.services_status && (
                <div>
                  <h4 className="text-[#D9B799] font-semibold mb-2">
                    Services Status
                  </h4>
                  {Object.entries(systemHealth.services_status).map(
                    ([service, status]) => (
                      <div
                        key={service}
                        className="flex justify-between items-center mb-1"
                      >
                        <span className="capitalize text-sm">
                          {service.replace("_", " ")}
                        </span>
                        <span
                          className={`text-sm ${
                            status === "healthy"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-[#D9B799] font-semibold mb-2">
                Recommendations
              </h4>
              {systemHealth.recommendations &&
              systemHealth.recommendations.length > 0 ? (
                <div className="space-y-1">
                  {systemHealth.recommendations
                    .slice(0, 4)
                    .map((rec, index) => (
                      <div
                        key={index}
                        className="text-sm text-[#8C6A58] flex items-start"
                      >
                        <span className="text-[#D9B799] mr-2">•</span>
                        {rec}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-green-400">
                  ✓ All systems operating normally
                </div>
              )}

              {systemHealth.alerts && systemHealth.alerts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[#D9B799] font-semibold mb-2">
                    Active Alerts
                  </h4>
                  {systemHealth.alerts.slice(0, 3).map((alert, index) => (
                    <div
                      key={index}
                      className={`text-sm mb-1 ${
                        alert.severity === "critical"
                          ? "text-red-400"
                          : alert.severity === "warning"
                          ? "text-yellow-400"
                          : "text-blue-400"
                      }`}
                    >
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
