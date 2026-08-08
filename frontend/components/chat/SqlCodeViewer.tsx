"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Clock, Database, Zap, Loader2 } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { api } from "@/lib/api-client";
import SqlOptimizerPanel from "./SqlOptimizerPanel";
import type { SqlOptimizeResponse } from "@/types/optimizer";

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
  const [optimizerData, setOptimizerData] = useState<SqlOptimizeResponse | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOptimize = async () => {
    if (optimizerData) {
      setShowOptimizer(!showOptimizer);
      return;
    }
    setIsOptimizing(true);
    try {
      const result = await api.post<SqlOptimizeResponse>("/sql/optimize", { sql, dialect: "sqlite" });
      setOptimizerData(result);
      setShowOptimizer(true);
    } catch {
      // silent
    } finally {
      setIsOptimizing(false);
    }
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

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            style={{
              background: showOptimizer ? "var(--accent-dim)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${showOptimizer ? "var(--accent-border)" : "var(--border)"}`,
              borderRadius: 4,
              padding: "3px 8px",
              fontSize: 11,
              color: showOptimizer ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} style={{ color: "var(--warning)" }} />}
            <span>{showOptimizer ? "Hide Analysis" : "Optimize SQL"}</span>
          </button>

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
      </div>

      {/* Code body */}
      {isExpanded && (
        <pre className="sql-block" style={{ margin: 0 }}>
          <code>{sql}</code>
        </pre>
      )}

      {/* Optimizer Panel */}
      {showOptimizer && optimizerData && (
        <div style={{ padding: "0 12px 12px" }}>
          <SqlOptimizerPanel analysis={optimizerData} />
        </div>
      )}
    </div>
  );
}
