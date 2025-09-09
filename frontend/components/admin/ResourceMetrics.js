import { useState, useEffect } from "react";
import {
  FiDatabase,
  FiHdd,
  FiDownload,
  FiUpload,
  FiRefreshCw,
} from "react-icons/fi";

import { apiClient } from "../../lib/api";

export default function ResourceMetrics() {
  const [metrics, setMetrics] = useState({
    cpu: { current: 0, history: [] },
    memory: { used: 0, total: 16, percent: 0 },
    storage: { used: 0, total: 100, percent: 0 },
    network: { incoming: 0, outgoing: 0, latency: 25 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResourceMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.admin.resources.usage();

      if (response.data) {
        setMetrics(response.data);
      }
    } catch (err) {
      console.error("Error fetching resource metrics:", err);
      setError("Failed to load resource metrics - Using demo data");

      // Enhanced fallback data that simulates real system behavior
      const now = new Date();
      const cpuVariation =
        35 + Math.sin(now.getMinutes() / 10) * 15 + Math.random() * 10;
      const memoryBase = 8 + now.getHours() * 0.5;
      const networkVariation = now.getSeconds() % 10;

      setMetrics({
        cpu: {
          current: Math.max(15, Math.min(85, cpuVariation)),
          history: Array.from({ length: 20 }, (_, i) => {
            const variation =
              35 +
              Math.sin((now.getMinutes() - i) / 10) * 15 +
              (Math.random() * 10 - 5);
            return Math.max(15, Math.min(85, variation));
          }).reverse(),
        },
        memory: {
          used: memoryBase + Math.random() * 2,
          total: 16,
          percent: ((memoryBase + Math.random() * 2) / 16) * 100,
        },
        storage: {
          used: 45.2 + Math.random() * 5,
          total: 100,
          percent: 45.2 + Math.random() * 5,
        },
        network: {
          incoming: 120 + networkVariation * 10 + Math.random() * 20,
          outgoing: 85 + networkVariation * 8 + Math.random() * 15,
          latency: 18 + Math.random() * 12,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResourceMetrics();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchResourceMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D9B799]"></div>
        <span className="ml-2 text-[#D9B799]">Loading resource metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-6 bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-yellow-200">Using demo data - {error}</span>
          <button
            onClick={fetchResourceMetrics}
            className="text-[#D9B799] hover:text-white flex items-center"
          >
            <FiRefreshCw className="mr-1" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Overview */}
        <div className="bg-[#4A3222] rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Resource Allocation</h3>
            <button
              onClick={fetchResourceMetrics}
              className="text-[#D9B799] hover:text-white flex items-center text-sm"
            >
              <FiRefreshCw className="mr-1" /> Refresh
            </button>
          </div>
          <div className="space-y-4">
            {/* CPU Usage */}
            <div>
              <div className="flex justify-between mb-2">
                <span>CPU Usage</span>
                <span>{metrics.cpu.current}%</span>
              </div>
              <div className="h-2 bg-[#2D1F14] rounded">
                <div
                  className={`h-2 rounded ${
                    metrics.cpu.current > 80
                      ? "bg-red-500"
                      : metrics.cpu.current > 60
                      ? "bg-yellow-500"
                      : "bg-[#D9B799]"
                  }`}
                  style={{ width: `${metrics.cpu.current}%` }}
                />
              </div>
            </div>

            {/* Memory Usage */}
            <div>
              <div className="flex justify-between mb-2">
                <span>Memory Usage</span>
                <span>
                  {metrics.memory.percent?.toFixed(1) ||
                    (
                      (metrics.memory.used / metrics.memory.total) *
                      100
                    ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="h-2 bg-[#2D1F14] rounded">
                <div
                  className={`h-2 rounded ${
                    (metrics.memory.percent ||
                      (metrics.memory.used / metrics.memory.total) * 100) > 80
                      ? "bg-red-500"
                      : (metrics.memory.percent ||
                          (metrics.memory.used / metrics.memory.total) * 100) >
                        60
                      ? "bg-yellow-500"
                      : "bg-[#D9B799]"
                  }`}
                  style={{
                    width: `${
                      metrics.memory.percent ||
                      (metrics.memory.used / metrics.memory.total) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="text-xs text-[#8C6A58] mt-1">
                {metrics.memory.used} GB / {metrics.memory.total} GB
              </div>
            </div>

            {/* Storage Usage */}
            <div>
              <div className="flex justify-between mb-2">
                <span>Storage Usage</span>
                <span>
                  {metrics.storage.percent?.toFixed(1) ||
                    (
                      (metrics.storage.used / metrics.storage.total) *
                      100
                    ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="h-2 bg-[#2D1F14] rounded">
                <div
                  className={`h-2 rounded ${
                    (metrics.storage.percent ||
                      (metrics.storage.used / metrics.storage.total) * 100) > 80
                      ? "bg-red-500"
                      : (metrics.storage.percent ||
                          (metrics.storage.used / metrics.storage.total) *
                            100) > 60
                      ? "bg-yellow-500"
                      : "bg-[#D9B799]"
                  }`}
                  style={{
                    width: `${
                      metrics.storage.percent ||
                      (metrics.storage.used / metrics.storage.total) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="text-xs text-[#8C6A58] mt-1">
                {metrics.storage.used} GB / {metrics.storage.total} GB
              </div>
            </div>
          </div>
        </div>

        {/* Network Metrics */}
        <div className="bg-[#4A3222] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Network Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <FiDownload className="text-[#D9B799]" />
                <span className="text-sm">Incoming</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.network.incoming} Mbps
              </div>
            </div>
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <FiUpload className="text-[#D9B799]" />
                <span className="text-sm">Outgoing</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.network.outgoing} Mbps
              </div>
            </div>
          </div>
        </div>

        {/* Storage Distribution */}
        <div className="bg-[#4A3222] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Storage Distribution</h3>
          <div className="space-y-4">
            {Object.entries({
              databases: 120,
              files: 80,
              backups: 56,
              logs: 15,
              cache: 25,
            }).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <span className="capitalize">{key}</span>
                  <span>{value} GB</span>
                </div>
                <div className="h-2 bg-[#2D1F14] rounded">
                  <div
                    className="h-2 bg-[#D9B799] rounded"
                    style={{
                      width: `${(value / metrics.storage.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-[#4A3222] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <div className="text-sm text-[#D9B799] mb-1">Latency</div>
              <div className="text-2xl font-bold">
                {metrics.network.latency} ms
              </div>
            </div>
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <div className="text-sm text-[#D9B799] mb-1">
                Memory Available
              </div>
              <div className="text-2xl font-bold">
                {(metrics.memory.total - metrics.memory.used).toFixed(1)} GB
              </div>
            </div>
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <div className="text-sm text-[#D9B799] mb-1">
                Storage Available
              </div>
              <div className="text-2xl font-bold">
                {metrics.storage.total - metrics.storage.used} GB
              </div>
            </div>
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <div className="text-sm text-[#D9B799] mb-1">System Load</div>
              <div className="text-2xl font-bold">
                {metrics.cpu.current < 50
                  ? "Low"
                  : metrics.cpu.current < 80
                  ? "Medium"
                  : "High"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
