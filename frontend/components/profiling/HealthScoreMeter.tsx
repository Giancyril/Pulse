"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, AlertCircle } from "lucide-react";

interface HealthScoreMeterProps {
  score: number;
  totalRows: number;
  totalColumns: number;
  nullPercentage: number;
  duplicateCount: number;
  warningCount: number;
}

export default function HealthScoreMeter({
  score,
  totalRows,
  totalColumns,
  nullPercentage,
  duplicateCount,
  warningCount,
}: HealthScoreMeterProps) {
  const color =
    score >= 85 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--critical)";
  const label = score >= 85 ? "Healthy" : score >= 60 ? "Needs Attention" : "Critical";
  const Icon = score >= 85 ? ShieldCheck : score >= 60 ? AlertTriangle : AlertCircle;
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="card"
      style={{ display: "flex", gap: 32, alignItems: "center", padding: "24px 28px", flexWrap: "wrap" }}
    >
      {/* Circular Score Meter */}
      <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="44" fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="55"
            cy="55"
            r="44"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{score}%</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Health</span>
        </div>
      </div>

      {/* Status Label */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon size={16} style={{ color }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
            {label}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Data Quality Health Score computed from null rates, duplicates, and outliers.
        </p>

        {/* Key Stats */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Rows", value: totalRows.toLocaleString() },
            { label: "Columns", value: totalColumns },
            { label: "Overall Nulls", value: `${nullPercentage}%` },
            { label: "Duplicates", value: duplicateCount },
            { label: "Warnings", value: warningCount },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
