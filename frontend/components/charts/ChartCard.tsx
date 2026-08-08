"use client";

import React, { useState } from "react";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Activity, BookmarkCheck, Bookmark } from "lucide-react";
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

  const getChartIcon = () => {
    switch (chartSpec.type) {
      case "line":
      case "area":
        return <LineIcon size={15} />;
      case "pie":
        return <PieIcon size={15} />;
      case "scatter":
        return <Activity size={15} />;
      default:
        return <BarChart3 size={15} />;
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        border: pinned ? "1px solid var(--accent-border)" : "1px solid var(--border)",
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
          background: "var(--surface-hover)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
            }}
          >
            {getChartIcon()}
          </div>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
            {title || chartSpec.title}
          </span>
        </div>

        {onPin && (
          <button
            onClick={onPin}
            onMouseEnter={() => setIsPinHovered(true)}
            onMouseLeave={() => setIsPinHovered(false)}
            style={{
              background: pinned
                ? "var(--accent-dim)"
                : isPinHovered
                ? "var(--surface)"
                : "transparent",
              border: `1px solid ${pinned ? "var(--accent-border)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 500,
              color: pinned ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            {pinned ? (
              <>
                <BookmarkCheck size={12} />
                <span>Pinned</span>
              </>
            ) : (
              <>
                <Bookmark size={12} />
                <span>Pin to Dashboard</span>
              </>
            )}
          </button>
        )}
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
            color: "var(--text-secondary)",
            background: "rgba(6,182,212,0.03)",
          }}
        >
          {insight}
        </div>
      )}
    </div>
  );
}
