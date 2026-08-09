"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import HealthScoreMeter from "@/components/profiling/HealthScoreMeter";
import ColumnProfileCard from "@/components/profiling/ColumnProfileCard";
import type { DataQualityReport } from "@/types/profiling";
import type { Dataset } from "@/types/dataset";
import CustomSelectDropdown from "@/components/shared/CustomSelectDropdown";

function ProfilingContent() {
  const searchParams = useSearchParams();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dataset[]>("/datasets").then((data) => {
      setDatasets(data);
      const preselect = searchParams.get("dataset") || (data[0]?.id ?? "");
      setSelectedId(preselect);
    }).catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) return;
    setIsLoading(true);
    setError(null);
    setReport(null);
    api.get<DataQualityReport>(`/datasets/${selectedId}/profile`)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Profile failed"))
      .finally(() => setIsLoading(false));
  }, [selectedId]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <BarChart3 size={16} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "0.25em", textTransform: "uppercase" }}>
              Pulse
            </span>
          </div>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/chat">
            <button className="btn-primary" style={{ fontSize: 13 }}>
              <span>Query Explorer</span>
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              Data Quality Report
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Statistical profiling, missingness analysis, IQR outlier detection, and health scoring.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>Dataset:</span>
            <CustomSelectDropdown
              options={
                datasets.length === 0
                  ? [{ label: "No datasets connected", value: "" }]
                  : datasets.map((d) => ({ label: d.name, value: d.id }))
              }
              value={selectedId}
              onChange={setSelectedId}
              placeholder="Select dataset..."
            />
          </div>
        </div>

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12, color: "var(--text-secondary)" }}>
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 14 }}>Profiling dataset — computing statistics...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", background: "var(--critical-dim)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--critical)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {report && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Health Score Panel */}
            <HealthScoreMeter
              score={report.health_score}
              totalRows={report.total_rows}
              totalColumns={report.total_columns}
              nullPercentage={report.overall_null_percentage}
              duplicateCount={report.duplicate_row_count}
              warningCount={report.warnings.length}
            />

            {/* Warnings */}
            {report.warnings.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {report.warnings.map((w, i) => (
                  <div key={i} style={{ padding: "9px 14px", borderRadius: "var(--radius-sm)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 12, color: "var(--warning)", display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={13} />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Column Profiles */}
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
                Column Profiles ({report.column_profiles.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.column_profiles.map((col) => (
                  <ColumnProfileCard key={col.name} profile={col} />
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !report && !error && datasets.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Upload a dataset first to generate a data quality report.
            </p>
            <Link href="/datasets">
              <button className="btn-primary" style={{ marginTop: 16, fontSize: 13 }}>
                <span>Go to Dataset Manager</span>
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilingPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    }>
      <ProfilingContent />
    </Suspense>
  );
}
