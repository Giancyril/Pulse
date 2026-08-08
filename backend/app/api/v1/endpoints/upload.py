"""
backend/app/api/v1/endpoints/upload.py
Upload endpoint for spreadsheet ingestion.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ingestion_service import IngestionService
from app.schemas.dataset import UploadResponse, ColumnSchema

router = APIRouter()


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED, tags=["Data Ingestion"])
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Accepts CSV/XLSX file uploads, infers column types, creates a dedicated SQL table,
    and returns dataset metadata.
    """
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a .csv or .xlsx file.",
        )

    try:
        contents = await file.read()
        dataset_record = IngestionService.process_file(contents, file.filename, db)

        return UploadResponse(
            success=True,
            dataset_id=dataset_record.id,
            table_name=dataset_record.table_name,
            row_count=dataset_record.row_count,
            columns=[
                ColumnSchema(
                    name=col["name"],
                    type=col["type"],
                    nullable=col["nullable"],
                )
                for col in dataset_record.columns_metadata
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File ingestion failed: {str(e)}")
