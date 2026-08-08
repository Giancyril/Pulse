"""
backend/app/models/dataset.py
SQLAlchemy models for datasets and table schemas.
"""
from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class DatasetModel(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=lambda: f"ds_{uuid.uuid4().hex[:10]}")
    name = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False, default="upload")  # 'upload' or 'external_db'
    table_name = Column(String(255), nullable=False)
    row_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    columns_metadata = Column(JSON, nullable=False, default=list)  # list of {name, type, nullable}

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "source": self.source_type,
            "table_name": self.table_name,
            "row_count": self.row_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "tables": [
                {
                    "name": self.table_name,
                    "row_count": self.row_count,
                    "columns": self.columns_metadata or [],
                }
            ],
        }
