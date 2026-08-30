"""
backend/app/schemas/eda.py
Pydantic schemas for automated Exploratory Data Analysis (EDA) reports.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CorrelationPair(BaseModel):
    col1: str
    col2: str
    correlation: float
    strength: str  # "Strong Positive", "Moderate Positive", "Weak", "Moderate Negative", "Strong Negative"


class CorrelationMatrix(BaseModel):
    columns: List[str]
    matrix: List[List[float]]   # N×N grid, row-major
    top_pairs: List[CorrelationPair]


class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    count: int


class DistributionProfile(BaseModel):
    column: str
    mean: float
    median: float
    std: float
    skewness: float
    kurtosis: float
    min: float
    max: float
    bins: List[HistogramBin]


class CategoricalFrequency(BaseModel):
    value: str
    count: int
    percentage: float


class CategoricalBreakdown(BaseModel):
    column: str
    total_distinct: int
    frequencies: List[CategoricalFrequency]   # up to top-15 + "Other" rollup
    other_count: int
    other_percentage: float


class ScatterPoint(BaseModel):
    x: float
    y: float


class PairwiseScatter(BaseModel):
    x_column: str
    y_column: str
    correlation: float
    strength: str
    points: List[ScatterPoint]   # capped at 300 points for performance


class EDANarrativeSummary(BaseModel):
    overview: str
    key_findings: List[str]


class EDAReportResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    row_count: int
    column_count: int
    numeric_column_count: int
    categorical_column_count: int
    correlations: Optional[CorrelationMatrix] = None
    distributions: List[DistributionProfile]
    categorical_breakdowns: List[CategoricalBreakdown]
    pairwise_scatters: List[PairwiseScatter]
    narrative_summary: EDANarrativeSummary
    computed_at: Optional[str] = None
    is_cached: bool = False
