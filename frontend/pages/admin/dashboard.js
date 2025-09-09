import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import customAxios from "../../lib/api";

import {
  FiUsers,
  FiActivity,
  FiLogOut,
  FiUser,
  FiSearch,
  FiAlertCircle,
  FiRefreshCw,
  FiTrendingUp,
  FiShield,
  FiEye,
  FiHome,
  FiMenu,
  FiMessageSquare,
} from "react-icons/fi";
import supabase from "../../lib/supabase";

function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Check authentication using consistent pattern
      const token = localStorage.getItem("supabase_token");
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (!token || !isLoggedIn) {
        router.push("/login");
        return;
      }

      // Fetch dashboard data
      const dashboardResponse = await customAxios.get("/admin/dashboard");
      setDashboardData(dashboardResponse.data);

      // Set users from dashboard response
      setUsers(dashboardResponse.data.recent_users || []);

      // Set support messages from dashboard response
      setSupportMessages(dashboardResponse.data.support_messages || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("isLoggedIn");
        router.push("/login?admin=required");
      } else {
        setError(
          "Failed to load dashboard data. Please check your connection."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("supabase_token");
    localStorage.removeItem("isLoggedIn");
    router.push("/");
  };

  const handleRetry = () => {
    fetchDashboardData();
  };

  // Enhanced navigation items with better icons and descriptions
  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: <FiHome className="w-5 h-5" />,
      description: "Dashboard overview and key metrics",
    },
    {
      id: "users",
      label: "Users",
      icon: <FiUsers className="w-5 h-5" />,
      description: "Manage user accounts and subscriptions",
    },
    {
      id: "support",
      label: "Support Messages",
      icon: <FiMessageSquare className="w-5 h-5" />,
      description: "Manage support tickets and messages",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <FiActivity className="w-5 h-5" />,
      description: "View platform analytics and metrics",
    },
  ];

  // Enhanced stat cards with animations
  const StatCard = ({ title, value, change, icon, color, trend }) => (
    <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:from-white/20 hover:to-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div
            className={`p-2 lg:p-3 rounded-lg lg:rounded-xl bg-gradient-to-br ${color} shadow-lg`}
          >
            {icon}
          </div>
          {trend && (
            <div
              className={`flex items-center text-xs lg:text-sm ${
                trend === "up" ? "text-green-400" : "text-red-400"
              }`}
            >
              <FiTrendingUp
                className={`w-3 h-3 lg:w-4 lg:h-4 mr-1 ${
                  trend === "down" ? "rotate-180" : ""
                }`}
              />
              <span className="hidden sm:inline">{change}</span>
            </div>
          )}
        </div>
        <h3 className="text-gray-300 text-xs lg:text-sm font-medium mb-1">
          {title}
        </h3>
        <p className="text-white text-xl lg:text-2xl font-bold">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D1F14] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#D9B799] mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-t-4 border-b-4 border-[#8B6F3F] mx-auto animate-spin animate-reverse"></div>
          </div>
          <div className="text-white text-xl font-medium">
            Loading Analytics Depot Admin
          </div>
          <div className="text-gray-400 text-sm mt-2">
            Initializing dashboard components...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2D1F14]">
      {/* Enhanced Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-[#D9B799]/20 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 max-w-full">
          <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <FiMenu className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0">
              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-[#D9B799] to-[#8B6F3F] rounded-lg flex items-center justify-center flex-shrink-0">
                <FiShield className="w-3 h-3 lg:w-5 lg:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-lg lg:text-xl font-bold truncate">
                  Analytics Depot
                </h1>
                <p className="text-gray-400 text-xs hidden lg:block">
                  Admin Dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Search - Hidden on mobile */}
            <div className="hidden lg:flex relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 bg-[#1A140D]/50 border border-[#D9B799]/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D9B799] focus:border-transparent w-48 xl:w-64"
              />
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg bg-[#1A140D]/50 hover:bg-[#1A140D]/70 transition-colors"
              >
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-[#D9B799] to-[#8B6F3F] rounded-full flex items-center justify-center">
                  <FiUser className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                </div>
                <span className="text-white text-sm font-medium hidden md:block">
                  Admin
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1A140D]/95 backdrop-blur-md border border-[#D9B799]/20 rounded-xl shadow-2xl z-50">
                  <div className="p-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Enhanced Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 transition-all duration-300 ${
            sidebarCollapsed ? "w-16 lg:w-16" : "w-64 lg:w-64"
          } ${
            sidebarCollapsed && "lg:block hidden"
          } bg-[#1A140D]/50 backdrop-blur-md border-r border-[#D9B799]/20`}
        >
          <nav className="p-2 lg:p-4 space-y-2 pt-4">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  // Close sidebar on mobile after selection
                  if (window.innerWidth < 1024) {
                    setSidebarCollapsed(true);
                  }
                }}
                className={`w-full flex items-center space-x-3 px-2 lg:px-4 py-3 rounded-xl transition-all duration-200 group ${
                  activeTab === item.id
                    ? "bg-gradient-to-r from-[#D9B799]/20 to-[#8B6F3F]/20 text-white border border-[#D9B799]/30 shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-[#D9B799]/10"
                }`}
              >
                <div
                  className={`flex-shrink-0 ${
                    activeTab === item.id
                      ? "text-[#D9B799]"
                      : "text-gray-400 group-hover:text-white"
                  }`}
                >
                  {item.icon}
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left overflow-hidden">
                    <div className="font-medium text-sm lg:text-base">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-400 hidden lg:block">
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Overlay */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Main Content */}
        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? "lg:ml-0" : "lg:ml-0"
          }`}
        >
          <div className="p-4 lg:p-6 max-w-full">
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <FiAlertCircle className="text-yellow-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-yellow-200 text-sm">{error}</p>
                    <button
                      onClick={handleRetry}
                      className="mt-2 flex items-center text-[#D9B799] text-sm hover:text-white transition-colors"
                    >
                      <FiRefreshCw className="mr-1" /> Retry Connection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white">
                      Dashboard Overview
                    </h2>
                    <p className="text-gray-400 mt-1">
                      Monitor your Analytics Depot platform
                    </p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#D9B799] to-[#8B6F3F] text-white rounded-xl hover:shadow-lg transition-all duration-200"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                  <StatCard
                    title="Total Users"
                    value={dashboardData?.stats?.total_users || "0"}
                    change="+12%"
                    icon={
                      <FiUsers className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-[#D9B799] to-[#8B6F3F]"
                    trend="up"
                  />
                  <StatCard
                    title="Free Users"
                    value={dashboardData?.stats?.free_users || "0"}
                    change="+8%"
                    icon={
                      <FiEye className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-green-500 to-teal-500"
                    trend="up"
                  />
                  <StatCard
                    title="Pro Users"
                    value={dashboardData?.stats?.pro_users || "0"}
                    change="99.9%"
                    icon={
                      <FiShield className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-emerald-500 to-green-500"
                    trend="up"
                  />
                  <StatCard
                    title="Basic Users"
                    value={dashboardData?.stats?.basic_users || "0"}
                    change="+15%"
                    icon={
                      <FiActivity className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-[#8B6F3F] to-[#6B5530]"
                    trend="up"
                  />
                </div>

                {/* Recent Support Messages */}
                <div className="bg-gradient-to-br from-[#1A140D]/30 to-[#2D1F14]/30 backdrop-blur-sm border border-[#D9B799]/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">
                      Recent Support Messages
                    </h3>
                    <button
                      onClick={() => setActiveTab("support")}
                      className="text-[#D9B799] hover:text-white text-sm"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(supportMessages || [])
                      .slice(0, 5)
                      .map((message, index) => (
                        <div
                          key={message.id || index}
                          className="flex items-center justify-between p-3 bg-[#1A140D]/20 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="text-white font-medium">
                              {message.name}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {message.subject || "No subject"}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                message.priority === "high"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              {message.priority}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                message.status === "open"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-green-500/20 text-green-400"
                              }`}
                            >
                              {message.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    {(!supportMessages || supportMessages.length === 0) && (
                      <div className="text-gray-400 text-center py-4">
                        No recent support messages
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Users */}
                <div className="bg-gradient-to-br from-[#1A140D]/30 to-[#2D1F14]/30 backdrop-blur-sm border border-[#D9B799]/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Recent Users
                  </h3>
                  <div className="space-y-3">
                    {(users || []).slice(0, 5).map((user, index) => (
                      <div
                        key={user.id || index}
                        className="flex items-center justify-between p-3 bg-[#1A140D]/20 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#D9B799] to-[#8B6F3F] rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.full_name?.charAt(0) ||
                                user.email?.charAt(0) ||
                                "U"}
                            </span>
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {user.full_name || user.email}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              user.subscription_plan === "pro"
                                ? "bg-purple-500/20 text-purple-400"
                                : user.subscription_plan === "basic"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {user.subscription_plan || "free"}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              user.role === "admin"
                                ? "bg-red-500/20 text-red-400"
                                : user.role === "expert"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {user.role || "user"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!users || users.length === 0) && (
                      <div className="text-gray-400 text-center py-4">
                        No recent users
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-[#1A140D]/30 to-[#2D1F14]/30 backdrop-blur-sm border border-[#D9B799]/20 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                    <button
                      onClick={() => setActiveTab("users")}
                      className="flex items-center space-x-3 p-3 lg:p-4 bg-[#1A140D]/30 hover:bg-[#D9B799]/10 rounded-lg lg:rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <FiUsers className="w-6 h-6 lg:w-8 lg:h-8 text-[#D9B799] flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="text-white font-medium text-sm lg:text-base">
                          User Management
                        </div>
                        <div className="text-gray-400 text-xs lg:text-sm truncate">
                          View and manage user accounts
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("support")}
                      className="flex items-center space-x-3 p-3 lg:p-4 bg-[#1A140D]/30 hover:bg-[#D9B799]/10 rounded-lg lg:rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <FiMessageSquare className="w-6 h-6 lg:w-8 lg:h-8 text-[#D9B799] flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="text-white font-medium text-sm lg:text-base">
                          Support Messages
                        </div>
                        <div className="text-gray-400 text-xs lg:text-sm truncate">
                          View and manage support tickets
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("analytics")}
                      className="flex items-center space-x-3 p-3 lg:p-4 bg-[#1A140D]/30 hover:bg-[#D9B799]/10 rounded-lg lg:rounded-xl transition-all duration-200 hover:scale-105 sm:col-span-2 lg:col-span-1"
                    >
                      <FiActivity className="w-6 h-6 lg:w-8 lg:h-8 text-green-400 flex-shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="text-white font-medium text-sm lg:text-base">
                          View Analytics
                        </div>
                        <div className="text-gray-400 text-xs lg:text-sm truncate">
                          Platform metrics and insights
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Support Messages Tab */}
            {activeTab === "support" && (
              <div className="space-y-6">
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Support Messages
                </h2>
                <div className="bg-gradient-to-br from-[#1A140D]/30 to-[#2D1F14]/30 backdrop-blur-sm border border-[#D9B799]/20 rounded-xl lg:rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-[#1A140D]/50">
                        <tr>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Name
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Email
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Subject
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Priority
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Status
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {supportMessages.map((message, index) => (
                          <tr
                            key={message.id || index}
                            className="border-t border-[#D9B799]/10 hover:bg-[#D9B799]/5"
                          >
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-gray-300 text-sm lg:text-base">
                              {message.name}
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-gray-300 text-sm lg:text-base">
                              <div className="max-w-[150px] lg:max-w-none truncate">
                                {message.email}
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-gray-300 text-sm lg:text-base">
                              <div className="max-w-[150px] lg:max-w-none truncate">
                                {message.subject || "No subject"}
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <span
                                className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                                  message.priority === "high"
                                    ? "bg-red-500/20 text-red-400"
                                    : message.priority === "normal"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {message.priority}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <span
                                className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                                  message.status === "open"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : message.status === "resolved"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {message.status}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-gray-300 text-sm lg:text-base">
                              {new Date(
                                message.created_at
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  User Management
                </h2>
                <div className="bg-gradient-to-br from-[#1A140D]/30 to-[#2D1F14]/30 backdrop-blur-sm border border-[#D9B799]/20 rounded-xl lg:rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[768px]">
                      <thead className="bg-[#1A140D]/50">
                        <tr>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            User
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Email
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Role
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Subscription
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Status
                          </th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-white font-medium text-sm lg:text-base">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user, index) => (
                          <tr
                            key={user.id || index}
                            className="border-t border-[#D9B799]/10 hover:bg-[#D9B799]/5"
                          >
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <div className="flex items-center space-x-2 lg:space-x-3">
                                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-[#D9B799] to-[#8B6F3F] rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xs lg:text-sm font-medium">
                                    {user.full_name?.charAt(0) ||
                                      user.email?.charAt(0) ||
                                      "U"}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-white font-medium text-sm lg:text-base truncate">
                                    {user.full_name || "No name"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-gray-300 text-sm lg:text-base">
                              <div className="max-w-[150px] lg:max-w-none truncate">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <span
                                className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                                  user.role === "admin"
                                    ? "bg-red-500/20 text-red-400"
                                    : user.role === "expert"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {user.role || "user"}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <span
                                className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                                  user.subscription_plan === "pro"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : user.subscription_plan === "basic"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-green-500/20 text-green-400"
                                }`}
                              >
                                {user.subscription_plan || "free"}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <span
                                className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${
                                  user.is_active
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-gray-300 text-sm lg:text-base">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Platform Analytics
                </h2>

                {/* Detailed Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  <StatCard
                    title="Total Users"
                    value={dashboardData?.stats?.total_users || "0"}
                    change="+12%"
                    icon={
                      <FiUsers className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-[#D9B799] to-[#8B6F3F]"
                    trend="up"
                  />
                  <StatCard
                    title="Admin Users"
                    value={dashboardData?.stats?.admin_users || "0"}
                    change="+2%"
                    icon={
                      <FiShield className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-red-500 to-pink-500"
                    trend="up"
                  />
                  <StatCard
                    title="Expert Users"
                    value={dashboardData?.stats?.expert_users || "0"}
                    change="+5%"
                    icon={
                      <FiUser className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-yellow-500 to-orange-500"
                    trend="up"
                  />
                  <StatCard
                    title="Free Users"
                    value={dashboardData?.stats?.free_users || "0"}
                    change="+8%"
                    icon={
                      <FiEye className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-green-500 to-teal-500"
                    trend="up"
                  />
                  <StatCard
                    title="Basic Users"
                    value={dashboardData?.stats?.basic_users || "0"}
                    change="+15%"
                    icon={
                      <FiActivity className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-blue-500 to-cyan-500"
                    trend="up"
                  />
                  <StatCard
                    title="Pro Users"
                    value={dashboardData?.stats?.pro_users || "0"}
                    change="+25%"
                    icon={
                      <FiTrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    }
                    color="from-purple-500 to-indigo-500"
                    trend="up"
                  />
                </div>

                {/* Platform Health */}
                <div className="bg-gradient-to-br from-[#1A140D]/30 to-[#2D1F14]/30 backdrop-blur-sm border border-[#D9B799]/20 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                  <h3 className="text-lg lg:text-xl font-bold text-white mb-4">
                    Platform Health
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <h4 className="text-white font-medium mb-3 text-sm lg:text-base">
                        User Distribution
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm lg:text-base">
                            Free Users
                          </span>
                          <span className="text-green-400 font-medium">
                            {dashboardData?.stats?.free_users || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm lg:text-base">
                            Basic Users
                          </span>
                          <span className="text-blue-400 font-medium">
                            {dashboardData?.stats?.basic_users || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm lg:text-base">
                            Pro Users
                          </span>
                          <span className="text-purple-400 font-medium">
                            {dashboardData?.stats?.pro_users || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-3 text-sm lg:text-base">
                        Role Distribution
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm lg:text-base">
                            Regular Users
                          </span>
                          <span className="text-gray-400 font-medium">
                            {(dashboardData?.stats?.total_users || 0) -
                              (dashboardData?.stats?.admin_users || 0) -
                              (dashboardData?.stats?.expert_users || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm lg:text-base">
                            Expert Users
                          </span>
                          <span className="text-yellow-400 font-medium">
                            {dashboardData?.stats?.expert_users || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm lg:text-base">
                            Admin Users
                          </span>
                          <span className="text-red-400 font-medium">
                            {dashboardData?.stats?.admin_users || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Click outside handler */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
