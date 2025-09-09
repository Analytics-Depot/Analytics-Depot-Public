import React, { useState, useEffect } from "react";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiUserPlus,
  FiFilter,
  FiDownload,
  FiShield,
  FiSlash,
  FiUnlock,
  FiInfo,
} from "react-icons/fi";
import { apiClient } from "../../lib/api";

// NOTE: UserDetailsModal component moved inside UserManagement below

export default function UserManagement() {
  // ----- Start of Moved UserDetailsModal -----
  const UserDetailsModal = ({ user, onClose, onBanUser }) => {
    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[#4A3222] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#F0E6DA]">User Details</h2>
            <button
              onClick={onClose}
              className="text-[#8C6A58] hover:text-[#D9B799]"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <h3 className="text-[#D9B799] font-semibold mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[#8C6A58]">Name</p>
                  <p className="text-white">{user.name}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Email</p>
                  <p className="text-white">{user.email}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Status</p>
                  <p className="text-white">
                    {user.isBanned ? "Banned" : user.status}
                  </p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Subscription</p>
                  <p className="text-white">{user.subscriptionLevel}</p>
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <h3 className="text-[#D9B799] font-semibold mb-3">
                Security Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[#8C6A58]">IP Address</p>
                  <p className="text-white">{user.details.ip}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Location</p>
                  <p className="text-white">{user.details.location}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Browser</p>
                  <p className="text-white">{user.details.browser}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Operating System</p>
                  <p className="text-white">{user.details.os}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">2FA Status</p>
                  <p className="text-white">
                    {user.details.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Failed Login Attempts</p>
                  <p className="text-white">
                    {user.details.failedLoginAttempts}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-[#2D1F14] p-4 rounded-lg">
              <h3 className="text-[#D9B799] font-semibold mb-3">
                Usage Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[#8C6A58]">API Calls</p>
                  <p className="text-white">{user.usageMetrics.apiCalls}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Storage Used</p>
                  <p className="text-white">{user.usageMetrics.storageUsed}</p>
                </div>
                <div>
                  <p className="text-[#8C6A58]">Active Chats</p>
                  <p className="text-white">{user.usageMetrics.activeChats}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => onBanUser(user.id, user.isBanned)}
                className={`px-4 py-2 rounded flex items-center ${
                  user.isBanned
                    ? "bg-green-900 text-green-100 hover:bg-green-800"
                    : "bg-red-900 text-red-100 hover:bg-red-800"
                }`}
              >
                {user.isBanned ? (
                  <FiUnlock className="mr-2" />
                ) : (
                  <FiSlash className="mr-2" />
                )}
                {user.isBanned ? "Unban User" : "Ban User"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // ----- End of Moved UserDetailsModal -----

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // Filter state (currently unused by backend)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null); // Add error state

  const ITEMS_PER_PAGE = 5; // Define items per page

  // Function to fetch users from the backend
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Admin token not found");
      }

      const response = await apiClient.admin.users({
        search: searchTerm,
        page: page,
        limit: ITEMS_PER_PAGE,
      });

      setUsers(response.data.users);
      setTotalPages(response.data.total_pages);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        err.response?.data?.detail || err.message || "Failed to fetch users"
      );
      setUsers([]); // Clear users on error
      setTotalPages(1); // Reset pages
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect to fetch users when component mounts or dependencies change
  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm]); // Re-fetch when page or searchTerm changes

  // Debounce search input (optional but recommended for better performance)
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1); // Reset to page 1 when search term changes
      // Fetch is triggered by the dependency change in the main useEffect
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handleBanUser = (userId, currentStatus) => {
    // TODO: Replace with API call to ban/unban user
    console.log("(Mock) Toggling ban status for user:", userId);
    // Optimistically update UI - replace with proper state update after API call
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, isBanned: !currentStatus } : user
    );
    setUsers(updatedUsers);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#F0E6DA]">User Management</h2>
        <div className="flex space-x-4">
          {/* Search Input */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8C6A58]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} // Update search term state
              className="pl-10 pr-4 py-2 bg-[#2D1F14] text-white rounded border border-[#6A4E3D] focus:border-[#D9B799] focus:outline-none"
            />
          </div>
          {/* Filter Button (currently non-functional) */}
          <button
            className="bg-[#6A4E3D] text-[#D9B799] px-4 py-2 rounded flex items-center hover:bg-[#5C3E2E] disabled:opacity-50"
            disabled
          >
            <FiFilter className="mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#2D1F14] rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[#2D1F14]">
              <tr>
                <th className="px-6 py-3 text-left text-[#D9B799]">User</th>
                <th className="px-6 py-3 text-left text-[#D9B799]">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-[#D9B799]">Status</th>
                <th className="px-6 py-3 text-left text-[#D9B799]">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-[#D9B799]">Usage</th>
                <th className="px-6 py-3 text-left text-[#D9B799]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D9B799]"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-[#8C6A58]"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#5C3E2E]">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white">{user.name}</div>
                        <div className="text-sm text-[#8C6A58]">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FiShield className="mr-2 text-[#D9B799]" />
                        {user.subscriptionLevel}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          user.isBanned
                            ? "bg-red-900 text-red-200"
                            : user.status === "Active"
                            ? "bg-green-900 text-green-200"
                            : "bg-yellow-900 text-yellow-200"
                        }`}
                      >
                        {user.isBanned ? "Banned" : user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(user.lastLogin).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>API Calls: {user.usageMetrics.apiCalls}</div>
                        <div>Storage: {user.usageMetrics.storageUsed}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsUserDetailsOpen(true);
                          }}
                          className="p-1 text-[#D9B799] hover:text-white"
                          title="View Details"
                        >
                          <FiInfo />
                        </button>
                        <button
                          className="p-1 text-[#D9B799] hover:text-white"
                          title="Edit User"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete User"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 flex justify-between items-center">
          <span className="text-[#8C6A58]">
            Page {page} of {totalPages}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="bg-[#4A3222] px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="bg-[#4A3222] px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {isUserDetailsOpen && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setIsUserDetailsOpen(false)}
          onBanUser={handleBanUser}
        />
      )}
    </div>
  );
}
