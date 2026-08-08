"use client";

import React, { useState } from "react";
import DynamicChart from "./DynamicChart";
import type { ChartSpec } from "@/types/chat";

interface ChartCardProps {
  title: string;
  chartSpec: ChartSpec;
  rows: Record<string, unknown>[];
  columns: string[];
  insight?: string;
  sql?: string;
  onPin?: () => void;
  pinned?: boolean;
}

export default function ChartCard({
  title,
  chartSpec,
  rows,
  columns,
  insight,
  sql,
  onPin,
  pinned = false,
}: ChartCardProps) {
  const [isPinHovered, setIsPinHovered] = useState(false);

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        border: pinned ? "1px solid rgba(6,182,212,0.4)" : "1px solid var(--border)",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>
            {chartSpec.type === "kpi"
              ? "🔢"
              : chartSpec.type === "pie"
              ? "🥧"
              : chartSpec.type === "line" || chartSpec.type === "area"
              ? "📈"
              : chartSpec.type === "scatter"
              ? "🔵"
              : "📊"}
          </span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>
            {title || chartSpec.title}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {onPin && (
            <button
              onClick={onPin}
              onMouseEnter={() => setIsPinHovered(true)}
              onMouseLeave={() => setIsPinHovered(false)}
              style={{
                background: pinned
                  ? "rgba(6,182,212,0.15)"
                  : isPinHovered
                  ? "rgba(6,182,212,0.08)"
                  : "transparent",
                border: `1px solid ${pinned ? "rgba(6,182,212,0.4)" : "var(--border)"}`,
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11,
                color: pinned ? "var(--accent)" : "var(--text-3)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {pinned ? "✓ Pinned" : "📌 Pin to Dashboard"}
            </button>
          )}
        </div>
      </div>

      {/* Chart Body */}
      <div style={{ padding: "16px 16px 8px" }}>
        <DynamicChart chartSpec={chartSpec} rows={rows} columns={columns} />
      </div>

      {/* Insight footer */}
      {insight && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text-2)",
            background: "rgba(6,182,212,0.04)",
          }}
        >
          💡 {insight}
        </div>
      )}
    </div>
  );
}
