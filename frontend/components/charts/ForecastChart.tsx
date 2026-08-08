"use client";

import React from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ForecastResponse } from "@/types/forecast";
import { formatNumber } from "@/lib/utils";

interface ForecastChartProps {
  data: ForecastResponse;
}

const TICK_STYLE = { fontSize: 11, fill: "#71717a" };
const TOOLTIP_STYLE = {
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fafafa",
};

export default function ForecastChart({ data }: ForecastChartProps) {
  const splitIdx = data.points.findIndex((p) => p.is_forecast);
  const splitLabel = splitIdx >= 0 ? data.points[splitIdx].label : null;

  const TrendIcon =
    data.trend.direction === "upward"
      ? TrendingUp
      : data.trend.direction === "downward"
      ? TrendingDown
      : Minus;
  const trendColor =
    data.trend.direction === "upward"
      ? "var(--success)"
      : data.trend.direction === "downward"
      ? "var(--critical)"
      : "var(--warning)";

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
            Forecast: <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{data.column}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {data.method === "linear_regression" ? "Linear Regression" : "Moving Average"} · {data.forecast_periods} period forecast
          </div>
        </div>

        {/* Trend Summary Badges */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Trend", value: data.trend.direction.charAt(0).toUpperCase() + data.trend.direction.slice(1), icon: <TrendIcon size={13} style={{ color: trendColor }} /> },
            { label: "Slope", value: `${data.trend.slope > 0 ? "+" : ""}${data.trend.slope}/period`, icon: null },
            { label: "R²", value: data.trend.r_squared.toFixed(3), icon: null },
            { label: "Change", value: `${data.trend.change_pct > 0 ? "+" : ""}${data.trend.change_pct}%`, icon: null },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)" }}>
                {s.icon}
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "20px 16px 16px" }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data.points} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={TICK_STYLE} />
            <YAxis tick={TICK_STYLE} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {splitLabel && (
              <ReferenceLine
                x={splitLabel}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="5 3"
                label={{ value: "Forecast →", position: "insideTopLeft", fontSize: 10, fill: "#71717a" }}
              />
            )}
            <Area type="monotone" dataKey="actual" name="Actual" stroke="#06b6d4" fill="url(#actualGrad)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted / Forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: "#8b5cf6" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
