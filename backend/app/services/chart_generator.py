"""
backend/app/services/chart_generator.py
Service for inferring recommended chart type and specification from query result shapes.
"""
from typing import List, Dict, Any


class ChartGeneratorService:
    @staticmethod
    def infer_chart_spec(columns: List[str], rows: List[Dict[str, Any]], title: str = "") -> Dict[str, Any]:
        """
        Analyzes query output columns and data types to recommend:
        - 'kpi' if single number (1 row, 1 col)
        - 'line' or 'area' if temporal date/time column present
        - 'bar' if string category + numeric measure
        - 'pie' if <= 5 categories
        - 'scatter' if two numeric columns
        """
        if not rows or not columns:
            return {"recommended": False, "type": "bar", "title": title or "Query Output"}

        col_count = len(columns)
        row_count = len(rows)

        # Single aggregate KPI metric card
        if row_count == 1 and col_count == 1:
            val = rows[0][columns[0]]
            return {
                "recommended": True,
                "type": "kpi",
                "title": title or columns[0].replace("_", " ").title(),
                "yAxisKey": columns[0],
                "description": f"Single aggregate measure ({columns[0]})",
            }

        # Check for temporal / date columns
        date_cols = [c for c in columns if any(k in c.lower() for k in ["date", "time", "month", "year", "created", "day"])]
        numeric_cols = []

        first_row = rows[0]
        for c in columns:
            val = first_row.get(c)
            if isinstance(val, (int, float)) and c not in date_cols:
                numeric_cols.append(c)

        string_cols = [c for c in columns if c not in numeric_cols and c not in date_cols]

        # Time-series line chart
        if date_cols and numeric_cols:
            return {
                "recommended": True,
                "type": "line",
                "title": title or f"{numeric_cols[0].title()} over Time",
                "xAxisKey": date_cols[0],
                "yAxisKey": numeric_cols[0],
                "color": "#06b6d4",
            }

        # Categorical bar chart or pie chart
        if string_cols and numeric_cols:
            x_col = string_cols[0]
            y_col = numeric_cols[0]

            if row_count <= 5:
                return {
                    "recommended": True,
                    "type": "pie",
                    "title": title or f"Distribution of {y_col.title()} by {x_col.title()}",
                    "xAxisKey": x_col,
                    "yAxisKey": y_col,
                }

            return {
                "recommended": True,
                "type": "bar",
                "title": title or f"{y_col.title()} by {x_col.title()}",
                "xAxisKey": x_col,
                "yAxisKey": y_col,
                "color": "#06b6d4",
            }

        # Two numeric columns scatter plot
        if len(numeric_cols) >= 2:
            return {
                "recommended": True,
                "type": "scatter",
                "title": title or f"{numeric_cols[1].title()} vs {numeric_cols[0].title()}",
                "xAxisKey": numeric_cols[0],
                "yAxisKey": numeric_cols[1],
                "color": "#22d3ee",
            }

        return {
            "recommended": True,
            "type": "bar",
            "title": title or "Query Results",
            "xAxisKey": columns[0],
            "yAxisKey": columns[1] if len(columns) > 1 else columns[0],
            "color": "#06b6d4",
        }
