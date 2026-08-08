"""
backend/app/api/v1/endpoints/datasets.py
Datasets listing and detail endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.dataset import DatasetModel
from app.schemas.dataset import DatasetResponse

router = APIRouter()


@router.get("/datasets", response_model=List[DatasetResponse], tags=["Datasets"])
def list_datasets(db: Session = Depends(get_db)):
    """List all ingested and connected datasets with schema metadata."""
    datasets = db.query(DatasetModel).order_by(DatasetModel.created_at.desc()).all()
    return [d.to_dict() for d in datasets]


@router.get("/datasets/{dataset_id}", response_model=DatasetResponse, tags=["Datasets"])
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed schema for a specific dataset by ID."""
    dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID '{dataset_id}' not found.",
        )
    return dataset.to_dict()
