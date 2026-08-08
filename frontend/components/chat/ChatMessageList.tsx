"use client";

import React from "react";
import { Bot, Sparkles, AlertCircle } from "lucide-react";
import SqlCodeViewer from "./SqlCodeViewer";
import QueryResultTable from "./QueryResultTable";
import ChartCard from "@/components/charts/ChartCard";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
}

export default function ChatMessageList({ messages }: ChatMessageListProps) {
  if (messages.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        if (isUser) {
          return (
            <div key={msg.id} className="chat-bubble-user">
              <p style={{ margin: 0, fontSize: 14, color: "#ffffff", fontWeight: 500 }}>
                {msg.content}
              </p>
            </div>
          );
        }

        return (
          <div key={msg.id} className="chat-bubble-ai">
            {/* AI Avatar & Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-dim)",
                  border: "1px solid var(--accent-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                }}
              >
                <Bot size={15} />
              </div>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--accent)" }}>
                PULSE
              </span>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, margin: "0 0 10px" }}>
              {msg.content}
            </p>

            {/* Error Banner */}
            {msg.error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--critical-dim)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "var(--critical)",
                  fontSize: 12,
                  margin: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={14} />
                <span>{msg.error}</span>
              </div>
            )}

            {/* SQL Code Block */}
            {msg.generated_sql && (
              <SqlCodeViewer
                sql={msg.generated_sql}
                executionTimeMs={msg.execution_time_ms}
                rowCount={msg.row_count}
              />
            )}

            {/* Business Insight Banner */}
            {msg.insight && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-dim)",
                  border: "1px solid var(--accent-border)",
                  color: "var(--accent-hover)",
                  fontSize: 12,
                  margin: "10px 0",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Sparkles size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>
                  <strong>Business Insight:</strong> {msg.insight}
                </span>
              </div>
            )}

            {/* Chart Card */}
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

            {/* Query Result Table */}
            {msg.rows && msg.columns && (
              <QueryResultTable columns={msg.columns} rows={msg.rows} />
            )}
          </div>
        );
      })}
    </div>
  );
}
