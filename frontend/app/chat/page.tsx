"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import ChatMessageList from "@/components/chat/ChatMessageList";
import PipelineLoader from "@/components/shared/PipelineLoader";
import type { Dataset } from "@/types/dataset";
import type { ChatMessage, ChatResponse } from "@/types/chat";

export default function ChatPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [promptInput, setPromptInput] = useState("");
  const [sessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 9)}`);
  const [pipelineStage, setPipelineStage] = useState<"thinking" | "generating_sql" | "executing" | "rendering" | "done">("done");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDatasets() {
      try {
        const data = await api.get<Dataset[]>("/datasets");
        setDatasets(data);
        if (data.length > 0) {
          setSelectedDatasetId(data[0].id);
        }
      } catch {
        // Backend not running
      }
    }
    loadDatasets();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pipelineStage]);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || !selectedDatasetId || isLoading) return;

    const userPrompt = promptInput.trim();
    setPromptInput("");

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: userPrompt,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setPipelineStage("thinking");

    setTimeout(() => setPipelineStage("generating_sql"), 400);
    setTimeout(() => setPipelineStage("executing"), 900);

    try {
      const res = await api.post<ChatResponse>("/chat", {
        dataset_id: selectedDatasetId,
        prompt: userPrompt,
        session_id: sessionId,
      });

      setPipelineStage("rendering");

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "assistant",
        content: res.error ? "An error occurred while generating or executing the SQL query." : "Analysis complete.",
        generated_sql: res.generated_sql,
        execution_time_ms: res.execution_time_ms,
        row_count: res.row_count,
        columns: res.columns,
        rows: res.rows,
        chart_spec: res.chart_spec,
        insight: res.insight,
        error: res.error,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to run natural language query";
      const errorMsgObj: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: "Failed to execute request.",
        error: errMsg,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsgObj]);
    } finally {
      setIsLoading(false);
      setPipelineStage("done");
    }
  };

  const PRESET_PROMPTS = [
    "Show total count of rows grouped by category",
    "List top 5 records sorted by numerical value descending",
    "Compare month over month trends",
    "Filter records with non-null values",
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header Bar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>
              AI Data Analyst
            </span>
          </div>
        </Link>

        {/* Dataset Selector in header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>Dataset:</span>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {datasets.length === 0 ? (
              <option value="">No datasets found</option>
            ) : (
              datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.source})
                </option>
              ))
            )}
          </select>

          <Link href="/datasets">
            <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}>
              + Manage Datasets
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Chat Area */}
      <div style={{ flex: 1, maxWidth: 960, width: "100%", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column" }}>
        {/* Dataset Banner */}
        {activeDataset && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>🗄️</span>
              <span style={{ fontWeight: 600, color: "var(--text-1)" }}>Active Target: {activeDataset.name}</span>
              <span style={{ color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                ({activeDataset.tables[0]?.columns.length || 0} columns · {activeDataset.tables[0]?.name})
              </span>
            </div>
            <span style={{ color: "var(--accent)" }}>Session Memory Active (Last 6 turns)</span>
          </div>
        )}

        {/* Zero state if no messages */}
        {messages.length === 0 && (
          <div style={{ padding: "48px 0", textAlign: "center", maxWidth: 540, margin: "0 auto" }}>
            <span style={{ fontSize: 40 }}>💡</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", marginTop: 12, marginBottom: 8 }}>
              Ask questions in Natural Language
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>
              The AI converts your questions to SQL, executes them safely against your database, and presents tabular results and insights.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
                Try asking:
              </span>
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPromptInput(p)}
                  className="btn-ghost"
                  style={{ textAlign: "left", fontSize: 13, padding: "8px 14px" }}
                >
                  💬 {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        <ChatMessageList messages={messages} />

        {/* Pipeline Loader */}
        {isLoading && <PipelineLoader stage={pipelineStage} />}

        <div ref={bottomRef} />
      </div>

      {/* Fixed Bottom Input Bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "rgba(9,9,11,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid var(--border)",
          padding: "16px 24px",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 960,
            margin: "0 auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder={
              selectedDatasetId
                ? "Ask a question about your data (e.g. 'Show top 5 categories by total revenue')..."
                : "Please upload or select a dataset first..."
            }
            disabled={!selectedDatasetId || isLoading}
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-1)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!selectedDatasetId || !promptInput.trim() || isLoading}
            className="btn-primary"
            style={{
              padding: "12px 24px",
              fontSize: 14,
              opacity: !selectedDatasetId || !promptInput.trim() || isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? "Analyzing..." : "Ask AI →"}
          </button>
        </form>
      </div>
    </div>
  );
}
