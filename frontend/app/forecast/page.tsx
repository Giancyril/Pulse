"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import ForecastChart from "@/components/charts/ForecastChart";
import type { Dataset } from "@/types/dataset";
import type { ForecastResponse } from "@/types/forecast";

import CustomSelectDropdown from "@/components/shared/CustomSelectDropdown";

export default function ForecastPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [valueColumn, setValueColumn] = useState("");
  const [labelColumn, setLabelColumn] = useState("");
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [method, setMethod] = useState<"linear_regression" | "moving_average">("linear_regression");
  const [result, setResult] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dataset[]>("/datasets").then((d) => {
      setDatasets(d);
      if (d[0]) setSelectedId(d[0].id);
    }).catch(() => { });
  }, []);

  const activeDataset = datasets.find((d) => d.id === selectedId);
  const columns = activeDataset?.tables[0]?.columns ?? [];

  const handleRun = async () => {
    if (!selectedId || !valueColumn) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ value_column: valueColumn, forecast_periods: String(forecastPeriods), method });
      if (labelColumn) params.set("label_column", labelColumn);
      const data = await api.get<ForecastResponse>(`/datasets/${selectedId}/forecast?${params}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Forecast failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "0.25em", textTransform: "uppercase" }}>Pulse</span>
          </div>
        </Link>
        <Link href="/chat"><button className="btn-primary" style={{ fontSize: 13 }}><span>Query Explorer</span><ArrowRight size={14} /></button></Link>
      </nav>

      <div style={{ flex: 1, padding: "32px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Trend & Forecast Engine</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Linear regression and moving-average forecasting with R² trend quality scoring.</p>
        </div>

        {/* Controls */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Dataset</label>
              <CustomSelectDropdown
                options={datasets.map((d) => ({ label: d.name, value: d.id }))}
                value={selectedId}
                onChange={(val) => { setSelectedId(val); setValueColumn(""); setLabelColumn(""); }}
                placeholder="Select dataset..."
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Value Column (Numeric)</label>
              <CustomSelectDropdown
                options={[
                  { label: "Select column...", value: "" },
                  ...columns.map((c) => ({ label: `${c.name} (${c.type})`, value: c.name })),
                ]}
                value={valueColumn}
                onChange={setValueColumn}
                placeholder="Select column..."
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Label Column (Optional)</label>
              <CustomSelectDropdown
                options={[
                  { label: "Use row index", value: "" },
                  ...columns.map((c) => ({ label: c.name, value: c.name })),
                ]}
                value={labelColumn}
                onChange={setLabelColumn}
                placeholder="Use row index"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Forecast Periods</label>
              <input type="number" min={1} max={30} value={forecastPeriods} onChange={(e) => setForecastPeriods(Number(e.target.value))} style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Method</label>
              <CustomSelectDropdown
                options={[
                  { label: "Linear Regression", value: "linear_regression" },
                  { label: "Moving Average", value: "moving_average" },
                ]}
                value={method}
                onChange={(val) => setMethod(val as any)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button onClick={handleRun} disabled={!selectedId || !valueColumn || isLoading} className="btn-primary" style={{ width: "100%", fontSize: 13, padding: "9px 0" }}>
                {isLoading ? <><Loader2 size={13} className="animate-spin" /><span>Running...</span></> : <><TrendingUp size={14} /><span>Run Forecast</span></>}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--critical-dim)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--critical)", fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <AlertCircle size={15} /><span>{error}</span>
          </div>
        )}

        {result && <ForecastChart data={result} />}

        {!result && !isLoading && !error && (
          <div className="card" style={{ textAlign: "center", padding: "56px 24px", color: "var(--text-muted)" }}>
            <TrendingUp size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>Select a dataset and numeric column above, then click Run Forecast.</p>
          </div>
        )}
      </div>
    </div>
  );
}
