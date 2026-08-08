"""
backend/tests/test_forecast.py
Unit tests for ForecastService trend and forecasting logic.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch
from app.services.forecast_service import ForecastService
from app.schemas.forecast import ForecastResponse


def _make_mock(df: pd.DataFrame, name: str = "test"):
    mock_dataset = MagicMock()
    mock_dataset.id = "ds_001"
    mock_dataset.name = name
    mock_dataset.table_name = "tbl_test"
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_dataset
    return mock_db


def test_linear_regression_upward_trend():
    """Strictly increasing series should produce upward trend with positive slope."""
    df = pd.DataFrame({"sales": [10, 20, 30, 40, 50]})
    mock_db = _make_mock(df)

    with patch("app.services.forecast_service.engine"), \
         patch("app.services.forecast_service.pd.read_sql_table", return_value=df):
        result = ForecastService.forecast("ds_001", "sales", None, 3, "linear_regression", mock_db)

    assert isinstance(result, ForecastResponse)
    assert result.trend.direction == "upward"
    assert result.trend.slope > 0
    assert result.forecast_periods == 3
    assert len(result.points) == 5 + 3  # 5 actual + 3 forecast


def test_moving_average_forecast_periods():
    """Moving average should produce the correct number of future forecast points."""
    df = pd.DataFrame({"revenue": [100, 110, 105, 115, 120]})
    mock_db = _make_mock(df)

    with patch("app.services.forecast_service.engine"), \
         patch("app.services.forecast_service.pd.read_sql_table", return_value=df):
        result = ForecastService.forecast("ds_001", "revenue", None, 4, "moving_average", mock_db)

    forecasted = [p for p in result.points if p.is_forecast]
    assert len(forecasted) == 4
    # Future predictions should use moving average (no None actuals)
    for fp in forecasted:
        assert fp.actual is None


def test_forecast_labels_from_column():
    """When label_column is provided, labels should come from that column."""
    df = pd.DataFrame({"month": ["Jan", "Feb", "Mar", "Apr"], "value": [5, 8, 12, 15]})
    mock_db = _make_mock(df)

    with patch("app.services.forecast_service.engine"), \
         patch("app.services.forecast_service.pd.read_sql_table", return_value=df):
        result = ForecastService.forecast("ds_001", "value", "month", 2, "linear_regression", mock_db)

    actual_labels = [p.label for p in result.points if not p.is_forecast]
    assert "Jan" in actual_labels
    assert "Apr" in actual_labels


def test_r_squared_perfect_linear_data():
    """Perfectly linear data should have R² close to 1.0."""
    df = pd.DataFrame({"x": [1, 2, 3, 4, 5, 6, 7, 8]})
    mock_db = _make_mock(df)

    with patch("app.services.forecast_service.engine"), \
         patch("app.services.forecast_service.pd.read_sql_table", return_value=df):
        result = ForecastService.forecast("ds_001", "x", None, 2, "linear_regression", mock_db)

    assert result.trend.r_squared >= 0.99
