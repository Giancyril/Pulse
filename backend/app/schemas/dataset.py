"""
backend/app/schemas/dataset.py
Pydantic schemas for dataset endpoints.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class ColumnSchema(BaseModel):
    name: str
    type: str
    nullable: bool = True


class TableSchema(BaseModel):
    name: str
    row_count: Optional[int] = 0
    columns: List[ColumnSchema]


class DatasetResponse(BaseModel):
    id: str
    name: str
    source: str
    table_name: str
    row_count: int
    created_at: Optional[str] = None
    tables: List[TableSchema]


class UploadResponse(BaseModel):
    success: bool = True
    dataset_id: str
    table_name: str
    row_count: int
    columns: List[ColumnSchema]


class ConnectDbRequest(BaseModel):
    name: str = Field(default="External Database")
    host: str = Field(default="localhost")
    port: int = Field(default=5432)
    database: str = Field(...)
    username: str = Field(...)
    password: str = Field(...)
    ssl: bool = Field(default=False)


class ConnectDbResponse(BaseModel):
    success: bool = True
    dataset_id: str
    tables: List[TableSchema]

