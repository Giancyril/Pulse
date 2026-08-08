"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
      {/* Nav */}
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
            <span style={{ fontSize: 20 }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>
              AI Data Analyst
            </span>
          </div>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/chat">
            <button className="btn-primary" style={{ fontSize: 13 }}>
              Open Chat Explorer →
            </button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
            Saved Dashboards
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            Charts pinned from the AI Chat Explorer. Live data re-executed on each load.
          </p>
        </div>

        {isLoading ? (
          <p style={{ color: "var(--text-3)", fontSize: 14 }}>Loading dashboards...</p>
        ) : dashboards.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: "64px 24px" }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>📌</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", marginBottom: 8 }}>
              No Dashboards Yet
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>
              Pin charts from the Chat Explorer to build your first dashboard.
            </p>
            <Link href="/chat">
              <button className="btn-primary" style={{ fontSize: 14 }}>
                Open Chat Explorer →
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>
            {/* Sidebar */}
            <div className="card" style={{ padding: 16, alignSelf: "start" }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Dashboards
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dashboards.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius)",
                      background: selectedId === d.id ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1px solid ${selectedId === d.id ? "var(--accent)" : "var(--border)"}`,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: selectedId === d.id ? 600 : 400,
                      color: "var(--text-1)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {d.name}
                    <p style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 0" }}>
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
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
                      {activeDash.name}
                    </h2>
                    {activeDash.description && (
                      <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>
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
