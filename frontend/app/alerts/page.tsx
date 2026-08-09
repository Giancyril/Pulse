"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight, Bell, BellOff, Loader2, Plus, Trash2, Play, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import type { AlertRule, AlertRuleCreate, AlertEvalResult } from "@/types/alert";
import type { Dataset } from "@/types/dataset";

import CustomSelectDropdown from "@/components/shared/CustomSelectDropdown";

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [evalResults, setEvalResults] = useState<Record<string, AlertEvalResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AlertRuleCreate>({ name: "", dataset_id: "", metric_column: "", aggregate_fn: "AVG", operator: ">", threshold: 0, severity: "warning" });
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  const loadRules = () => api.get<AlertRule[]>("/alerts").then(setRules).catch(() => { });
  useEffect(() => {
    Promise.all([
      api.get<AlertRule[]>("/alerts").then(setRules),
      api.get<Dataset[]>("/datasets").then(setDatasets),
    ]).finally(() => setIsLoading(false));
  }, []);

  const activeDataset = datasets.find((d) => d.id === form.dataset_id);
  const columns = activeDataset?.tables[0]?.columns ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post<AlertRule>("/alerts", form);
      await loadRules();
      setShowForm(false);
      setForm({ name: "", dataset_id: "", metric_column: "", aggregate_fn: "AVG", operator: ">", threshold: 0, severity: "warning" });
    } catch { } finally { setIsCreating(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/alerts/${id}`, { method: "DELETE" });
    await loadRules();
  };

  const handleEvaluate = async (id: string) => {
    setEvaluatingId(id);
    try {
      const result = await api.post<AlertEvalResult>(`/alerts/${id}/evaluate`, {});
      setEvalResults((prev) => ({ ...prev, [id]: result }));
      await loadRules();
    } catch { } finally { setEvaluatingId(null); }
  };

  const handleEvaluateAll = async () => {
    setEvaluatingId("all");
    try {
      const results = await api.post<AlertEvalResult[]>("/alerts/evaluate-all", {});
      const map: Record<string, AlertEvalResult> = {};
      results.forEach((r) => { map[r.rule_id] = r; });
      setEvalResults(map);
      await loadRules();
    } catch { } finally { setEvaluatingId(null); }
  };

  const severityIcon = (sev: string, triggered: boolean) => {
    if (!triggered) return <CheckCircle2 size={16} style={{ color: "var(--success)" }} />;
    if (sev === "critical") return <XCircle size={16} style={{ color: "var(--critical)" }} />;
    return <AlertTriangle size={16} style={{ color: "var(--warning)" }} />;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "0.25em", textTransform: "uppercase" }}>Pulse</span>
          </div>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          {rules.length > 0 && <button onClick={handleEvaluateAll} className="btn-ghost" style={{ fontSize: 13 }} disabled={evaluatingId === "all"}>
            {evaluatingId === "all" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}<span>Check All Rules</span>
          </button>}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ fontSize: 13 }}>
            <Plus size={14} /><span>New Alert Rule</span>
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, padding: "32px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Metric Watchdog</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Create threshold-based alert rules that monitor live dataset metrics and notify on breaches.</p>
        </div>

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="card" style={{ marginBottom: 24, padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "var(--text-primary)" }}>New Alert Rule</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Rule Name</label>
                <input type="text" placeholder="e.g. High Revenue Alert" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Dataset</label>
                <CustomSelectDropdown
                  options={[
                    { label: "Select...", value: "" },
                    ...datasets.map((d) => ({ label: d.name, value: d.id })),
                  ]}
                  value={form.dataset_id}
                  onChange={(val) => setForm({ ...form, dataset_id: val, metric_column: "" })}
                  placeholder="Select..."
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Metric Column</label>
                <CustomSelectDropdown
                  options={[
                    { label: "Select...", value: "" },
                    ...columns.map((c) => ({ label: c.name, value: c.name })),
                  ]}
                  value={form.metric_column}
                  onChange={(val) => setForm({ ...form, metric_column: val })}
                  placeholder="Select..."
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Aggregate</label>
                <CustomSelectDropdown
                  options={["AVG", "SUM", "MAX", "MIN", "COUNT"].map((f) => ({ label: f, value: f }))}
                  value={form.aggregate_fn}
                  onChange={(val) => setForm({ ...form, aggregate_fn: val as any })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Operator</label>
                <CustomSelectDropdown
                  options={[">", "<", ">=", "<=", "=="].map((op) => ({ label: op, value: op }))}
                  value={form.operator}
                  onChange={(val) => setForm({ ...form, operator: val as any })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Threshold</label>
                <input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Severity</label>
                <CustomSelectDropdown
                  options={["info", "warning", "critical"].map((s) => ({ label: s, value: s }))}
                  value={form.severity}
                  onChange={(val) => setForm({ ...form, severity: val as any })}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
              <button type="submit" disabled={isCreating} className="btn-primary" style={{ fontSize: 13 }}>
                {isCreating ? <><Loader2 size={13} className="animate-spin" /><span>Creating...</span></> : <span>Create Rule</span>}
              </button>
            </div>
          </form>
        )}

        {/* Rules List */}
        {isLoading ? <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading alert rules...</p> : rules.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
            <BellOff size={32} style={{ margin: "0 auto 12px", opacity: 0.3, color: "var(--text-muted)" }} />
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>No alert rules configured. Create one above to start monitoring dataset metrics.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rules.map((rule) => {
              const evalResult = evalResults[rule.id];
              const isTriggered = evalResult ? evalResult.triggered : rule.triggered;
              const borderColor = isTriggered ? (rule.severity === "critical" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)") : "var(--border)";
              return (
                <div key={rule.id} className="card" style={{ padding: "14px 18px", border: `1px solid ${borderColor}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {severityIcon(rule.severity, isTriggered)}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{rule.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                          {rule.aggregate_fn}({rule.metric_column}) {rule.operator} {rule.threshold}
                        </div>
                      </div>
                      <span className={`badge${rule.severity === "critical" ? "" : ""}`} style={{ background: rule.severity === "critical" ? "var(--critical-dim)" : rule.severity === "warning" ? "rgba(245,158,11,0.1)" : "var(--accent-dim)", color: rule.severity === "critical" ? "var(--critical)" : rule.severity === "warning" ? "var(--warning)" : "var(--accent)", borderColor: rule.severity === "critical" ? "rgba(239,68,68,0.3)" : rule.severity === "warning" ? "rgba(245,158,11,0.3)" : "var(--accent-border)" }}>
                        {rule.severity}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {evalResult && (
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: evalResult.triggered ? "var(--critical)" : "var(--success)" }}>
                          Value: {evalResult.current_value}
                        </span>
                      )}
                      {rule.last_checked_at && !evalResult && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Last: {rule.last_value?.toFixed(2)}
                        </span>
                      )}
                      <button onClick={() => handleEvaluate(rule.id)} disabled={evaluatingId === rule.id} className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }}>
                        {evaluatingId === rule.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        <span>Check</span>
                      </button>
                      <button onClick={() => handleDelete(rule.id)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {evalResult && (
                    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: "var(--radius-sm)", background: evalResult.triggered ? "var(--critical-dim)" : "var(--success-dim)", border: `1px solid ${evalResult.triggered ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`, fontSize: 12, color: evalResult.triggered ? "var(--critical)" : "var(--success)" }}>
                      {evalResult.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
