"""
backend/tests/test_report.py
Unit tests for ReportService Executive BI Report Generator.
"""
import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from app.services.report_service import ReportService
from app.schemas.report import ExecutiveReportRequest, ExecutiveReportResponse


def _make_mock(df: pd.DataFrame, name: str = "test"):
    mock_dataset = MagicMock()
    mock_dataset.id = "ds_001"
    mock_dataset.name = name
    mock_dataset.table_name = "tbl_test"
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_dataset
    return mock_db


def test_report_generation_returns_kpis_and_recommendations():
    df = pd.DataFrame({"revenue": [1000, 2000, 3000], "costs": [500, 800, 1200]})
    mock_db = _make_mock(df, "Sales Data")

    req = ExecutiveReportRequest(dataset_id="ds_001", custom_instructions="Focus on profitability")

    with patch("app.services.report_service.engine"), \
         patch("app.services.report_service.pd.read_sql_table", return_value=df):
        res = ReportService.generate_report(req, mock_db)

    assert isinstance(res, ExecutiveReportResponse)
    assert res.dataset_name == "Sales Data"
    assert len(res.kpi_scorecards) >= 1
    assert len(res.strategic_recommendations) >= 1
    assert "Executive BI Report" in res.markdown_report


def test_report_generation_invalid_dataset():
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    req = ExecutiveReportRequest(dataset_id="invalid_id")

    with pytest.raises(ValueError, match="not found"):
        ReportService.generate_report(req, mock_db)
