"use client";

import React from "react";
import SqlCodeViewer from "./SqlCodeViewer";
import QueryResultTable from "./QueryResultTable";
import ChartCard from "@/components/charts/ChartCard";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  onPinChart?: (msg: ChatMessage) => void;
}

export default function ChatMessageList({ messages, onPinChart }: ChatMessageListProps) {
  if (messages.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        if (isUser) {
          return (
            <div key={msg.id} className="chat-bubble-user">
              <p style={{ margin: 0, fontSize: 14, color: "#fff", fontWeight: 500 }}>
                {msg.content}
              </p>
            </div>
          );
        }

        return (
          <div key={msg.id} className="chat-bubble-ai">
            {/* Header / Explanation */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>
                AI Data Analyst
              </span>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.6, margin: "0 0 10px" }}>
              {msg.content}
            </p>

            {/* Error banner if any */}
            {msg.error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "var(--critical)",
                  fontSize: 12,
                  margin: "8px 0",
                }}
              >
                ⚠️ {msg.error}
              </div>
            )}

            {/* Generated SQL block */}
            {msg.generated_sql && (
              <SqlCodeViewer
                sql={msg.generated_sql}
                executionTimeMs={msg.execution_time_ms}
                rowCount={msg.row_count}
              />
            )}

            {/* Proactive insight if present */}
            {msg.insight && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius)",
                  background: "rgba(6,182,212,0.08)",
                  border: "1px solid rgba(6,182,212,0.2)",
                  color: "var(--accent-hi)",
                  fontSize: 12,
                  margin: "10px 0",
                }}
              >
                💡 <strong>Business Insight:</strong> {msg.insight}
              </div>
            )}

            {/* Dynamic chart visualization */}
            {msg.chart_spec?.recommended && msg.rows && msg.rows.length > 0 && msg.columns && (
              <ChartCard
                title={msg.chart_spec.title || "Visualization"}
                chartSpec={msg.chart_spec}
                rows={msg.rows}
                columns={msg.columns}
                insight={msg.insight}
                sql={msg.generated_sql}
              />
            )}

            {/* Data result table */}
            {msg.rows && msg.columns && (
              <QueryResultTable columns={msg.columns} rows={msg.rows} />
            )}
          </div>
        );
      })}
    </div>
  );
}
