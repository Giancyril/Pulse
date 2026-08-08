"""
backend/app/schemas/dashboard.py
Pydantic schemas for dashboard endpoints.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.chat import ChartSpecSchema


class CreateDashboardRequest(BaseModel):
    name: str = Field(default="My Analytics Dashboard")
    description: Optional[str] = None


class PinCardRequest(BaseModel):
    dataset_id: str = Field(...)
    sql: str = Field(...)
    title: str = Field(default="Saved Chart")
    chart_spec: ChartSpecSchema
    columns: List[str] = Field(default_factory=list)


class DashboardCardResponse(BaseModel):
    id: str
    dashboard_id: str
    title: str
    dataset_id: str
    sql: str
    chart_spec: ChartSpecSchema
    columns: List[str]
    position: int
    rows: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    created_at: Optional[str] = None


class DashboardResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None
    cards: List[DashboardCardResponse] = Field(default_factory=list)
