// components/ReportBuilder.js
import { useState } from "react";
import customAxios from "../lib/api";

export default function ReportBuilder({ onReportGenerated }) {
  const [sourceType, setSourceType] = useState("chat");
  const [chatSource, setChatSource] = useState({
    chat_id: "",
    data_type: "all",
    date_range: "7d",
    include_attachments: true,
  });
  const [visualization, setVisualization] = useState({
    type: "time_series",
  });
  const [exportFormats, setExportFormats] = useState(["csv"]);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [saveConfig, setSaveConfig] = useState(false);
  const [reportName, setReportName] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleCron, setScheduleCron] = useState("0 9 * * 1"); // Monday 9 AM

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Available options - only chat data
  const sourceTypes = [
    {
      value: "chat",
      label: "Chat Data",
      description: "Analysis results, file data from conversations",
    },
  ];

  const exportFormatOptions = [
    { value: "csv", label: "CSV", description: "Spreadsheet format" },
    { value: "pdf", label: "PDF", description: "Document format" },
    { value: "png", label: "PNG", description: "Chart images" },
  ];

  const chartTypes = [
    {
      value: "time_series",
      label: "Time Series",
      description: "Data over time",
    },
    {
      value: "bar",
      label: "Bar Chart",
      description: "Categorical comparisons",
    },
    { value: "pie", label: "Pie Chart", description: "Proportional data" },
    {
      value: "scatter",
      label: "Scatter Plot",
      description: "Correlation analysis",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate that we have some data to work with
      if (!chatSource.chat_id && chatSource.data_type === "all") {
        // If no specific chat is selected, we need to ensure there's some data available
        console.log(
          "DEBUG: No specific chat selected, will attempt to generate report from available data"
        );
      }

      const payload = {
        source_type: "chat",
        chat_source: chatSource,
        visualization: includeCharts ? visualization : null,
        export: {
          formats: exportFormats,
          include_charts: includeCharts,
        },
      };

      // If saving configuration, add the save details
      if (saveConfig) {
        payload.save_config = {
          name: reportName,
          schedule_cron: scheduleEnabled ? scheduleCron : null,
        };
      }

      const response = await customAxios.post("/reports/run", payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout for report generation
      });

      if (response.data.run_id) {
        let successMessage = `Report generation started! Run ID: ${response.data.run_id}`;
        if (saveConfig) {
          successMessage += `\nReport configuration "${reportName}" has been saved.`;
          if (scheduleEnabled) {
            successMessage += `\nScheduled to run: ${scheduleCron}`;
          }
        }
        setSuccess(successMessage);
        onReportGenerated(response.data.run_id);

        // Reset form
        setChatSource({
          chat_id: "",
          data_type: "all",
          date_range: "7d",
          include_attachments: true,
        });
        setVisualization({
          type: "time_series",
        });
        setExportFormats(["csv"]);
        setIncludeCharts(false);
        setSaveConfig(false);
        setReportName("");
        setScheduleEnabled(false);
        setScheduleCron("0 9 * * 1");
      } else {
        setError("Failed to start report generation");
      }
    } catch (err) {
      console.error("Report generation error:", err);

      let errorMessage = "Failed to generate report";
      if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
        errorMessage =
          "Request timed out. The report generation is taking longer than expected.";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExportFormatChange = (format) => {
    setExportFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handleChatSourceChange = (key, value) => {
    setChatSource((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleVisualizationChange = (key, value) => {
    setVisualization((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-[#2D1F14] rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-[#F0E6DA] mb-4">
          Build Custom Report
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Type Selection */}
          <div>
            <label className="block text-[#D9B799] font-medium mb-3">
              Data Source
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sourceTypes.map((type) => (
                <label
                  key={type.value}
                  className={`relative cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                    sourceType === type.value
                      ? "border-[#D9B799] bg-[#4A3222]"
                      : "border-[#4A3222] bg-[#1A140D] hover:border-[#6A4E3D]"
                  }`}
                >
                  <input
                    type="radio"
                    name="sourceType"
                    value={type.value}
                    checked={sourceType === type.value}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 mt-1 ${
                        sourceType === type.value
                          ? "border-[#D9B799] bg-[#D9B799]"
                          : "border-[#6A4E3D]"
                      }`}
                    >
                      {sourceType === type.value && (
                        <div className="w-2 h-2 rounded-full bg-[#2D1F14] mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[#F0E6DA]">
                        {type.label}
                      </div>
                      <div className="text-sm text-[#8C6A58]">
                        {type.description}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Chat Data Configuration */}
          <div className="bg-[#1A140D] p-4 rounded-lg">
            <h3 className="text-[#D9B799] font-medium mb-3">
              Chat Data Configuration
            </h3>

            {/* Helpful message when no specific chat is selected */}
            {!chatSource.chat_id && (
              <div className="mb-4 p-3 bg-[#4A3222] rounded-lg border border-[#6A4E3D]">
                <p className="text-[#D9B799] text-sm">
                  💡 <strong>Tip:</strong> Leave Chat ID empty to analyze all
                  available chat data, or enter a specific Chat ID to focus on
                  one conversation.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[#8C6A58] text-sm mb-2">
                  Chat ID
                </label>
                <input
                  type="text"
                  placeholder="Enter chat ID or leave empty for all chats"
                  value={chatSource.chat_id || ""}
                  onChange={(e) =>
                    handleChatSourceChange("chat_id", e.target.value)
                  }
                  className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                />
                <p className="text-xs text-[#8C6A58] mt-1">
                  Leave empty to analyze all available chat data
                </p>
              </div>
              <div>
                <label className="block text-[#8C6A58] text-sm mb-2">
                  Data Type
                </label>
                <select
                  value={chatSource.data_type || "all"}
                  onChange={(e) =>
                    handleChatSourceChange("data_type", e.target.value)
                  }
                  className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                >
                  <option value="analysis_results">Analysis Results</option>
                  <option value="file_data">File Data</option>
                  <option value="conversations">Conversations</option>
                  <option value="all">All Data</option>
                </select>
              </div>
              <div>
                <label className="block text-[#8C6A58] text-sm mb-2">
                  Date Range
                </label>
                <select
                  value={chatSource.date_range || "7d"}
                  onChange={(e) =>
                    handleChatSourceChange("date_range", e.target.value)
                  }
                  className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                >
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatSource.include_attachments || false}
                    onChange={(e) =>
                      handleChatSourceChange(
                        "include_attachments",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-[#D9B799] bg-[#2D1F14] border-[#4A3222] rounded focus:ring-[#D9B799] focus:ring-2"
                  />
                  <span className="text-[#8C6A58] text-sm">
                    Include file attachments
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Visualization Options */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="w-4 h-4 text-[#D9B799] bg-[#2D1F14] border-[#4A3222] rounded focus:ring-[#D9B799] focus:ring-2"
              />
              <span className="text-[#D9B799] font-medium">
                Include Visualizations
              </span>
            </label>

            {includeCharts && (
              <div className="mt-4 bg-[#1A140D] p-4 rounded-lg">
                <h3 className="text-[#D9B799] font-medium mb-3">
                  Chart Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8C6A58] text-sm mb-2">
                      Chart Type
                    </label>
                    <select
                      value={visualization.type || ""}
                      onChange={(e) =>
                        handleVisualizationChange("type", e.target.value)
                      }
                      className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                    >
                      <option value="">Select chart type</option>
                      {chartTypes.map((chart) => (
                        <option key={chart.value} value={chart.value}>
                          {chart.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8C6A58] text-sm mb-2">
                      X-Axis Field
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., timestamp, category"
                      value={visualization.x_axis || ""}
                      onChange={(e) =>
                        handleVisualizationChange("x_axis", e.target.value)
                      }
                      className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Options */}
          <div>
            <label className="block text-[#D9B799] font-medium mb-3">
              Export Formats
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exportFormatOptions.map((format) => (
                <label
                  key={format.value}
                  className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-[#4A3222] hover:border-[#6A4E3D] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={exportFormats.includes(format.value)}
                    onChange={() => handleExportFormatChange(format.value)}
                    className="w-4 h-4 text-[#D9B799] bg-[#2D1F14] border-[#4A3222] rounded focus:ring-[#D9B799] focus:ring-2"
                  />
                  <div>
                    <div className="font-medium text-[#F0E6DA]">
                      {format.label}
                    </div>
                    <div className="text-sm text-[#8C6A58]">
                      {format.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Save Configuration */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveConfig}
                onChange={(e) => setSaveConfig(e.target.checked)}
                className="w-4 h-4 text-[#D9B799] bg-[#2D1F14] border-[#4A3222] rounded focus:ring-[#D9B799] focus:ring-2"
              />
              <span className="text-[#D9B799] font-medium">
                Save Report Configuration
              </span>
            </label>

            {saveConfig && (
              <div className="mt-4 bg-[#1A140D] p-4 rounded-lg">
                <h3 className="text-[#D9B799] font-medium mb-3">
                  Configuration Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8C6A58] text-sm mb-2">
                      Report Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter a descriptive name for this report"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                      required={saveConfig}
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleEnabled}
                        onChange={(e) => setScheduleEnabled(e.target.checked)}
                        className="w-4 h-4 text-[#D9B799] bg-[#2D1F14] border-[#4A3222] rounded focus:ring-[#D9B799] focus:ring-2"
                      />
                      <span className="text-[#8C6A58] text-sm">
                        Enable Scheduling
                      </span>
                    </label>
                  </div>
                </div>

                {scheduleEnabled && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#8C6A58] text-sm mb-2">
                        Schedule Pattern (Cron)
                      </label>
                      <input
                        type="text"
                        placeholder="0 9 * * 1 (Monday 9 AM)"
                        value={scheduleCron}
                        onChange={(e) => setScheduleCron(e.target.value)}
                        className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                      />
                      <p className="text-xs text-[#8C6A58] mt-1">
                        Format: minute hour day month weekday
                      </p>
                    </div>
                    <div>
                      <label className="block text-[#8C6A58] text-sm mb-2">
                        Quick Schedule
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            setScheduleCron(value);
                          }
                        }}
                        className="w-full bg-[#2D1F14] border border-[#4A3222] rounded px-3 py-2 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                      >
                        <option value="">Select preset...</option>
                        <option value="0 9 * * 1">Weekly (Monday 9 AM)</option>
                        <option value="0 9 * * 0">Weekly (Sunday 9 AM)</option>
                        <option value="0 9 1 * *">
                          Monthly (1st of month 9 AM)
                        </option>
                        <option value="0 9 * * 1-5">
                          Weekdays (Mon-Fri 9 AM)
                        </option>
                        <option value="0 */6 * * *">Every 6 hours</option>
                        <option value="0 0 * * *">Daily (Midnight)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={
                loading ||
                exportFormats.length === 0 ||
                (saveConfig && !reportName.trim())
              }
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                loading ||
                exportFormats.length === 0 ||
                (saveConfig && !reportName.trim())
                  ? "bg-[#4A3222] text-[#8C6A58] cursor-not-allowed"
                  : "bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14]"
              }`}
            >
              {loading
                ? "Generating Report..."
                : saveConfig
                ? "Generate & Save Report"
                : "Generate Report"}
            </button>
          </div>
        </form>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 p-4 rounded-lg">
          <div className="flex items-start">
            <span className="mr-2 mt-1">✅</span>
            <div className="whitespace-pre-line">{success}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg">
          <p className="flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
