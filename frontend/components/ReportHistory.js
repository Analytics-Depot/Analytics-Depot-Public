// components/ReportHistory.js
import { useState } from "react";

export default function ReportHistory({ runs, loading, onRefresh }) {
  const [selectedRun, setSelectedRun] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "running":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
      case "queued":
        return "text-blue-400";
      default:
        return "text-[#8C6A58]";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✅";
      case "running":
        return "🔄";
      case "failed":
        return "❌";
      case "queued":
        return "⏳";
      default:
        return "❓";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (startedAt, finishedAt) => {
    if (!startedAt || !finishedAt) return "N/A";
    const start = new Date(startedAt);
    const end = new Date(finishedAt);
    const duration = end - start;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleRunClick = (run) => {
    setSelectedRun(selectedRun?.id === run.id ? null : run);
  };

  const handleDownload = async (run, format = 'csv') => {
    try {
      // Check if we have outputs for this format
      if (!run.outputs || !run.outputs[format]) {
        console.log(`No ${format} output found for run:`, run.id);
        return;
      }

      const output = run.outputs[format];

      if (output.storage_type === 'base64') {
        // Handle base64-encoded files
        const csvData = output.data;
        const filename = output.filename;

        // Convert base64 to blob and download
        const byteCharacters = atob(csvData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'text/csv' });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log(`Downloaded ${format} file:`, filename);
      } else if (output.url) {
        // Handle URL-based files (Supabase storage)
        window.open(output.url, '_blank');
        console.log(`Opened ${format} file URL:`, output.url);
      } else {
        // Try to use the download endpoint as fallback
        try {
          const response = await fetch(`/api/reports/download/${run.id}/${format}`, {
            credentials: 'include'
          });

          if (response.ok) {
            const blob = await response.blob();
            const filename = output.filename || `report_${run.id.slice(0, 8)}.${format}`;

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log(`Downloaded ${format} file via API:`, filename);
          } else {
            console.error(`Failed to download ${format}:`, response.statusText);
          }
        } catch (apiError) {
          console.error(`API download failed for ${format}:`, apiError);
        }
      }
    } catch (error) {
      console.error(`Error downloading ${format} file:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D9B799]"></div>
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-[#8C6A58] text-lg mb-4">
          📋 No report runs yet
        </div>
        <p className="text-[#8C6A58] mb-6">
          Generate your first report using the Report Builder to see it appear here.
        </p>
        <div className="bg-[#2D1F14] rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-[#D9B799] font-medium mb-3">Report History Features</h3>
          <ul className="text-[#8C6A58] text-sm space-y-2 text-left">
            <li>• Track report generation progress</li>
            <li>• Download generated files</li>
            <li>• View error details</li>
            <li>• Monitor performance metrics</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#F0E6DA]">Report Run History</h2>
        <button
          onClick={onRefresh}
          className="bg-[#4A3222] hover:bg-[#5C3E2E] text-[#D9B799] px-4 py-2 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {runs.map((run) => (
          <div
            key={run.id}
            className={`bg-[#2D1F14] rounded-lg border transition-colors cursor-pointer ${
              selectedRun?.id === run.id
                ? "border-[#D9B799] bg-[#3A2A1A]"
                : "border-[#4A3222] hover:border-[#6A4E3D]"
            }`}
            onClick={() => handleRunClick(run)}
          >
            {/* Run Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`text-lg ${getStatusColor(run.status)}`}>
                    {getStatusIcon(run.status)}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#F0E6DA] font-medium">
                        Report Run {run.id.slice(0, 8)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)} bg-opacity-20`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="text-sm text-[#8C6A58] mt-1">
                      Created: {formatDate(run.created_at)}
                    </div>
                  </div>
                </div>

                <div className="text-right text-sm text-[#8C6A58]">
                  <div>Started: {formatDate(run.started_at)}</div>
                  <div>Duration: {formatDuration(run.started_at, run.finished_at)}</div>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedRun?.id === run.id && (
              <div className="border-t border-[#4A3222] p-4 bg-[#1A140D]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-[#D9B799] font-medium mb-2">Request Details</h4>
                    <div className="text-sm text-[#8C6A58] space-y-1">
                      <div>Source Type: {run.requested_payload?.source_type || "N/A"}</div>
                      <div>Export Formats: {run.requested_payload?.export?.formats?.join(", ") || "N/A"}</div>
                      <div>Include Charts: {run.requested_payload?.export?.include_charts ? "Yes" : "No"}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[#D9B799] font-medium mb-2">Outputs</h4>
                    {run.outputs && Object.keys(run.outputs).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(run.outputs).map(([format, output]) => {
                          // Skip metadata and other non-file outputs
                          if (format === 'metadata' || format === 'visualizations') {
                            return null;
                          }

                          if (output.error) {
                            return (
                              <div key={format} className="flex items-center justify-between text-sm">
                                <span className="text-[#8C6A58]">{format.toUpperCase()}: {output.error}</span>
                                <span className="text-red-400 text-xs">Error</span>
                              </div>
                            );
                          }

                          return (
                            <div key={format} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <span className="text-[#8C6A58]">{output.filename || `${format.toUpperCase()} file`}</span>
                                <div className="text-xs text-[#6A4E3D]">
                                  {output.storage_type === 'base64' ? 'Stored locally' : 'Stored in cloud'}
                                  {output.size_bytes && ` • ${(output.size_bytes / 1024).toFixed(1)} KB`}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(run, format);
                                }}
                                className="text-[#D9B799] hover:text-[#F0E6DA] text-xs underline"
                              >
                                Download
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-[#8C6A58]">No files generated yet</div>
                    )}
                  </div>
                </div>

                {run.error && (
                  <div className="bg-red-900/50 border border-red-700 rounded p-3">
                    <h4 className="text-red-200 font-medium mb-2">Error Details</h4>
                    <p className="text-red-300 text-sm">{run.error}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Find the first available format to download
                      const availableFormats = Object.keys(run.outputs || {}).filter(format =>
                        format !== 'metadata' && format !== 'visualizations' && !run.outputs[format].error
                      );
                      if (availableFormats.length > 0) {
                        handleDownload(run, availableFormats[0]);
                      }
                    }}
                    disabled={!run.outputs || Object.keys(run.outputs).filter(format =>
                      format !== 'metadata' && format !== 'visualizations' && !run.outputs[format].error
                    ).length === 0 || run.status !== "completed"}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      run.outputs && Object.keys(run.outputs).filter(format =>
                        format !== 'metadata' && format !== 'visualizations' && !run.outputs[format].error
                      ).length > 0 && run.status === "completed"
                        ? "bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14]"
                        : "bg-[#4A3222] text-[#8C6A58] cursor-not-allowed"
                    }`}
                  >
                    Download Files
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRun(null);
                    }}
                    className="px-3 py-2 rounded text-sm font-medium bg-[#4A3222] hover:bg-[#5C3E2E] text-[#D9B799] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
