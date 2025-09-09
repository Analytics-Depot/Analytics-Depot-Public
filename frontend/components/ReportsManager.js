// components/ReportsManager.js
import { useState } from "react";

export default function ReportsManager({
  definitions,
  loading,
  onRefresh,
  onTabChange,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  // Placeholder for when backend supports report definitions
  const hasDefinitions = definitions && definitions.length > 0;

  const handleStartEdit = (definition) => {
    setEditingId(definition.id);
    setEditingName(definition.name || "");
  };

  const handleSaveEdit = async (id) => {
    if (editingName.trim()) {
      // TODO: Implement update report definition API call
      console.log("Updating report definition:", id, editingName);
      setEditingId(null);
      setEditingName("");
      onRefresh();
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this report definition?")) {
      // TODO: Implement delete report definition API call
      console.log("Deleting report definition:", id);
      onRefresh();
    }
  };

  const handleRunNow = async (definition) => {
    // TODO: Implement run report definition API call
    console.log("Running report definition:", definition.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D9B799]"></div>
      </div>
    );
  }

  if (!hasDefinitions) {
    return (
      <div className="text-center py-12">
        <div className="text-[#8C6A58] text-lg mb-4">
          📊 No saved report definitions yet
        </div>
        <p className="text-[#8C6A58] mb-6">
          Create your first report definition to get started. Use the Report
          Builder to save frequently used report configurations and schedule
          them to run automatically.
        </p>
        <div className="bg-[#2D1F14] rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-[#D9B799] font-medium mb-3">
            Features Available
          </h3>
          <ul className="text-[#8C6A58] text-sm space-y-2 text-left">
            <li>✅ Save report configurations</li>
            <li>✅ Schedule recurring reports</li>
            <li>• Share reports with team members</li>
            <li>• Template library</li>
          </ul>
          <div className="mt-4 text-center">
            <button
              onClick={() => onTabChange && onTabChange("builder")}
              className="bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14] px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Go to Report Builder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#F0E6DA]">
          Saved Report Definitions
        </h2>
        <button
          onClick={onRefresh}
          className="bg-[#4A3222] hover:bg-[#5C3E2E] text-[#D9B799] px-4 py-2 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {definitions.map((definition) => (
          <div
            key={definition.id}
            className="bg-[#2D1F14] rounded-lg p-4 border border-[#4A3222] hover:border-[#6A4E3D] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingId === definition.id ? (
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-[#1A140D] border border-[#4A3222] rounded px-3 py-1 text-[#F0E6DA] focus:border-[#D9B799] focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(definition.id)}
                      className="text-[#D9B799] hover:text-[#F0E6DA] text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[#8C6A58] hover:text-[#D9B799] text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <h3 className="text-[#F0E6DA] font-medium">
                      {definition.name || "Untitled Report"}
                    </h3>
                    <button
                      onClick={() => handleStartEdit(definition)}
                      className="text-[#8C6A58] hover:text-[#D9B799] text-sm"
                    >
                      Edit
                    </button>
                  </div>
                )}

                <div className="mt-2 text-sm text-[#8C6A58]">
                  <span className="mr-4">Source: {definition.source_type}</span>
                  <span className="mr-4">
                    Schedule: {definition.schedule_cron || "On-demand"}
                  </span>
                  <span>Last run: {definition.last_run || "Never"}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRunNow(definition)}
                  className="bg-[#D9B799] hover:bg-[#C4A085] text-[#2D1F14] px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  Run Now
                </button>
                <button
                  onClick={() => handleDelete(definition.id)}
                  className="text-red-400 hover:text-red-300 p-2"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            {definition.description && (
              <p className="mt-3 text-[#8C6A58] text-sm">
                {definition.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
