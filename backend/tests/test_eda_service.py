"""
backend/tests/test_eda_service.py
Unit tests for EDAComputationService: correlation, distributions,
categorical breakdowns, pairwise scatters, and deterministic narrative.
"""
import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.dataset import DatasetModel
from app.models.eda_report import EDAReportModel
from app.services.eda_service import EDAComputationService
from app.schemas.eda import EDAReportResponse


# ── fixture ──────────────────────────────────────────────────────────────────

@pytest.fixture
def eda_db():
    """In-memory SQLite DB with all tables."""
    db_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=db_engine)
    Session = sessionmaker(bind=db_engine)
    session = Session()

    dataset = DatasetModel(
        id="ds_eda_01",
        name="eda_sample.csv",
        source_type="upload",
        table_name="tbl_eda_01",
        row_count=100,
        columns_metadata=[],
    )
    session.add(dataset)
    session.commit()
    yield session, db_engine
    session.close()


def _sample_df(n: int = 100) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    revenue = rng.normal(5000, 1200, n)
    marketing = 0.82 * revenue + rng.normal(0, 300, n)   # strong positive correlation
    units = rng.integers(10, 500, n).astype(float)
    region = rng.choice(["North", "North", "North", "South", "East", "West"], n)  # skewed
    category = rng.choice(["A", "B", "C"], n)
    return pd.DataFrame({
        "revenue": revenue,
        "marketing_spend": marketing,
        "units_sold": units,
        "region": region,
        "category": category,
    })


def _run_eda(df, eda_db):
    session, db_engine = eda_db
    with patch("app.services.eda_service.engine", db_engine), \
         patch("app.services.eda_service.pd.read_sql_table", return_value=df):
        return EDAComputationService.compute_eda("ds_eda_01", session, force_refresh=True)


# ── correlation ───────────────────────────────────────────────────────────────

def test_correlation_matrix_dimensions(eda_db):
    """N×N matrix must have exactly N rows and columns."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    assert result.correlations is not None
    n = len(result.correlations.columns)
    assert n == 3  # revenue, marketing_spend, units_sold
    assert len(result.correlations.matrix) == n
    for row in result.correlations.matrix:
        assert len(row) == n


def test_diagonal_is_one(eda_db):
    """Pearson correlation of a variable with itself must be exactly 1.0."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    for i, row in enumerate(result.correlations.matrix):
        assert abs(row[i] - 1.0) < 1e-6, f"Diagonal element [{i},{i}] is {row[i]}, not 1.0"


def test_strong_correlation_is_detected(eda_db):
    """revenue↔marketing_spend should surface as a top pair with |r| ≥ 0.7."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    top_pair = result.correlations.top_pairs[0]
    assert abs(top_pair.correlation) >= 0.70, (
        f"Expected top correlation ≥0.70, got {top_pair.correlation}"
    )
    names = {top_pair.col1, top_pair.col2}
    assert "revenue" in names
    assert "marketing_spend" in names


def test_correlation_values_in_minus1_to_1(eda_db):
    """All correlation values must be within [-1, 1]."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    for row in result.correlations.matrix:
        for v in row:
            assert -1.0 <= v <= 1.0, f"Correlation value {v} outside [-1, 1]"


# ── distributions ────────────────────────────────────────────────────────────

def test_distributions_produced_for_numeric_cols(eda_db):
    """A distribution profile must be generated for every numeric column."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    dist_cols = {d.column for d in result.distributions}
    assert "revenue" in dist_cols
    assert "marketing_spend" in dist_cols
    assert "units_sold" in dist_cols


def test_distribution_bins_are_contiguous(eda_db):
    """Histogram bin edges must be contiguous (bin_end[i] == bin_start[i+1])."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    for dist in result.distributions:
        bins = dist.bins
        assert len(bins) >= 5, f"Too few bins for column {dist.column}"
        for i in range(len(bins) - 1):
            assert abs(bins[i].bin_end - bins[i + 1].bin_start) < 1e-3, (
                f"Non-contiguous bins at index {i} for {dist.column}"
            )


def test_distribution_bin_counts_sum_to_n(eda_db):
    """Total bin counts must equal the non-null row count."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    for dist in result.distributions:
        total_in_bins = sum(b.count for b in dist.bins)
        expected = df[dist.column].dropna().shape[0]
        assert total_in_bins == expected, (
            f"Bin counts ({total_in_bins}) != non-null rows ({expected}) for {dist.column}"
        )


def test_skewness_sign_matches_data(eda_db):
    """Skewness sign should match scipy's calculation."""
    from scipy import stats
    df = _sample_df()
    result = _run_eda(df, eda_db)

    rev_dist = next(d for d in result.distributions if d.column == "revenue")
    expected_sign = np.sign(float(stats.skew(df["revenue"].dropna())))
    actual_sign = np.sign(rev_dist.skewness) if rev_dist.skewness != 0 else 0
    assert actual_sign == expected_sign, (
        f"Skewness sign mismatch: expected {expected_sign}, got {rev_dist.skewness}"
    )


# ── categorical breakdowns ────────────────────────────────────────────────────

def test_categorical_breakdowns_produced(eda_db):
    """Categorical breakdowns must be generated for region and category."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    cat_cols = {c.column for c in result.categorical_breakdowns}
    assert "region" in cat_cols
    assert "category" in cat_cols


def test_categorical_percentages_sum_to_100(eda_db):
    """Top frequencies + other_percentage should account for all rows."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    for cat in result.categorical_breakdowns:
        top_sum = sum(f.percentage for f in cat.frequencies)
        total = top_sum + cat.other_percentage
        # Allow up to 1% floating point rounding tolerance
        assert abs(total - 100.0) < 1.0, (
            f"Percentages for '{cat.column}' sum to {total}, not ~100%"
        )


def test_north_is_dominant_category(eda_db):
    """'North' should be the top region value (seeded to appear ~50% of the time)."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    region_cat = next(c for c in result.categorical_breakdowns if c.column == "region")
    assert region_cat.frequencies[0].value == "North"
    assert region_cat.frequencies[0].percentage >= 40.0


# ── pairwise scatters ────────────────────────────────────────────────────────

def test_pairwise_scatters_for_strong_pairs(eda_db):
    """A scatter should be produced for the revenue↔marketing_spend pair."""
    df = _sample_df()
    result = _run_eda(df, eda_db)

    assert len(result.pairwise_scatters) >= 1
    scatter = result.pairwise_scatters[0]
    names = {scatter.x_column, scatter.y_column}
    assert "revenue" in names
    assert "marketing_spend" in names


def test_scatter_points_capped(eda_db):
    """Scatter points must be capped at MAX_SCATTER_POINTS."""
    df = _sample_df(1000)  # large dataset
    result = _run_eda(df, eda_db)

    from app.services.eda_service import MAX_SCATTER_POINTS
    for scatter in result.pairwise_scatters:
        assert len(scatter.points) <= MAX_SCATTER_POINTS, (
            f"Scatter for {scatter.x_column}↔{scatter.y_column} has "
            f"{len(scatter.points)} points, exceeds cap {MAX_SCATTER_POINTS}"
        )


# ── deterministic narrative ──────────────────────────────────────────────────

def test_narrative_references_only_computed_numbers(eda_db):
    """
    Every numeric value mentioned in findings must originate from computed stats.
    This guards against LLM hallucination — even for the deterministic fallback,
    all findings must be traceable to the actual EDA outputs.
    """
    df = _sample_df()
    result = _run_eda(df, eda_db)

    narrative = result.narrative_summary
    assert narrative.overview  # non-empty
    assert isinstance(narrative.key_findings, list)

    # Check that correlation r values mentioned in findings come from computed top_pairs
    computed_r_values = {str(p.correlation) for p in result.correlations.top_pairs}
    for finding in narrative.key_findings:
        # If a finding mentions "r = X.XX", verify X.XX is a computed correlation value
        import re
        matches = re.findall(r"r\s*=\s*([-\d.]+)", finding)
        for m in matches:
            assert m in computed_r_values, (
                f"Finding references r={m} which is not a computed correlation value. "
                f"Computed values: {computed_r_values}"
            )


def test_narrative_overview_contains_row_count(eda_db):
    """The overview sentence should mention the total record count."""
    df = _sample_df(100)
    result = _run_eda(df, eda_db)

    assert "100" in result.narrative_summary.overview


# ── caching ──────────────────────────────────────────────────────────────────

def test_eda_cache_is_created_on_first_compute(eda_db):
    """After compute_eda, an EDAReportModel record must exist in the DB."""
    session, db_engine = eda_db
    df = _sample_df()

    with patch("app.services.eda_service.engine", db_engine), \
         patch("app.services.eda_service.pd.read_sql_table", return_value=df):
        EDAComputationService.compute_eda("ds_eda_01", session, force_refresh=True)

    cached = session.query(EDAReportModel).filter(EDAReportModel.dataset_id == "ds_eda_01").first()
    assert cached is not None
    assert cached.correlations is not None


def test_eda_cache_is_returned_on_second_call(eda_db):
    """Second call without force_refresh must return is_cached=True."""
    session, db_engine = eda_db
    df = _sample_df()

    with patch("app.services.eda_service.engine", db_engine), \
         patch("app.services.eda_service.pd.read_sql_table", return_value=df):
        EDAComputationService.compute_eda("ds_eda_01", session, force_refresh=True)
        result2 = EDAComputationService.compute_eda("ds_eda_01", session, force_refresh=False)

    assert result2.is_cached is True


def test_force_refresh_recomputes_eda(eda_db):
    """force_refresh=True must produce is_cached=False even if cache exists."""
    session, db_engine = eda_db
    df = _sample_df()

    with patch("app.services.eda_service.engine", db_engine), \
         patch("app.services.eda_service.pd.read_sql_table", return_value=df):
        EDAComputationService.compute_eda("ds_eda_01", session, force_refresh=True)
        result2 = EDAComputationService.compute_eda("ds_eda_01", session, force_refresh=True)

    assert result2.is_cached is False
