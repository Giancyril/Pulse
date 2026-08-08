"""
backend/app/api/v1/endpoints/profiling.py
Data profiling & health score endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.profiling_service import ProfilingService
from app.schemas.profiling import DataQualityReport

router = APIRouter()


@router.get("/datasets/{dataset_id}/profile", response_model=DataQualityReport, tags=["Data Profiling"])
def get_dataset_profile(dataset_id: str, db: Session = Depends(get_db)):
    """
    Generates automated statistical data profile, column missingness analysis,
    IQR outlier count, and Data Quality Health Score.
    """
    try:
        return ProfilingService.profile_dataset(dataset_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Profiling failed: {str(e)}")
