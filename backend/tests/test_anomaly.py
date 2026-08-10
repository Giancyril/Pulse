"""
backend/tests/test_anomaly.py
Unit tests for AnomalyService Z-score anomaly detection engine.
"""
import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from app.services.anomaly_service import AnomalyService
from app.schemas.anomaly import AnomalyResponse


def _make_mock(df: pd.DataFrame, name: str = "test"):
    mock_dataset = MagicMock()
    mock_dataset.id = "ds_001"
    mock_dataset.name = name
    mock_dataset.table_name = "tbl_test"
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_dataset
    return mock_db


def test_anomaly_detection_flags_extreme_outlier():
    # Value 1000 is an extreme outlier among normal values ~10
    values = [10, 11, 12, 10, 11, 12, 10, 11, 12, 1000]
    df = pd.DataFrame({"metrics": values})
    mock_db = _make_mock(df)

    with patch("app.services.anomaly_service.engine"), \
         patch("app.services.anomaly_service.pd.read_sql_table", return_value=df):
        res = AnomalyService.detect_anomalies("ds_001", threshold_z=2.0, target_columns=None, db=mock_db)

    assert isinstance(res, AnomalyResponse)
    assert res.summary.total_anomalies >= 1
    assert any(a.value == 1000 for a in res.anomalies)


def test_anomaly_detection_empty_df():
    df = pd.DataFrame()
    mock_db = _make_mock(df)

    with patch("app.services.anomaly_service.engine"), \
         patch("app.services.anomaly_service.pd.read_sql_table", return_value=df):
        res = AnomalyService.detect_anomalies("ds_001", threshold_z=2.0, target_columns=None, db=mock_db)

    assert res.summary.total_anomalies == 0


def test_severity_classification():
    # Normal data + one moderate + one extreme outlier
    values = [10.0] * 50 + [40.0, 100.0]  # mean ~13.4, std ~14.4
    df = pd.DataFrame({"sales": values})
    mock_db = _make_mock(df)

    with patch("app.services.anomaly_service.engine"), \
         patch("app.services.anomaly_service.pd.read_sql_table", return_value=df):
        res = AnomalyService.detect_anomalies("ds_001", threshold_z=1.5, target_columns=None, db=mock_db)

    severities = [a.severity for a in res.anomalies]
    assert "EXTREME" in severities or "MODERATE" in severities
