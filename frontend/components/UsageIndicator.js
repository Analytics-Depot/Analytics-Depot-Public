import { useState, useEffect } from "react";
import Link from "next/link";
import { FiActivity, FiAlertCircle } from "react-icons/fi";
import { apiClient } from "../lib/api";

const UsageIndicator = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsageStats = async () => {
    try {
      const response = await apiClient.usage.stats();

      if (response.status === 200) {
        const data = response.data;
        setUsage(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch usage stats:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUsageStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800/50 p-3 rounded-lg">
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-600 rounded"></div>
          <div className="w-20 h-3 bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const isUnlimited = usage.limit === -1;
  const isNearLimit = !isUnlimited && usage.remaining <= 5;
  const isAtLimit = !isUnlimited && usage.remaining <= 0;

  const getProgressColor = () => {
    if (isAtLimit) return "bg-red-500";
    if (isNearLimit) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getProgressWidth = () => {
    if (isUnlimited) return "100%";
    return `${Math.min((usage.used / usage.limit) * 100, 100)}%`;
  };

  return (
    <div
      className={`p-3 rounded-lg border ${
        isAtLimit
          ? "bg-red-900/20 border-red-500/50"
          : isNearLimit
          ? "bg-yellow-900/20 border-yellow-500/50"
          : "bg-gray-800/50 border-gray-600/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isAtLimit ? (
          <FiAlertCircle className="h-4 w-4 text-red-400" />
        ) : (
          <FiActivity className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-200">
          {isUnlimited ? "Unlimited Queries" : "Monthly Queries"}
        </span>
      </div>

      {!isUnlimited && (
        <>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: getProgressWidth() }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>{usage.used} used</span>
            <span>{usage.remaining} remaining</span>
          </div>

          {isAtLimit && (
            <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-300">
              <p>
                Query limit reached.{" "}
                <Link href="/pricing" className="text-red-200 underline">
                  Upgrade plan
                </Link>{" "}
                for more queries.
              </p>
            </div>
          )}

          {isNearLimit && !isAtLimit && (
            <div className="mt-2 p-2 bg-yellow-900/30 rounded text-xs text-yellow-300">
              <p>
                Almost at your monthly limit. Consider{" "}
                <Link href="/pricing" className="text-yellow-200 underline">
                  upgrading
                </Link>
                .
              </p>
            </div>
          )}
        </>
      )}

      {isUnlimited && (
        <p className="text-xs text-green-400">
          ✓ Unlimited queries with your current plan
        </p>
      )}
    </div>
  );
};

export default UsageIndicator;
