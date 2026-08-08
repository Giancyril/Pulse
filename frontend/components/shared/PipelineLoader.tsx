"use client";

import React, { useState, useEffect } from "react";

interface PipelineLoaderProps {
  stage: "thinking" | "generating_sql" | "executing" | "rendering" | "done";
}

const STAGES = [
  { key: "thinking", label: "Understanding natural language intent..." },
  { key: "generating_sql", label: "Generating PostgreSQL query via Gemini..." },
  { key: "executing", label: "Validating AST & executing read-only query..." },
  { key: "rendering", label: "Structuring results & chart specification..." },
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
        gap: 10,
        margin: "12px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
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
                  ? "var(--text-1)"
                  : "var(--text-3)",
                fontWeight: isActive ? 600 : 400,
                transition: "color 0.2s ease",
              }}
            >
              <span style={{ fontSize: 12, width: 16, textAlign: "center" }}>
                {isDone ? "✓" : isActive ? "⏳" : "○"}
              </span>
              <span>{s.label}</span>
              {isActive && (
                <span style={{ display: "inline-flex", gap: 2 }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
