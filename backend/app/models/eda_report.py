"""
backend/app/models/eda_report.py
SQLAlchemy model for caching automated Exploratory Data Analysis (EDA) reports.
"""
from datetime import datetime, UTC
import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from app.core.database import Base


class EDAReportModel(Base):
    __tablename__ = "eda_reports"

    id = Column(String, primary_key=True, default=lambda: f"eda_{uuid.uuid4().hex[:10]}")
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, unique=True)
    correlations = Column(JSON, nullable=False)  # {columns: [], matrix: [[]], top_pairs: []}
    distributions = Column(JSON, nullable=False)  # [{column, bins: [], stats: {}}]
    categorical_breakdowns = Column(JSON, nullable=False)  # [{column, total_distinct, frequencies: []}]
    pairwise_scatters = Column(JSON, nullable=False)  # [{x_column, y_column, correlation, points: []}]
    narrative_summary = Column(JSON, nullable=False)  # {overview: str, key_findings: [], anomalies_noted: []}
    computed_at = Column(DateTime, default=lambda: datetime.now(UTC))

    def to_dict(self):
        return {
            "id": self.id,
            "dataset_id": self.dataset_id,
            "correlations": self.correlations,
            "distributions": self.distributions,
            "categorical_breakdowns": self.categorical_breakdowns,
            "pairwise_scatters": self.pairwise_scatters,
            "narrative_summary": self.narrative_summary,
            "computed_at": self.computed_at.isoformat() if self.computed_at else None,
        }
