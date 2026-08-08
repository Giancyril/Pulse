"""
backend/app/api/v1/endpoints/chat.py
Chat and natural-language-to-SQL query endpoint.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.nl_to_sql import NlToSqlService
from app.schemas.chat import ChatRequest, ChatResponse, ChartSpecSchema

router = APIRouter()


@router.post("/chat", response_model=ChatResponse, tags=["Natural Language Query"])
def chat_query(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Accepts a natural language question, generates & validates a read-only SQL query,
    executes it against the dataset, and returns SQL, rows, chart recommendation, and insights.
    """
    session_id = payload.session_id or f"sess_{uuid.uuid4().hex[:10]}"

    try:
        sql, cols, rows, chart_spec, time_ms, insight = NlToSqlService.query(
            dataset_id=payload.dataset_id,
            prompt=payload.prompt,
            session_id=session_id,
            db=db,
        )

        return ChatResponse(
            success=True,
            dataset_id=payload.dataset_id,
            session_id=session_id,
            generated_sql=sql,
            execution_time_ms=time_ms,
            row_count=len(rows),
            columns=cols,
            rows=rows,
            chart_spec=ChartSpecSchema(
                recommended=chart_spec.get("recommended", False),
                type=chart_spec.get("type", "bar"),
                title=chart_spec.get("title", "Data Visualization"),
                xAxisKey=chart_spec.get("xAxisKey"),
                yAxisKey=chart_spec.get("yAxisKey"),
                color=chart_spec.get("color", "#06b6d4"),
                description=chart_spec.get("description"),
            ),
            insight=insight,
        )
    except Exception as e:
        return ChatResponse(
            success=False,
            dataset_id=payload.dataset_id,
            session_id=session_id,
            error=str(e),
        )
