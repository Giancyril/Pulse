"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BarChart3, Database, Send, Sparkles, MessageSquare, Plus, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import ChatMessageList from "@/components/chat/ChatMessageList";
import PipelineLoader from "@/components/shared/PipelineLoader";
import CustomSelectDropdown from "@/components/shared/CustomSelectDropdown";
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
        // Backend offline
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
        content: res.error ? "An error occurred while generating or executing the SQL query." : "Query analysis completed.",
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
      const errMsg = err instanceof Error ? err.message : "Failed to execute natural language query";
      const errorMsgObj: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: "Failed to process request.",
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
    "Show total aggregate metrics grouped by top category",
    "List top 10 records sorted by primary numeric metric descending",
    "Calculate distribution across groups",
    "Filter records with complete non-null fields",
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              Pulse
            </span>
          </div>
        </Link>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, flexShrink: 0 }}>
              Target Dataset:
            </span>
            <CustomSelectDropdown
              options={
                datasets.length === 0
                  ? [{ label: "No datasets found", value: "" }]
                  : datasets.map((d) => ({ label: `${d.name} (${d.source})`, value: d.id }))
              }
              value={selectedDatasetId}
              onChange={setSelectedDatasetId}
              placeholder="Select dataset..."
            />
          </div>

          <Link href="/datasets">
            <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}>
              <Plus size={13} />
              <span>Manage Datasets</span>
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Chat Content */}
      <div style={{ flex: 1, maxWidth: 960, width: "100%", margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column" }}>
        {/* Active Target Banner */}
        {activeDataset && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Target: {activeDataset.name}</span>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                ({activeDataset.tables[0]?.columns.length || 0} columns · {activeDataset.tables[0]?.name})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--success)" }}>
              <CheckCircle2 size={13} />
              <span style={{ fontWeight: 500 }}>Session Context Active</span>
            </div>
          </div>
        )}

        {/* Empty State Prompt Guide */}
        {messages.length === 0 && (
          <div style={{ padding: "56px 0", textAlign: "center", maxWidth: 580, margin: "0 auto" }}>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Natural Language Data Explorer
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.6 }}>
              Ask questions in plain language. The engine generates validated read-only SQL, executes against your dataset, and renders interactive charts and tabular results.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>
                Sample Prompts:
              </span>
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPromptInput(p)}
                  className="btn-ghost"
                  style={{ textAlign: "left", fontSize: 13, padding: "9px 14px", justifyContent: "flex-start" }}
                >
                  <MessageSquare size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ChatMessageList messages={messages} />

        {/* Pipeline Progress Indicator */}
        {isLoading && <PipelineLoader stage={pipelineStage} />}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--surface-glass)",
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
                ? "Ask a question about your data (e.g. 'Show total revenue grouped by category')..."
                : "Select or connect a dataset first..."
            }
            disabled={!selectedDatasetId || isLoading}
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={!selectedDatasetId || !promptInput.trim() || isLoading}
            className="btn-primary"
            style={{
              padding: "12px 22px",
              fontSize: 14,
            }}
          >
            <span>Execute</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
