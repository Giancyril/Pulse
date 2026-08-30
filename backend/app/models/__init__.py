"""
backend/app/models/__init__.py
Exports all SQLAlchemy models for metadata registration.
"""
from app.models.dataset import DatasetModel
from app.models.chat_session import ChatSessionModel, ChatMessageModel
from app.models.dashboard import DashboardModel, DashboardCardModel
from app.models.alert import AlertRuleModel
from app.models.cleaning_action import CleaningActionModel
from app.models.eda_report import EDAReportModel

__all__ = [
    "DatasetModel",
    "ChatSessionModel",
    "ChatMessageModel",
    "DashboardModel",
    "DashboardCardModel",
    "AlertRuleModel",
    "CleaningActionModel",
    "EDAReportModel",
]
