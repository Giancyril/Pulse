"""
backend/tests/test_export.py
Unit tests for ExportService multi-format export engine.
"""
import json
import pytest
from app.services.export_service import ExportService

SAMPLE_ROWS = [{"name": "Alice", "revenue": 5000}, {"name": "Bob", "revenue": 8200}]
SAMPLE_COLS = ["name", "revenue"]


def test_csv_export_contains_headers_and_data():
    data, media_type, filename = ExportService.export_query_result(SAMPLE_ROWS, SAMPLE_COLS, "csv")
    text = data.decode("utf-8")
    assert "name" in text
    assert "revenue" in text
    assert "Alice" in text
    assert media_type == "text/csv"
    assert filename.endswith(".csv")


def test_json_export_is_valid_json():
    data, media_type, filename = ExportService.export_query_result(SAMPLE_ROWS, SAMPLE_COLS, "json")
    parsed = json.loads(data.decode("utf-8"))
    assert isinstance(parsed, list)
    assert len(parsed) == 2
    assert parsed[0]["name"] == "Alice"
    assert media_type == "application/json"


def test_xlsx_export_returns_bytes():
    data, media_type, filename = ExportService.export_query_result(SAMPLE_ROWS, SAMPLE_COLS, "xlsx")
    assert isinstance(data, bytes)
    assert len(data) > 0
    assert "spreadsheetml" in media_type
    assert filename.endswith(".xlsx")


def test_markdown_export_produces_table():
    data, media_type, filename = ExportService.export_query_result(SAMPLE_ROWS, SAMPLE_COLS, "markdown")
    text = data.decode("utf-8")
    assert "| name |" in text
    assert "| Alice |" in text
    assert "---" in text
    assert filename.endswith(".md")


def test_empty_rows_export_csv():
    data, _, _ = ExportService.export_query_result([], SAMPLE_COLS, "csv")
    text = data.decode("utf-8")
    assert "name" in text
    assert "revenue" in text


def test_invalid_format_raises_error():
    with pytest.raises(ValueError, match="Unsupported export format"):
        ExportService.export_query_result(SAMPLE_ROWS, SAMPLE_COLS, "pdf")  # type: ignore
