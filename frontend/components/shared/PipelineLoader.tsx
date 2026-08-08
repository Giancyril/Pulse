"use client";

import React, { useState, useEffect } from "react";
import { Check, Loader2, Circle, Zap } from "lucide-react";

interface PipelineLoaderProps {
  stage: "thinking" | "generating_sql" | "executing" | "rendering" | "done";
}

const STAGES = [
  { key: "thinking", label: "Analyzing natural language query intent..." },
  { key: "generating_sql", label: "Generating PostgreSQL query via Gemini..." },
  { key: "executing", label: "Validating AST guardrails & executing SELECT..." },
  { key: "rendering", label: "Structuring tabular output & chart spec..." },
];

export default function PipelineLoader({ stage }: PipelineLoaderProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (stage === "thinking") setActiveIdx(0);
    else if (stage === "generating_sql") setActiveIdx(1);
    else if (stage === "executing") setActiveIdx(2);
    else if (stage === "rendering") setActiveIdx(3);
  }, [stage]);

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        margin: "12px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Zap size={15} style={{ color: "var(--accent)" }} />
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--accent)" }}>
          Pipeline Processing
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {STAGES.map((s, idx) => {
          const isDone = idx < activeIdx;
          const isActive = idx === activeIdx;

          return (
            <div
              key={s.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: isDone
                  ? "var(--success)"
                  : isActive
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
                fontWeight: isActive ? 600 : 400,
                transition: "color 0.2s ease",
              }}
            >
              <div style={{ width: 16, display: "flex", justifyContent: "center" }}>
                {isDone ? (
                  <Check size={14} style={{ color: "var(--success)" }} />
                ) : isActive ? (
                  <Loader2 size={13} className="animate-spin" style={{ color: "var(--accent)" }} />
                ) : (
                  <Circle size={10} style={{ opacity: 0.4 }} />
                )}
              </div>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
