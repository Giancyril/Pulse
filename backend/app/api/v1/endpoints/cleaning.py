"""
backend/app/api/v1/endpoints/cleaning.py
API endpoints for guided data cleaning suggestions, preview dry-runs, and audit logs.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.cleaning_service import CleaningSuggestionService, CleaningExecutionService
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


@router.post("/datasets/{dataset_id}/clean", response_model=CleaningResultResponse, tags=["Data Cleaning"])
def execute_cleaning_action(
    dataset_id: str,
    req: CleaningActionRequest,
    db: Session = Depends(get_db),
):
    """
    Preview (dry_run=true) or apply (dry_run=false) a single guided cleaning action.
    Preview mode returns a before/after sample diff without mutating any stored data.
    Apply mode atomically updates the underlying dataset table, logs the action, and
    refreshes the Data Quality Health Score.
    """
    try:
        return CleaningExecutionService.execute_cleaning_action(dataset_id, req, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleaning action failed: {str(e)}",
        )


@router.get("/datasets/{dataset_id}/cleaning-history", response_model=CleaningHistoryResponse, tags=["Data Cleaning"])
def get_cleaning_history(dataset_id: str, db: Session = Depends(get_db)):
    """
    Returns the full chronological audit log of cleaning actions applied to this dataset.
    """
    try:
        return CleaningExecutionService.get_cleaning_history(dataset_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve cleaning history: {str(e)}",
        )
