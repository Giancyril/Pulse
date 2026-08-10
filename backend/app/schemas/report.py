"""
backend/app/schemas/report.py
Pydantic schemas for Executive BI Report Generator.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class KPIScorecard(BaseModel):
    title: str
    value: str
    status: str                             # "POSITIVE", "NEUTRAL", "CONCERN"
    trend_note: str


class ExecutiveInsight(BaseModel):
    category: str                           # "Growth", "Risk", "Efficiency", "Data Quality"
    finding: str
    impact: str
    recommendation: str


class ExecutiveReportRequest(BaseModel):
    dataset_id: str
    custom_instructions: Optional[str] = None


class ExecutiveReportResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    generated_at: str
    executive_summary: str
    kpi_scorecards: List[KPIScorecard]
    insights: List[ExecutiveInsight]
    strategic_recommendations: List[str]
    markdown_report: str
