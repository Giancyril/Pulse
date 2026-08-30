"use client";

import React, { useState, useEffect } from "react";
import { Loader2, RefreshCw, AlertTriangle, Sparkles, Activity, Layers, Hash } from "lucide-react";
import { api } from "@/lib/api-client";
import type { EDAReportResponse } from "@/types/eda";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, ZAxis
} from "recharts";

interface AutomatedEDATabProps {
  datasetId: string;
}

export default function AutomatedEDATab({ datasetId }: AutomatedEDATabProps) {
  const [report, setReport] = useState<EDAReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEda = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      if (forceRefresh) {
        const res = await api.post<EDAReportResponse>(`/datasets/${datasetId}/eda/refresh`, {});
        setReport(res);
      } else {
        const res = await api.get<EDAReportResponse>(`/datasets/${datasetId}/eda`);
        setReport(res);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load EDA report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (datasetId) fetchEda();
  }, [datasetId]);

  if (isLoading) {
    return (
      <div style={{ padding: "64px", textAlign: "center", color: "var(--text-muted)" }}>
        <Loader2 className="animate-spin" style={{ margin: "0 auto", marginBottom: 16 }} size={24} />
        <p>Computing statistical distributions and finding patterns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "var(--critical)", display: "flex", alignItems: "center", gap: 12 }}>
        <AlertTriangle />
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => fetchEda(true)} style={{ marginLeft: "auto" }}>Retry</button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 24 }}>
      {/* Header & Narrative */}
      <div className="card" style={{ padding: 24, background: "linear-gradient(to right, rgba(99,102,241,0.05), rgba(168,85,247,0.05))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent)" }}>
            <Sparkles size={20} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>AI Executive Summary</h3>
          </div>
          <button className="btn-secondary" onClick={() => fetchEda(true)} style={{ fontSize: 12, padding: "6px 12px" }}>
            <RefreshCw size={14} /> Recompute
          </button>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
          {report.narrative_summary.overview}
        </p>
        <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {report.narrative_summary.key_findings.map((finding, idx) => (
            <li key={idx} style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>
              {finding}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Distributions */}
        {report.distributions.map((dist) => (
          <div key={dist.column} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Activity size={16} color="var(--text-muted)" />
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{dist.column} Distribution</h4>
            </div>
            <div style={{ height: 200, width: "100%", marginBottom: 12 }}>
              <ResponsiveContainer>
                <BarChart data={dist.bins.map(b => ({ name: `${b.bin_start.toFixed(1)}-${b.bin_end.toFixed(1)}`, count: b.count }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip 
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                    cursor={{ fill: "var(--accent-dim)" }}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)", padding: "10px", background: "var(--background)", borderRadius: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Mean:</span> {dist.mean.toFixed(2)}</div>
              <div><span style={{ color: "var(--text-muted)" }}>Median:</span> {dist.median.toFixed(2)}</div>
              <div><span style={{ color: "var(--text-muted)" }}>Skew:</span> {dist.skewness.toFixed(2)}</div>
            </div>
          </div>
        ))}

        {/* Categorical Breakdowns */}
        {report.categorical_breakdowns.map((cat) => (
          <div key={cat.column} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Layers size={16} color="var(--text-muted)" />
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{cat.column} Breakdown</h4>
            </div>
            <div style={{ height: 200, width: "100%", marginBottom: 12 }}>
              <ResponsiveContainer>
                <BarChart data={cat.frequencies.slice(0, 5)} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} hide />
                  <YAxis type="category" dataKey="value" tick={{ fontSize: 11, fill: "var(--text-primary)" }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                    cursor={{ fill: "var(--background)" }}
                  />
                  <Bar dataKey="percentage" name="% Total" fill="var(--success)" radius={[0, 2, 2, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              Showing top categories. Distinct values: {cat.total_distinct}
            </div>
          </div>
        ))}
      </div>

      {/* Pairwise Scatters */}
      {report.pairwise_scatters.length > 0 && (
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Key Correlations</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {report.pairwise_scatters.map((scatter, i) => (
              <div key={i} className="card" style={{ padding: 20 }}>
                 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                    {scatter.x_column} vs {scatter.y_column}
                  </h4>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "var(--accent-dim)", color: "var(--accent)" }}>
                    r = {scatter.correlation.toFixed(2)}
                  </span>
                </div>
                <div style={{ height: 250, width: "100%" }}>
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" dataKey="x" name={scatter.x_column} tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                      <YAxis type="number" dataKey="y" name={scatter.y_column} tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                      />
                      <Scatter name="Points" data={scatter.points} fill="var(--accent)" opacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
