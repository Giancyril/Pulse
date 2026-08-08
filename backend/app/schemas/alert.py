"""
backend/app/schemas/alert.py
Pydantic schemas for metric alert rules and evaluation results.
"""
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class AlertRuleCreate(BaseModel):
    name: str
    dataset_id: str
    metric_column: str
    aggregate_fn: Literal["AVG", "SUM", "MAX", "MIN", "COUNT"] = "AVG"
    operator: Literal[">", "<", ">=", "<=", "=="]
    threshold: float
    severity: Literal["info", "warning", "critical"] = "warning"
    description: Optional[str] = None


class AlertRuleResponse(BaseModel):
    id: str
    name: str
    dataset_id: str
    metric_column: str
    aggregate_fn: str
    operator: str
    threshold: float
    severity: str
    is_active: bool
    triggered: bool
    last_value: Optional[float] = None
    last_checked_at: Optional[datetime] = None
    last_triggered_at: Optional[datetime] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertEvalResult(BaseModel):
    rule_id: str
    rule_name: str
    current_value: float
    threshold: float
    operator: str
    triggered: bool
    severity: str
    message: str
