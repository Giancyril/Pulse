"use client";

import React, { useState } from "react";
import { formatDuration } from "@/lib/utils";

interface SqlCodeViewerProps {
  sql: string;
  executionTimeMs?: number;
  rowCount?: number;
  onEditAndRun?: (newSql: string) => void;
}

export default function SqlCodeViewer({
  sql,
  executionTimeMs,
  rowCount,
  onEditAndRun,
}: SqlCodeViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        margin: "12px 0",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "#0b0f19",
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "#131826",
          borderBottom: isExpanded ? "1px solid var(--border)" : "none",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{isExpanded ? "▼" : "▶"}</span>
            <span>Generated SQL Query</span>
          </button>

          {executionTimeMs !== undefined && (
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              ⏱ {formatDuration(executionTimeMs)}
            </span>
          )}

          {rowCount !== undefined && (
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              📊 {rowCount} rows
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "3px 8px",
              fontSize: 11,
              color: "var(--text-2)",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied" : "📋 Copy SQL"}
          </button>
        </div>
      </div>

      {/* Code body */}
      {isExpanded && (
        <pre className="sql-block" style={{ margin: 0 }}>
          <code>{sql}</code>
        </pre>
      )}
    </div>
  );
}
