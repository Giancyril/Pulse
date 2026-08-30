"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertTriangle, CheckCircle, Search, Beaker, Play, RefreshCw, Layers } from "lucide-react";
import { api } from "@/lib/api-client";
import type { CleaningSuggestionsResponse, CleaningSuggestion, CleaningResultResponse } from "@/types/cleaning";

interface GuidedCleaningTabProps {
  datasetId: string;
  onRefreshProfile: () => void;
}

export default function GuidedCleaningTab({ datasetId, onRefreshProfile }: GuidedCleaningTabProps) {
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<CleaningResultResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<CleaningSuggestion | null>(null);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<CleaningSuggestionsResponse>(`/datasets/${datasetId}/cleaning-suggestions`);
      setSuggestions(res.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cleaning suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (datasetId) fetchSuggestions();
  }, [datasetId]);

  const handlePreview = async (suggestion: CleaningSuggestion) => {
    setActiveSuggestion(suggestion);
    setIsPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await api.post<CleaningResultResponse>(`/datasets/${datasetId}/clean`, {
        action_type: suggestion.suggested_action,
        column_name: suggestion.column_name,
        parameters: suggestion.action_parameters,
        dry_run: true
      });
      setPreviewData(res);
    } catch (e) {
      alert("Failed to preview action.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (!activeSuggestion) return;
    setIsPreviewLoading(true);
    try {
      await api.post(`/datasets/${datasetId}/clean`, {
        action_type: activeSuggestion.suggested_action,
        column_name: activeSuggestion.column_name,
        parameters: activeSuggestion.action_parameters,
        dry_run: false
      });
      setPreviewData(null);
      setActiveSuggestion(null);
      // Refresh suggestions and the overarching profile
      fetchSuggestions();
      onRefreshProfile();
    } catch (e) {
      alert("Failed to apply action.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "64px", textAlign: "center", color: "var(--text-muted)" }}>
        <Loader2 className="animate-spin" style={{ margin: "0 auto", marginBottom: 16 }} size={24} />
        <p>Analyzing dataset for quality issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "var(--critical)" }}>
        <AlertTriangle style={{ marginBottom: 8 }} />
        <p>{error}</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="card" style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", marginTop: 24 }}>
        <CheckCircle style={{ margin: "0 auto", marginBottom: 16, color: "var(--success)" }} size={32} />
        <h3 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Your data looks clean!</h3>
        <p>No major anomalies, missing values, or obvious outliers were detected.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
      {/* Suggestions List */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Detected Issues ({suggestions.length})</h3>
        {suggestions.map((sug, idx) => (
          <div key={idx} className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, border: activeSuggestion === sug ? "2px solid var(--accent)" : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ 
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: 12,
                    background: sug.severity === "high" ? "var(--critical-dim)" : sug.severity === "medium" ? "rgba(245,158,11,0.15)" : "var(--accent-dim)",
                    color: sug.severity === "high" ? "var(--critical)" : sug.severity === "medium" ? "var(--warning)" : "var(--accent)",
                  }}>
                    {sug.severity}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>{sug.column_name || "Dataset Level"}</span>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{sug.description}</h4>
              </div>
              <button 
                onClick={() => handlePreview(sug)}
                className="btn-secondary"
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                <Beaker size={14} />
                <span>Preview Fix</span>
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", background: "var(--surface)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Suggested Action: </span> 
              {sug.suggested_action} ({sug.impact_estimate})
            </div>
          </div>
        ))}
      </div>

      {/* Preview Panel */}
      <div style={{ width: 400, flexShrink: 0 }}>
        <div className="card" style={{ position: "sticky", top: 24, padding: "20px", display: "flex", flexDirection: "column", minHeight: 400 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={18} /> Preview Changes
          </h3>
          
          {!activeSuggestion ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", textAlign: "center", fontSize: 13 }}>
              Select "Preview Fix" on any issue to see the proposed changes before applying them.
            </div>
          ) : isPreviewLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexDirection: "column", gap: 12 }}>
              <Loader2 className="animate-spin" size={24} />
              <span style={{ fontSize: 13 }}>Running dry-run simulation...</span>
            </div>
          ) : previewData ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, marginBottom: 8 }}>Impact Summary:</div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {previewData.summary}
                </p>
              </div>

              {previewData.sample_diff && previewData.sample_diff.length > 0 && (
                <div style={{ marginBottom: 24, flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, marginBottom: 8 }}>Sample Diff:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                    {previewData.sample_diff.map((diff, i) => (
                      <div key={i} style={{ fontSize: 12, fontFamily: "monospace", padding: "10px", background: "var(--background)", borderRadius: 6, border: "1px solid var(--border)" }}>
                        {diff.before && <div style={{ color: "var(--critical)", opacity: 0.8 }}>- {JSON.stringify(diff.before)}</div>}
                        {diff.after && <div style={{ color: "var(--success)" }}>+ {JSON.stringify(diff.after)}</div>}
                        {!diff.after && <div style={{ color: "var(--text-muted)", fontStyle: "italic", marginTop: 4 }}>(Row removed)</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
                <button className="btn-secondary" onClick={() => { setActiveSuggestion(null); setPreviewData(null); }} style={{ flex: 1 }}>Cancel</button>
                <button className="btn-primary" onClick={handleApply} style={{ flex: 1, background: "var(--success)" }}>
                  <Play size={14} /> Apply Fix
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
