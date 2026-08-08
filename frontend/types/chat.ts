export type ChartType = "bar" | "line" | "area" | "pie" | "scatter" | "kpi";

export interface ChartSpec {
  recommended: boolean;
  type: ChartType;
  title: string;
  xAxisKey?: string;
  yAxisKey?: string;
  color?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated_sql?: string;
  execution_time_ms?: number;
  row_count?: number;
  columns?: string[];
  rows?: Record<string, unknown>[];
  chart_spec?: ChartSpec;
  insight?: string;
  error?: string;
  timestamp: string;
}

export interface ChatRequest {
  dataset_id: string;
  prompt: string;
  session_id: string;
}

export interface ChatResponse {
  success: boolean;
  dataset_id: string;
  session_id: string;
  generated_sql?: string;
  execution_time_ms?: number;
  row_count?: number;
  columns?: string[];
  rows?: Record<string, unknown>[];
  chart_spec?: ChartSpec;
  insight?: string;
  error?: string;
}
