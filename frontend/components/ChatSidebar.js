// components/ChatSidebar.js
import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiUpload,
  FiX,
  FiFile,
  FiTrash2,
  FiPlus,
  FiMessageSquare,
  FiEdit2,
  FiSettings,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiBarChart2,
  FiFileText,
  FiTrendingUp,
} from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiClient } from "../lib/api";

const ChatSidebar = ({
  onIndustrySelect,
  currentIndustry,
  completedChats = [],
  onChatSelect,
  onDeleteChat,
  onLoadMore,
  hasMore,
  loading,
  onRenameChat,
}) => {
  const [hoveredChat, setHoveredChat] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingChatName, setEditingChatName] = useState("");
  // REMOVE uploading state, handleFileUpload, and upload section
  const router = useRouter();

  const menuItems = [
    { id: "real_estate", label: "Real Estate" },
    { id: "legal", label: "Legal" },
    { id: "finance", label: "Finance" },
    { id: "medical", label: "Medical" },
    { id: "insurance", label: "Insurance" },
    { id: "management", label: "Management" },
  ];

  const handleSignOut = () => {
    localStorage.removeItem("token");
    router.push("/"); // Redirect to the main page where the login form is
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleStartEdit = (chat) => {
    setEditingChatId(chat.id);
    setEditingChatName(chat.name);
  };

  const handleSaveEdit = async (chatId) => {
    if (editingChatName.trim()) {
      await onRenameChat(chatId, editingChatName.trim());
      setEditingChatId(null);
      setEditingChatName("");
    }
  };

  const handleKeyPress = (e, chatId) => {
    if (e.key === "Enter") {
      handleSaveEdit(chatId);
    } else if (e.key === "Escape") {
      setEditingChatId(null);
      setEditingChatName("");
    }
  };

  // REMOVE handleFileUpload function

  return (
    <div className="w-72 bg-[#4A3222] flex flex-col h-full">
      {/* Industries Section */}
      <div className="flex-none p-4">
        <h2 className="text-xl font-bold text-[#F0E6DA] mb-4">Industries</h2>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li
              key={item.id}
              onClick={() => onIndustrySelect(item.id)}
              className={`cursor-pointer p-2 rounded-lg transition-colors ${
                currentIndustry === item.id
                  ? "bg-[#6A4E3D] text-white"
                  : "text-[#D9B799] hover:bg-[#5C3E2E]"
              }`}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {/* File Upload Section */}
      {/* REMOVE this entire section */}

      {/* Analysis Section */}
      {/* REMOVE this entire section */}

      {/* Chat History Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#F0E6DA]">Chat History</h3>
          <button
            onClick={() => window.location.reload()}
            className="text-[#D9B799] hover:text-white p-1 rounded transition-colors"
            title="Refresh chats"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <ul className="space-y-2">
          {Array.isArray(completedChats) &&
            completedChats
              .filter((chat) => chat && typeof chat === "object" && chat.id)
              .map((chat) => (
                <li
                  key={chat.id}
                  className="relative rounded-lg transition-colors"
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => setHoveredChat(null)}
                >
                  <div
                    onClick={() => onChatSelect && onChatSelect(chat.id)}
                    className={`p-2 rounded-lg cursor-pointer ${
                      hoveredChat === chat.id
                        ? "bg-[#5C3E2E]"
                        : "hover:bg-[#5C3E2E]"
                    }`}
                  >
                    <div className="flex flex-col">
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={editingChatName}
                          onChange={(e) => setEditingChatName(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, chat.id)}
                          onBlur={() => handleSaveEdit(chat.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#2D1F14] text-[#D9B799] p-1 rounded w-full focus:outline-none focus:ring-1 focus:ring-[#D9B799]"
                          autoFocus
                        />
                      ) : (
                        <span className="text-[#D9B799] font-medium">
                          {chat.name || "Untitled Chat"}
                        </span>
                      )}
                      <span className="text-[#8C6A58] text-sm">
                        {chat.created_at ? formatDate(chat.created_at) : ""}
                      </span>
                    </div>
                    {hoveredChat === chat.id && !editingChatId && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(chat);
                          }}
                          className="text-[#D9B799] hover:text-white"
                        >
                          <FiEdit2 />
                        </button>
                        {onDeleteChat && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}

          {/* Show message when no chats are available */}
          {Array.isArray(completedChats) && completedChats.length === 0 && (
            <li className="text-center py-4">
              <p className="text-[#8C6A58] text-sm">No chats available</p>
              <p className="text-[#8C6A58] text-xs mt-1">
                Start a new conversation to see it here
              </p>
            </li>
          )}
        </ul>
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="w-full mt-4 p-2 text-[#D9B799] hover:text-white disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#D9B799]" />
            ) : (
              <>
                <FiChevronDown className="mr-2" />
                Load More
              </>
            )}
          </button>
        )}
      </div>

      {/* User Account Section */}
      <div className="flex-none p-4 border-t border-[#2D1F14]">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 text-[#D9B799] hover:text-white w-full p-2 rounded-lg transition-colors"
          >
            <FiUser />
            <span>Account</span>
          </button>
          {showUserMenu && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-[#2D1F14] rounded-lg shadow-lg overflow-hidden">
              <Link
                href="/settings"
                className="flex items-center space-x-2 p-3 text-[#D9B799] hover:bg-[#4A3222] cursor-pointer"
              >
                <FiSettings />
                <span>Settings</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 p-3 text-red-400 hover:bg-[#4A3222] w-full"
              >
                <FiLogOut />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
