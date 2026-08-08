"""
backend/app/models/alert.py
SQLAlchemy model for metric alert rules and alert event log.
"""
import uuid
from datetime import datetime, UTC
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, Enum as SAEnum
from app.core.database import Base
import enum


class AlertOperator(str, enum.Enum):
    GREATER_THAN = ">"
    LESS_THAN = "<"
    GREATER_THAN_OR_EQUAL = ">="
    LESS_THAN_OR_EQUAL = "<="
    EQUAL = "=="


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertRuleModel(Base):
    __tablename__ = "alert_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    dataset_id = Column(String, nullable=False)
    metric_column = Column(String, nullable=False)         # Column to aggregate
    aggregate_fn = Column(String, default="AVG")           # AVG, SUM, MAX, MIN, COUNT
    operator = Column(String, nullable=False)              # >, <, >=, <=, ==
    threshold = Column(Float, nullable=False)
    severity = Column(String, default="warning")
    is_active = Column(Boolean, default=True)
    last_checked_at = Column(DateTime, nullable=True)
    last_triggered_at = Column(DateTime, nullable=True)
    last_value = Column(Float, nullable=True)
    triggered = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
