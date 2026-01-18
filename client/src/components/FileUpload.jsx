import React, { useState, useRef, useEffect } from "react";
import { uploadFile } from "../utils/api";
import { useLoading } from "../context/LoadingContext";
import AOS from 'aos';

const FileUpload = ({ onFileProcessed, onError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const ocrTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  //Reset state helper
  const resetProgress=()=>{
    setUploadProgress(0);
    setProcessingOcr(false);
    setOcrProgress(0);
    if (ocrTimerRef.current) {
      clearInterval(ocrTimerRef.current);
    }
  }

  const { showLoading, hideLoading } = useLoading();

  // Clean up the timer when component unmounts

  useEffect(() => {
    AOS.refresh();
    return () => resetProgress(); //ensure cleanup
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileUpload = async (file) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      onError("Please upload a PDF or image file (JPEG, JPG, PNG)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError("File size must be less than 10MB");
      return;
    }

    try {
      showLoading();
      setUploadProgress(0);

      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        setProcessingOcr(true);
        setOcrProgress(0);

        if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);

        ocrTimerRef.current = setInterval(() => {
          setOcrProgress((prev) => {
            if (prev >= 95) return 95;
            const increment =
              prev < 20
                ? 0.8
                : prev < 40
                ? 0.5
                : prev < 60
                ? 0.3
                : prev < 80
                ? 0.2
                : 0.1;
            return prev + increment;
          });
        }, 1000);
      }

      const result = await uploadFile(file, (progress) => {
        if (!processingOcr) setUploadProgress(progress);
      });

      if (ocrTimerRef.current) {
        clearInterval(ocrTimerRef.current);
        setOcrProgress(100);
      }

      hideLoading();
      if (result.isScannedDocument) {
        onFileProcessed(result);
        if (result.requiresManualEntry) {
          onError(
            "This looks like a scanned document. No health parameters detected — you may need to enter data manually."
          );
        } else {
          onError(
            "This looks like a scanned document. Some health parameters detected, but verify for completeness."
          );
        }
      } else {
        onFileProcessed(result);
      }
    } catch (error) {
      console.error("File upload error:", error);
      if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);

      if (error.message?.includes("No text could be extracted")) {
        onError("No readable text found. Please upload a clearer report.");
      } else if (error.message?.includes("No health parameters found")) {
        onError(
          "Could not detect health parameters. Please upload a standard health report."
        );
      } else if (
        error.message?.includes("timeout") ||
        error.code === "ECONNABORTED"
      ) {
        onError(
          "The server is taking too long. Try again later or with a simpler file."
        );
      } else if (
        error.message?.includes("Network Error") ||
        !navigator.onLine
      ) {
        onError("Network issue detected. Please check your connection.");
      } else if (error.response?.status === 413) {
        onError("File too large. Please upload under 10MB.");
      } else if (error.response?.status === 415) {
        onError("Unsupported format. Please upload PDF, JPEG, JPG, or PNG.");
      } else if (error.response?.status >= 500) {
        onError("Server error. Please try again later.");
      } else {
        onError(error.message || "Upload failed. Please try again.");
      }
    } finally {
      hideLoading();
      resetProgress();
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Handle keyboard activation (Enter or Space)
  const handleKeyPress = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFileDialog();
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        onKeyDown={handleKeyPress}
        tabIndex={0}
        role="button"
        aria-label="Upload your health report via click or drag-and-drop"
      >
        <div className="upload-icon">📄</div>
        <h3>Upload Your Health Report</h3>
        <p>Drag and drop your PDF or image file here, or click to browse</p>
        <p className="file-types">Supported: PDF, JPEG, JPG, PNG (max 10MB)</p>

        {uploadProgress > 0 && !processingOcr && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span>{uploadProgress}% uploaded</span>
          </div>
        )}

        {processingOcr && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${ocrProgress}%` }}
              ></div>
            </div>
            <span>
              {ocrProgress < 100
                ? "Analyzing document with OCR..."
                : "Analysis complete!"}
            </span>
            <p className="ocr-note">
              OCR processing can take up to 5 minutes for complex documents
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <div className="upload-tips" data-aos="fade-up" data-aos-delay="400">
        <h4 data-aos="fade-right" data-aos-delay="500">📋 Tips for better results:</h4>
        <ul data-aos="fade-up" data-aos-delay="600">
          <li>Ensure the document is clear and well-lit</li>
          <li>Include the full lab report with parameter names and values</li>
          <li>Avoid blurry or skewed images</li>
          <li>Make sure text is readable and not cut off</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
