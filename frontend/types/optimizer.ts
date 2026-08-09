// frontend/types/optimizer.ts
export interface OptimizationSuggestion {
  type: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  explanation: string;
  suggestion: string;
}

export interface SqlOptimizeResponse {
  original_sql: string;
  optimized_sql: string;
  transpiled_sql?: string | null;
  target_dialect?: string | null;
  complexity_score: number;
  suggestions: OptimizationSuggestion[];
  ast_summary: string;
}
