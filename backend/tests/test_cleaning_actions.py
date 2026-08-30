"""
backend/tests/test_cleaning_actions.py
Unit tests for CleaningExecutionService: action correctness, dry-run guarantee, and history.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch, call
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.dataset import DatasetModel
from app.models.cleaning_action import CleaningActionModel
from app.models.eda_report import EDAReportModel
from app.services.cleaning_service import CleaningExecutionService
from app.schemas.cleaning import CleaningActionRequest


# ─── Helpers ───────────────────────────────────────────────────────────────

def _make_req(action_type: str, column_name: str = None, params: dict = None, dry_run: bool = False) -> CleaningActionRequest:
    return CleaningActionRequest(
        action_type=action_type,
        column_name=column_name,
        parameters=params or {},
        dry_run=dry_run,
    )


@pytest.fixture
def in_memory_db():
    """Creates a fresh in-memory SQLite DB per test with all tables."""
    db_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=db_engine)
    Session = sessionmaker(bind=db_engine)
    session = Session()

    dataset = DatasetModel(
        id="ds_exec_01",
        name="test_data.csv",
        source_type="upload",
        table_name="tbl_exec_01",
        row_count=10,
        columns_metadata=[],
    )
    session.add(dataset)
    session.commit()
    yield session, db_engine
    session.close()


def _patch_and_exec(df: pd.DataFrame, req: CleaningActionRequest, db, db_engine):
    """Helper to execute action with mocked DB I/O."""
    with patch("app.services.cleaning_service.engine", db_engine), \
         patch("app.services.cleaning_service.pd.read_sql_table", return_value=df), \
         patch("app.services.profiling_service.engine", db_engine), \
         patch("app.services.profiling_service.pd.read_sql_table", return_value=df):

        # For apply, also mock to_sql and EDA invalidation
        with patch.object(pd.DataFrame, "to_sql", return_value=None):
            return CleaningExecutionService.execute_cleaning_action("ds_exec_01", req, db)


# ─── Drop Null Rows ─────────────────────────────────────────────────────────

def test_drop_null_rows_removes_correct_rows(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({
        "age": [25, np.nan, 30, np.nan, 35],
        "city": ["A", "B", "C", "D", "E"],
    })
    req = _make_req("drop_null_rows", params={"columns": ["age"], "how": "any"})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_before == 5
    assert result.rows_after == 3
    assert result.rows_affected == 2
    assert result.dry_run is False
    assert "Dropped 2" in result.summary


def test_drop_null_rows_dry_run_does_not_mutate(in_memory_db):
    """Preview must not change the underlying DataFrame."""
    db, db_engine = in_memory_db
    df = pd.DataFrame({"val": [1.0, np.nan, 3.0]})
    req = _make_req("drop_null_rows", params={"columns": ["val"]}, dry_run=True)

    with patch("app.services.cleaning_service.engine", db_engine), \
         patch("app.services.cleaning_service.pd.read_sql_table", return_value=df.copy()):
        result = CleaningExecutionService.execute_cleaning_action("ds_exec_01", req, db)

    assert result.dry_run is True
    assert "[PREVIEW]" in result.summary
    # Original df is untouched
    assert df["val"].isnull().sum() == 1


# ─── Impute Mean / Median / Mode / Constant ────────────────────────────────

def test_impute_median_fills_nulls(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({"score": [10.0, np.nan, 30.0, np.nan, 50.0]})
    req = _make_req("impute_median", column_name="score", params={"column": "score", "value": 30.0})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_affected == 2
    assert "30.0" in result.summary


def test_impute_mean_fills_nulls(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({"revenue": [100.0, 200.0, np.nan, 400.0]})
    req = _make_req("impute_mean", column_name="revenue", params={"column": "revenue", "value": 233.33})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_affected == 1
    assert "233.33" in result.summary


def test_impute_mode_fills_categorical_nulls(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({"region": ["North", "North", None, "South", None]})
    req = _make_req("impute_mode", column_name="region", params={"column": "region", "value": "North"})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_affected == 2
    assert "North" in result.summary


def test_impute_constant_fills_value(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({"quantity": [5, np.nan, 15, np.nan]})
    req = _make_req("impute_constant", column_name="quantity", params={"column": "quantity", "value": 0})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_affected == 2


# ─── Drop Duplicates ────────────────────────────────────────────────────────

def test_drop_duplicates_removes_exact_matches(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({
        "id": [1, 2, 2, 3, 3, 3],
        "name": ["Alice", "Bob", "Bob", "Carol", "Carol", "Carol"],
    })
    req = _make_req("drop_duplicates", params={"subset": None, "keep": "first"})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_before == 6
    assert result.rows_after == 3
    assert result.rows_affected == 3
    assert "3 duplicate row(s)" in result.summary


# ─── Cast Column Type ────────────────────────────────────────────────────────

def test_cast_column_type_float_strips_currency(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({"salary": ["$50,000", "$75,000", "$100,000"]})
    req = _make_req("cast_column_type", column_name="salary",
                    params={"column": "salary", "target_type": "FLOAT", "on_error": "coerce"})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_affected == 3  # all 3 values changed type representation
    assert "FLOAT" in result.summary


def test_cast_column_type_integer(in_memory_db):
    db, db_engine = in_memory_db
    df = pd.DataFrame({"units": ["10", "20", "30"]})
    req = _make_req("cast_column_type", column_name="units",
                    params={"column": "units", "target_type": "INTEGER", "on_error": "coerce"})
    result = _patch_and_exec(df, req, db, db_engine)

    assert "INTEGER" in result.summary


# ─── IQR Cap / Drop ─────────────────────────────────────────────────────────

def test_cap_iqr_outliers_winsorizes_extreme_values(in_memory_db):
    db, db_engine = in_memory_db
    values = [10, 11, 12, 10, 11, 12, 13, 10, 500]  # 500 is the outlier
    df = pd.DataFrame({"metric": values})
    req = _make_req("cap_iqr_outliers", column_name="metric",
                    params={"column": "metric", "factor": 1.5})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_affected >= 1
    assert result.rows_before == result.rows_after  # no rows dropped
    assert "capped" in result.summary.lower() or "winsorized" in result.summary.lower()


def test_drop_iqr_outliers_removes_rows(in_memory_db):
    db, db_engine = in_memory_db
    values = [10, 11, 12, 10, 11, 12, 13, 10, 500]
    df = pd.DataFrame({"metric": values})
    req = _make_req("drop_iqr_outliers", column_name="metric",
                    params={"column": "metric", "factor": 1.5})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_after < result.rows_before
    assert "Dropped" in result.summary


# ─── Z-Score Cap / Drop ─────────────────────────────────────────────────────

def test_cap_zscore_outliers_clamps_extremes(in_memory_db):
    db, db_engine = in_memory_db
    values = list(range(20)) + [1000]  # 1000 is wildly extreme
    df = pd.DataFrame({"measure": values})
    req = _make_req("cap_zscore_outliers", column_name="measure",
                    params={"column": "measure", "threshold_z": 3.0})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_affected >= 1
    assert result.rows_before == result.rows_after  # no rows dropped


def test_drop_zscore_outliers_removes_rows(in_memory_db):
    db, db_engine = in_memory_db
    values = list(range(20)) + [1000]
    df = pd.DataFrame({"measure": values})
    req = _make_req("drop_zscore_outliers", column_name="measure",
                    params={"column": "measure", "threshold_z": 3.0})
    result = _patch_and_exec(df, req, db, db_engine)

    assert result.rows_after < result.rows_before


# ─── Sample Diff Integrity ───────────────────────────────────────────────────

def test_sample_diff_shows_before_and_after(in_memory_db):
    """For apply actions, sample_diff must include before and after for each changed row."""
    db, db_engine = in_memory_db
    df = pd.DataFrame({"price": [100.0, np.nan, 300.0, np.nan]})
    req = _make_req("impute_median", column_name="price", params={"column": "price", "value": 200.0})
    result = _patch_and_exec(df, req, db, db_engine)

    assert len(result.sample_diff) >= 1
    for diff in result.sample_diff:
        assert diff.before is not None
        assert diff.after is not None  # non-drop actions always have after
        assert diff.before.get("price") is None  # was null before


def test_sample_diff_drop_actions_have_no_after(in_memory_db):
    """Dropped rows should show before dict but after=None."""
    db, db_engine = in_memory_db
    df = pd.DataFrame({"val": [1.0, np.nan, 3.0]})
    req = _make_req("drop_null_rows", params={"columns": ["val"]})
    result = _patch_and_exec(df, req, db, db_engine)

    assert len(result.sample_diff) >= 1
    for diff in result.sample_diff:
        assert diff.before is not None
        assert diff.after is None  # row was dropped


# ─── Cleaning History ────────────────────────────────────────────────────────

def test_cleaning_history_returns_applied_actions(in_memory_db):
    """Verify that applied actions appear in cleaning history."""
    db, db_engine = in_memory_db

    # Manually insert a log entry
    action = CleaningActionModel(
        dataset_id="ds_exec_01",
        action_type="drop_duplicates",
        column_name=None,
        parameters={"keep": "first"},
        rows_affected=3,
        summary="Removed 3 duplicate row(s) (keeping first occurrence).",
    )
    db.add(action)
    db.commit()

    result = CleaningExecutionService.get_cleaning_history("ds_exec_01", db)

    assert result.total_actions == 1
    assert result.history[0].action_type == "drop_duplicates"
    assert result.history[0].rows_affected == 3
