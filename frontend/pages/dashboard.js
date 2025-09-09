import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ChartRenderer from "../components/ChartRenderer";
import LoadingState from "../components/LoadingState";
import supabase from "../lib/supabase";
import customAxios from "../lib/api";
import {
  FiBarChart2,
  FiTrendingUp,
  FiPieChart,
  FiActivity,
  FiDownload,
  FiSave,
  FiUpload,
} from "react-icons/fi";

export default function Dashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard state
  const [activeCharts, setActiveCharts] = useState([]);
  const [queryInput, setQueryInput] = useState("");
  const [selectedDataset, setSelectedDataset] = useState("");
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [generatingChart, setGeneratingChart] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase session first
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          localStorage.setItem("supabase_token", session.access_token);
          localStorage.setItem("isLoggedIn", "true");
          setIsAuthenticated(true);
          loadDatasets();
          setLoading(false);
          return;
        }

        // Fallback to localStorage check
        const token = localStorage.getItem("supabase_token");
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

        if (!token || !isLoggedIn) {
          router.push("/login");
          return;
        }

        // Verify token with backend
        try {
          await customAxios.get("/auth/profile");
          setIsAuthenticated(true);
          loadDatasets();
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem("supabase_token");
          localStorage.removeItem("isLoggedIn");
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setError("Authentication check failed");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    const loadDatasets = async () => {
      try {
        // For now, use sample datasets - you can implement backend endpoint later
        setAvailableDatasets([
          {
            id: "sample_dataset",
            name: "Sample Marketing Data",
            type: "csv",
            columns: [
              "date",
              "marketing_cost",
              "campaign",
              "channel",
              "conversions",
            ],
          },
        ]);
      } catch (error) {
        console.error("Failed to load datasets:", error);
        setAvailableDatasets([
          {
            id: "sample_dataset",
            name: "Sample Marketing Data",
            type: "csv",
            columns: [
              "date",
              "marketing_cost",
              "campaign",
              "channel",
              "conversions",
            ],
          },
        ]);
      }
    };

    checkAuth();
  }, [router]);

  const generateVisualization = async () => {
    if (!queryInput.trim()) return;

    setGeneratingChart(true);
    try {
      // For now, create a mock chart - you can implement backend endpoint later
      const newChart = {
        id: Date.now(),
        query: queryInput,
        chartData: {
          type: "bar",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May"],
            datasets: [
              {
                label: "Sample Data",
                data: [12, 19, 3, 5, 2],
                backgroundColor: "rgba(217, 183, 153, 0.8)",
                borderColor: "rgba(217, 183, 153, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: queryInput,
              },
            },
          },
        },
        analysis: {
          query_intent: "Data visualization",
          chart_type: "bar",
        },
        generatedAt: new Date().toISOString(),
        datasetInfo: {
          name: selectedDataset || "Sample Dataset",
          columns: ["date", "value"],
          row_count: 5,
        },
      };

      setActiveCharts((prev) => [newChart, ...prev]);
      setQueryInput("");
    } catch (error) {
      console.error("Failed to generate visualization:", error);
      setError("Failed to generate visualization. Please try again.");
    } finally {
      setGeneratingChart(false);
    }
  };

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    generateVisualization();
  };

  const exportChart = (chartId, format = "png") => {
    // TODO: Implement chart export functionality
    console.log(`Exporting chart ${chartId} as ${format}`);
  };

  const saveChart = (chartId) => {
    // TODO: Implement chart saving functionality
    console.log(`Saving chart ${chartId}`);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // For now, simulate file upload - you can implement backend endpoint later
      const mockResponse = {
        success: true,
        file_data: {
          metadata: {
            filename: file.name,
            columns: ["column1", "column2", "column3"],
            row_count: 100,
          },
        },
      };

      if (mockResponse.success) {
        setUploadedFile(mockResponse.file_data);
        // Add the uploaded file as a new dataset option
        const newDataset = {
          id: `uploaded_${Date.now()}`,
          name: file.name,
          type: file.name.split(".").pop(),
          columns: mockResponse.file_data.metadata.columns || [],
          row_count: mockResponse.file_data.metadata.row_count || 0,
          uploaded: true,
        };
        setAvailableDatasets((prev) => [newDataset, ...prev]);
        setSelectedDataset(newDataset.id);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeChart = (chartId) => {
    setActiveCharts((prev) => prev.filter((chart) => chart.id !== chartId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2D1F14] flex items-center justify-center">
        <div className="bg-[#4A3222] p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D9B799] mx-auto mb-4"></div>
          <p className="text-[#D9B799]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-[#2D1F14]">
      <Head>
        <title>Dashboard - Analytics Depot</title>
        <meta
          name="description"
          content="Intelligent data visualization dashboard"
        />
      </Head>

      {/* Navigation Header */}
      <div className="bg-[#1A140D]/80 backdrop-blur-sm border-b border-[#3D2F24] py-6 px-6 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-[#F0E6DA] mr-12">
                Analytics Depot
              </h1>
              <nav className="flex space-x-8">
                <Link
                  href="/chat"
                  className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors text-lg"
                >
                  Chat
                </Link>
                <span className="text-[#F0E6DA] text-lg font-semibold">
                  Dashboard
                </span>
                <Link
                  href="/analysis"
                  className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors text-lg"
                >
                  Analysis
                </Link>
                <Link
                  href="/reports"
                  className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors text-lg"
                >
                  Reports
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/settings"
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors text-lg"
              >
                Settings
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  localStorage.removeItem("supabase_token");
                  localStorage.removeItem("isLoggedIn");
                  localStorage.removeItem("userData");
                  router.push("/");
                }}
                className="text-[#D9B799] hover:text-[#F0E6DA] transition-colors text-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#F0E6DA] mb-4">
            Intelligent Dashboard
          </h1>
          <p className="text-[#D9B799] text-lg">
            Ask for what you want to see, and we&apos;ll create the perfect
            visualization
          </p>
        </div>

        {/* File Upload Section */}
        <div className="bg-[#4A3222] rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-[#F0E6DA] mb-4">
            Upload Your Data
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-[#D9B799] text-[#2D1F14] px-6 py-3 rounded-lg font-semibold hover:bg-[#C4A085] transition-colors cursor-pointer flex items-center gap-2"
            >
              <FiUpload />
              {uploading ? "Uploading..." : "Choose File"}
            </label>
            <span className="text-[#D9B799] text-sm">
              Supported formats: CSV, JSON
            </span>
            {uploadedFile && (
              <span className="text-green-400 text-sm">
                ✓ {uploadedFile.metadata.filename} uploaded successfully
              </span>
            )}
          </div>
        </div>

        {/* Query Input Section */}
        <div className="bg-[#4A3222] rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-[#F0E6DA] mb-4">
            What would you like to visualize?
          </h2>

          <form onSubmit={handleQuerySubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="e.g., 'Show me marketing cost trends' or 'Compare sales by region' or 'data trend of GOOG stock for the first quarter of 2025'"
                  className="w-full bg-[#2D1F14] border border-[#6A4E3D] rounded-lg px-4 py-3 text-[#F0E6DA] placeholder-[#8C6A58] focus:border-[#D9B799] focus:outline-none"
                />
              </div>

              <div className="w-48">
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full bg-[#2D1F14] border border-[#6A4E3D] rounded-lg px-4 py-3 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                >
                  <option value="">Select Dataset (Optional)</option>
                  {availableDatasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} {dataset.uploaded ? "(Uploaded)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={generatingChart || !queryInput.trim()}
                className="bg-[#D9B799] hover:bg-[#C4A085] disabled:bg-[#6A4E3D] text-[#2D1F14] font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                {generatingChart ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#2D1F14]"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FiBarChart2 />
                    Visualize
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Example Queries */}
          <div className="mt-4">
            <p className="text-[#8C6A58] text-sm mb-2">
              Try these example queries:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Show me marketing cost trends",
                "Compare sales by region",
                "What's the distribution of customer ratings?",
                "Show correlation between price and demand",
                "data trend of GOOG stock for the first quarter of 2025",
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQueryInput(example)}
                  className="text-[#D9B799] hover:text-[#F0E6DA] text-sm bg-[#2D1F14] px-3 py-1 rounded border border-[#6A4E3D] hover:border-[#D9B799] transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 text-sm mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Charts Display */}
        <div className="space-y-6">
          {generatingChart && (
            <LoadingState message="Creating your visualization..." />
          )}

          {activeCharts.map((chart) => (
            <ChartCard
              key={chart.id}
              chart={chart}
              onExport={exportChart}
              onSave={saveChart}
              onRemove={removeChart}
            />
          ))}
        </div>

        {/* Empty State */}
        {activeCharts.length === 0 && (
          <div className="text-center py-16">
            <FiBarChart2 className="mx-auto text-[#6A4E3D] text-6xl mb-4" />
            <h3 className="text-2xl font-semibold text-[#D9B799] mb-2">
              No visualizations yet
            </h3>
            <p className="text-[#8C6A58]">
              Start by asking for a visualization above, or upload some data to
              get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ chart, onExport, onSave, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getChartIcon = (chartType) => {
    switch (chartType) {
      case "time_series":
        return <FiTrendingUp className="text-blue-400" />;
      case "bar":
        return <FiBarChart2 className="text-green-400" />;
      case "pie":
        return <FiPieChart className="text-purple-400" />;
      case "scatter":
        return <FiActivity className="text-orange-400" />;
      default:
        return <FiBarChart2 className="text-gray-400" />;
    }
  };

  const renderChartData = (chartData) => {
    if (!chartData)
      return <p className="text-[#8C6A58]">No chart data available</p>;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#D9B799] mb-4">
          {getChartIcon(chartData.type)}
          <span className="font-medium capitalize">
            {chartData.type.replace("_", " ")} Chart
          </span>
        </div>

        {/* Render the actual chart instead of JSON */}
        <ChartRenderer chartData={chartData} chartType={chartData.type} />
      </div>
    );
  };

  return (
    <div className="bg-[#4A3222] rounded-lg p-6">
      {/* Chart Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-[#F0E6DA] mb-2">
            {chart.query}
          </h3>
          <div className="flex items-center gap-4 text-sm text-[#8C6A58]">
            <span>
              Generated: {new Date(chart.generatedAt).toLocaleString()}
            </span>
            <span>Dataset: {chart.datasetInfo?.name || "Unknown"}</span>
            <span>Chart Type: {chart.analysis?.chart_type || "Unknown"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSave(chart.id)}
            className="text-[#D9B799] hover:text-[#F0E6DA] p-2 rounded hover:bg-[#2D1F14] transition-colors"
            title="Save Chart"
          >
            <FiSave />
          </button>
          <button
            onClick={() => onExport(chart.id, "png")}
            className="text-[#D9B799] hover:text-[#F0E6DA] p-2 rounded hover:bg-[#2D1F14] transition-colors"
            title="Export as PNG"
          >
            <FiDownload />
          </button>
          <button
            onClick={() => onRemove(chart.id)}
            className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-[#2D1F14] transition-colors"
            title="Remove Chart"
          >
            ×
          </button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="space-y-4">
        {renderChartData(chart.chartData)}

        {/* Analysis Details */}
        <div className="border-t border-[#6A4E3D] pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#D9B799] hover:text-[#F0E6DA] text-sm flex items-center gap-2"
          >
            {isExpanded ? "Hide" : "Show"} Analysis Details
          </button>

          {isExpanded && (
            <div className="mt-3 bg-[#2D1F14] rounded-lg p-4">
              <h4 className="font-medium text-[#D9B799] mb-2">
                Analysis Results:
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#8C6A58]">Query Intent: </span>
                  <span className="text-[#F0E6DA]">
                    {chart.analysis?.query_intent || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C6A58]">Chart Type: </span>
                  <span className="text-[#F0E6DA]">
                    {chart.analysis?.chart_type || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C6A58]">Columns: </span>
                  <span className="text-[#F0E6DA]">
                    {chart.datasetInfo?.columns?.join(", ") || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C6A58]">Row Count: </span>
                  <span className="text-[#F0E6DA]">
                    {chart.datasetInfo?.row_count || "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
