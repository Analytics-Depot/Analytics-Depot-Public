import { useState, useEffect } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";

import { apiClient } from "../../lib/api";

export default function APIMetrics() {
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    errorRate: 0,
    endpoints: [],
    hourlyStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAPIMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("adminToken");
      const headers = { Authorization: `Bearer ${token}` };

      const response = await apiClient.admin.api.metrics();

      if (response.data) {
        setMetrics(response.data);
      }
    } catch (err) {
      console.error("Error fetching API metrics:", err);
      setError("Failed to load API metrics - Using demo data");

      // Enhanced fallback data that appears more realistic
      const now = new Date();
      const baseRequests = 15000 + now.getHours() * 500;

      setMetrics({
        totalRequests: baseRequests,
        successRate: 99.2 + (Math.random() * 0.6 - 0.3),
        avgResponseTime: 220 + Math.floor(Math.random() * 60),
        errorRate: 0.8 + (Math.random() * 0.4 - 0.2),
        endpoints: [
          {
            path: "/api/auth",
            requests: Math.floor(baseRequests * 0.18),
            avgTime: 180 + Math.floor(Math.random() * 40),
          },
          {
            path: "/api/chats",
            requests: Math.floor(baseRequests * 0.32),
            avgTime: 245 + Math.floor(Math.random() * 50),
          },
          {
            path: "/api/users",
            requests: Math.floor(baseRequests * 0.22),
            avgTime: 165 + Math.floor(Math.random() * 30),
          },
          {
            path: "/api/files",
            requests: Math.floor(baseRequests * 0.16),
            avgTime: 305 + Math.floor(Math.random() * 80),
          },
          {
            path: "/api/admin",
            requests: Math.floor(baseRequests * 0.06),
            avgTime: 255 + Math.floor(Math.random() * 60),
          },
          {
            path: "/api/terminal",
            requests: Math.floor(baseRequests * 0.06),
            avgTime: 290 + Math.floor(Math.random() * 70),
          },
        ],
        hourlyStats: Array.from({ length: 12 }, (_, i) => {
          const hour = (now.getHours() - i) % 24;
          const isBusinessHour = hour >= 9 && hour <= 17;
          const multiplier = isBusinessHour ? 1.4 : 0.7;
          return {
            hour: `${hour.toString().padStart(2, "0")}:00`,
            requests: Math.floor((baseRequests / 24) * multiplier),
            errors: Math.floor(Math.random() * 5),
          };
        }).reverse(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAPIMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D9B799]"></div>
        <span className="ml-2 text-[#D9B799]">Loading API metrics...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-yellow-200">Using demo data - {error}</span>
          <button
            onClick={fetchAPIMetrics}
            className="text-[#D9B799] hover:text-white flex items-center"
          >
            <FiRefreshCw className="mr-1" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#4A3222] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <FiActivity className="text-blue-500" size={24} />
            <h3 className="text-[#D9B799] text-sm">Total Requests</h3>
          </div>
          <p className="text-2xl font-bold">
            {metrics.totalRequests.toLocaleString()}
          </p>
          <p className="text-xs text-[#8C6A58] mt-1">Last 24 hours</p>
        </div>

        <div className="bg-[#4A3222] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <FiActivity className="text-green-500" size={24} />
            <h3 className="text-[#D9B799] text-sm">Success Rate</h3>
          </div>
          <p className="text-2xl font-bold">{metrics.successRate}%</p>
          <p className="text-xs text-green-400 mt-1">↑ 0.1% from yesterday</p>
        </div>

        <div className="bg-[#4A3222] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <FiClock className="text-yellow-500" size={24} />
            <h3 className="text-[#D9B799] text-sm">Avg Response Time</h3>
          </div>
          <p className="text-2xl font-bold">{metrics.avgResponseTime}ms</p>
          <p className="text-xs text-yellow-400 mt-1">↓ 15ms from yesterday</p>
        </div>

        <div className="bg-[#4A3222] p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <FiAlertTriangle className="text-red-500" size={24} />
            <h3 className="text-[#D9B799] text-sm">Error Rate</h3>
          </div>
          <p className="text-2xl font-bold">{metrics.errorRate}%</p>
          <p className="text-xs text-red-400 mt-1">Target: &lt; 1%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#4A3222] rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Endpoint Performance</h3>
            <button
              onClick={fetchAPIMetrics}
              className="text-[#D9B799] hover:text-white flex items-center text-sm"
            >
              <FiRefreshCw className="mr-1" /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-[#6A4E3D]">
                  <th className="pb-2">Endpoint</th>
                  <th className="pb-2">Requests</th>
                  <th className="pb-2">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {metrics.endpoints.map((endpoint, index) => (
                  <tr key={index} className="border-b border-[#6A4E3D]">
                    <td className="py-2 font-mono text-sm">{endpoint.path}</td>
                    <td className="py-2">
                      {endpoint.requests.toLocaleString()}
                    </td>
                    <td className="py-2">
                      <span
                        className={`${
                          endpoint.avgTime < 200
                            ? "text-green-400"
                            : endpoint.avgTime < 500
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {endpoint.avgTime}ms
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#4A3222] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Hourly Request Volume</h3>
          <div className="space-y-3">
            {metrics.hourlyStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-[#8C6A58]">{stat.hour}</span>
                <div className="flex items-center space-x-4">
                  <div className="w-32 bg-[#2D1F14] rounded-full h-2">
                    <div
                      className="bg-[#D9B799] h-2 rounded-full"
                      style={{
                        width: `${
                          (stat.requests /
                            Math.max(
                              ...metrics.hourlyStats.map((s) => s.requests)
                            )) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm w-16 text-right">
                    {stat.requests}
                  </span>
                  {stat.errors > 0 && (
                    <span className="text-xs text-red-400">
                      {stat.errors} errors
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
