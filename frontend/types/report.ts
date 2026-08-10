// frontend/types/report.ts

export interface KPIScorecard {
  title: string;
  value: string;
  status: "POSITIVE" | "NEUTRAL" | "CONCERN";
  trend_note: string;
}

export interface ExecutiveInsight {
  category: "Growth" | "Risk" | "Efficiency" | "Data Quality";
  finding: string;
  impact: string;
  recommendation: string;
}

export interface ExecutiveReportRequest {
  dataset_id: string;
  custom_instructions?: string;
}

export interface ExecutiveReportResponse {
  dataset_id: string;
  dataset_name: string;
  generated_at: string;
  executive_summary: string;
  kpi_scorecards: KPIScorecard[];
  insights: ExecutiveInsight[];
  strategic_recommendations: string[];
  markdown_report: string;
}
