import type { ChartSpec } from "./chat";

export interface DashboardCard {
  id: string;
  dashboard_id: string;
  title: string;
  dataset_id: string;
  sql: string;
  chart_spec: ChartSpec;
  columns: string[];
  position: number;
  created_at: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  cards: DashboardCard[];
  created_at: string;
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
}

export interface PinCardRequest {
  dataset_id: string;
  sql: string;
  chart_spec: ChartSpec;
  columns: string[];
  title: string;
}
