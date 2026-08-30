"""
backend/app/api/v1/endpoints/cleaning.py
API endpoints for guided data cleaning suggestions, preview dry-runs, and audit logs.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.cleaning_service import CleaningSuggestionService
from app.schemas.cleaning import (
    CleaningSuggestionsResponse,
    CleaningActionRequest,
    CleaningResultResponse,
    CleaningHistoryResponse,
)

router = APIRouter()


@router.get("/datasets/{dataset_id}/cleaning-suggestions", response_model=CleaningSuggestionsResponse, tags=["Data Cleaning"])
def get_cleaning_suggestions(dataset_id: str, db: Session = Depends(get_db)):
    """
    Returns detected data quality defects and actionable, one-click cleaning options
    based on profiling statistics and statistical anomaly detection.
    """
    try:
        return CleaningSuggestionService.generate_suggestions(dataset_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cleaning suggestions: {str(e)}",
        )
