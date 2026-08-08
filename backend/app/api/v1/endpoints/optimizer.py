"""
backend/app/api/v1/endpoints/optimizer.py
SQL performance optimizer, static AST analysis, and dialect transpiler endpoint.
"""
from fastapi import APIRouter, HTTPException, status
from app.services.optimizer_service import OptimizerService
from app.schemas.optimizer import SqlOptimizeRequest, SqlOptimizeResponse

router = APIRouter()


@router.post("/sql/optimize", response_model=SqlOptimizeResponse, tags=["SQL Optimizer"])
def optimize_sql_query(payload: SqlOptimizeRequest):
    """
    Analyzes a SQL query AST using sqlglot to detect anti-patterns,
    suggest optimizations, format pretty SQL, and transpile across dialects.
    """
    try:
        return OptimizerService.optimize(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SQL optimization failed: {str(e)}",
        )
