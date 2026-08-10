"""
backend/app/api/v1/endpoints/reports.py
Executive BI Report Generator endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.report_service import ReportService
from app.schemas.report import ExecutiveReportRequest, ExecutiveReportResponse

router = APIRouter()


@router.post(
    "/reports/generate",
    response_model=ExecutiveReportResponse,
    tags=["Executive Reports"],
)
def generate_executive_report(payload: ExecutiveReportRequest, db: Session = Depends(get_db)):
    """
    Generates an executive BI report with KPI scorecards, risk/growth insights, and strategic recommendations.
    """
    try:
        return ReportService.generate_report(payload, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Report generation failed: {str(e)}")
