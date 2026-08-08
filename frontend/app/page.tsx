import Link from "next/link";

const FEATURES = [
  {
    icon: "💬",
    title: "Natural Language Chat",
    desc: "Ask questions in plain English — the AI generates and runs the SQL for you.",
  },
  {
    icon: "📊",
    title: "Instant Visualizations",
    desc: "Bar, line, pie, scatter charts auto-selected based on your data shape.",
  },
  {
    icon: "🧠",
    title: "Business Insights",
    desc: "Proactive trend detection, anomaly flags, and month-over-month comparisons.",
  },
  {
    icon: "🗄️",
    title: "Any Data Source",
    desc: "Upload CSV/XLSX spreadsheets or connect directly to a PostgreSQL database.",
  },
  {
    icon: "🔒",
    title: "Read-Only Safety",
    desc: "All generated SQL is validated and sandboxed — no destructive operations ever.",
  },
  {
    icon: "📌",
    title: "Saved Dashboards",
    desc: "Pin any generated chart into a persistent BI dashboard board.",
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
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Header */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(9,9,11,0.85)",
          backdropFilter: "blur(12px)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>📊</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--text-1)",
              letterSpacing: "0.02em",
            }}
          >
            AI Data Analyst
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/datasets">
            <button className="btn-ghost" style={{ fontSize: 13 }}>
              Datasets
            </button>
          </Link>
          <Link href="/chat">
            <button className="btn-primary" style={{ fontSize: 13 }}>
              Start Analyzing →
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", marginTop: 80, maxWidth: 680 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: 99,
            border: "1px solid rgba(6,182,212,0.3)",
            background: "rgba(6,182,212,0.08)",
            fontSize: 12,
            color: "var(--accent)",
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          ✦ Powered by Google Gemini
        </div>

        <h1
          className="text-gradient"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          Chat with Your Data.
          <br />
          Get Real Answers.
        </h1>

        <p
          style={{
            fontSize: 16,
            color: "var(--text-2)",
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 540,
            margin: "0 auto 36px",
          }}
        >
          Upload a spreadsheet or connect a database and ask questions in plain
          English. The AI generates SQL, runs it safely, and visualizes the
          results — instantly.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/chat">
            <button
              className="btn-primary"
              style={{ padding: "11px 28px", fontSize: 15 }}
            >
              Start Analyzing →
            </button>
          </Link>
          <Link href="/datasets">
            <button
              className="btn-ghost"
              style={{ padding: "11px 28px", fontSize: 15 }}
            >
              Connect a Dataset
            </button>
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          maxWidth: 900,
          width: "100%",
          marginTop: 72,
        }}
      >
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              {f.title}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: 64,
          fontSize: 12,
          color: "var(--text-3)",
          textAlign: "center",
        }}
      >
        AI Data Analyst · Built with Next.js, FastAPI &amp; Google Gemini
      </p>
    </div>
  );
}
