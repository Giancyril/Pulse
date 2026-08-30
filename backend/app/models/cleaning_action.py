"""
backend/app/models/cleaning_action.py
SQLAlchemy model for logging dataset cleaning actions and audit trails.
"""
from datetime import datetime, UTC
import uuid
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON
from app.core.database import Base


class CleaningActionModel(Base):
    __tablename__ = "cleaning_actions"

    id = Column(String, primary_key=True, default=lambda: f"act_{uuid.uuid4().hex[:10]}")
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String(100), nullable=False)  # e.g. "impute_median", "drop_duplicates", "cast_column_type"
    column_name = Column(String(255), nullable=True)
    parameters = Column(JSON, default=dict)
    rows_affected = Column(Integer, default=0)
    summary = Column(Text, nullable=False)
    applied_at = Column(DateTime, default=lambda: datetime.now(UTC))

    def to_dict(self):
        return {
            "id": self.id,
            "dataset_id": self.dataset_id,
            "action_type": self.action_type,
            "column_name": self.column_name,
            "parameters": self.parameters or {},
            "rows_affected": self.rows_affected,
            "summary": self.summary,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
        }
