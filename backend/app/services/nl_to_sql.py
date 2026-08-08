"""
backend/app/services/nl_to_sql.py
Natural-language-to-SQL generation service powered by Google Gemini and SqlValidator.
"""
import json
import time
from typing import List, Dict, Any, Tuple
import google.generativeai as genai
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import engine, Base
from app.models.dataset import DatasetModel
from app.models.chat_session import ChatSessionModel, ChatMessageModel
from app.services.sql_validator import SqlValidator, SqlValidationError


class NlToSqlService:
    @staticmethod
    def _get_table_sample_data(table_name: str) -> List[Dict[str, Any]]:
        """Fetch up to 2 sample rows from dataset table for prompt context."""
        try:
            with engine.connect() as conn:
                res = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 2'))
                cols = res.keys()
                rows = res.fetchall()
                return [dict(zip(cols, row)) for row in rows]
        except Exception:
            return []

    @staticmethod
    def query(
        dataset_id: str,
        prompt: str,
        session_id: str,
        db: Session,
    ) -> Tuple[str, List[str], List[Dict[str, Any]], Dict[str, Any], int, str]:
        """
        Main pipeline:
        1. Retrieves dataset schema and sample rows.
        2. Retrieves last 5-10 lightweight conversation turns for session memory.
        3. Constructs LLM prompt and calls Gemini API.
        4. Validates AST read-only guardrails.
        5. Executes query against dataset table.
        6. Saves turn to session log.
        """
        # Fetch dataset schema
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        # Ensure chat session exists
        chat_session = db.query(ChatSessionModel).filter(ChatSessionModel.id == session_id).first()
        if not chat_session:
            chat_session = ChatSessionModel(id=session_id, dataset_id=dataset_id)
            db.add(chat_session)
            db.commit()

        # Fetch last 6 conversation turns for lightweight session memory
        past_messages = (
            db.query(ChatMessageModel)
            .filter(ChatMessageModel.session_id == session_id)
            .order_by(ChatMessageModel.timestamp.desc())
            .limit(6)
            .all()
        )
        past_messages.reverse()

        conversation_history_str = ""
        if past_messages:
            history_lines = []
            for msg in past_messages:
                role_label = "User" if msg.role == "user" else "Assistant"
                line = f"{role_label}: {msg.content}"
                if msg.generated_sql:
                    line += f" [Executed SQL: {msg.generated_sql}]"
                history_lines.append(line)
            conversation_history_str = "\nRecent Conversation History:\n" + "\n".join(history_lines) + "\n"

        # Fetch sample rows
        sample_rows = NlToSqlService._get_table_sample_data(dataset.table_name)
        sample_str = json.dumps(sample_rows, default=str) if sample_rows else "[]"

        # Construct system prompt
        cols_desc = ", ".join([f"{c['name']} ({c['type']})" for c in dataset.columns_metadata])
        
        system_prompt = f"""You are an expert Data Analyst AI.
Your target database table is: "{dataset.table_name}"
Columns: {cols_desc}
Sample Rows: {sample_str}
{conversation_history_str}
User Question: "{prompt}"

Strict Requirements:
1. Generate standard SQL queries for SQLite/PostgreSQL. Use table name "{dataset.table_name}".
2. You MUST return ONLY a JSON object with this exact schema:
{{
  "sql": "SELECT category, SUM(sales) AS total_sales FROM \\"{dataset.table_name}\\" GROUP BY category ORDER BY total_sales DESC;",
  "explanation": "Summarized sales grouped by category.",
  "chart": {{
    "recommended": true,
    "type": "bar",
    "title": "Sales by Category",
    "xAxisKey": "category",
    "yAxisKey": "total_sales"
  }},
  "insight": "Electronics generated the highest total revenue."
}}
3. Do NOT include markdown code fences or any text outside the JSON payload.
4. MUST BE READ-ONLY SELECT statement.
"""

        # Call Gemini API or local fallback generator if no API key is provided
        raw_json_response = ""
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-2.5-flash")
                res = model.generate_content(system_prompt)
                raw_json_response = res.text
            except Exception:
                # Fallback to gemini-1.5-flash if 2.5 is not available
                try:
                    model = genai.GenerativeModel("gemini-1.5-flash")
                    res = model.generate_content(system_prompt)
                    raw_json_response = res.text
                except Exception as e:
                    raw_json_response = ""
        
        # Fallback query generator for development testing if API key is unconfigured
        if not raw_json_response or "{" not in raw_json_response:
            col_first = dataset.columns_metadata[0]["name"] if dataset.columns_metadata else "*"
            raw_json_response = json.dumps({
                "sql": f'SELECT * FROM "{dataset.table_name}" LIMIT 50;',
                "explanation": f"Retrieved top rows from {dataset.name}",
                "chart": {
                    "recommended": True,
                    "type": "bar",
                    "title": f"Dataset Summary ({dataset.name})",
                    "xAxisKey": col_first,
                    "yAxisKey": dataset.columns_metadata[1]["name"] if len(dataset.columns_metadata) > 1 else col_first
                },
                "insight": f"Dataset contains {dataset.row_count} total records."
            })

        # Clean JSON text
        clean_text = raw_json_response.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        try:
            parsed = json.loads(clean_text)
        except Exception:
            parsed = {
                "sql": f'SELECT * FROM "{dataset.table_name}" LIMIT 50;',
                "explanation": prompt,
                "chart": {"recommended": False, "type": "bar", "title": "Results"},
                "insight": "Query executed."
            }

        generated_sql = parsed.get("sql", f'SELECT * FROM "{dataset.table_name}" LIMIT 50;')
        explanation = parsed.get("explanation", "")
        chart_spec = parsed.get("chart", {"recommended": False})
        insight = parsed.get("insight", "")

        # Validate SQL AST guardrails
        validated_sql = SqlValidator.validate_and_format(generated_sql)

        # Execute query safely
        start_time = time.time()
        with engine.connect() as conn:
            query_res = conn.execute(text(validated_sql))
            cols = list(query_res.keys())
            rows_raw = query_res.fetchall()
            rows = [dict(zip(cols, row)) for row in rows_raw]
        execution_time_ms = int((time.time() - start_time) * 1000)

        # Save user message and AI message to session history
        user_msg = ChatMessageModel(
            session_id=session_id,
            role="user",
            content=prompt,
        )
        ai_msg = ChatMessageModel(
            session_id=session_id,
            role="assistant",
            content=explanation or "Query executed successfully.",
            generated_sql=validated_sql,
            execution_time_ms=execution_time_ms,
            row_count=len(rows),
            chart_spec=chart_spec,
            insight=insight,
        )

        db.add(user_msg)
        db.add(ai_msg)
        db.commit()

        return validated_sql, cols, rows, chart_spec, execution_time_ms, insight
