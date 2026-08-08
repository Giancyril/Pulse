"""
backend/app/services/export_service.py
Multi-format export engine: CSV, JSON, XLSX, Markdown summary.
"""
import io
import json
import csv
from typing import List, Dict, Any, Literal
import pandas as pd


ExportFormat = Literal["csv", "json", "xlsx", "markdown"]


class ExportService:
    @staticmethod
    def export_query_result(
        rows: List[Dict[str, Any]],
        columns: List[str],
        fmt: ExportFormat,
        filename: str = "export",
    ) -> tuple[bytes, str, str]:
        """
        Returns (file_bytes, media_type, filename_with_extension).
        """
        if not rows:
            df = pd.DataFrame(columns=columns)
        else:
            df = pd.DataFrame(rows, columns=columns)

        if fmt == "csv":
            buf = io.StringIO()
            df.to_csv(buf, index=False)
            return buf.getvalue().encode("utf-8"), "text/csv", f"{filename}.csv"

        elif fmt == "json":
            data = df.to_dict(orient="records")
            json_bytes = json.dumps(data, indent=2, default=str).encode("utf-8")
            return json_bytes, "application/json", f"{filename}.json"

        elif fmt == "xlsx":
            buf = io.BytesIO()
            with pd.ExcelWriter(buf, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Query Results")
            buf.seek(0)
            return (
                buf.read(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                f"{filename}.xlsx",
            )

        elif fmt == "markdown":
            md_lines = ["| " + " | ".join(str(c) for c in df.columns) + " |"]
            md_lines.append("| " + " | ".join(["---"] * len(df.columns)) + " |")
            for _, row in df.iterrows():
                md_lines.append("| " + " | ".join(str(v) for v in row.values) + " |")
            md_str = "\n".join(md_lines)
            return md_str.encode("utf-8"), "text/markdown", f"{filename}.md"

        else:
            raise ValueError(f"Unsupported export format: {fmt}")
