"use client";
import type { PieLabelRenderProps } from "recharts";

import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/utils";
import type { ChartSpec } from "@/types/chat";

interface DynamicChartProps {
  chartSpec: ChartSpec;
  rows: Record<string, unknown>[];
  columns: string[];
}

const PALETTE = [
  "#06b6d4", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#a855f7",
];

const TICK_STYLE = { fontSize: 11, fill: "#71717a" };
const TOOLTIP_STYLE = {
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fafafa",
};

export default function DynamicChart({ chartSpec, rows, columns }: DynamicChartProps) {
  if (!rows || rows.length === 0) return null;

  const { type, xAxisKey, yAxisKey, color = "#06b6d4", title } = chartSpec;

  /* ── KPI Card ── */
  if (type === "kpi") {
    const key = yAxisKey || columns[0];
    const value = rows[0]?.[key];
    return (
      <div
        style={{
          padding: "28px 32px",
          textAlign: "center",
          background: "rgba(6,182,212,0.06)",
          border: "1px solid rgba(6,182,212,0.2)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase" }}>
          {title || key}
        </p>
        <p style={{ fontSize: 42, fontWeight: 800, color: "var(--accent)", margin: 0 }}>
          {typeof value === "number" ? formatNumber(value) : String(value ?? "—")}
        </p>
      </div>
    );
  }

  /* ── Pie Chart ── */
  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={rows}
            dataKey={yAxisKey || columns[1] || columns[0]}
            nameKey={xAxisKey || columns[0]}
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={(props: PieLabelRenderProps) =>
              `${props.name ?? ""} (${((props.percent ?? 0) * 100).toFixed(1)}%)`
            }
            labelLine={false}
          >
            {rows.map((_, idx) => (
              <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  /* ── Scatter Chart ── */
  if (type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={xAxisKey || columns[0]} tick={TICK_STYLE} name={xAxisKey || columns[0]} />
          <YAxis dataKey={yAxisKey || columns[1]} tick={TICK_STYLE} name={yAxisKey || columns[1]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={TOOLTIP_STYLE} />
          <Scatter name="Data" data={rows} fill={color} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  /* ── Area Chart ── */
  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={xAxisKey || columns[0]} tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey={yAxisKey || columns[1]} stroke={color} fill="url(#areaGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  /* ── Line Chart ── */
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={xAxisKey || columns[0]} tick={TICK_STYLE} />
          <YAxis tick={TICK_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey={yAxisKey || columns[1]}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  /* ── Bar Chart (default) ── */
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={xAxisKey || columns[0]} tick={TICK_STYLE} />
        <YAxis tick={TICK_STYLE} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey={yAxisKey || columns[1]} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
