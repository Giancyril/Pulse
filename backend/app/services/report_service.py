"""
backend/app/services/report_service.py
Executive BI Report Generator synthesizing statistical data with Google Gemini AI.
"""
from datetime import datetime, UTC
from typing import List, Optional
import json
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.dataset import DatasetModel
from app.schemas.report import (
    ExecutiveReportRequest,
    ExecutiveReportResponse,
    KPIScorecard,
    ExecutiveInsight,
)
from app.core.config import settings


class ReportService:
    @staticmethod
    def generate_report(req: ExecutiveReportRequest, db: Session) -> ExecutiveReportResponse:
        dataset = db.query(DatasetModel).filter(DatasetModel.id == req.dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{req.dataset_id}' not found.")

        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        total_rows = len(df)
        total_cols = len(df.columns)
        num_cols = list(df.select_dtypes(include=[np.number]).columns)

        # Statistical summary
        stats_summary = {}
        for col in num_cols[:5]:
            series = df[col].dropna()
            if not series.empty:
                stats_summary[col] = {
                    "mean": float(series.mean()),
                    "sum": float(series.sum()),
                    "min": float(series.min()),
                    "max": float(series.max()),
                }

        # Build prompt for Gemini AI synthesis
        prompt = f"""You are an executive Chief Data Officer. Generate an Executive BI Report for dataset '{dataset.name}'.
Dataset Stats: Total Rows: {total_rows}, Total Columns: {total_cols}
Key Column Metrics: {json.dumps(stats_summary, default=str)}
User Custom Focus: {req.custom_instructions or 'General executive performance and operational insights'}

Respond ONLY with valid JSON in this exact structure (no markdown fences, no raw text outside JSON):
{{
  "executive_summary": "High-level 2-3 sentence executive summary of dataset health and findings.",
  "kpi_scorecards": [
    {{
      "title": "KPI Metric Title",
      "value": "Formatted Value",
      "status": "POSITIVE|NEUTRAL|CONCERN",
      "trend_note": "Brief trend observation"
    }}
  ],
  "insights": [
    {{
      "category": "Growth|Risk|Efficiency|Data Quality",
      "finding": "Core finding",
      "impact": "Business impact",
      "recommendation": "Actionable recommendation"
    }}
  ],
  "strategic_recommendations": [
    "Actionable bullet point 1",
    "Actionable bullet point 2",
    "Actionable bullet point 3"
  ]
}}"""

        ai_response = None
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            ai_response = response.text
        except Exception:
            # Fallback to direct Gemini or heuristic generation
            pass

        # Parse JSON from AI or use deterministic fallback
        kpis: List[KPIScorecard] = []
        insights: List[ExecutiveInsight] = []
        strat_recs: List[str] = []
        exec_summary = f"Executive BI analysis for '{dataset.name}' comprising {total_rows} records and {total_cols} attributes."

        if ai_response:
            try:
                clean_json = ai_response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                parsed = json.loads(clean_json.strip())

                exec_summary = parsed.get("executive_summary", exec_summary)
                for item in parsed.get("kpi_scorecards", []):
                    kpis.append(KPIScorecard(**item))
                for item in parsed.get("insights", []):
                    insights.append(ExecutiveInsight(**item))
                strat_recs = parsed.get("strategic_recommendations", [])
            except Exception:
                pass

        # Fallback KPI generation if AI parsing skipped
        if not kpis:
            kpis.append(KPIScorecard(title="Total Volume", value=f"{total_rows:,} rows", status="POSITIVE", trend_note="Complete dataset load"))
            if num_cols:
                col1 = num_cols[0]
                kpis.append(KPIScorecard(title=f"Avg {col1}", value=f"{df[col1].mean():,.2f}", status="POSITIVE", trend_note="Central metric mean"))

        if not strat_recs:
            strat_recs = [
                "Establish automated quality profiling and monitoring on key column thresholds.",
                "Conduct regular trend forecasting to anticipate revenue and operational shifts.",
                "Optimize high-frequency queries to reduce infrastructure latency.",
            ]

        now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")

        # Render Markdown report preview
        md_lines = [
            f"# Executive BI Report: {dataset.name}",
            f"**Generated:** {now_str}  ",
            f"**Dataset ID:** `{dataset.id}` | **Rows:** {total_rows:,} | **Columns:** {total_cols}\n",
            "## Executive Summary",
            exec_summary,
            "\n## Key Performance Indicators",
            "\n".join([f"- **{k.title}**: {k.value} ({k.status}) — *{k.trend_note}*" for k in kpis]),
            "\n## Strategic Recommendations",
            "\n".join([f"1. {r}" for r in strat_recs]),
        ]
        markdown_report = "\n".join(md_lines)

        return ExecutiveReportResponse(
            dataset_id=dataset.id,
            dataset_name=dataset.name,
            generated_at=now_str,
            executive_summary=exec_summary,
            kpi_scorecards=kpis,
            insights=insights,
            strategic_recommendations=strat_recs,
            markdown_report=markdown_report,
        )
