"use client";

import React, { useState } from "react";
import { Zap, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import type { SqlOptimizeResponse } from "@/types/optimizer";

interface SqlOptimizerPanelProps {
  analysis: SqlOptimizeResponse;
  onApplyOptimized?: (sql: string) => void;
}

export default function SqlOptimizerPanel({ analysis, onApplyOptimized }: SqlOptimizerPanelProps) {
  const [activeTab, setActiveTab] = useState<"suggestions" | "formatted" | "transpile">("suggestions");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getImpactColor = (impact: string) => {
    if (impact === "HIGH") return "var(--critical)";
    if (impact === "MEDIUM") return "var(--warning)";
    return "var(--accent)";
  };

  const scoreColor =
    analysis.complexity_score > 60
      ? "var(--critical)"
      : analysis.complexity_score > 30
      ? "var(--warning)"
      : "var(--success)";

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-medium)",
        background: "var(--surface)",
        overflow: "hidden",
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--surface-hover)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={15} style={{ color: "var(--warning)" }} />
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>SQL Performance & AST Analysis</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Complexity:</span>
            <span style={{ fontWeight: 800, color: scoreColor, fontFamily: "var(--font-mono)" }}>
              {analysis.complexity_score}/100
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        {[
          { key: "suggestions", label: `Suggestions (${analysis.suggestions.length})` },
          { key: "formatted", label: "Pretty SQL" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
        {activeTab === "suggestions" && (
          <div>
            {analysis.suggestions.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontSize: 13 }}>
                <CheckCircle2 size={16} />
                <span>No performance anti-patterns detected in this query!</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analysis.suggestions.map((sug, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface-hover)",
                      border: `1px solid var(--border)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        className="badge"
                        style={{
                          background: `${getImpactColor(sug.impact)}15`,
                          color: getImpactColor(sug.impact),
                          borderColor: `${getImpactColor(sug.impact)}40`,
                          fontSize: 10,
                        }}
                      >
                        {sug.impact} IMPACT
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{sug.title}</span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "4px 0 6px" }}>
                      {sug.explanation}
                    </p>
                    <div style={{ color: "var(--accent)", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-mono)" }}>
                      💡 {sug.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "formatted" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {analysis.ast_summary}
              </span>
              <button
                onClick={() => handleCopy(analysis.optimized_sql)}
                className="btn-ghost"
                style={{ fontSize: 11, padding: "3px 8px" }}
              >
                {copied ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy SQL"}</span>
              </button>
            </div>
            <pre
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#e4e4e7",
                background: "var(--surface-hover)",
                padding: "12px",
                borderRadius: "var(--radius-sm)",
                overflowX: "auto",
                margin: 0,
                border: "1px solid var(--border)",
              }}
            >
              {analysis.optimized_sql}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
