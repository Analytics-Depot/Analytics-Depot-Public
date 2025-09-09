import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { FiCalendar, FiDollarSign, FiUsers, FiClock } from "react-icons/fi";
import { apiClient } from "../../lib/api";

export default function ExpertDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {}, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
        <div className="text-[#F0E6DA]">Loading...</div>
      </div>
    );
  }

  if (!user || !dashboardData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A140D] to-[#2D1F14]">
      {/* Navigation */}
      <nav className="bg-[#1A140D]/80 backdrop-blur-sm border-b border-[#3D2F24] py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold text-[#F0E6DA] hover:text-[#D9B799]"
          >
            Analytics Depot - Expert Portal
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[#D9B799]">
              Expert: {user.name || user.username}
            </span>
            <Link
              href="/chat"
              className="px-4 py-2 bg-[#D9B799] text-[#2D1F14] rounded-md hover:bg-[#C0A080]"
            >
              Main Chat
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#F0E6DA] mb-2">
            Expert Dashboard
          </h1>
          <p className="text-[#8C6A58]">
            Manage your consultation sessions and client interactions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-6 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-3 mb-2">
              <FiCalendar className="h-6 w-6 text-[#D9B799]" />
              <h3 className="text-[#F0E6DA] font-medium">Total Sessions</h3>
            </div>
            <p className="text-2xl font-bold text-[#D9B799]">
              {dashboardData.expert_info.total_sessions}
            </p>
            <p className="text-sm text-[#8C6A58]">All time</p>
          </div>

          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-6 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-3 mb-2">
              <FiClock className="h-6 w-6 text-[#D9B799]" />
              <h3 className="text-[#F0E6DA] font-medium">This Month</h3>
            </div>
            <p className="text-2xl font-bold text-[#D9B799]">
              {dashboardData.expert_info.this_month_sessions}
            </p>
            <p className="text-sm text-[#8C6A58]">Sessions completed</p>
          </div>

          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-6 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-3 mb-2">
              <FiDollarSign className="h-6 w-6 text-[#D9B799]" />
              <h3 className="text-[#F0E6DA] font-medium">Earnings</h3>
            </div>
            <p className="text-2xl font-bold text-[#D9B799]">
              ${dashboardData.earnings.this_month}
            </p>
            <p className="text-sm text-[#8C6A58]">This month</p>
          </div>

          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-6 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-3 mb-2">
              <FiUsers className="h-6 w-6 text-[#D9B799]" />
              <h3 className="text-[#F0E6DA] font-medium">Rating</h3>
            </div>
            <p className="text-2xl font-bold text-[#D9B799]">
              {dashboardData.expert_info.rating}
            </p>
            <p className="text-sm text-[#8C6A58]">Average rating</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Sessions */}
          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-6 rounded-lg border border-[#3D2F24]">
            <h2 className="text-xl font-semibold text-[#F0E6DA] mb-4">
              Upcoming Sessions
            </h2>
            {dashboardData.upcoming_sessions.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.upcoming_sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-[#1A140D] rounded-lg border border-[#3D2F24]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-[#D9B799] font-medium">
                        {session.client_name}
                      </h3>
                      <span className="text-sm text-[#8C6A58]">
                        {session.duration_hours}h session
                      </span>
                    </div>
                    <p className="text-[#F0E6DA] text-sm mb-1">
                      {session.session_type}
                    </p>
                    <p className="text-[#8C6A58] text-sm">
                      {new Date(session.scheduled_at).toLocaleString()}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${
                          session.status === "confirmed"
                            ? "bg-green-900/50 text-green-200"
                            : "bg-yellow-900/50 text-yellow-200"
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#8C6A58]">No upcoming sessions scheduled.</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#2D1F14]/90 backdrop-blur-md p-6 rounded-lg border border-[#3D2F24]">
            <h2 className="text-xl font-semibold text-[#F0E6DA] mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link
                href="/expert/sessions"
                className="block w-full p-3 bg-[#D9B799] text-[#2D1F14] rounded-md hover:bg-[#C0A080] transition-colors text-center font-medium"
              >
                View All Sessions
              </Link>
              <Link
                href="/expert/availability"
                className="block w-full p-3 bg-[#1A140D] text-[#F0E6DA] border border-[#3D2F24] rounded-md hover:border-[#D9B799] transition-colors text-center font-medium"
              >
                Manage Availability
              </Link>
              <Link
                href="/expert/clients"
                className="block w-full p-3 bg-[#1A140D] text-[#F0E6DA] border border-[#3D2F24] rounded-md hover:border-[#D9B799] transition-colors text-center font-medium"
              >
                View Clients
              </Link>
              <Link
                href="/expert/earnings"
                className="block w-full p-3 bg-[#1A140D] text-[#F0E6DA] border border-[#3D2F24] rounded-md hover:border-[#D9B799] transition-colors text-center font-medium"
              >
                Earnings Report
              </Link>
            </div>
          </div>
        </div>

        {/* Availability Status */}
        <div className="mt-8 bg-[#2D1F14]/90 backdrop-blur-md p-6 rounded-lg border border-[#3D2F24]">
          <h2 className="text-xl font-semibold text-[#F0E6DA] mb-4">
            Current Status
          </h2>
          <div className="flex items-center gap-4">
            <span
              className={`inline-block px-3 py-1 rounded ${
                dashboardData.availability.status === "available"
                  ? "bg-green-900/50 text-green-200"
                  : "bg-red-900/50 text-red-200"
              }`}
            >
              {dashboardData.availability.status === "available"
                ? "Available"
                : "Unavailable"}
            </span>
            <span className="text-[#8C6A58]">
              Next available:{" "}
              {new Date(
                dashboardData.availability.next_available
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
