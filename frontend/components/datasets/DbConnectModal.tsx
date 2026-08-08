"use client";

import React, { useState } from "react";
import { Database, X, Loader2, AlertCircle } from "lucide-react";
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
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-card)",
          padding: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <Database size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Connect External Database
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                PostgreSQL schema introspection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Connection Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Analytics DB"
              style={{ width: "100%", padding: "9px 12px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                style={{ width: "100%", padding: "9px 12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="5432"
                style={{ width: "100%", padding: "9px 12px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Database Name *
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="e.g. analytics_production"
              required
              style={{ width: "100%", padding: "9px 12px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Username *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="postgres"
                required
                style={{ width: "100%", padding: "9px 12px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "9px 12px" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <input
              type="checkbox"
              id="sslCheck"
              checked={ssl}
              onChange={(e) => setSsl(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="sslCheck" style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              Require SSL connection mode
            </label>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--critical-dim)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "var(--critical)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ fontSize: 13 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ fontSize: 13 }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                "Connect & Introspect Schema"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
