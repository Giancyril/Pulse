"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Database, Upload, Plus, ArrowRight, Table, Server } from "lucide-react";
import FileUploadZone from "@/components/datasets/FileUploadZone";
import DbConnectModal from "@/components/datasets/DbConnectModal";
import { api } from "@/lib/api-client";
import type { Dataset, UploadResponse, ConnectDbResponse } from "@/types/dataset";
import { formatNumber } from "@/lib/utils";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const fetchDatasets = async () => {
    try {
      const data = await api.get<Dataset[]>("/datasets");
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0]);
      }
    } catch {
      // Backend offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleUploadSuccess = (res: UploadResponse) => {
    fetchDatasets();
  };

  const handleConnectSuccess = (res: ConnectDbResponse) => {
    fetchDatasets();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation Bar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px",
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
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="btn-ghost"
            style={{ fontSize: 13 }}
          >
            <Server size={14} />
            <span>Connect Database</span>
          </button>
          <Link href="/chat">
            <button className="btn-primary" style={{ fontSize: 13 }}>
              <span>Open Query Explorer</span>
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Dataset &amp; Schema Manager
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Upload CSV/XLSX spreadsheets or connect PostgreSQL databases for natural language querying.
          </p>
        </div>

        {/* Upload Dropzone */}
        <div style={{ marginBottom: 36 }}>
          <FileUploadZone onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Datasets List & Schema Inspector */}
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
          {/* Active Datasets Sidebar */}
          <div className="card" style={{ padding: 18, alignSelf: "start" }}>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 14,
              }}
            >
              Active Datasets ({datasets.length})
            </h3>

            {isLoading ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading datasets...</p>
            ) : datasets.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                No datasets connected. Upload a spreadsheet above to begin.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {datasets.map((ds) => {
                  const isSelected = selectedDataset?.id === ds.id;
                  return (
                    <div
                      key={ds.id}
                      onClick={() => setSelectedDataset(ds)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        background: isSelected ? "var(--accent-dim)" : "var(--surface-hover)",
                        border: `1px solid ${isSelected ? "var(--accent-border)" : "var(--border)"}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>
                          {ds.name}
                        </span>
                        <span className="badge" style={{ fontSize: 10 }}>
                          {ds.source}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, margin: "4px 0 0" }}>
                        {formatNumber(ds.tables[0]?.row_count || 0)} rows · {ds.tables[0]?.columns.length || 0} columns
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Schema Inspector Panel */}
          <div className="card">
            {selectedDataset ? (
              <div>
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
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                      {selectedDataset.name}
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                      SQL Table: {selectedDataset.tables[0]?.name}
                    </p>
                  </div>
                  <Link href={`/chat?dataset=${selectedDataset.id}`}>
                    <button className="btn-primary" style={{ fontSize: 13 }}>
                      <span>Query with AI</span>
                      <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>

                <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
                  Inferred Schema Columns ({selectedDataset.tables[0]?.columns.length || 0})
                </h4>

                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                      textAlign: "left",
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "8px 12px" }}>Column Name</th>
                        <th style={{ padding: "8px 12px" }}>Data Type</th>
                        <th style={{ padding: "8px 12px" }}>Nullable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDataset.tables[0]?.columns.map((col) => (
                        <tr
                          key={col.name}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                          }}
                        >
                          <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                            {col.name}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span className="badge">
                              {col.type}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                            {col.nullable ? "Yes" : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ padding: "64px 0", textAlign: "center", color: "var(--text-muted)" }}>
                <Table size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 13 }}>
                  Select a dataset on the left to inspect its schema columns and data types.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <DbConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={handleConnectSuccess}
      />
    </div>
  );
}
