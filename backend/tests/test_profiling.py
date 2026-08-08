"""
backend/tests/test_profiling.py
Unit tests for ProfilingService health score and column analysis logic.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch
from app.services.profiling_service import ProfilingService
from app.schemas.profiling import DataQualityReport


def _make_df_and_mock(df: pd.DataFrame, name: str = "test_ds"):
    mock_dataset = MagicMock()
    mock_dataset.id = "ds_001"
    mock_dataset.name = name
    mock_dataset.table_name = "tbl_test"
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_dataset
    return mock_db, mock_dataset


def test_health_score_perfect_data():
    """A complete dataset with no nulls, no duplicates should score close to 100."""
    df = pd.DataFrame({"revenue": [100, 200, 300], "month": ["Jan", "Feb", "Mar"]})
    mock_db, _ = _make_df_and_mock(df)

    with patch("app.services.profiling_service.engine") as mock_engine, \
         patch("app.services.profiling_service.pd.read_sql_table", return_value=df):
        report = ProfilingService.profile_dataset("ds_001", mock_db)

    assert isinstance(report, DataQualityReport)
    assert report.health_score >= 98.0
    assert report.duplicate_row_count == 0
    assert report.overall_null_percentage == 0.0


def test_null_detection_increases_warning():
    """Columns with >30% nulls should appear in warnings list."""
    df = pd.DataFrame({
        "price": [10.0, None, None, 40.0, None],
        "label": ["A", "B", "C", "D", "E"],
    })
    mock_db, _ = _make_df_and_mock(df)

    with patch("app.services.profiling_service.engine"), \
         patch("app.services.profiling_service.pd.read_sql_table", return_value=df):
        report = ProfilingService.profile_dataset("ds_001", mock_db)

    warnings_text = " ".join(report.warnings)
    assert "missingness" in warnings_text.lower() or "null" in warnings_text.lower()


def test_outlier_iqr_detection():
    """IQR outlier detection should flag extreme values."""
    values = [10, 11, 12, 10, 11, 12, 13, 10, 500]  # 500 is an outlier
    df = pd.DataFrame({"sales": values})
    mock_db, _ = _make_df_and_mock(df)

    with patch("app.services.profiling_service.engine"), \
         patch("app.services.profiling_service.pd.read_sql_table", return_value=df):
        report = ProfilingService.profile_dataset("ds_001", mock_db)

    sales_col = next(c for c in report.column_profiles if c.name == "sales")
    assert sales_col.outlier_count >= 1


def test_duplicate_rows_counted():
    """Duplicate rows should be detected and counted."""
    df = pd.DataFrame({"a": [1, 2, 2, 3], "b": ["x", "y", "y", "z"]})
    mock_db, _ = _make_df_and_mock(df)

    with patch("app.services.profiling_service.engine"), \
         patch("app.services.profiling_service.pd.read_sql_table", return_value=df):
        report = ProfilingService.profile_dataset("ds_001", mock_db)

    assert report.duplicate_row_count >= 1
