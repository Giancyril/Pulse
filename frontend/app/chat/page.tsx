export default function ChatPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <span style={{ fontSize: 48 }}>💬</span>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)" }}>
        Chat Interface
      </h1>
      <p style={{ color: "var(--text-2)", fontSize: 14 }}>
        Coming in Stage 4 — Natural Language to SQL Pipeline
      </p>
    </div>
  );
}
