"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, BarChart3, Hash, Type } from "lucide-react";
import type { ColumnProfile } from "@/types/profiling";
import { formatNumber } from "@/lib/utils";

interface ColumnProfileCardProps {
  profile: ColumnProfile;
}

export default function ColumnProfileCard({ profile }: ColumnProfileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isNumeric = profile.mean_value !== null && profile.mean_value !== undefined;
  const hasOutliers = (profile.outlier_count ?? 0) > 0;
  const highNull = profile.null_percentage > 30;

  return (
    <div
      style={{
        border: `1px solid ${highNull || hasOutliers ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
        overflow: "hidden",
        transition: "all 0.15s ease",
      }}
    >
      {/* Header Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          cursor: "pointer",
          gap: 12,
          background: expanded ? "var(--surface-hover)" : "transparent",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-hover)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            flexShrink: 0,
          }}
        >
          {isNumeric ? <BarChart3 size={14} /> : <Type size={14} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              {profile.name}
            </span>
            <span className="badge">{profile.data_type}</span>
            {highNull && (
              <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "var(--warning)", borderColor: "rgba(245,158,11,0.3)" }}>
                High Nulls
              </span>
            )}
            {hasOutliers && (
              <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "var(--critical)", borderColor: "rgba(239,68,68,0.3)" }}>
                Outliers
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "flex", gap: 20, fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: profile.null_percentage > 30 ? "var(--warning)" : "var(--text-primary)" }}>
              {profile.null_percentage}%
            </div>
            <div>Nulls</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {formatNumber(profile.unique_count)}
            </div>
            <div>Unique</div>
          </div>
          {isNumeric && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                {profile.mean_value !== null ? formatNumber(profile.mean_value!) : "—"}
              </div>
              <div>Mean</div>
            </div>
          )}
        </div>

        <div style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {/* Null Fill Bar */}
      <div style={{ height: 2, background: "var(--border)" }}>
        <div
          style={{
            height: "100%",
            width: `${100 - profile.null_percentage}%`,
            background: profile.null_percentage > 30 ? "var(--warning)" : "var(--accent)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {[
              { label: "Total Rows", value: formatNumber(profile.total_count) },
              { label: "Null Count", value: formatNumber(profile.null_count) },
              { label: "Distinct %", value: `${profile.distinct_percentage}%` },
              { label: "Min", value: profile.min_value !== null ? String(profile.min_value) : "—" },
              { label: "Max", value: profile.max_value !== null ? String(profile.max_value) : "—" },
              ...(isNumeric ? [
                { label: "Std Dev", value: profile.std_dev !== null ? String(profile.std_dev) : "—" },
                { label: "P25", value: profile.quantiles ? String(profile.quantiles["25%"]) : "—" },
                { label: "P50 (Median)", value: profile.quantiles ? String(profile.quantiles["50%"]) : "—" },
                { label: "P75", value: profile.quantiles ? String(profile.quantiles["75%"]) : "—" },
                { label: "Outliers (IQR)", value: String(profile.outlier_count ?? 0) },
              ] : []),
            ].map((stat) => (
              <div key={stat.label} style={{ background: "var(--surface-hover)", borderRadius: "var(--radius-sm)", padding: "8px 12px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Top Frequencies */}
          {profile.top_frequencies && profile.top_frequencies.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Top Values by Frequency
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {profile.top_frequencies.map((entry, i) => {
                  const maxCount = profile.top_frequencies![0].count;
                  const pct = Math.round((entry.count / maxCount) * 100);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", width: 120, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.value}
                      </span>
                      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", width: 40, textAlign: "right" }}>
                        {formatNumber(entry.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
