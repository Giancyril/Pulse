// frontend/types/anomaly.ts

export interface AnomalyPoint {
  row_index: number;
  column_name: string;
  value: number;
  mean: number;
  std_dev: number;
  z_score: number;
  severity: "EXTREME" | "MODERATE" | "MILD";
  row_data: Record<string, unknown>;
}

export interface AnomalySummary {
  total_anomalies: number;
  extreme_count: number;
  moderate_count: number;
  mild_count: number;
  anomaly_rate_pct: number;
  most_anomalous_column?: string | null;
}

export interface AnomalyResponse {
  dataset_id: string;
  dataset_name: string;
  analyzed_columns: string[];
  threshold_z: number;
  anomalies: AnomalyPoint[];
  summary: AnomalySummary;
}
