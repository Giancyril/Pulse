"""
backend/app/schemas/anomaly.py
Pydantic schemas for automated anomaly and outlier detection engine.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class AnomalyPoint(BaseModel):
    row_index: int
    column_name: str
    value: float
    mean: float
    std_dev: float
    z_score: float
    severity: str                           # "EXTREME" (|Z| > 3.5), "MODERATE" (|Z| > 2.5), "MILD" (|Z| > 2.0)
    row_data: Dict[str, Any]


class AnomalySummary(BaseModel):
    total_anomalies: int
    extreme_count: int
    moderate_count: int
    mild_count: int
    anomaly_rate_pct: float
    most_anomalous_column: Optional[str] = None


class AnomalyResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    analyzed_columns: List[str]
    threshold_z: float
    anomalies: List[AnomalyPoint]
    summary: AnomalySummary
