"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, ArrowRight, AlertTriangle, ShieldAlert, Loader2, RefreshCw, Zap } from "lucide-react";
import { api } from "@/lib/api-client";
import CustomSelectDropdown from "@/components/shared/CustomSelectDropdown";
import type { Dataset } from "@/types/dataset";
import type { AnomalyResponse, AnomalyPoint } from "@/types/anomaly";
import { formatNumber } from "@/lib/utils";

function AnomaliesContent() {
  const searchParams = useSearchParams();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [thresholdZ, setThresholdZ] = useState<number>(2.0);
  const [report, setReport] = useState<AnomalyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dataset[]>("/datasets").then((data) => {
      setDatasets(data);
      const preselect = searchParams.get("dataset") || (data[0]?.id ?? "");
      setSelectedId(preselect);
    }).catch(() => {});
  }, [searchParams]);

  const loadAnomalies = () => {
    if (!selectedId) return;
    setIsLoading(true);
    setError(null);
    api.get<AnomalyResponse>(`/datasets/${selectedId}/anomalies?threshold_z=${thresholdZ}`)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Anomaly scan failed"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAnomalies();
  }, [selectedId, thresholdZ]);

  const getSeverityBadge = (sev: AnomalyPoint["severity"]) => {
    if (sev === "EXTREME") {
      return (
        <span className="badge" style={{ background: "var(--critical-dim)", color: "var(--critical)", borderColor: "rgba(239,68,68,0.4)" }}>
          EXTREME (Z ≥ 3.5)
        </span>
      );
    }
    if (sev === "MODERATE") {
      return (
        <span className="badge" style={{ background: "rgba(245,158,11,0.12)", color: "var(--warning)", borderColor: "rgba(245,158,11,0.4)" }}>
          MODERATE (Z ≥ 2.5)
        </span>
      );
    }
    return (
      <span className="badge" style={{ background: "var(--accent-dim)", color: "var(--accent)", borderColor: "var(--accent-border)" }}>
        MILD (Z ≥ 2.0)
      </span>
    );
  };

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
        <Link href="/chat">
          <button className="btn-primary" style={{ fontSize: 13 }}>
            <span>Query Explorer</span>
            <ArrowRight size={14} />
          </button>
        </Link>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "32px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Automated Anomaly & Outlier Detection Engine
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Statistical Z-Score analysis identifying anomalous records across dataset columns.
          </p>
        </div>

        {/* Controls */}
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, alignItems: "center" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Target Dataset
              </label>
              <CustomSelectDropdown
                options={
                  datasets.length === 0
                    ? [{ label: "No datasets found", value: "" }]
                    : datasets.map((d) => ({ label: d.name, value: d.id }))
                }
                value={selectedId}
                onChange={setSelectedId}
                placeholder="Select dataset..."
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Z-Score Sensitivity Threshold ({thresholdZ.toFixed(1)} σ)
              </label>
              <input
                type="range"
                min={1.5}
                max={4.0}
                step={0.1}
                value={thresholdZ}
                onChange={(e) => setThresholdZ(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                <span>1.5 σ (Sensitive)</span>
                <span>2.5 σ (Standard)</span>
                <span>4.0 σ (Strict)</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={loadAnomalies}
                disabled={!selectedId || isLoading}
                className="btn-ghost"
                style={{ width: "100%", fontSize: 13, padding: "8px 0", justifyContent: "center" }}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>Rescan Dataset</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", background: "var(--critical-dim)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--critical)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {report && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPI Summary Banner */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
              {[
                { label: "Total Outliers", value: report.summary.total_anomalies, color: report.summary.total_anomalies > 0 ? "var(--warning)" : "var(--success)" },
                { label: "Extreme (≥3.5σ)", value: report.summary.extreme_count, color: report.summary.extreme_count > 0 ? "var(--critical)" : "var(--text-primary)" },
                { label: "Moderate (≥2.5σ)", value: report.summary.moderate_count, color: "var(--text-primary)" },
                { label: "Anomaly Rate", value: `${report.summary.anomaly_rate_pct}%`, color: "var(--accent)" },
              ].map((card) => (
                <div key={card.label} className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: "var(--font-mono)" }}>
                    {typeof card.value === "number" ? formatNumber(card.value) : card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Outliers Breakdown List */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  Flagged Anomalies ({report.anomalies.length})
                </h2>
                {report.summary.most_anomalous_column && (
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Most Anomalous Column: <strong style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{report.summary.most_anomalous_column}</strong>
                  </span>
                )}
              </div>

              {report.anomalies.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                  <ShieldAlert size={32} style={{ margin: "0 auto 12px", color: "var(--success)", opacity: 0.8 }} />
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                    No statistical anomalies detected above threshold {thresholdZ.toFixed(1)} σ. Dataset values are cleanly distributed.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {report.anomalies.map((item, idx) => (
                    <div key={idx} className="card" style={{ padding: "14px 18px", border: `1px solid ${item.severity === "EXTREME" ? "rgba(239,68,68,0.3)" : "var(--border)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {getSeverityBadge(item.severity)}
                          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                            {item.column_name}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Row #{item.row_index + 1}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: "var(--font-mono)" }}>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Observed: </span>
                            <span style={{ fontWeight: 700, color: "var(--critical)" }}>{item.value}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Mean: </span>
                            <span>{item.mean}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Std Dev: </span>
                            <span>{item.std_dev}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Z-Score: </span>
                            <span style={{ fontWeight: 700, color: "var(--accent)" }}>{item.z_score > 0 ? `+${item.z_score}` : item.z_score} σ</span>
                          </div>
                        </div>
                      </div>

                      {/* Row Data Snapshot */}
                      <div style={{ background: "var(--surface-hover)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", overflowX: "auto" }}>
                        {Object.entries(item.row_data).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join("  |  ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnomaliesPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    }>
      <AnomaliesContent />
    </Suspense>
  );
}
