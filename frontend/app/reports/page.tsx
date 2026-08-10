"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, ArrowRight, FileText, Sparkles, Loader2, Download, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import CustomSelectDropdown from "@/components/shared/CustomSelectDropdown";
import type { Dataset } from "@/types/dataset";
import type { ExecutiveReportResponse } from "@/types/report";

function ReportsContent() {
  const searchParams = useSearchParams();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");
  const [report, setReport] = useState<ExecutiveReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<Dataset[]>("/datasets").then((data) => {
      setDatasets(data);
      const preselect = searchParams.get("dataset") || (data[0]?.id ?? "");
      setSelectedId(preselect);
    }).catch(() => {});
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!selectedId) return;
    setIsLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await api.post<ExecutiveReportResponse>("/reports/generate", {
        dataset_id: selectedId,
        custom_instructions: instructions || undefined,
      });
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report.markdown_report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `executive_report_${report.dataset_name.toLowerCase().replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div style={{ flex: 1, padding: "32px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Executive BI Report Generator
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            AI-synthesized executive briefings with KPI scorecards, risk analyses, and strategic recommendations.
          </p>
        </div>

        {/* Generator Form */}
        <div className="card" style={{ marginBottom: 28, padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                Custom Executive Focus / Focus Areas (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Focus on Q3 revenue growth and operational cost efficiency..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                style={{ width: "100%", padding: "9px 12px" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleGenerate}
                disabled={!selectedId || isLoading}
                className="btn-primary"
                style={{ fontSize: 13, padding: "10px 24px" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Synthesizing Executive Report...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Generate Executive BI Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius-sm)", background: "var(--critical-dim)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--critical)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {report && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Header & Export Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Generated: {report.generated_at}</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Executive Briefing: {report.dataset_name}
                </h2>
              </div>
              <button onClick={handleDownload} className="btn-ghost" style={{ fontSize: 13, gap: 6 }}>
                <Download size={14} />
                <span>Export Markdown Report</span>
              </button>
            </div>

            {/* Executive Summary Card */}
            <div className="card" style={{ padding: 20, background: "var(--surface-hover)", border: "1px solid var(--accent-border)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Executive Summary
              </div>
              <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
                {report.executive_summary}
              </p>
            </div>

            {/* KPI Scorecards */}
            {report.kpi_scorecards.length > 0 && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                  Key Performance Indicator Scorecards
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  {report.kpi_scorecards.map((kpi, idx) => (
                    <div key={idx} className="card" style={{ padding: "16px 18px" }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{kpi.title}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                        {kpi.value}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--accent)" }}>{kpi.trend_note}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Recommendations */}
            {report.strategic_recommendations.length > 0 && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                  Strategic Recommendations
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {report.strategic_recommendations.map((rec, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--text-secondary)" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <span style={{ lineHeight: 1.5 }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}
