"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Clock, Database } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface SqlCodeViewerProps {
  sql: string;
  executionTimeMs?: number;
  rowCount?: number;
}

export default function SqlCodeViewer({
  sql,
  executionTimeMs,
  rowCount,
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
        borderRadius: "var(--radius-sm)",
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              gap: 6,
              padding: 0,
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Generated SQL Query</span>
          </button>

          {executionTimeMs !== undefined && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={12} />
              {formatDuration(executionTimeMs)}
            </span>
          )}

          {rowCount !== undefined && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Database size={12} />
              {rowCount} rows
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 11,
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {copied ? (
            <>
              <Check size={12} style={{ color: "var(--success)" }} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy SQL</span>
            </>
          )}
        </button>
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
