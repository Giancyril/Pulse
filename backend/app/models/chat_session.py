"""
backend/app/models/chat_session.py
SQLAlchemy models for chat sessions and turn history.
"""
from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class ChatSessionModel(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: f"sess_{uuid.uuid4().hex[:10]}")
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("ChatMessageModel", back_populates="session", cascade="all, delete-orphan")


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: f"msg_{uuid.uuid4().hex[:10]}")
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    row_count = Column(Integer, nullable=True)
    chart_spec = Column(JSON, nullable=True)
    insight = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSessionModel", back_populates="messages")
