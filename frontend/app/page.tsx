import Link from "next/link";
import { MessageSquare, BarChart3, Sparkles, Database, ShieldCheck, Bookmark } from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Natural Language Interface",
    desc: "Ask business questions in plain text. The system translates intent into optimized SQL queries.",
  },
  {
    icon: BarChart3,
    title: "Automated Visualizations",
    desc: "Bar, line, area, pie, and scatter charts dynamically selected based on query data shape.",
  },
  {
    icon: Sparkles,
    title: "Proactive Business Insights",
    desc: "Automated anomaly detection, trend summaries, and key distribution highlights.",
  },
  {
    icon: Database,
    title: "Multi-Source Data Ingestion",
    desc: "Upload CSV/XLSX spreadsheets or connect directly to external PostgreSQL databases.",
  },
  {
    icon: ShieldCheck,
    title: "Read-Only Security Guardrails",
    desc: "AST parsing guarantees non-destructive SELECT operations with automatic row limits.",
  },
  {
    icon: Bookmark,
    title: "Saved BI Dashboards",
    desc: "Pin query charts to persistent analytics dashboards with live data re-execution.",
  },
];

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      {/* Header Bar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 36px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-glass)",
          backdropFilter: "blur(12px)",
          zIndex: 50,
        }}
      >
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
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/datasets">
            <button className="btn-ghost" style={{ fontSize: 13 }}>
              Datasets
            </button>
          </Link>
          <Link href="/dashboards">
            <button className="btn-ghost" style={{ fontSize: 13 }}>
              Dashboards
            </button>
          </Link>
          <Link href="/chat">
            <button className="btn-primary" style={{ fontSize: 13 }}>
              Start Analyzing
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ textAlign: "center", marginTop: 96, maxWidth: 720 }}>

        <h1
          className="text-gradient"
          style={{
            fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          Conversational Analytics for Modern Teams
        </h1>

        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 580,
            margin: "0 auto 36px",
          }}
        >
          Connect spreadsheets or SQL databases and query your data in natural language.
          Generates read-only SQL and visualizes insights instantly.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/chat">
            <button
              className="btn-primary"
              style={{ padding: "11px 28px", fontSize: 14 }}
            >
              Open Query Explorer
            </button>
          </Link>
          <Link href="/datasets">
            <button
              className="btn-ghost"
              style={{ padding: "11px 28px", fontSize: 14 }}
            >
              Connect Dataset
            </button>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          maxWidth: 960,
          width: "100%",
          marginTop: 80,
        }}
      >
        {FEATURES.map((f) => {
          const IconComp = f.icon;
          return (
            <div key={f.title} className="card">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  marginBottom: 16,
                }}
              >
                <IconComp size={18} />
              </div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: 80,
          fontSize: 12,
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        Pulse · Enterprise Natural Language Business Intelligence
      </p>
    </div>
  );
}
