import { useState, useEffect } from "react";
import {
  FiDollarSign,
  FiUsers,
  FiBarChart2,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiCreditCard,
  FiActivity,
  FiAlertTriangle,
  FiSettings,
} from "react-icons/fi";

import { apiClient } from "../../lib/api";

export default function BillingOverview() {
  const [billingData, setBillingData] = useState({
    total_revenue: 0,
    monthly_revenue: 0,
    active_subscriptions: 0,
    total_customers: 0,
    average_transaction_value: 0,
    success_rate: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        const [statsResponse, transactionsResponse] = await Promise.all([
          apiClient.admin.billing.stats(),
          apiClient.admin.billing.transactions({ limit: 10 }),
        ]);

        if (statsResponse.data.maintenance_mode) {
          setError(
            statsResponse.data.message || "Billing system is under maintenance"
          );
          setBillingData({
            total_revenue: 0,
            monthly_revenue: 0,
            active_subscriptions: 0,
            total_customers: 0,
            average_transaction_value: 0,
            success_rate: 0,
            maintenance_mode: true,
          });
          setTransactions([]);
        } else {
          setBillingData(statsResponse.data);
          setTransactions(transactionsResponse.data.transactions || []);
        }
      } catch (apiError) {
        console.error("Billing API error:", apiError);
        setError(
          "Billing system temporarily unavailable - Stripe integration in progress"
        );
        setBillingData({
          total_revenue: 0,
          monthly_revenue: 0,
          active_subscriptions: 0,
          total_customers: 0,
          average_transaction_value: 0,
          success_rate: 0,
          maintenance_mode: true,
        });
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching billing data:", err);
      setError("Failed to load billing data - System under maintenance");
      setBillingData({
        total_revenue: 0,
        monthly_revenue: 0,
        active_subscriptions: 0,
        total_customers: 0,
        average_transaction_value: 0,
        success_rate: 0,
        maintenance_mode: true,
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const MetricCard = ({
    title,
    value,
    change,
    icon,
    color,
    trend,
    subtitle,
  }) => (
    <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:from-white/20 hover:to-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}
          >
            {icon}
          </div>
          {change && (
            <div
              className={`flex items-center text-sm ${
                trend === "up"
                  ? "text-green-400"
                  : trend === "down"
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              {trend === "up" ? (
                <FiTrendingUp className="w-4 h-4 mr-1" />
              ) : trend === "down" ? (
                <FiTrendingDown className="w-4 h-4 mr-1" />
              ) : null}
              {change}
            </div>
          )}
        </div>
        <h3 className="text-gray-300 text-sm font-medium mb-1">{title}</h3>
        <p className="text-white text-2xl font-bold mb-1">{value}</p>
        {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
      </div>
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
            Loading billing data...
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
          <h2 className="text-3xl font-bold text-white">Billing & Revenue</h2>
          <p className="text-gray-400 mt-1">
            Manage payments and subscription analytics
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchBillingData}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-200"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all duration-200">
            <FiSettings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Maintenance Mode Banner */}
      {billingData?.maintenance_mode && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <FiAlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-yellow-200 mb-2">
                Billing Module - Development Mode
              </h3>
              <p className="text-yellow-100 mb-4">
                Payment processing is currently in development. The billing
                system will be fully operational once Stripe integration is
                completed and tested.
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-yellow-200">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Integration in progress</span>
                </div>
                <div className="flex items-center space-x-2 text-yellow-200">
                  <FiCreditCard className="w-4 h-4" />
                  <span className="text-sm">Stripe SDK ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !billingData?.maintenance_mode && (
        <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiAlertTriangle className="text-red-400 w-6 h-6" />
              <span className="text-red-200">{error}</span>
            </div>
            <button
              onClick={fetchBillingData}
              className="text-red-400 hover:text-white flex items-center space-x-2 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Revenue Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${billingData.total_revenue?.toLocaleString() || "0"}`}
          change="+12.5%"
          icon={<FiDollarSign className="w-6 h-6 text-white" />}
          color="from-green-500 to-emerald-500"
          trend="up"
          subtitle={`Monthly: $${
            billingData.monthly_revenue?.toLocaleString() || "0"
          }`}
        />
        <MetricCard
          title="Active Subscriptions"
          value={billingData.active_subscriptions || 0}
          change="+8.2%"
          icon={<FiUsers className="w-6 h-6 text-white" />}
          color="from-blue-500 to-cyan-500"
          trend="up"
          subtitle={`Total Customers: ${billingData.total_customers || 0}`}
        />
        <MetricCard
          title="Success Rate"
          value={`${billingData.success_rate?.toFixed(1) || "0"}%`}
          change="+0.3%"
          icon={<FiActivity className="w-6 h-6 text-white" />}
          color="from-purple-500 to-pink-500"
          trend="up"
          subtitle="Payment processing"
        />
        <MetricCard
          title="Avg. Transaction"
          value={`$${billingData.average_transaction_value?.toFixed(2) || "0"}`}
          change="-2.1%"
          icon={<FiBarChart2 className="w-6 h-6 text-white" />}
          color="from-orange-500 to-red-500"
          trend="down"
          subtitle="Per customer"
        />
      </div>

      {/* Revenue Chart & Recent Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="xl:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Revenue Trend</h3>
              <p className="text-gray-400 text-sm">
                Monthly recurring revenue growth
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm">
                7D
              </button>
              <button className="px-3 py-1 bg-white/10 text-gray-400 rounded-lg text-sm">
                30D
              </button>
              <button className="px-3 py-1 bg-white/10 text-gray-400 rounded-lg text-sm">
                90D
              </button>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <FiBarChart2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                Revenue analytics will be available
              </p>
              <p className="text-gray-500 text-sm">after Stripe integration</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Quick Stats</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Failed Payments</span>
                <span className="text-red-400 font-medium">0.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Refund Rate</span>
                <span className="text-yellow-400 font-medium">1.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Churn Rate</span>
                <span className="text-green-400 font-medium">3.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">LTV/CAC Ratio</span>
                <span className="text-blue-400 font-medium">4.5:1</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">
              Payment Methods
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiCreditCard className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">Credit Cards</span>
                </div>
                <span className="text-white font-medium">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiDollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">Bank Transfer</span>
                </div>
                <span className="text-white font-medium">12%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiUsers className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">PayPal</span>
                </div>
                <span className="text-white font-medium">3%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">
              Recent Transactions
            </h3>
            <p className="text-gray-400 text-sm">Latest payment activities</p>
          </div>
          <button
            onClick={fetchBillingData}
            className="flex items-center space-x-2 text-blue-400 hover:text-white transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-gray-300 font-medium">
                    Transaction
                  </th>
                  <th className="text-left py-3 text-gray-300 font-medium">
                    Customer
                  </th>
                  <th className="text-left py-3 text-gray-300 font-medium">
                    Amount
                  </th>
                  <th className="text-left py-3 text-gray-300 font-medium">
                    Date
                  </th>
                  <th className="text-left py-3 text-gray-300 font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 text-gray-300 font-medium">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4">
                      <div className="font-mono text-sm text-gray-300">
                        {transaction.id.substring(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.description || "Payment"}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {transaction.customer_name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <span className="text-white">
                          {transaction.customer_name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-white font-medium">
                      ${transaction.amount}
                    </td>
                    <td className="py-4 text-gray-300">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.status === "succeeded"
                            ? "bg-green-500/20 text-green-400"
                            : transaction.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <FiCreditCard className="w-4 h-4" />
                        <span className="text-sm">Card</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiCreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-medium text-white mb-2">
              No transactions yet
            </h4>
            <p className="text-gray-400">
              Transactions will appear here once billing is active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
