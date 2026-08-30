"""
backend/tests/test_cleaning_suggestions.py
Unit tests for cleaning suggestion generation logic and endpoint.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.services.cleaning_service import CleaningSuggestionService
from app.schemas.cleaning import CleaningSuggestionsResponse

client = TestClient(app)


def _make_mock_db_with_df(df: pd.DataFrame, dataset_id: str = "ds_clean_01"):
    mock_dataset = MagicMock()
    mock_dataset.id = dataset_id
    mock_dataset.name = "messy_sample.csv"
    mock_dataset.table_name = f"tbl_{dataset_id}"
    mock_dataset.row_count = len(df)
    mock_dataset.columns_metadata = []

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_dataset
    return mock_db, mock_dataset


def test_suggestions_for_missing_values_and_duplicates():
    """Verify suggestions correctly identify nulls, duplicates, and offer valid actions."""
    df = pd.DataFrame({
        "age": [25, np.nan, 30, 35, np.nan, 25],
        "city": ["New York", "London", None, "Paris", "New York", "New York"],
        "salary": ["$50,000", "$60,000", "$75,000", "$80,000", "$50,000", "$50,000"],
    })
    # Note: row 0 and 5 are duplicates across all columns

    mock_db, _ = _make_mock_db_with_df(df)

    with patch("app.services.cleaning_service.engine"), \
         patch("app.services.cleaning_service.pd.read_sql_table", return_value=df), \
         patch("app.services.profiling_service.engine"), \
         patch("app.services.profiling_service.pd.read_sql_table", return_value=df), \
         patch("app.services.anomaly_service.engine"), \
         patch("app.services.anomaly_service.pd.read_sql_table", return_value=df):
        resp = CleaningSuggestionService.generate_suggestions("ds_clean_01", mock_db)

    assert isinstance(resp, CleaningSuggestionsResponse)
    assert resp.total_suggestions >= 3

    # Check duplicate suggestion
    dup_sug = next((s for s in resp.suggestions if s.issue_type == "DUPLICATE_ROWS"), None)
    assert dup_sug is not None
    assert dup_sug.recommended_action == "drop_duplicates"

    # Check age missingness suggestion
    age_sug = next((s for s in resp.suggestions if s.column_name == "age"), None)
    assert age_sug is not None
    assert age_sug.issue_type == "MISSING_VALUES"
    action_types = [a.action_type for a in age_sug.available_actions]
    assert "impute_median" in action_types
    assert "impute_mean" in action_types
    assert "drop_null_rows" in action_types

    # Check city categorical missingness suggestion
    city_sug = next((s for s in resp.suggestions if s.column_name == "city"), None)
    assert city_sug is not None
    assert city_sug.issue_type == "MISSING_VALUES"
    city_actions = [a.action_type for a in city_sug.available_actions]
    assert "impute_mode" in city_actions

    # Check salary type mismatch suggestion (string containing dollar sign and commas)
    salary_sug = next((s for s in resp.suggestions if s.column_name == "salary"), None)
    assert salary_sug is not None
    assert salary_sug.issue_type == "TYPE_MISMATCH"
    assert salary_sug.recommended_action == "cast_column_type"


def test_suggestions_for_iqr_outliers():
    """Verify outliers trigger capping and dropping recommendations."""
    values = [10, 11, 10, 12, 10, 11, 10, 12, 500]  # 500 is extreme
    df = pd.DataFrame({"metric": values})
    mock_db, _ = _make_mock_db_with_df(df)

    with patch("app.services.cleaning_service.engine"), \
         patch("app.services.cleaning_service.pd.read_sql_table", return_value=df), \
         patch("app.services.profiling_service.engine"), \
         patch("app.services.profiling_service.pd.read_sql_table", return_value=df), \
         patch("app.services.anomaly_service.engine"), \
         patch("app.services.anomaly_service.pd.read_sql_table", return_value=df):
        resp = CleaningSuggestionService.generate_suggestions("ds_clean_01", mock_db)

    iqr_sug = next((s for s in resp.suggestions if s.issue_type == "IQR_OUTLIERS" and s.column_name == "metric"), None)
    assert iqr_sug is not None
    assert iqr_sug.recommended_action == "cap_iqr_outliers"
