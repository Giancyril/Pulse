"""
backend/app/api/v1/endpoints/anomaly.py
Automated anomaly detection endpoint.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.anomaly_service import AnomalyService
from app.schemas.anomaly import AnomalyResponse

router = APIRouter()


@router.get(
    "/datasets/{dataset_id}/anomalies",
    response_model=AnomalyResponse,
    tags=["Anomalies"],
)
def detect_dataset_anomalies(
    dataset_id: str,
    threshold_z: float = Query(2.0, ge=1.0, le=5.0, description="Z-Score threshold for anomaly flagging"),
    columns: Optional[List[str]] = Query(None, description="Optional list of specific columns to scan"),
    db: Session = Depends(get_db),
):
    """
    Scans numerical dataset columns and returns flagged statistical anomalies with Z-scores and row snapshots.
    """
    try:
        return AnomalyService.detect_anomalies(
            dataset_id=dataset_id,
            threshold_z=threshold_z,
            target_columns=columns,
            db=db,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Anomaly detection failed: {str(e)}")
