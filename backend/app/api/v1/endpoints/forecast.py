"""
backend/app/api/v1/endpoints/forecast.py
Trend analysis and time-series forecasting endpoint.
"""
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.forecast_service import ForecastService
from app.schemas.forecast import ForecastResponse

router = APIRouter()


@router.get(
    "/datasets/{dataset_id}/forecast",
    response_model=ForecastResponse,
    tags=["Forecast & Trends"],
)
def forecast_dataset_column(
    dataset_id: str,
    value_column: str = Query(..., description="Numeric column to forecast"),
    label_column: Optional[str] = Query(None, description="Label/date column for X-axis"),
    forecast_periods: int = Query(5, ge=1, le=30, description="Number of future periods to predict"),
    method: Literal["linear_regression", "moving_average"] = Query("linear_regression"),
    db: Session = Depends(get_db),
):
    """
    Runs trend analysis and forward forecast on a numeric dataset column.
    Supports linear regression (with R²) and moving-average methods.
    """
    try:
        return ForecastService.forecast(
            dataset_id=dataset_id,
            value_column=value_column,
            label_column=label_column,
            forecast_periods=forecast_periods,
            method=method,
            db=db,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Forecast failed: {str(e)}")
