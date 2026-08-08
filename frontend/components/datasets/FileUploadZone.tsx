"use client";

import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import type { UploadResponse } from "@/types/dataset";

interface FileUploadZoneProps {
  onUploadSuccess: (data: UploadResponse) => void;
}

export default function FileUploadZone({ onUploadSuccess }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError("Please upload a valid .csv or .xlsx spreadsheet file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds maximum limit of 50MB.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.postForm<UploadResponse>("/upload", formData);
      onUploadSuccess(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload file";
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="card" style={{ width: "100%" }}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${
            isDragging ? "var(--accent)" : "var(--border-medium)"
          }`,
          borderRadius: "var(--radius-md)",
          padding: "40px 24px",
          textAlign: "center",
          background: isDragging ? "var(--accent-dim)" : "var(--surface-hover)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 180,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            marginBottom: 14,
          }}
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Upload size={20} />
          )}
        </div>

        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          {isUploading
            ? "Parsing spreadsheet & inferring schema types..."
            : "Click to upload or drag and drop spreadsheet"}
        </p>

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Supports CSV and XLSX files up to 50MB · Automatic data type inference
        </p>

        {/* Technical Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {["CSV", "XLSX", "Schema Inference", "SQL Ready"].map((tag) => (
            <span key={tag} className="badge">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            background: "var(--critical-dim)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--critical)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
