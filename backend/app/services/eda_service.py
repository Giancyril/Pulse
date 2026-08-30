"""
backend/app/services/eda_service.py
Automated Exploratory Data Analysis (EDA) computation engine.

Computes per-dataset:
  - Pearson correlation matrix across numeric columns
  - Distribution histograms with skewness / kurtosis stats
  - Categorical value-count breakdowns with long-tail rollup
  - Pairwise scatter data for the top-correlated numeric pairs

Results are cached in EDAReportModel (one row per dataset).
EDA cache is invalidated whenever a cleaning action is applied.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, UTC
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats
from sqlalchemy.orm import Session

from app.core.database import engine
from app.models.dataset import DatasetModel
from app.models.eda_report import EDAReportModel
from app.schemas.eda import (
    CorrelationMatrix,
    CorrelationPair,
    DistributionProfile,
    HistogramBin,
    CategoricalBreakdown,
    CategoricalFrequency,
    PairwiseScatter,
    ScatterPoint,
    EDANarrativeSummary,
    EDAReportResponse,
)

# ── tunables ─────────────────────────────────────────────────────────────────
MAX_NUMERIC_HIST_COLS = 8          # at most 8 histograms
MAX_CATEGORICAL_COLS = 8           # at most 8 categorical breakdowns
MAX_CATEGORICAL_CARDINALITY = 50   # ignore cols with too many distinct categories
MAX_SCATTER_POINTS = 300           # cap scatter points for frontend perf
MAX_SCATTER_PAIRS = 4              # max pairwise scatter plots to return
MIN_CORRELATION_ABS = 0.25        # minimum |r| to surface a scatter pair


# ── helpers ──────────────────────────────────────────────────────────────────

def _correlation_strength(r: float) -> str:
    a = abs(r)
    sign = "Positive" if r >= 0 else "Negative"
    if a >= 0.70:
        return f"Strong {sign}"
    elif a >= 0.40:
        return f"Moderate {sign}"
    elif a >= 0.20:
        return f"Weak {sign}"
    return "Negligible"


def _safe_float(v) -> float:
    """Return float, replacing NaN/Inf with 0.0."""
    try:
        f = float(v)
        return 0.0 if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return 0.0


def _freedman_diaconis_bins(series: pd.Series, max_bins: int = 40) -> int:
    """Estimate histogram bin count using the Freedman-Diaconis rule."""
    n = len(series)
    if n < 2:
        return 10
    q75, q25 = np.percentile(series, [75, 25])
    iqr = q75 - q25
    if iqr == 0:
        return min(int(np.sqrt(n)), max_bins)
    h = 2.0 * iqr / (n ** (1 / 3))
    r = series.max() - series.min()
    if h == 0:
        return min(int(np.sqrt(n)), max_bins)
    return max(5, min(int(math.ceil(r / h)), max_bins))


# ── EDA computation ───────────────────────────────────────────────────────────

class EDAComputationService:

    @staticmethod
    def _compute_correlations(num_df: pd.DataFrame) -> Optional[CorrelationMatrix]:
        """Computes Pearson correlation matrix for numeric columns."""
        if num_df.shape[1] < 2:
            return None

        corr = num_df.corr(method="pearson", numeric_only=True)
        cols = list(corr.columns)

        matrix: List[List[float]] = []
        for row in corr.values:
            matrix.append([round(_safe_float(v), 4) for v in row])

        # Collect unique upper-triangle pairs
        top_pairs: List[CorrelationPair] = []
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                r = _safe_float(corr.iloc[i, j])
                top_pairs.append(
                    CorrelationPair(
                        col1=cols[i],
                        col2=cols[j],
                        correlation=round(r, 4),
                        strength=_correlation_strength(r),
                    )
                )

        top_pairs.sort(key=lambda p: abs(p.correlation), reverse=True)

        return CorrelationMatrix(columns=cols, matrix=matrix, top_pairs=top_pairs[:10])

    @staticmethod
    def _compute_distributions(num_df: pd.DataFrame) -> List[DistributionProfile]:
        """Computes histogram bins and descriptive stats for numeric columns."""
        profiles: List[DistributionProfile] = []
        cols = list(num_df.columns)[:MAX_NUMERIC_HIST_COLS]

        for col in cols:
            series = num_df[col].dropna()
            if len(series) < 3:
                continue

            n_bins = _freedman_diaconis_bins(series)
            counts, bin_edges = np.histogram(series, bins=n_bins)

            bins = [
                HistogramBin(
                    bin_start=round(float(bin_edges[i]), 4),
                    bin_end=round(float(bin_edges[i + 1]), 4),
                    count=int(counts[i]),
                )
                for i in range(len(counts))
            ]

            skew = _safe_float(scipy_stats.skew(series))
            kurt = _safe_float(scipy_stats.kurtosis(series))

            profiles.append(
                DistributionProfile(
                    column=col,
                    mean=round(_safe_float(series.mean()), 4),
                    median=round(_safe_float(series.median()), 4),
                    std=round(_safe_float(series.std()), 4),
                    skewness=round(skew, 4),
                    kurtosis=round(kurt, 4),
                    min=round(_safe_float(series.min()), 4),
                    max=round(_safe_float(series.max()), 4),
                    bins=bins,
                )
            )

        return profiles

    @staticmethod
    def _compute_categorical_breakdowns(df: pd.DataFrame) -> List[CategoricalBreakdown]:
        """Computes top-frequency breakdowns for low-cardinality categorical columns."""
        breakdowns: List[CategoricalBreakdown] = []
        cat_cols = [
            c for c in df.select_dtypes(include=["object", "category", "str"]).columns
            if df[c].nunique(dropna=True) <= MAX_CATEGORICAL_CARDINALITY
        ][:MAX_CATEGORICAL_COLS]


        total_rows = max(1, len(df))

        for col in cat_cols:
            vc = df[col].value_counts(dropna=True)
            total_distinct = int(vc.shape[0])
            top15 = vc.head(15)
            other_count = int(vc.iloc[15:].sum()) if total_distinct > 15 else 0

            freqs = [
                CategoricalFrequency(
                    value=str(val),
                    count=int(cnt),
                    percentage=round((int(cnt) / total_rows) * 100, 2),
                )
                for val, cnt in top15.items()
            ]

            breakdowns.append(
                CategoricalBreakdown(
                    column=col,
                    total_distinct=total_distinct,
                    frequencies=freqs,
                    other_count=other_count,
                    other_percentage=round((other_count / total_rows) * 100, 2),
                )
            )

        return breakdowns

    @staticmethod
    def _compute_pairwise_scatters(
        num_df: pd.DataFrame,
        top_pairs: List[CorrelationPair],
    ) -> List[PairwiseScatter]:
        """Builds scatter point datasets for the strongest correlated pairs."""
        scatters: List[PairwiseScatter] = []

        eligible = [p for p in top_pairs if abs(p.correlation) >= MIN_CORRELATION_ABS][:MAX_SCATTER_PAIRS]

        for pair in eligible:
            sub = num_df[[pair.col1, pair.col2]].dropna()
            if len(sub) < 3:
                continue

            # Downsample for performance
            if len(sub) > MAX_SCATTER_POINTS:
                sub = sub.sample(n=MAX_SCATTER_POINTS, random_state=42)

            points = [
                ScatterPoint(x=round(float(row[pair.col1]), 4), y=round(float(row[pair.col2]), 4))
                for _, row in sub.iterrows()
            ]

            scatters.append(
                PairwiseScatter(
                    x_column=pair.col1,
                    y_column=pair.col2,
                    correlation=pair.correlation,
                    strength=pair.strength,
                    points=points,
                )
            )

        return scatters

    @staticmethod
    def _build_narrative(
        distributions: List[DistributionProfile],
        categorical_breakdowns: List[CategoricalBreakdown],
        top_pairs: List[CorrelationPair],
        total_rows: int,
    ) -> EDANarrativeSummary:
        """
        Deterministic (non-LLM) narrative builder used as fallback.
        Every sentence is strictly grounded in the computed statistics passed in.
        """
        findings: List[str] = []

        # Strong correlations
        for pair in top_pairs[:3]:
            if abs(pair.correlation) >= 0.40:
                findings.append(
                    f"'{pair.col1}' and '{pair.col2}' exhibit a {pair.strength.lower()} "
                    f"correlation (r = {pair.correlation})."
                )

        # Skewed distributions
        for dist in distributions:
            if abs(dist.skewness) >= 1.0:
                direction = "right (positive)" if dist.skewness > 0 else "left (negative)"
                findings.append(
                    f"Column '{dist.column}' is heavily skewed {direction} "
                    f"(skewness = {dist.skewness}), with mean {dist.mean} vs. median {dist.median}."
                )

        # Dominant categories
        for cat in categorical_breakdowns:
            if cat.frequencies and cat.frequencies[0].percentage >= 50.0:
                top = cat.frequencies[0]
                findings.append(
                    f"The '{cat.column}' column is heavily concentrated — "
                    f"'{top.value}' accounts for {top.percentage}% of records."
                )

        if not findings:
            findings.append(
                f"No dominant patterns detected across {total_rows:,} records. "
                "The dataset appears broadly distributed with no extreme skews or strong correlations."
            )

        n_corr = len([p for p in top_pairs if abs(p.correlation) >= 0.40])
        overview = (
            f"Automated EDA analysed {total_rows:,} records. "
            f"Found {n_corr} notable numeric correlation(s) and "
            f"{len(categorical_breakdowns)} categorical column breakdown(s)."
        )

        return EDANarrativeSummary(overview=overview, key_findings=findings)

    @classmethod
    def compute_eda(cls, dataset_id: str, db: Session, force_refresh: bool = False) -> EDAReportResponse:
        """
        Returns the EDA report for a dataset.
        Uses cached EDAReportModel if present and force_refresh=False.
        """
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        # Return cache if available
        if not force_refresh:
            cached = db.query(EDAReportModel).filter(EDAReportModel.dataset_id == dataset_id).first()
            if cached:
                return cls._deserialize_cached(cached, dataset)

        # Load full dataset
        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        if df.empty:
            raise ValueError(f"Dataset '{dataset_id}' has no rows.")

        total_rows = len(df)
        num_df = df.select_dtypes(include=[np.number]).copy()

        # Run all computations
        correlation_matrix = cls._compute_correlations(num_df)
        distributions = cls._compute_distributions(num_df)
        categorical_breakdowns = cls._compute_categorical_breakdowns(df)

        top_pairs = correlation_matrix.top_pairs if correlation_matrix else []
        pairwise_scatters = cls._compute_pairwise_scatters(num_df, top_pairs)

        from app.services.eda_narrative import EDANarrativeService
        ai_narrative = EDANarrativeService.generate_narrative(
            distributions, categorical_breakdowns, top_pairs, total_rows
        )
        narrative = ai_narrative if ai_narrative else cls._build_narrative(
            distributions, categorical_breakdowns, top_pairs, total_rows
        )

        # Serialize for cache storage
        corr_json = correlation_matrix.model_dump() if correlation_matrix else {}
        dist_json = [d.model_dump() for d in distributions]
        cat_json = [c.model_dump() for c in categorical_breakdowns]
        scatter_json = [s.model_dump() for s in pairwise_scatters]
        narrative_json = narrative.model_dump()

        # Upsert cache
        existing = db.query(EDAReportModel).filter(EDAReportModel.dataset_id == dataset_id).first()
        now = datetime.now(UTC)
        if existing:
            existing.correlations = corr_json
            existing.distributions = dist_json
            existing.categorical_breakdowns = cat_json
            existing.pairwise_scatters = scatter_json
            existing.narrative_summary = narrative_json
            existing.computed_at = now
            db.commit()
            db.refresh(existing)
            computed_at_str = existing.computed_at.isoformat()
        else:
            new_record = EDAReportModel(
                dataset_id=dataset_id,
                correlations=corr_json,
                distributions=dist_json,
                categorical_breakdowns=cat_json,
                pairwise_scatters=scatter_json,
                narrative_summary=narrative_json,
                computed_at=now,
            )
            db.add(new_record)
            db.commit()
            computed_at_str = now.isoformat()

        return EDAReportResponse(
            dataset_id=dataset.id,
            dataset_name=dataset.name,
            row_count=total_rows,
            column_count=len(df.columns),
            numeric_column_count=len(num_df.columns),
            categorical_column_count=len(categorical_breakdowns),
            correlations=correlation_matrix,
            distributions=distributions,
            categorical_breakdowns=categorical_breakdowns,
            pairwise_scatters=pairwise_scatters,
            narrative_summary=narrative,
            computed_at=computed_at_str,
            is_cached=False,
        )

    @classmethod
    def _deserialize_cached(cls, cached: EDAReportModel, dataset: DatasetModel) -> EDAReportResponse:
        """Reconstructs EDAReportResponse from cached JSON blobs."""
        corr_data = cached.correlations or {}
        corr = CorrelationMatrix(**corr_data) if corr_data.get("columns") else None

        distributions = [DistributionProfile(**d) for d in (cached.distributions or [])]
        cat_breakdowns = [CategoricalBreakdown(**c) for c in (cached.categorical_breakdowns or [])]
        scatters = [PairwiseScatter(**s) for s in (cached.pairwise_scatters or [])]
        narrative = EDANarrativeSummary(**(cached.narrative_summary or {"overview": "", "key_findings": []}))

        return EDAReportResponse(
            dataset_id=dataset.id,
            dataset_name=dataset.name,
            row_count=dataset.row_count,
            column_count=len(dataset.columns_metadata or []),
            numeric_column_count=len(distributions),
            categorical_column_count=len(cat_breakdowns),
            correlations=corr,
            distributions=distributions,
            categorical_breakdowns=cat_breakdowns,
            pairwise_scatters=scatters,
            narrative_summary=narrative,
            computed_at=cached.computed_at.isoformat() if cached.computed_at else None,
            is_cached=True,
        )
