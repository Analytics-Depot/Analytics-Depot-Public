import { useState, useRef } from "react";
import { FiUpload, FiFile, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { apiClient } from "../lib/api";

const FileUpload = ({ chatId, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    // Add defensive check for event and target
    if (!e || !e.target || !e.target.files) {
      console.error("[FileUpload] Invalid file selection event");
      return;
    }

    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    console.log("[FileUpload] Starting upload, file:", file, "chatId:", chatId);

    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    // Debug log for chatId
    console.log("[DEBUG] FileUpload handleUpload - chatId prop value:", chatId);
    if (chatId) {
      formData.append("chat_id", chatId);
    }

    try {
      console.log(
        "[FileUpload] Uploading file with chatId:",
        chatId,
        "file:",
        file.name
      );

      const response = await apiClient.files.upload(formData);
      console.log("[FileUpload] Upload successful:", response.data);

      setUploading(false);
      setUploadSuccess(true);
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
      setFile(null);
    } catch (err) {
      setUploading(false);

      // More detailed error logging
      console.error("[FRONTEND] Upload failed. See details below.");
      if (err.response) {
        console.error("[FRONTEND] Error Response:", err.response);
        console.error("[FRONTEND] Response Data:", err.response.data);
        console.error("[FRONTEND] Response Status:", err.response.status);
        console.error("[FRONTEND] Response Headers:", err.response.headers);
      } else if (err.request) {
        console.error("[FRONTEND] Error Request:", err.request);
      } else {
        console.error("[FRONTEND] Error Message:", err.message);
      }
      console.error(
        "[FRONTEND] Full Error Config:",
        err.config || "No config available"
      );

      let message = "File upload failed.";
      if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    }
  };

  const triggerFileSelect = () => {
    console.log(
      "[FileUpload] Triggering file select, ref:",
      fileInputRef.current
    );
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error("[FileUpload] File input ref is null");
    }
  };

  return (
    <div className="p-4 border-t border-[#2D1F14]">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={triggerFileSelect}
          className="flex-grow bg-[#2D1F14] px-4 py-2 rounded border border-[#6A4E3D] text-white truncate"
        >
          {file ? file.name : "Select a file..."}
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="p-2 rounded bg-[#D9B799] text-[#2D1F14] hover:bg-[#C0A080] disabled:opacity-50"
        >
          <FiUpload className="w-5 h-5" />
        </button>
      </div>

      {uploading && (
        <div className="mt-2">
          <div className="w-full bg-[#2D1F14] rounded-full h-1.5">
            <div
              className="bg-[#D9B799] h-1.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center text-[#8C6A58] mt-1">
            Uploading: {progress}%
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 text-red-400 text-sm flex items-center">
          <FiAlertCircle className="mr-2" />
          {error}
        </div>
      )}

      {uploadSuccess && (
        <div className="mt-2 text-green-400 text-sm flex items-center">
          <FiCheckCircle className="mr-2" />
          File uploaded successfully!
        </div>
      )}
    </div>
  );
};

export default FileUpload;
