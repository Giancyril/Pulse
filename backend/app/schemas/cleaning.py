"""
backend/app/schemas/cleaning.py
Pydantic schemas for guided data cleaning suggestions, actions, preview diffs, and history.
"""
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field


class CleaningActionOption(BaseModel):
    action_type: str = Field(..., description="Unique action identifier e.g. impute_median, drop_duplicates")
    label: str = Field(..., description="Human-friendly label e.g. 'Impute with Median (32.0)'")
    description: str = Field(..., description="Explanation of what this action will do")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Pre-filled arguments for the action")
    is_recommended: bool = Field(default=False, description="Whether this is the recommended default fix")


class CleaningSuggestion(BaseModel):
    id: str = Field(..., description="Suggestion identifier e.g. sug_missing_age")
    issue_type: str = Field(..., description="MISSING_VALUES, DUPLICATE_ROWS, TYPE_MISMATCH, IQR_OUTLIERS, ZSCORE_ANOMALIES")
    severity: str = Field(..., description="HIGH, MEDIUM, LOW")
    column_name: Optional[str] = Field(default=None, description="Affected column name, or None for row-level issues")
    title: str = Field(..., description="Short title describing the issue")
    description: str = Field(..., description="Detailed description of the detected defect")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Supporting metrics e.g. null_count, outlier_count")
    recommended_action: str = Field(..., description="Default recommended action_type")
    available_actions: List[CleaningActionOption] = Field(default_factory=list)


class CleaningSuggestionsResponse(BaseModel):
    dataset_id: str
    dataset_name: str
    total_suggestions: int
    health_score: float
    suggestions: List[CleaningSuggestion]


class CleaningActionRequest(BaseModel):
    action_type: str = Field(..., description="The cleaning action to execute")
    column_name: Optional[str] = Field(default=None, description="Target column if applicable")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action arguments e.g. value, factor, threshold_z")
    dry_run: bool = Field(default=True, description="If True, returns preview diff without mutating database")


class CleaningDiffSample(BaseModel):
    row_index: int
    before: Dict[str, Any]
    after: Optional[Dict[str, Any]] = None  # None if row dropped


class CleaningResultResponse(BaseModel):
    dry_run: bool
    action_type: str
    column_name: Optional[str] = None
    rows_before: int
    rows_after: int
    rows_affected: int
    summary: str
    sample_diff: List[CleaningDiffSample] = Field(default_factory=list)
    new_health_score: Optional[float] = None
    action_id: Optional[str] = None
    applied_at: Optional[str] = None


class CleaningActionLog(BaseModel):
    id: str
    dataset_id: str
    action_type: str
    column_name: Optional[str] = None
    parameters: Dict[str, Any]
    rows_affected: int
    summary: str
    applied_at: Optional[str] = None


class CleaningHistoryResponse(BaseModel):
    dataset_id: str
    total_actions: int
    history: List[CleaningActionLog]
