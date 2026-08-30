export interface CorrelationPair {
  col1: string;
  col2: string;
  correlation: number;
  strength: string;
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
  top_pairs: CorrelationPair[];
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface DistributionProfile {
  column: string;
  mean: number;
  median: number;
  std: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  bins: HistogramBin[];
}

export interface CategoricalFrequency {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoricalBreakdown {
  column: string;
  total_distinct: number;
  frequencies: CategoricalFrequency[];
  other_count: number;
  other_percentage: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
}

export interface PairwiseScatter {
  x_column: string;
  y_column: string;
  correlation: number;
  strength: string;
  points: ScatterPoint[];
}

export interface EDANarrativeSummary {
  overview: string;
  key_findings: string[];
}

export interface EDAReportResponse {
  dataset_id: string;
  dataset_name: string;
  row_count: number;
  column_count: number;
  numeric_column_count: number;
  categorical_column_count: number;
  correlations: CorrelationMatrix | null;
  distributions: DistributionProfile[];
  categorical_breakdowns: CategoricalBreakdown[];
  pairwise_scatters: PairwiseScatter[];
  narrative_summary: EDANarrativeSummary;
  computed_at: string | null;
  is_cached: boolean;
}
