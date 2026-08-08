// frontend/types/forecast.ts
export interface ForecastPoint {
  label: string;
  actual?: number | null;
  predicted: number;
  is_forecast: boolean;
}

export interface TrendSummary {
  direction: "upward" | "downward" | "stable";
  slope: number;
  r_squared: number;
  change_pct: number;
}

export interface ForecastResponse {
  column: string;
  label_column: string;
  points: ForecastPoint[];
  trend: TrendSummary;
  forecast_periods: number;
  method: string;
}
