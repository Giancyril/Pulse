"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import type { ConnectDbResponse } from "@/types/dataset";

interface DbConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: ConnectDbResponse) => void;
}

export default function DbConnectModal({ isOpen, onClose, onSuccess }: DbConnectModalProps) {
  const [name, setName] = useState("Production Postgres");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(5432);
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("postgres");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!database || !username) {
      setError("Please provide a database name and username.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<ConnectDbResponse>("/connect-db", {
        name,
        host,
        port: Number(port),
        database,
        username,
        password,
        ssl,
      });
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔌</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>
              Connect External Database
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-3)",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
              Connection Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Postgres DB"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
                Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="5432"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
              Database Name *
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="e.g. analytics_db"
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="postgres"
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              id="sslCheck"
              checked={ssl}
              onChange={(e) => setSsl(e.target.checked)}
            />
            <label htmlFor="sslCheck" style={{ fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
              Require SSL connection
            </label>
          </div>

          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius)",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "var(--critical)",
                fontSize: 12,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ fontSize: 13 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ fontSize: 13, opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? "Testing Connection..." : "Connect & Introspect →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
