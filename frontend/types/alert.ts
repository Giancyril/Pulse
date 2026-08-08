// frontend/types/alert.ts
export interface AlertRuleCreate {
  name: string;
  dataset_id: string;
  metric_column: string;
  aggregate_fn: "AVG" | "SUM" | "MAX" | "MIN" | "COUNT";
  operator: ">" | "<" | ">=" | "<=" | "==";
  threshold: number;
  severity: "info" | "warning" | "critical";
  description?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  dataset_id: string;
  metric_column: string;
  aggregate_fn: string;
  operator: string;
  threshold: number;
  severity: string;
  is_active: boolean;
  triggered: boolean;
  last_value?: number | null;
  last_checked_at?: string | null;
  last_triggered_at?: string | null;
  description?: string | null;
  created_at: string;
}

export interface AlertEvalResult {
  rule_id: string;
  rule_name: string;
  current_value: number;
  threshold: number;
  operator: string;
  triggered: boolean;
  severity: string;
  message: string;
}
