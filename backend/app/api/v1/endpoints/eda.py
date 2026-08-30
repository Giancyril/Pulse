"""
backend/app/api/v1/endpoints/eda.py
API endpoints for the automated Exploratory Data Analysis (EDA) suite.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.eda_service import EDAComputationService
from app.schemas.eda import EDAReportResponse

router = APIRouter()


@router.get("/datasets/{dataset_id}/eda", response_model=EDAReportResponse, tags=["Automated EDA"])
def get_eda_report(
    dataset_id: str,
    force_refresh: bool = False,
    db: Session = Depends(get_db),
):
    """
    Returns the automated EDA report for a dataset.
    Computed statistics include: Pearson correlation matrix, numeric distribution
    histograms, categorical value-count breakdowns, and pairwise scatter plots
    for the most correlated feature pairs.

    Results are cached per dataset and recomputed only after a cleaning action
    is applied or when force_refresh=true is passed.
    """
    try:
        return EDAComputationService.compute_eda(dataset_id, db, force_refresh=force_refresh)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"EDA computation failed: {str(e)}",
        )


@router.post("/datasets/{dataset_id}/eda/refresh", response_model=EDAReportResponse, tags=["Automated EDA"])
def refresh_eda_report(dataset_id: str, db: Session = Depends(get_db)):
    """
    Force-recomputes the EDA report and AI narrative for a dataset,
    discarding any existing cache.
    """
    try:
        return EDAComputationService.compute_eda(dataset_id, db, force_refresh=True)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"EDA refresh failed: {str(e)}",
        )
