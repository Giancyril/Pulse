"use client";

import React, { useState } from "react";
import { Download, ChevronDown, FileText, FileJson, Table, Check } from "lucide-react";

interface ExportButtonProps {
  rows: Record<string, unknown>[];
  columns: string[];
  filename?: string;
}

const FORMATS = [
  { label: "CSV Spreadsheet", value: "csv", icon: Table, ext: ".csv" },
  { label: "JSON Data", value: "json", icon: FileJson, ext: ".json" },
  { label: "Excel Workbook", value: "xlsx", icon: FileText, ext: ".xlsx" },
  { label: "Markdown Table", value: "markdown", icon: FileText, ext: ".md" },
] as const;

type ExportFormat = (typeof FORMATS)[number]["value"];

export default function ExportButton({ rows, columns, filename = "pulse_export" }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [done, setDone] = useState<ExportFormat | null>(null);

  const handleExport = async (fmt: ExportFormat) => {
    setExporting(fmt);
    setOpen(false);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, columns, format: fmt, filename }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const ext = FORMATS.find((f) => f.value === fmt)?.ext ?? "";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(fmt);
      setTimeout(() => setDone(null), 2500);
    } catch {
      // silent
    } finally {
      setExporting(null);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-ghost"
        style={{ fontSize: 12, padding: "5px 12px", gap: 6 }}
      >
        {done ? <Check size={13} style={{ color: "var(--success)" }} /> : <Download size={13} />}
        <span>{done ? "Downloaded!" : exporting ? "Exporting..." : "Export"}</span>
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-card)",
            minWidth: 190,
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "6px 0" }}>
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              return (
                <button
                  key={fmt.value}
                  onClick={() => handleExport(fmt.value)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 14px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                >
                  <Icon size={14} style={{ color: "var(--accent)" }} />
                  <span>{fmt.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
                    {fmt.ext}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
