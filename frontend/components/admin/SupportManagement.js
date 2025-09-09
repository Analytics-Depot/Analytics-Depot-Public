import { useState, useEffect } from "react";
import {
  FiMessageSquare,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiUser,
  FiMail,
  FiCalendar,
} from "react-icons/fi";
import { apiClient } from "../../lib/api";

export default function SupportManagement() {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [filter, setFilter] = useState({ status: "all", priority: "all" });

  const fetchSupportData = async () => {
    try {
      // Fetch support stats
      const statsResponse = await apiClient.support.stats();
      if (statsResponse.status === 200) {
        const statsData = statsResponse.data;
        setStats(statsData);
      }

      // Fetch support messages
      const params = {};
      if (filter.status !== "all") params.status = filter.status;
      if (filter.priority !== "all") params.priority = filter.priority;

      const messagesResponse = await apiClient.support.messages(params);
      if (messagesResponse.status === 200) {
        const messagesData = messagesResponse.data;
        setMessages(messagesData.messages);
      }
    } catch (error) {
      console.error("Failed to fetch support data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportData();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusUpdate = async (
    messageId,
    status,
    adminResponse = null
  ) => {
    try {
      const updateData = { status };
      if (adminResponse) {
        updateData.admin_response = adminResponse;
      }

      const response = await apiClient.support.updateMessage(
        messageId,
        updateData
      );

      if (response.status === 200) {
        fetchSupportData();
        setSelectedMessage(null);
        setResponseText("");
      }
    } catch (error) {
      console.error("Failed to update message:", error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-400 bg-red-900/20";
      case "normal":
        return "text-yellow-400 bg-yellow-900/20";
      case "low":
        return "text-green-400 bg-green-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "text-red-400 bg-red-900/20";
      case "in_progress":
        return "text-yellow-400 bg-yellow-900/20";
      case "resolved":
        return "text-green-400 bg-green-900/20";
      case "closed":
        return "text-gray-400 bg-gray-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D9B799]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Support Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#2D1F14] p-4 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-2 mb-2">
              <FiMessageSquare className="h-5 w-5 text-[#D9B799]" />
              <h3 className="text-[#F0E6DA] font-medium">Total Messages</h3>
            </div>
            <p className="text-2xl font-bold text-[#D9B799]">
              {stats.total_messages}
            </p>
          </div>

          <div className="bg-[#2D1F14] p-4 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-2 mb-2">
              <FiClock className="h-5 w-5 text-yellow-400" />
              <h3 className="text-[#F0E6DA] font-medium">Open Messages</h3>
            </div>
            <p className="text-2xl font-bold text-yellow-400">
              {stats.open_messages}
            </p>
          </div>

          <div className="bg-[#2D1F14] p-4 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-2 mb-2">
              <FiAlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="text-[#F0E6DA] font-medium">High Priority</h3>
            </div>
            <p className="text-2xl font-bold text-red-400">
              {stats.high_priority_open}
            </p>
          </div>

          <div className="bg-[#2D1F14] p-4 rounded-lg border border-[#3D2F24]">
            <div className="flex items-center gap-2 mb-2">
              <FiCheckCircle className="h-5 w-5 text-green-400" />
              <h3 className="text-[#F0E6DA] font-medium">Resolved Today</h3>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {stats.resolved_today}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={filter.status}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, status: e.target.value }))
          }
          className="bg-[#1A140D] text-[#F0E6DA] px-3 py-2 rounded border border-[#3D2F24]"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filter.priority}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, priority: e.target.value }))
          }
          className="bg-[#1A140D] text-[#F0E6DA] px-3 py-2 rounded border border-[#3D2F24]"
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Messages List */}
      <div className="bg-[#2D1F14] rounded-lg border border-[#3D2F24] overflow-hidden">
        <div className="p-4 border-b border-[#3D2F24]">
          <h3 className="text-lg font-semibold text-[#F0E6DA]">
            Support Messages
          </h3>
        </div>

        <div className="divide-y divide-[#3D2F24]">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-[#8C6A58]">
              No messages found matching your filters.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="p-4 hover:bg-[#1A140D]/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <FiUser className="h-4 w-4 text-[#8C6A58]" />
                    <span className="text-[#F0E6DA] font-medium">
                      {message.name}
                    </span>
                    <span className="text-[#8C6A58] text-sm">
                      {message.email}
                    </span>
                    {message.user_info?.subscription_plan === "pro" && (
                      <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs">
                        Pro Subscriber
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${getPriorityColor(
                        message.priority
                      )}`}
                    >
                      {message.priority}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusColor(
                        message.status
                      )}`}
                    >
                      {message.status}
                    </span>
                  </div>
                </div>

                {message.subject && (
                  <h4 className="text-[#D9B799] font-medium mb-1">
                    {message.subject}
                  </h4>
                )}

                <p className="text-[#8C6A58] text-sm mb-2 line-clamp-2">
                  {message.message}
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#8C6A58] flex items-center gap-1">
                    <FiCalendar className="h-3 w-3" />
                    {new Date(message.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex gap-2">
                    {message.status === "open" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(message.id, "in_progress")
                        }
                        className="px-3 py-1 bg-yellow-600 text-yellow-100 rounded text-xs hover:bg-yellow-700"
                      >
                        Start Working
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedMessage(message)}
                      className="px-3 py-1 bg-[#D9B799] text-[#2D1F14] rounded text-xs hover:bg-[#C0A080]"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2D1F14] rounded-lg border border-[#3D2F24] max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-[#3D2F24]">
              <h3 className="text-lg font-semibold text-[#F0E6DA]">
                Support Message Details
              </h3>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#8C6A58] text-sm">Name</label>
                  <p className="text-[#F0E6DA]">{selectedMessage.name}</p>
                </div>
                <div>
                  <label className="text-[#8C6A58] text-sm">Email</label>
                  <p className="text-[#F0E6DA]">{selectedMessage.email}</p>
                </div>
              </div>

              {selectedMessage.subject && (
                <div>
                  <label className="text-[#8C6A58] text-sm">Subject</label>
                  <p className="text-[#F0E6DA]">{selectedMessage.subject}</p>
                </div>
              )}

              <div>
                <label className="text-[#8C6A58] text-sm">Message</label>
                <p className="text-[#F0E6DA] bg-[#1A140D] p-3 rounded">
                  {selectedMessage.message}
                </p>
              </div>

              {selectedMessage.admin_response && (
                <div>
                  <label className="text-[#8C6A58] text-sm">
                    Admin Response
                  </label>
                  <p className="text-[#F0E6DA] bg-[#1A140D] p-3 rounded">
                    {selectedMessage.admin_response}
                  </p>
                </div>
              )}

              <div>
                <label className="text-[#8C6A58] text-sm">Your Response</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full bg-[#1A140D] text-[#F0E6DA] px-3 py-2 rounded border border-[#3D2F24] resize-none"
                  rows="4"
                  placeholder="Type your response here..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#3D2F24] flex justify-between">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-[#1A140D] text-[#8C6A58] rounded border border-[#3D2F24] hover:bg-[#3D2F24]"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleStatusUpdate(
                      selectedMessage.id,
                      "resolved",
                      responseText
                    )
                  }
                  disabled={!responseText.trim()}
                  className="px-4 py-2 bg-green-600 text-green-100 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Resolve & Send Response
                </button>

                <button
                  onClick={() =>
                    handleStatusUpdate(selectedMessage.id, "closed")
                  }
                  className="px-4 py-2 bg-gray-600 text-gray-100 rounded hover:bg-gray-700"
                >
                  Close Without Response
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
