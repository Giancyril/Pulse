"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface QueryResultTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function QueryResultTable({ columns, rows }: QueryResultTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  if (!rows || rows.length === 0) {
    return (
      <div
        style={{
          padding: "14px 16px",
          fontSize: 12,
          color: "var(--text-muted)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-hover)",
          margin: "10px 0",
        }}
      >
        Query executed successfully. 0 records returned.
      </div>
    );
  }

  const totalPages = Math.ceil(rows.length / pageSize);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ margin: "12px 0", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--surface-hover)", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {columns.map((col) => (
                <th key={col} style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td key={col} style={{ padding: "8px 12px", color: "var(--text-primary)" }}>
                      {val === null || val === undefined ? (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>null</span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 14px",
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <span>
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, rows.length)} of {rows.length} records
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "3px 8px",
                color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ChevronLeft size={12} />
              <span>Previous</span>
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "3px 8px",
                color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>Next</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
