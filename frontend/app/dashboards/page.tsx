"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";
import ChartCard from "@/components/charts/ChartCard";
import type { Dashboard } from "@/types/dashboard";

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboards() {
      try {
        const data = await api.get<Dashboard[]>("/dashboards");
        setDashboards(data);
        if (data.length > 0) setSelectedId(data[0].id);
      } catch {
        // Backend offline
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboards();
  }, []);

  const activeDash = dashboards.find((d) => d.id === selectedId);

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
            Saved Dashboards
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Pinned visualizations from the Query Explorer. Live query data re-executed on page load.
          </p>
        </div>

        {isLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading dashboards...</p>
        ) : dashboards.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: "64px 24px" }}
          >

            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              No Dashboards Pinned
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>
              Pin chart recommendations from the Chat Query Explorer to build your custom analytics board.
            </p>
            <Link href="/chat">
              <button className="btn-primary" style={{ fontSize: 14 }}>
                <span>Open Query Explorer</span>
                <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>
            {/* Sidebar */}
            <div className="card" style={{ padding: 16, alignSelf: "start" }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Dashboards
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dashboards.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: selectedId === d.id ? "var(--accent-dim)" : "var(--surface-hover)",
                      border: `1px solid ${selectedId === d.id ? "var(--accent-border)" : "var(--border)"}`,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: selectedId === d.id ? 600 : 400,
                      color: selectedId === d.id ? "var(--accent)" : "var(--text-primary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {d.name}
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                      {d.cards?.length || 0} cards
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cards Grid */}
            <div>
              {activeDash && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                      {activeDash.name}
                    </h2>
                    {activeDash.description && (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                        {activeDash.description}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                      gap: 20,
                    }}
                  >
                    {activeDash.cards.map((card) => (
                      <ChartCard
                        key={card.id}
                        title={card.title}
                        chartSpec={card.chart_spec}
                        rows={(card as unknown as Record<string, unknown>).rows as Record<string, unknown>[] || []}
                        columns={card.columns}
                        pinned
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
