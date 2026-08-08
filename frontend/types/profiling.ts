// frontend/types/profiling.ts
// TypeScript types for data profiling and quality reporting.

export interface ColumnProfile {
  name: string;
  data_type: string;
  total_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  distinct_percentage: number;
  min_value?: string | number | null;
  max_value?: string | number | null;
  mean_value?: number | null;
  std_dev?: number | null;
  quantiles?: { "25%": number; "50%": number; "75%": number } | null;
  top_frequencies?: { value: string; count: number }[] | null;
  outlier_count?: number;
}

export interface DataQualityReport {
  dataset_id: string;
  dataset_name: string;
  total_rows: number;
  total_columns: number;
  health_score: number;
  overall_null_percentage: number;
  duplicate_row_count: number;
  column_profiles: ColumnProfile[];
  warnings: string[];
}
