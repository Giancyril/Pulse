"""
backend/app/schemas/chat.py
Pydantic schemas for chat endpoints.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChartSpecSchema(BaseModel):
    recommended: bool = False
    type: str = "bar"
    title: str = "Data Visualization"
    xAxisKey: Optional[str] = None
    yAxisKey: Optional[str] = None
    color: Optional[str] = "#06b6d4"
    description: Optional[str] = None


class ChatRequest(BaseModel):
    dataset_id: str = Field(...)
    prompt: str = Field(...)
    session_id: Optional[str] = Field(default=None)


class ChatResponse(BaseModel):
    success: bool = True
    dataset_id: str
    session_id: str
    generated_sql: Optional[str] = None
    execution_time_ms: Optional[int] = None
    row_count: Optional[int] = 0
    columns: List[str] = Field(default_factory=list)
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    chart_spec: Optional[ChartSpecSchema] = None
    insight: Optional[str] = None
    error: Optional[str] = None
