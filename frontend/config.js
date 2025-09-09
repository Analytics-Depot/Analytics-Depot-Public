// Frontend configuration
const config = {
  apiEndpoints: {
    base: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
    reports: {
      runs: "/reports/runs",
      create: "/reports/create",
      definitions: "/reports/definitions",
    },
    auth: {
      profile: "/auth/profile",
      role: "/auth/role",
    },
    chats: {
      base: "/chats",
      messages: "/chats/{id}/messages",
    },
    files: {
      upload: "/files/upload",
      analyze: "/files/analyze",
    },
  },
  app: {
    name: "Analytics Depot",
    version: "1.0.0",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: [".pdf", ".csv", ".xlsx", ".txt", ".md", ".json"],
  },
  features: {
    dataVisualization: true,
    realTimeChat: true,
    fileUpload: true,
    reportGeneration: true,
    exportFormats: ["csv", "pdf", "png"],
  },
};

export default config;
