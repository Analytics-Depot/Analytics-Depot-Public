/**
 * Custom Axios Instance with Authentication
 * Centralized HTTP client for all API requests and configuration
 */

import axios from "axios";

// Note: CONFIG is internal only - use apiClient for all API calls

// Create custom axios instance
const customAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // Base URL already includes /api from environment
  withCredentials: true,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to get auth token from localStorage
const getAuthToken = () => {
  try {
    // First try to get from the dedicated token storage
    const token = localStorage.getItem("supabase_token");
    if (token) {
      return token;
    }

    // Fallback to session data (for backward compatibility)
    const sessionData = JSON.parse(
      localStorage.getItem("supabase_session") || "{}"
    );
    return sessionData.access_token || null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// Request interceptor to add auth token
customAxios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
customAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors globally
    if (error.response?.status === 401) {
      // Clear invalid session data
      localStorage.removeItem("supabase_session");
      localStorage.removeItem("supabase_token");
      localStorage.removeItem("isLoggedIn");

      // Only redirect if we're not already on login page
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints using the custom instance
export const apiClient = {
  // Auth endpoints
  auth: {
    profile: () => customAxios.get("/auth/profile"),
    getProfile: () => customAxios.get("/auth/profile"), // Alias for consistency
    syncUser: (data) => customAxios.post("/auth/sync-user", data),
    updateProfile: (data) => customAxios.patch("/auth/profile", data),
    changePassword: (data) => customAxios.post("/auth/change-password", data),
    resetPassword: (data) => customAxios.post("/auth/reset-password", data),
  },

  // Chat endpoints
  chats: {
    list: (params) => customAxios.get("/chats", { params }),
    get: (chatId) => customAxios.get(`/chats/${chatId}`),
    create: (data) => customAxios.post("/chats", data),
    update: (chatId, data) => customAxios.patch(`/chats/${chatId}`, data),
    delete: (chatId) => customAxios.delete(`/chats/${chatId}`),
    addFile: (chatId, data) => customAxios.post(`/chats/${chatId}/files`, data),
    messages: {
      list: (chatId) => customAxios.get(`/chats/${chatId}/messages`),
      send: (chatId, data) =>
        customAxios.post(`/chats/${chatId}/messages`, data),
    },
  },

  // File endpoints
  files: {
    upload: (data) => {
      // Set proper headers for file upload
      return customAxios.post("/files/upload", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    get: (fileId) => customAxios.get(`/files/${fileId}`),
    delete: (fileId) => customAxios.delete(`/files/${fileId}`),
  },

  // Payment endpoints (/api/payments prefix in router)
  payments: {
    config: () => customAxios.get("/payments/config"),
    plans: () => customAxios.get("/payments/plans"),
    createPaymentIntent: (data) =>
      customAxios.post("/payments/create-payment-intent", data),
    createSubscription: (data) =>
      customAxios.post("/payments/create-subscription", data),
    cancelSubscription: (data) =>
      customAxios.post("/payments/cancel-subscription", data),
    getSubscriptionStatus: () =>
      customAxios.get("/payments/subscription-status"),
    webhook: (data) => customAxios.post("/payments/webhook", data),
  },

  // Support endpoints (/api/support prefix in router)
  support: {
    stats: () => customAxios.get("/support/stats"),
    messages: (params) => customAxios.get("/support/messages", { params }),
    getMessage: (messageId) =>
      customAxios.get(`/support/messages/${messageId}`),
    updateMessage: (messageId, data) =>
      customAxios.patch(`/support/messages/${messageId}`, data),
    createMessage: (data) => customAxios.post("/support/messages", data),
  },

  // Expert endpoints (/api/experts prefix in router)
  expert: {
    dashboard: () => customAxios.get("/experts/dashboard"),
  },

  // Usage endpoints
  usage: {
    stats: () => customAxios.get("/usage/stats"),
  },

  // Reports endpoints (reports router has /api prefix in backend)
  reports: {
    run: (data) => customAxios.post("/reports/run", data),
    runs: (params) => customAxios.get("/reports/runs", { params }),
    getRunDetail: (runId) => customAxios.get(`/reports/runs/${runId}`),
    download: (runId, format) =>
      customAxios.get(`/reports/download/${runId}/${format}`, {
        responseType: "blob",
      }),
  },

  // Admin endpoints
  admin: {
    verify: () => customAxios.get("/admin/verify"),
    stats: () => customAxios.get("/admin/stats"),
    users: (params) => customAxios.get("/admin/users", { params }),
    analytics: () => customAxios.get("/admin/analytics"),
    metrics: {
      realTime: () => customAxios.get("/admin/metrics/real-time"),
    },
    server: {
      monitoring: () => customAxios.get("/admin/server/monitoring"),
    },
    resources: {
      usage: () => customAxios.get("/admin/resources/usage"),
    },
    billing: {
      stats: () => customAxios.get("/admin/billing/stats"),
      transactions: (params) =>
        customAxios.get("/admin/billing/transactions", { params }),
    },
    api: {
      metrics: () => customAxios.get("/admin/api/metrics"),
    },
  },
};

// Export the raw axios instance for custom requests
export default customAxios;
