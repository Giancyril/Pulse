"""
backend/app/schemas/profiling.py
Pydantic schemas for automated data profiling and quality reporting.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ColumnProfile(BaseModel):
    name: str
    data_type: str
    total_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    distinct_percentage: float
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None
    mean_value: Optional[float] = None
    std_dev: Optional[float] = None
    quantiles: Optional[Dict[str, float]] = None  # e.g. {"25%": x, "50%": y, "75%": z}
    top_frequencies: Optional[List[Dict[str, Any]]] = None
    outlier_count: Optional[int] = 0


class DataQualityReport(BaseModel):
    dataset_id: str
    dataset_name: str
    total_rows: int
    total_columns: int
    health_score: float  # 0 to 100%
    overall_null_percentage: float
    duplicate_row_count: int
    column_profiles: List[ColumnProfile]
    warnings: List[str]
