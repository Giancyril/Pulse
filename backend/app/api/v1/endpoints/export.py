"""
backend/app/api/v1/endpoints/export.py
Export query results in CSV, JSON, XLSX, or Markdown formats.
"""
import json
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Dict, Any, Literal
from app.services.export_service import ExportService

router = APIRouter()


class ExportRequest(BaseModel):
    rows: List[Dict[str, Any]]
    columns: List[str]
    format: Literal["csv", "json", "xlsx", "markdown"] = "csv"
    filename: str = "pulse_export"


@router.post("/export", tags=["Export"])
def export_query_results(payload: ExportRequest):
    """
    Accepts tabular query results and streams the file in the requested format.
    Supports CSV, JSON, XLSX, and Markdown.
    """
    try:
        data_bytes, media_type, filename = ExportService.export_query_result(
            rows=payload.rows,
            columns=payload.columns,
            fmt=payload.format,
            filename=payload.filename,
        )
        return Response(
            content=data_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Export failed: {str(e)}")
