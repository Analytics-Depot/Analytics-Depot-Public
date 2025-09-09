// components/ChatInterface.js
import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiSend,
  FiUpload,
  FiAlertTriangle,
  FiX,
  FiFile,
  FiFileText,
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiFileCheck,
  FiTrendingUp,
  FiPieChart,
  FiTable,
  FiCheckCircle,
  FiClock,
  FiInfo,
} from "react-icons/fi";
import customAxios from "../lib/api";
import ReactMarkdown from "react-markdown";
import FileUpload from "./FileUpload"; // Import the new component

// Define supported file types
export const SUPPORTED_FILES = {
  data: [".csv", ".json"],
  documents: [".pdf", ".docx", ".doc", ".txt", ".rtf", ".odt"],
  presentations: [".pptx", ".ppt"],
  spreadsheets: [".xlsx", ".xls"],
  images: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"],
};

// FileTypeIcon component
const FileTypeIcon = ({ fileType }) => {
  // Extract extension from MIME type or filename
  const getExtension = () => {
    if (!fileType) return "unknown";

    const mimeToExt = {
      "application/json": "json",
      "text/csv": "csv",
      "application/csv": "csv",
      "application/pdf": "pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
    };

    if (mimeToExt[fileType]) return mimeToExt[fileType];
    if (fileType.startsWith(".")) return fileType.substring(1);
    if (fileType.includes(".")) {
      return fileType.split(".").pop().toLowerCase();
    }
    return "unknown";
  };

  const ext = getExtension();
  let icon = <FiFile />;
  let bgColor = "bg-gray-700";

  switch (ext) {
    case "json":
      icon = <FiFileText />;
      bgColor = "bg-yellow-800";
      break;
    case "csv":
      icon = <FiBarChart2 />;
      bgColor = "bg-green-800";
      break;
    case "pdf":
      icon = <FiFileText />;
      bgColor = "bg-red-800";
      break;
    case "docx":
    case "doc":
      icon = <FiFileText />;
      bgColor = "bg-blue-800";
      break;
    default:
      icon = <FiFile />;
      bgColor = "bg-gray-800";
  }

  return (
    <div className={`p-2 rounded ${bgColor} text-white flex-shrink-0`}>
      {icon}
    </div>
  );
};

// Loading spinner component
const LoadingSpinner = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

// Get industry display name
const getIndustryDisplayName = (industryId) => {
  const names = {
    real_estate: "Real Estate",
    legal: "Legal",
    finance: "Finance",
    medical: "Medical",
    insurance: "Insurance",
    management: "Management",
  };
  return names[industryId] || "AI";
};

const AnalysisSuggestions = ({ fileData, onSuggestionClick }) => {
  // This component is now intentionally left blank as suggestions have been removed.
  return null;
};

const ProcessingStatus = ({
  status,
  progress,
  filename,
  enhancedProcessing,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
        return <FiUpload className="animate-pulse" />;
      case "processing":
        return <FiClock className="animate-spin" />;
      case "analyzing":
        return <FiBarChart2 className="animate-pulse" />;
      case "success":
        return <FiCheckCircle className="text-green-400" />;
      case "error":
        return <FiAlertTriangle className="text-red-400" />;
      default:
        return <FiClock />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return "Uploading file...";
      case "processing":
        return enhancedProcessing
          ? "Enhanced processing..."
          : "Processing file...";
      case "analyzing":
        return "Analyzing data...";
      case "success":
        return "File processed successfully!";
      case "error":
        return "Processing failed";
      default:
        return "Ready to process";
    }
  };

  return (
    <div className="bg-[#4A3222] rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-[#F0E6DA] font-medium">{getStatusText()}</p>
          {filename && <p className="text-sm text-[#8C6A58]">{filename}</p>}
          {enhancedProcessing && (
            <p className="text-xs text-[#D9B799]">Using enhanced processing</p>
          )}
        </div>
        {progress !== null && (
          <span className="text-[#D9B799] font-medium">{progress}%</span>
        )}
      </div>
      {progress !== null && progress < 100 && (
        <div className="mt-2 bg-[#2D1F14] rounded-full h-2">
          <div
            className="bg-[#D9B799] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

const AnalysisResults = ({ results, query, onExport }) => {
  if (!results) return null;

  return (
    <div className="bg-[#4A3222] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#F0E6DA] font-semibold flex items-center">
          <FiBarChart2 className="mr-2" />
          Analysis Results
        </h3>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-[#8C6A58]">Query: {query}</span>
          {onExport && (
            <button
              onClick={onExport}
              className="bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14] px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {results.statistical && (
          <div className="bg-[#2D1F14] p-3 rounded">
            <h4 className="text-[#D9B799] font-medium mb-2">
              Statistical Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {Object.entries(results.statistical).map(([key, value]) => (
                <div key={key}>
                  <span className="text-[#8C6A58]">{key}: </span>
                  <span className="text-[#F0E6DA]">
                    {typeof value === "number" ? value.toFixed(2) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.insights && results.insights.length > 0 && (
          <div className="bg-[#2D1F14] p-3 rounded">
            <h4 className="text-[#D9B799] font-medium mb-2">Key Insights</h4>
            <ul className="space-y-1">
              {results.insights.map((insight, index) => (
                <li
                  key={index}
                  className="text-[#F0E6DA] text-sm flex items-start"
                >
                  <FiInfo className="text-[#D9B799] mr-2 mt-0.5 flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {results.charts && results.charts.length > 0 && (
          <div className="bg-[#2D1F14] p-3 rounded">
            <h4 className="text-[#D9B799] font-medium mb-2">Visualizations</h4>
            <div className="text-[#8C6A58] text-sm">
              {results.charts.length} chart(s) generated
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ChatInterface({
  chatId,
  setChatId,
  onNewChatCreated,
  isNewChat,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [fileData, setFileData] = useState(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);

  // Add request deduplication flags
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [isFetchingChatData, setIsFetchingChatData] = useState(false);

  // Helper function to get token from Supabase session
  const getToken = () => {
    // For now, return null since we're using session cookies
    // The backend will handle authentication via session cookies
    // The backend now uses user-specific cookie names like analytics_depot_session_{user_id}
    return null;
  };
  const fetchChatData = async (currentChatId) => {
    // Prevent multiple simultaneous calls
    if (isFetchingChatData) {
      console.log("[fetchChatData] Skipping - already in progress");
      return;
    }

    setIsFetchingChatData(true);
    try {
      const response = await customAxios.get(`/chats/${currentChatId}`);
      if (response.data.file_data && response.data.file_data.length > 0) {
        const lastFile =
          response.data.file_data[response.data.file_data.length - 1];
        setFileData({
          metadata: {
            filename: lastFile.filename,
            file_type: lastFile.file_type,
          },
          content: "File content is available for analysis.",
        });
      }
    } catch (err) {
      console.log(
        "No associated file data found or error fetching chat details."
      );
    } finally {
      setIsFetchingChatData(false);
    }
  };

  const suggestedQueries = [
    "What are the key insights from this data?",
    "Summarize the main findings.",
    "What is the most important information here?",
    "Are there any trends or patterns?",
  ];

  const fetchMessages = useCallback(
    async (idOverride = null) => {
      const currentChatId = idOverride || chatId;
      if (!currentChatId) return;

      // Prevent multiple simultaneous calls
      if (isFetchingMessages) {
        console.log("[fetchMessages] Skipping - already in progress");
        return;
      }

      setIsFetchingMessages(true);
      try {
        const response = await customAxios.get(
          `/chats/${currentChatId}/messages`
        );
        setMessages(response.data);
        // Only attempt to load file data if we don't already have it
        if (!fileData) {
          fetchChatData(currentChatId);
        }
      } catch (err) {
        setError(
          "Failed to fetch messages. Please try refreshing or starting a new chat."
        );
        console.error(err);
      } finally {
        setIsFetchingMessages(false);
      }
    },
    [chatId, isFetchingMessages, fileData]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add ref to track last processed chatId to prevent loops
  const lastProcessedChatId = useRef(null);

  useEffect(() => {
    // Prevent processing the same chatId multiple times
    if (lastProcessedChatId.current === chatId) {
      return;
    }

    if (chatId) {
      lastProcessedChatId.current = chatId;
      fetchMessages();
      console.log("[FRONTEND] useEffect chatId changed:", chatId);
    } else {
      lastProcessedChatId.current = null;
      setMessages([]);
      setFileData(null);
      setFile(null);
      console.log("[FRONTEND] useEffect chatId cleared, fileData set to null");
    }
  }, [chatId]); // Remove fetchMessages from dependencies

  // Add debug log for chatId
  useEffect(() => {
    console.log("[DEBUG] ChatInterface received chatId prop:", chatId);
  }, [chatId]);

  const ErrorDisplay = () => {
    if (!error) return null;

    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // You can add file upload logic here
      console.log("File dropped:", file);
    }
  };

  // Define handleUploadComplete to fix ReferenceError and implement file upload logic
  const handleUploadComplete = async (data) => {
    console.log("[FRONTEND] Upload complete:", data);
    let newChatId = data.chat_id;

    // If no chatId, set it from upload response
    if (!chatId && newChatId) {
      if (setChatId) setChatId(newChatId);
      if (onNewChatCreated) onNewChatCreated(newChatId);
    }
    // If file uploaded mid-chat, associate with current session
    if (chatId && data.file_id && chatId !== newChatId) {
      try {
        await customAxios.post(`/chats/${chatId}/files`, {
          file_id: data.file_id,
        });
        newChatId = chatId;
      } catch (err) {
        setError("Failed to associate file with chat session.");
        console.error(err);
      }
    }
    // Set fileData from upload response if available
    if (data.filename) {
      setFileData({
        metadata: {
          filename: data.filename,
          file_type: data.file_type,
        },
        content: "File content is available for analysis.",
      });
      // Prompt user after file upload
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: "File uploaded! Ask me anything about it.",
        },
      ]);
    }
    // Fetch messages and file data for the chat
    if (newChatId) {
      fetchMessages(newChatId);
      fetchChatData(newChatId);
    }
  };

  // Refactored handleSubmit to allow chat without file and create chat session if needed
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    const userInput = input.trim();
    setInput(""); // Clear input immediately

    // Add user message to state immediately for better UX
    const userMessage = { role: "user", content: userInput };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let currentChatId = chatId;

      // If no chatId, create a new chat session first
      if (!currentChatId) {
        const createChatRes = await customAxios.post("/chats", {
          name: "General",
        });
        currentChatId = createChatRes.data.chat_id || createChatRes.data.id;
        if (setChatId) setChatId(currentChatId);
        if (onNewChatCreated) onNewChatCreated(currentChatId);
      }

      // Send the message
      const response = await customAxios.post(
        `/chats/${currentChatId}/messages`,
        {
          message: userInput,
        }
      );

      // Add assistant message to state
      const assistantMessage = {
        role: "assistant",
        content: response.data.message,
        type: response.data.type || "text",
        timestamp: response.data.timestamp,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Send message error:", err);

      // Handle different error types
      let errorMessage = "Failed to get a response. Please try again.";

      if (err.response?.status === 429) {
        const detail = err.response?.data?.detail || "Usage limit exceeded.";
        errorMessage = `${detail} Your usage will reset at the beginning of next month.`;
      } else if (err.response?.status === 401) {
        errorMessage = "Session expired. Please log in again.";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      setError(errorMessage);
      // Remove the user message from state on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Remove file-required error from handleSuggestionClick
  const handleSuggestionClick = (query) => {
    setInput(query);
    const fakeEvent = { preventDefault: () => {} };
    handleSubmit(fakeEvent);
  };

  // Handle export of analysis results
  const handleExportAnalysis = async (results, query) => {
    try {
      if (!chatId) {
        setError("No active chat session for export");
        return;
      }

      // Create export request payload
      const exportPayload = {
        source_type: "chat",
        chat_source: {
          chat_id: chatId,
        },
        export: {
          formats: ["csv"],
          include_charts: false,
        },
      };

      // Call the reports API
      const response = await customAxios.post("/reports/run", exportPayload);

      if (response.data.success || response.data.run_id) {
        // Show success message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Export started! Your CSV will be ready shortly. Run ID: ${response.data.run_id}`,
            type: "export_status",
          },
        ]);
      } else {
        setError("Failed to start export");
      }
    } catch (err) {
      console.error("Export error:", err);
      setError(err.response?.data?.detail || "Export failed");
    }
  };

  const renderMessage = (message, index) => {
    const isFileMessage = message.type === "file";
    const isErrorMessage = message.type === "error";
    const isAnalysisSuggestions = message.type === "analysis_suggestions";
    const isAnalysisResults = message.type === "analysis_results";

    if (isFileMessage) {
      return (
        <div className="flex items-start space-x-3 bg-[#2D1F14] p-3 rounded">
          <FileTypeIcon
            fileType={message.metadata?.file_type || message.metadata?.name}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[#D9B799]">{message.content}</p>
            {message.metadata && (
              <p className="text-xs text-[#8C6A58] mt-1">
                {message.metadata.file_type || message.metadata.name}
              </p>
            )}
            {message.enhancedProcessing && (
              <p className="text-xs text-[#D9B799] mt-1">
                ✓ Enhanced processing used
              </p>
            )}
          </div>
        </div>
      );
    }

    if (isErrorMessage) {
      return (
        <div className="bg-red-900/50 text-red-200 p-3 rounded">
          <p className="flex items-center">
            <FiAlertTriangle className="mr-2 flex-shrink-0" size={16} />
            {message.content}
          </p>
        </div>
      );
    }

    if (isAnalysisSuggestions) {
      return (
        <AnalysisSuggestions
          fileData={message.fileData}
          onSuggestionClick={handleSuggestionClick}
        />
      );
    }

    if (isAnalysisResults) {
      return (
        <AnalysisResults
          results={message.results}
          query={message.query}
          onExport={() => handleExportAnalysis(message.results, message.query)}
        />
      );
    }

    return (
      <div className="bg-[#2D1F14] p-3 rounded prose prose-invert max-w-none">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    );
  };

  // Remove intro message that requires file upload
  const shouldShowIntroMessage = () => {
    return messages.length === 0;
  };

  return (
    <div className="flex h-full bg-[#1A140D] text-[#D9B799]">
      <div className="flex-1 flex flex-col relative" onDragEnter={handleDrag}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#4A3222] scrollbar-track-[#1A140D]">
          {error && <ErrorDisplay />}

          {/* Render chat messages */}
          {messages
            .filter((message) => !message.isHidden && message.type !== "intro")
            .map((message, index) => (
              <div
                key={index}
                className={`${message.role === "user" ? "ml-12" : "mr-12"}`}
              >
                <div className="mb-1 text-xs flex items-center text-[#8C6A58]">
                  <div className="h-1 w-1 rounded-full bg-[#8C6A58] mr-2"></div>
                  {message.role === "user" ? "You" : "AI Assistant"}
                </div>
                {renderMessage(message, index)}
              </div>
            ))}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="px-4 pb-1 flex-shrink-0">
            <p className="flex items-center bg-red-900/50 text-red-200 p-2 rounded text-sm">
              <FiAlertTriangle className="mr-2 flex-shrink-0" size={14} />
              <span className="flex-1">
                {typeof error === "object" ? JSON.stringify(error) : error}
              </span>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-300 hover:text-red-100 p-1"
                title="Dismiss"
              >
                <FiX size={16} />
              </button>
            </p>
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="px-4 pb-1 flex-shrink-0">
            <div className="w-full bg-[#2D1F14] rounded-full h-1.5">
              <div
                className="bg-[#D9B799] h-1.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-center text-[#8C6A58] mt-1">
              Uploading: {uploadProgress}%
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-[#2D1F14] flex items-center space-x-2 flex-shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className={`flex-1 bg-[#2D1F14] px-4 py-2 rounded border border-[#6A4E3D] focus:border-[#D9B799] focus:ring-1 focus:ring-[#D9B799] focus:outline-none text-white`}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`bg-[#D9B799] text-[#2D1F14] px-4 py-2 rounded font-medium hover:bg-[#C0A080] disabled:opacity-50`}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <LoadingSpinner /> : <FiSend className="w-5 h-5" />}
          </button>
        </form>

        <FileUpload chatId={chatId} onUploadComplete={handleUploadComplete} />

        {dragActive && (
          <div
            className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 border-4 border-dashed border-[#D9B799] rounded-lg"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FiUpload className="w-16 h-16 text-[#D9B799] mb-4" />
            <p className="text-xl font-semibold text-[#F0E6DA]">
              Drop file to upload
            </p>
            <p className="text-sm text-[#8C6A58] mt-2">
              Supported formats: CSV, JSON
            </p>
          </div>
        )}
      </div>

      <div className="w-80 bg-[#4A3222] p-4 border-l border-[#6A4E3D] flex flex-col space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#6A4E3D] scrollbar-track-[#2D1F14]">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[#D9B799]">
            Suggested Queries
          </h3>
          <div className="space-y-2">
            {suggestedQueries.length > 0 ? (
              suggestedQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => setInput(query)}
                  className={`w-full text-left p-3 rounded bg-[#2D1F14] text-[#D9B799] hover:bg-[#3D2F24] transition-colors text-sm`}
                  disabled={isLoading}
                >
                  {query}
                </button>
              ))
            ) : (
              <div className="text-[#8C6A58] text-center italic text-sm">
                No suggestions available for this topic.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold mb-3 text-[#D9B799]">
            Supported File Types
          </h4>
          <div className="space-y-2">
            <div className="bg-[#2D1F14] p-3 rounded">
              <h5 className="text-[#D9B799] text-sm font-medium mb-1 capitalize">
                Data Files
              </h5>
              <p className="text-[#8C6A58] text-xs">.csv, .json</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold mb-3 text-[#D9B799]">
            Analysis Tips
          </h4>
          <div className="space-y-2 text-sm text-[#8C6A58]">
            <p>Upload a CSV or JSON file to analyze the data</p>
            <p>Ask specific questions about patterns and trends</p>
            <p>Request summaries of key metrics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
