// pages/chat.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ChatSidebar from "../components/ChatSidebar";
import ChatInterface from "../components/ChatInterface";
import customAxios from "../lib/api";
import supabase from "../lib/supabase";

// Menu items defined at the top level
const MENU_ITEMS = [
  { id: "real_estate", label: "Real Estate" },
  { id: "legal", label: "Legal" },
  { id: "finance", label: "Finance" },
  { id: "medical", label: "Medical" },
  { id: "insurance", label: "Insurance" },
  { id: "management", label: "Management" },
];

// Convert DB message format to frontend format if needed
const formatMessageForFrontend = (dbMessage) => ({
  id: dbMessage.id, // Assuming ID is needed
  role: dbMessage.role,
  content: dbMessage.content,
  type: dbMessage.type || "text",
  visualization: dbMessage.visualization,
});

// --- Function to get suggested queries ---
const getSuggestedQueriesForIndustry = (industryId) => {
  const suggestions = {
    real_estate: [
      "What are the latest housing price trends in California?",
      "Compare rental yields in New York vs. Florida.",
      "Show me commercial property listings under $1M.",
    ],
    legal: [
      "Summarize recent changes in contract law.",
      "Find precedents related to intellectual property disputes.",
      "Analyze this deposition transcript for key arguments.",
    ],
    finance: [
      "What is the current market sentiment for tech stocks?",
      "Analyze the Q3 earnings report for Company XYZ.",
      "Generate a risk assessment for a diversified portfolio.",
    ],
    medical: [
      "What are the latest advancements in treating diabetes?",
      "Compare the efficacy of drug A vs. drug B.",
      "Analyze patient outcome data for hospital X.",
    ],
    insurance: [
      "Calculate the risk score for a property in a flood zone.",
      "Analyze claims data for auto accidents in Texas.",
      "What are common exclusions in homeowners policies?",
    ],
    management: [
      "Analyze employee performance metrics for Q2.",
      "What are the key drivers of customer churn this month?",
      "Generate a report on project budget variance.",
    ],
  };
  return suggestions[industryId] || suggestions.real_estate; // Default to real estate
};

// Get intro message for industry
const getIntroMessageForIndustry = (industryId) => {
  const messages = {
    real_estate:
      "Welcome! I can help you analyze real estate data and provide market insights.",
    legal:
      "Welcome! I can help you analyze legal documents and provide analytical insights.",
    finance:
      "Welcome! I can help you analyze financial data and provide market insights.",
    medical:
      "Welcome! I can help you analyze healthcare data and provide medical insights.",
    insurance:
      "Welcome! I can help you analyze insurance data and provide risk insights.",
    management:
      "Welcome! I can help you analyze business data and provide performance insights.",
  };
  return messages[industryId] || messages.real_estate;
};

// Load chat messages function - consolidated version
const loadChatMessages = async (chatId) => {
  try {
    const response = await customAxios.get(`/chats/${chatId}/messages`);

    if (response.data && Array.isArray(response.data)) {
      return response.data.map(formatMessageForFrontend);
    }
    return [];
  } catch (err) {
    throw err;
  }
};

const ChatPage = () => {
  const router = useRouter();
  const [specialistProfile, setSpecialistProfile] = useState("real_estate");
  const [completedChats, setCompletedChats] = useState([]);
  const [currentChat, setCurrentChat] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentIndustry, setCurrentIndustry] = useState("real_estate");
  const [introMessage, setIntroMessage] = useState("");
  const [error, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true); // Separate state for initial load
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [suggestedQueries, setSuggestedQueries] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Add request deduplication flags
  const [isChatLoading, setIsChatLoading] = useState(false); // Add flag to prevent multiple chat loads
  const [isLoading, setIsLoading] = useState(false); // Add isLoading state
  const [fileData, setFileData] = useState(null); // Add state to store file data

  // Add refs to prevent multiple simultaneous operations
  const isInitialized = useRef(false);
  const isSyncing = useRef(false);
  const lastChatId = useRef(null);

  // Function to load file data for a specific chat
  const loadFileDataForChat = useCallback(
    (chatId) => {
      if (!chatId) {
        setFileData(null);
        return;
      }

      try {
        // Try to load from localStorage first
        const storedFileData = localStorage.getItem(`chat_file_${chatId}`);
        if (storedFileData) {
          const parsedData = JSON.parse(storedFileData);
          // Prevent unnecessary updates if data is the same
          if (JSON.stringify(fileData) === JSON.stringify(parsedData)) {
            return;
          }

          setFileData(parsedData);
          return;
        }

        setFileData(null);
      } catch {
        console.error("Error loading file data for chat:");
        setFileData(null);
      }
    },
    [fileData]
  );

  // Function to save file data for a specific chat
  const saveFileDataForChat = useCallback((chatId, data) => {
    if (!chatId || !data) return;

    try {
      // Check if data is already saved to prevent unnecessary writes
      const existingData = localStorage.getItem(`chat_file_${chatId}`);
      if (existingData) {
        const existingParsed = JSON.parse(existingData);
        if (JSON.stringify(existingParsed) === JSON.stringify(data)) {
          return; // Data is already the same, no need to write
        }
      }

      localStorage.setItem(`chat_file_${chatId}`, JSON.stringify(data));
    } catch {
      console.error("Error saving file data for chat:");
    }
  }, []);

  // Wrapper function for setFileData that also saves to localStorage
  const setFileDataAndSave = useCallback(
    (data) => {
      // Prevent unnecessary updates if data is the same
      if (JSON.stringify(fileData) === JSON.stringify(data)) {
        return;
      }

      setFileData(data);
      if (currentChatId && data) {
        // Add chatId to metadata before saving
        const dataToSave = {
          ...data,
          metadata: {
            ...data.metadata,
            chatId: currentChatId,
          },
        };
        saveFileDataForChat(currentChatId, dataToSave);
      }
    },
    [currentChatId, fileData, saveFileDataForChat]
  );

  // Always reload chats from backend after any operation that could change the list
  const refreshChatsFromBackend = async () => {
    // Prevent multiple rapid refresh calls
    if (isSyncing.current) {
      console.log(
        "[refreshChatsFromBackend] Skipping - sync already in progress"
      );
      return;
    }
  };

  // Improve loadChats function with better error handling
  const loadChats = useCallback(
    async (pageNum = 0) => {
      if (loadingHistory) return;
      setLoadingHistory(true);
      setError(null);
      try {
        // Check if user is authenticated via the API client
        const response = await customAxios.get("/chats", {
          params: {
            skip: pageNum * 20,
            limit: 20,
          },
        });

        const newChats = response.data || [];
        // Defensive: filter and log
        const validChats = newChats.filter(
          (chat) =>
            chat &&
            typeof chat === "object" &&
            chat.id &&
            chat.name &&
            chat.created_at
        );
        if (validChats.length !== newChats.length) {
          console.warn(
            "[loadChats] Filtered out invalid chats:",
            newChats.filter((c) => !c || !c.id || !c.name || !c.created_at)
          );
        }
        if (pageNum === 0) {
          setCompletedChats(validChats);
          console.log("[loadChats] Setting completedChats:", validChats);
        } else {
          setCompletedChats((prev) => {
            const prevFiltered = prev.filter(
              (c) =>
                c && typeof c === "object" && c.id && c.name && c.created_at
            );
            const existingIds = new Set(prevFiltered.map((c) => c.id));
            const filteredNew = validChats.filter(
              (c) => !existingIds.has(c.id)
            );
            const merged = [...prevFiltered, ...filteredNew];
            console.log("[loadChats] Merged completedChats:", merged);
            return merged;
          });
        }
        setHasMore(validChats.length === 20);
        setPage(pageNum);
        setIsAuthenticated(true);
      } catch (err) {
        const errorMessage =
          err.response?.data?.detail ||
          err.friendlyMessage ||
          "Failed to load chat history. Please try logging in again.";
        setError(errorMessage);

        if (err.response?.status === 401) {
          // Clear invalid session data
          localStorage.removeItem("supabase_token");
          localStorage.removeItem("isLoggedIn");
          console.log("tets");
          router.push("/login");
        }
      } finally {
        setLoadingHistory(false);
        setInitialLoading(false); // Always clear initial loading
      }
    },
    [loadingHistory, router]
  );

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Enhanced authentication check
    const checkAuth = async () => {
      try {
        // First check Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          // Update localStorage with fresh token
          localStorage.setItem("supabase_token", session.access_token);
          localStorage.setItem("isLoggedIn", "true");

          // Store user data if available
          if (session.user) {
            localStorage.setItem(
              "userData",
              JSON.stringify({
                id: session.user.id,
                email: session.user.email,
                name:
                  session.user.user_metadata?.full_name ||
                  session.user.email?.split("@")[0],
              })
            );
          }

          setIsAuthenticated(true);
          return true;
        }

        // Fallback to localStorage check
        const token = localStorage.getItem("supabase_token");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

        if (!token || !isLoggedIn) {
          console.log("No valid token found, redirecting to login");
          router.push("/login");
          return false;
        }

        setIsAuthenticated(true);
        return true;
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userData");
        router.push("/login");
        return false;
      }
    };

    const initializeChat = async () => {
      try {
        // Check auth first
        const isValid = await checkAuth();
        if (!isValid) {
          return;
        }

        // Clear any potentially stale chat data
        setCompletedChats([]);
        setCurrentChat([]);
        setCurrentChatId(null);

        // Force a fresh load of chats from backend
        await loadChats(0);
        const initialIndustry = "real_estate";
        const introMessage = getIntroMessageForIndustry(initialIndustry);
        if (introMessage) {
          setIntroMessage(introMessage);
        }
        const queries = getSuggestedQueriesForIndustry(initialIndustry);
        if (queries) {
          setSuggestedQueries(queries);
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.detail ||
          err.message ||
          "Failed to initialize chat. Please refresh the page.";
        setError(errorMessage);
      } finally {
        setInitialLoading(false); // Clear initial loading when done
      }
    };

    checkAuth();
    initializeChat();
  }, []); // Remove dependencies to prevent infinite loops

  // Periodic sync to keep frontend in sync with backend
  useEffect(() => {
    if (!isAuthenticated) return;

    // Add request deduplication to prevent multiple simultaneous calls
    let syncIntervalId = null;
    let isMounted = true; // Track if component is still mounted

    const syncInterval = setInterval(async () => {
      // Prevent multiple simultaneous sync calls and check if component is still mounted
      if (isSyncing.current || !isMounted) {
        console.log(
          "[syncInterval] Skipping sync - already in progress or component unmounted"
        );
        return;
      }

      isSyncing.current = true;
      try {
        // Silently refresh chat list every 2 minutes when authenticated (reduced from 30 seconds)
        const response = await customAxios.get("/chats", {
          params: {
            skip: 0,
            limit: 100,
          },
        });

        if (!isMounted) return; // Check again after API call

        const backendChats = response.data || [];
        // Defensive: filter and log
        const validBackendChats = backendChats.filter(
          (chat) =>
            chat &&
            typeof chat === "object" &&
            chat.id &&
            chat.name &&
            chat.created_at
        );
        if (validBackendChats.length !== backendChats.length) {
          console.warn(
            "[syncInterval] Filtered out invalid chats:",
            backendChats.filter((c) => !c || !c.id || !c.name || !c.created_at)
          );
        }
        // Only update if there are new chats (don't restore deleted ones)
        setCompletedChats((prevChats) => {
          if (!isMounted) return prevChats; // Don't update if unmounted

          const prevFiltered = prevChats.filter(
            (c) => c && typeof c === "object" && c.id && c.name && c.created_at
          );
          const prevChatIds = new Set(prevFiltered.map((c) => c.id));
          const hasNewChats = validBackendChats.some(
            (c) => !prevChatIds.has(c.id)
          );

          if (hasNewChats) {
            console.log(
              "[syncInterval] Adding new chats from backend:",
              validBackendChats
            );
            // Only add new chats, don't remove existing ones
            const newChats = validBackendChats.filter(
              (c) => !prevChatIds.has(c.id)
            );
            const merged = [...prevFiltered, ...newChats].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            console.log("[syncInterval] Merged completedChats:", merged);
            return merged;
          }

          return prevFiltered; // No new chats, keep existing state
        });
      } catch (error) {
        // Silently fail - don't show errors for background sync
        if (isMounted) {
          console.warn("Background sync failed:", error.message);
        }
      } finally {
        if (isMounted) {
          isSyncing.current = false;
        }
      }
    }, 120000); // Sync every 2 minutes instead of 30 seconds

    syncIntervalId = syncInterval;

    return () => {
      isMounted = false; // Mark as unmounted
      if (syncIntervalId) {
        clearInterval(syncIntervalId);
      }
    };
  }, [isAuthenticated]);

  // Always reload fileData from localStorage when chat changes
  useEffect(() => {
    // Prevent unnecessary updates if fileData is already set for this chat
    if (
      currentChatId &&
      fileData &&
      fileData.metadata &&
      fileData.metadata.chatId === currentChatId
    ) {
      return;
    }

    if (currentChatId) {
      const savedFileData = localStorage.getItem(`chat_file_${currentChatId}`);
      if (savedFileData) {
        try {
          const parsedData = JSON.parse(savedFileData);
          // Add chatId to metadata to prevent unnecessary updates
          if (!parsedData.metadata) parsedData.metadata = {};
          parsedData.metadata.chatId = currentChatId;
          setFileData(parsedData);
        } catch (e) {
          setFileData(null);
        }
      } else {
        setFileData(null);
      }
    } else {
      setFileData(null);
    }
  }, [currentChatId]); // Remove fileData from dependencies to prevent loops

  // Handle industry selection (potentially starting a new chat)
  const handleIndustrySelect = (industryId) => {
    setCurrentIndustry(industryId);
    setCurrentChat([]);
    setCurrentChatId(null);
    setSpecialistProfile(industryId);
    setIntroMessage(getIntroMessageForIndustry(industryId));
    setSuggestedQueries(getSuggestedQueriesForIndustry(industryId));
    setError(null);
    refreshChatsFromBackend();
  };

  // Validate if a chat actually exists in the backend before operations
  const validateChatExists = async (chatId) => {
    try {
      const response = await customAxios.get(`/chats/${chatId}`);
      return response.status === 200;
    } catch (err) {
      return false;
    }
  };

  // Enhanced chat selection with validation
  const handleChatSelect = async (chatId) => {
    if (loadingHistory || isChatLoading) return;

    // Prevent loading the same chat multiple times
    if (lastChatId.current === chatId && currentChatId === chatId) {
      console.log(
        "[handleChatSelect] Skipping - same chat already loaded:",
        chatId
      );
      return;
    }

    // Prevent loading if already loading this chat
    if (isChatLoading) {
      console.log(
        "[handleChatSelect] Skipping - chat loading already in progress"
      );
      return;
    }

    setError(null);
    setIsChatLoading(true);
    lastChatId.current = chatId;

    try {
      // Validate chat exists before loading
      const isValid = await validateChatExists(chatId);
      if (!isValid) {
        setError("Chat not found. It may have been deleted.");
        setIsChatLoading(false);
        return;
      }

      // Load file data for this chat
      loadFileDataForChat(chatId);

      // Load chat messages
      const messages = await loadChatMessages(chatId);
      setCurrentChat(messages);
      setCurrentChatId(chatId);

      // Find the selected chat to get its industry
      const selectedChat = completedChats.find((chat) => chat.id === chatId);
      if (selectedChat && selectedChat.industry) {
        setCurrentIndustry(selectedChat.industry);
        setSpecialistProfile(selectedChat.industry);
      }

      setIntroMessage("");
    } catch (err) {
      console.error("Error loading chat:", err);

      // Clear current chat on error to prevent looping
      setCurrentChat([]);
      setCurrentChatId(null);

      const errorMessage =
        err.response?.data?.detail || err.code === "ECONNABORTED"
          ? "Request timed out. Please try again."
          : "Failed to load chat. Please try again.";

      setError(errorMessage);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Enhanced chat deletion with validation
  const handleDeleteChat = async (chatId) => {
    setError(null);

    try {
      // Optimistically remove from UI immediately
      setCompletedChats((prev) => prev.filter((chat) => chat.id !== chatId));

      // If this is the current chat, reset to industry selection
      if (currentChatId === chatId) {
        handleIndustrySelect(currentIndustry);
      }

      // Delete from backend with better error handling
      try {
        await customAxios.delete(`/chats/${chatId}`);

        console.log(`Chat ${chatId} deleted successfully`);

        // Refresh chat list to ensure consistency
        setTimeout(() => {
          refreshChatsFromBackend();
        }, 1000);
      } catch (deleteError) {
        console.error("Delete chat error:", deleteError);

        // Check if it's a network error (backend not running)
        if (
          deleteError.code === "ERR_NETWORK" ||
          deleteError.code === "ECONNREFUSED"
        ) {
          setError(
            "Cannot connect to server. Please make sure the backend is running and try again."
          );
          // Restore the chat in the UI since deletion failed
          await refreshChatsFromBackend();
        } else if (deleteError.response?.status === 404) {
          // Chat doesn't exist, removal was correct - no action needed
          console.log("Chat was already deleted");
        } else if (deleteError.response?.status === 401) {
          setError("Session expired. Please log in again.");
          // Clear invalid session data
          localStorage.removeItem("supabase_token");
          localStorage.removeItem("isLoggedIn");
          router.push("/login");
        } else {
          // Other error - restore chat list and show error
          setError(
            `Failed to delete chat: ${
              deleteError.response?.data?.detail || deleteError.message
            }`
          );
          try {
            await refreshChatsFromBackend();
          } catch (refreshError) {
            console.error("Failed to refresh chat list:", refreshError);
          }
        }
      }
    } catch (err) {
      console.error("Delete chat error:", err);
      setError("Failed to delete chat. Please try again.");

      // Restore chat list from backend
      try {
        await refreshChatsFromBackend();
      } catch (refreshError) {
        console.error("Failed to refresh chat list:", refreshError);
      }
    }
  };

  // Handle chat renaming
  const handleRenameChat = async (chatId, newName) => {
    setError(null);
    try {
      await customAxios.put(`/chats/${chatId}`, { name: newName });

      setCompletedChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, name: newName } : chat
        )
      );
    } catch (err) {
      setError("Failed to rename chat.");
      if (
        err.message === "No auth session found" ||
        err.message === "No access token found" ||
        err.response?.status === 401
      ) {
        // Clear invalid session data
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("isLoggedIn");
        router.push("/login");
      }
    }
  };

  // Analysis command detection
  const detectAnalysisCommand = (message) => {
    const analysisKeywords = [
      "analyze",
      "analysis",
      "statistics",
      "statistical",
      "trend",
      "correlation",
      "summary",
      "insights",
      "data analysis",
      "chart",
      "graph",
      "visualize",
      "mean",
      "median",
      "standard deviation",
      "distribution",
      "pattern",
    ];

    const lowerMessage = message.toLowerCase();
    return analysisKeywords.some((keyword) => lowerMessage.includes(keyword));
  };

  // Get analysis context based on current industry and file data
  const getAnalysisContext = () => {
    const context = {
      industry: currentIndustry,
      hasFileData: !!fileData,
      fileType: fileData?.metadata?.file_type || null,
      fileName: fileData?.metadata?.filename || null,
    };

    // Add industry-specific analysis suggestions
    const industryAnalysis = {
      real_estate: {
        focus: "property data, market trends, pricing analysis",
        metrics: "price per square foot, rental yields, market cap rates",
      },
      legal: {
        focus: "document analysis, case law, legal precedents",
        metrics: "case outcomes, settlement amounts, processing times",
      },
      finance: {
        focus: "financial data, market analysis, risk assessment",
        metrics: "returns, volatility, Sharpe ratio, beta",
      },
      medical: {
        focus: "patient data, treatment outcomes, clinical metrics",
        metrics: "recovery rates, treatment efficacy, patient satisfaction",
      },
      insurance: {
        focus: "claims data, risk analysis, policy metrics",
        metrics: "claim frequency, severity, loss ratios",
      },
      management: {
        focus: "business metrics, performance data, operational efficiency",
        metrics: "KPIs, productivity, cost analysis",
      },
    };

    context.industryAnalysis =
      industryAnalysis[currentIndustry] || industryAnalysis.management;
    return context;
  };

  // Handle sending new message (including creating chat if needed)
  const handleSendMessage = async (messageContent) => {
    const userMessage = { role: "user", content: messageContent };
    setCurrentChat((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    let chatIdToUse = currentChatId;

    try {
      // Create a new chat if we don't have one yet
      if (!chatIdToUse) {
        try {
          const selectedIndustry = MENU_ITEMS.find(
            (item) => item.id === currentIndustry
          );
          // LOGGING: Log chat creation request
          console.log("[Chat Creation] Creating new chat:", {
            name: `${selectedIndustry?.label || "Untitled"} Chat`,
            industry: currentIndustry,
          });
          const chatResponse = await customAxios.post("/chats", {
            name: `${selectedIndustry?.label || "Untitled"} Chat`,
            industry: currentIndustry,
          });
          // LOGGING: Log chat creation response
          console.log("[Chat Creation] Response", chatResponse.data);

          if (!chatResponse.data || !chatResponse.data.id) {
            throw new Error("Failed to create chat session. Please try again.");
          }
          chatIdToUse = chatResponse.data.id;
          setCurrentChatId(chatIdToUse);
          setCompletedChats((prev) => [chatResponse.data, ...prev]);
          setIntroMessage("");
        } catch (createChatError) {
          throw new Error(
            createChatError.response?.data?.detail ||
              "Failed to create chat session. Please try again."
          );
        }
      }

      // Ensure we have the latest file data for this chat
      if (!fileData && chatIdToUse) {
        loadFileDataForChat(chatIdToUse);
      }

      // Check localStorage directly for file data
      if (chatIdToUse) {
        const storedFileData = localStorage.getItem(`chat_file_${chatIdToUse}`);

        if (storedFileData && !fileData) {
          try {
            const parsedData = JSON.parse(storedFileData);

            setFileData(parsedData);
          } catch {
            console.error("Error parsing stored file data:");
          }
        }
      }

      try {
        // Always include file context if fileData is available
        const requestData = {
          message: messageContent,
          profile: currentIndustry, // Send profile ID directly
        };

        // Add context if available (using the correct API contract)
        if (fileData) {
          requestData.context = {
            file_type: fileData.metadata.file_type,
            file_name: fileData.metadata.filename,
            has_content: !!fileData.content,
            has_analysis: !!fileData.analysis,
            file_id: fileData.metadata.file_id || null,
          };
        }
        // Check if this is an analysis command
        const isAnalysisCommand = detectAnalysisCommand(messageContent);
        if (isAnalysisCommand && fileData) {
          // Add analysis context to the existing context
          if (!requestData.context) {
            requestData.context = {};
          }
          requestData.context.is_analysis = true;
          requestData.context.analysis_context = getAnalysisContext();
        }

        // Use the consolidated API endpoint structure
        const response = await customAxios.post(
          `/chats/${chatIdToUse}/messages`,
          requestData
        );

        const assistantMessage = {
          role: "assistant",
          content: response.data.message,
          type: response.data.type || "text",
          timestamp: response.data.timestamp,
          isAnalysis: isAnalysisCommand,
          analysisContext: isAnalysisCommand
            ? requestData.context?.analysis_context
            : null,
        };
        setCurrentChat((prev) => [...prev, assistantMessage]);

        // If this was an analysis command and we have file data, show analysis results
        if (isAnalysisCommand && fileData && response.data.analysis_results) {
          const analysisResultsMessage = {
            role: "system",
            type: "analysis_results",
            content: "analysis_results",
            results: response.data.analysis_results,
            query: messageContent,
          };
          setCurrentChat((prev) => [...prev, analysisResultsMessage]);
        }
      } catch (chatbotError) {
        if (chatbotError.code === "ECONNABORTED") {
          setError("Request timed out. Please try again.");
        } else if (chatbotError.response?.status === 413) {
          setError("Message too large. Please try a shorter message.");
        } else if (chatbotError.response?.status === 429) {
          setError(
            "Too many requests. Please wait a moment before trying again."
          );
        } else {
          setError(
            chatbotError.response?.data?.detail ||
              "Unable to process your request at this time. Please try again later."
          );
        }

        const fallbackMessage = {
          role: "assistant",
          type: "error",
          content: error,
        };
        setCurrentChat((prev) => [...prev, fallbackMessage]);
      }
    } catch (err) {
      const errorDetail =
        err.message || "An unexpected error occurred. Please try again.";
      setError(errorDetail);
      setCurrentChat((prev) => [
        ...prev,
        { role: "system", type: "error", content: errorDetail },
      ]);

      if (
        err.response?.status === 401 ||
        err.message.includes("Session expired")
      ) {
        // Clear invalid session data
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("isLoggedIn");
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new chat creation during file upload
  const handleNewChatCreated = (newChatId, newChatData) => {
    setCurrentChatId(newChatId);
    setCompletedChats((prev) => [newChatData, ...prev]);
    setIntroMessage("");

    // Load file data for the new chat (it should be available in localStorage)
    loadFileDataForChat(newChatId);
  };

  // Load more chats
  const handleLoadMore = () => {
    if (!loadingHistory && hasMore) {
      loadChats(page + 1);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#2D1F14]">
      {/* Navigation Header */}
      <div className="bg-[#1A140D]/80 backdrop-blur-sm border-b border-[#3D2F24] py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-2xl font-bold text-[#F0E6DA] hover:text-[#D9B799] transition-colors mr-8"
              >
                Analytics Depot
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-[#F0E6DA] font-semibold">Chat</span>
              <Link
                href="/dashboard"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/analysis"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Analysis
              </Link>
              <Link
                href="/reports"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Reports
              </Link>
              <Link
                href="/settings"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Settings
              </Link>
              <button
                onClick={async () => {
                  // Clear authentication data
                  await supabase.auth.signOut();
                  localStorage.removeItem("supabase_token");
                  localStorage.removeItem("isLoggedIn");
                  router.push("/");
                }}
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex">
        <ChatSidebar
          onIndustrySelect={handleIndustrySelect}
          currentIndustry={currentIndustry}
          completedChats={
            Array.isArray(completedChats)
              ? completedChats.filter(
                  (chat) => chat && typeof chat === "object" && chat.id
                )
              : []
          }
          onChatSelect={handleChatSelect}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loadingHistory}
        />
        <div className="flex-1">
          <ChatInterface
            specialistProfile={specialistProfile}
            introMessage={introMessage}
            currentChat={
              Array.isArray(currentChat)
                ? currentChat.filter(
                    (msg) =>
                      msg &&
                      typeof msg === "object" &&
                      (msg.content || msg.role)
                  )
                : []
            }
            setCurrentChat={setCurrentChat}
            onSendMessage={handleSendMessage}
            loading={isLoading} // Use isLoading for ChatInterface
            error={error}
            suggestedQueries={suggestedQueries}
            chatId={currentChatId} // Pass current chat ID as chatId
            setActiveData={setFileDataAndSave} // Pass file data setter
            fileData={fileData} // Pass current file data
            onNewChatCreated={handleNewChatCreated} // Pass callback for new chat creation
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
