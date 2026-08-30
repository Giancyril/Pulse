"""
backend/app/services/eda_narrative.py
Service for generating an AI-written narrative summary of EDA findings using Gemini.
"""
import json
import logging
from typing import List, Dict, Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.eda import (
    DistributionProfile,
    CategoricalBreakdown,
    CorrelationPair,
    EDANarrativeSummary,
)

logger = logging.getLogger(__name__)

class EDANarrativeService:
    @staticmethod
    def generate_narrative(
        distributions: List[DistributionProfile],
        categorical_breakdowns: List[CategoricalBreakdown],
        top_pairs: List[CorrelationPair],
        total_rows: int,
    ) -> EDANarrativeSummary | None:
        """
        Calls Gemini to generate a human-readable EDA summary based strictly on the
        computed statistical distributions, breakdowns, and correlations.
        Returns None if generation fails or API key is not configured.
        """
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set. Skipping AI EDA Narrative.")
            return None

        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)

            # Prepare grounded stats dictionary for the prompt
            stats_context: Dict[str, Any] = {
                "total_rows": total_rows,
                "strong_correlations": [
                    {"col1": p.col1, "col2": p.col2, "correlation": p.correlation, "strength": p.strength}
                    for p in top_pairs if abs(p.correlation) >= 0.30
                ],
                "distributions_summary": [
                    {
                        "column": d.column,
                        "mean": d.mean,
                        "median": d.median,
                        "skewness": d.skewness,
                        "is_skewed": abs(d.skewness) >= 1.0
                    }
                    for d in distributions
                ],
                "categorical_highlights": [
                    {
                        "column": c.column,
                        "total_distinct": c.total_distinct,
                        "top_value": c.frequencies[0].value if c.frequencies else None,
                        "top_percentage": c.frequencies[0].percentage if c.frequencies else 0.0
                    }
                    for c in categorical_breakdowns
                ]
            }

            prompt = f"""
You are an expert Data Analyst. I have run an automated Exploratory Data Analysis (EDA) on a dataset.
Review the following statistical findings and provide a concise, insightful narrative summary.

STATISTICAL FINDINGS (JSON):
{json.dumps(stats_context, indent=2)}

INSTRUCTIONS:
1. "overview": Provide a 1-2 sentence high-level summary of what the data looks like.
2. "key_findings": Provide a list of 3-5 bullet points highlighting the most interesting insights 
   (e.g., strong correlations, heavy skews, dominant categorical values). 
   Do NOT hallucinate numbers; only use the numbers provided in the findings above.

Respond ONLY with a valid JSON object matching this schema:
{{
  "overview": "str",
  "key_findings": ["str", "str", ...]
}}
"""
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2, # Keep it grounded
                    response_mime_type="application/json",
                ),
            )
            
            raw_text = response.text
            data = json.loads(raw_text)
            
            return EDANarrativeSummary(
                overview=data.get("overview", ""),
                key_findings=data.get("key_findings", [])
            )
            
        except Exception as e:
            logger.error(f"Failed to generate EDA narrative with Gemini: {e}")
            return None
