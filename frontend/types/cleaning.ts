export interface CleaningSuggestion {
  column_name: string | null;
  issue_type: "missing_values" | "duplicates" | "type_mismatch" | "outliers" | "anomalies";
  severity: "high" | "medium" | "low";
  description: string;
  suggested_action: string; // The action_type (e.g. "drop_null_rows", "impute_median")
  action_parameters: Record<string, any>;
  impact_estimate: string;
}

export interface CleaningSuggestionsResponse {
  dataset_id: string;
  suggestions: CleaningSuggestion[];
}

export interface SampleDiffRow {
  row_index?: number;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
}

export interface CleaningResultResponse {
  dataset_id: string;
  action_type: string;
  dry_run: boolean;
  rows_before: number;
  rows_after: number;
  rows_affected: number;
  summary: string;
  sample_diff: SampleDiffRow[];
}

export interface CleaningActionRequest {
  action_type: string;
  column_name: string | null;
  parameters: Record<string, any>;
  dry_run: boolean;
}
