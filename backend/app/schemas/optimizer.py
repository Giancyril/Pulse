"""
backend/app/schemas/optimizer.py
Pydantic schemas for SQL performance optimization, linting, and transpilation.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel


class SqlOptimizeRequest(BaseModel):
    sql: str
    dialect: str = "sqlite"
    target_dialect: Optional[str] = None


class OptimizationSuggestion(BaseModel):
    type: str                                       # "SELECT_STAR", "MISSING_LIMIT", "LEADING_WILDCARD", "FUNCTION_IN_WHERE", etc.
    impact: Literal["HIGH", "MEDIUM", "LOW"]
    title: str
    explanation: str
    suggestion: str


class SqlOptimizeResponse(BaseModel):
    original_sql: str
    optimized_sql: str
    transpiled_sql: Optional[str] = None
    target_dialect: Optional[str] = None
    complexity_score: int                           # 1-100 scale
    suggestions: List[OptimizationSuggestion]
    ast_summary: str
