"""
backend/app/models/dashboard.py
SQLAlchemy models for saved dashboards and chart cards.
"""
from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class DashboardModel(Base):
    __tablename__ = "dashboards"

    id = Column(String, primary_key=True, default=lambda: f"dash_{uuid.uuid4().hex[:10]}")
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cards = relationship("DashboardCardModel", back_populates="dashboard", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "cards": [c.to_dict() for c in self.cards] if self.cards else [],
        }


class DashboardCardModel(Base):
    __tablename__ = "dashboard_cards"

    id = Column(String, primary_key=True, default=lambda: f"card_{uuid.uuid4().hex[:10]}")
    dashboard_id = Column(String, ForeignKey("dashboards.id"), nullable=False)
    title = Column(String(255), nullable=False)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    sql = Column(Text, nullable=False)
    chart_spec = Column(JSON, nullable=False)
    columns = Column(JSON, nullable=False, default=list)
    position = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    dashboard = relationship("DashboardModel", back_populates="cards")

    def to_dict(self):
        return {
            "id": self.id,
            "dashboard_id": self.dashboard_id,
            "title": self.title,
            "dataset_id": self.dataset_id,
            "sql": self.sql,
            "chart_spec": self.chart_spec,
            "columns": self.columns,
            "position": self.position,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
