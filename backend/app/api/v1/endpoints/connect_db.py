"""
backend/app/api/v1/endpoints/connect_db.py
Endpoint for connecting to external SQL databases and introspecting schema.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.db_introspection import DbIntrospectionService
from app.schemas.dataset import ConnectDbRequest, ConnectDbResponse, TableSchema, ColumnSchema

router = APIRouter()


@router.post("/connect-db", response_model=ConnectDbResponse, status_code=status.HTTP_201_CREATED, tags=["Data Ingestion"])
def connect_database(payload: ConnectDbRequest, db: Session = Depends(get_db)):
    """
    Validates external database connection credentials, introspects table schemas,
    encrypts credentials at rest, and registers dataset.
    """
    try:
        dataset_record = DbIntrospectionService.connect_and_introspect(
            name=payload.name,
            host=payload.host,
            port=payload.port,
            database=payload.database,
            username=payload.username,
            password=payload.password,
            ssl=payload.ssl,
            db_session=db,
        )

        cols = [
            ColumnSchema(name=c["name"], type=c["type"], nullable=c["nullable"])
            for c in dataset_record.columns_metadata
        ]

        return ConnectDbResponse(
            success=True,
            dataset_id=dataset_record.id,
            tables=[TableSchema(name=dataset_record.table_name, row_count=dataset_record.row_count, columns=cols)],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database connection failed: {str(e)}",
        )
