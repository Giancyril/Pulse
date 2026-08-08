"""
backend/app/services/profiling_service.py
Statistical profiling and IQR outlier detection engine for datasets.
"""
from typing import List, Dict, Any
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.dataset import DatasetModel
from app.schemas.profiling import DataQualityReport, ColumnProfile


class ProfilingService:
    @staticmethod
    def profile_dataset(dataset_id: str, db: Session) -> DataQualityReport:
        """
        Calculates column statistics, distribution metrics, outlier counts using IQR,
        and an overall Data Quality Health Score (0-100%).
        """
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        # Read dataset into Pandas dataframe
        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        total_rows = len(df)
        total_cols = len(df.columns)

        if total_rows == 0:
            return DataQualityReport(
                dataset_id=dataset_id,
                dataset_name=dataset.name,
                total_rows=0,
                total_columns=total_cols,
                health_score=100.0,
                overall_null_percentage=0.0,
                duplicate_row_count=0,
                column_profiles=[],
                warnings=["Dataset contains 0 rows."],
            )

        column_profiles: List[ColumnProfile] = []
        total_null_cells = 0
        warnings: List[str] = []

        # Duplicate row check
        dup_count = int(df.duplicated().sum())
        if dup_count > 0:
            warnings.append(f"Detected {dup_count} duplicate row(s) in dataset.")

        for col in df.columns:
            series = df[col]
            null_cnt = int(series.isnull().sum())
            total_null_cells += null_cnt
            null_pct = round((null_cnt / total_rows) * 100, 2)
            uniq_cnt = int(series.nunique(dropna=True))
            dist_pct = round((uniq_cnt / total_rows) * 100, 2)

            if null_pct > 30:
                warnings.append(f"Column '{col}' has high missingness ({null_pct}% nulls).")

            min_val = None
            max_val = None
            mean_val = None
            std_val = None
            quantiles = None
            outlier_cnt = 0

            # Numeric profiling
            if pd.api.types.is_numeric_dtype(series):
                clean_s = series.dropna()
                if not clean_s.empty:
                    min_val = float(clean_s.min())
                    max_val = float(clean_s.max())
                    mean_val = round(float(clean_s.mean()), 4)
                    std_val = round(float(clean_s.std()), 4) if len(clean_s) > 1 else 0.0

                    q25, q50, q75 = np.percentile(clean_s, [25, 50, 75])
                    quantiles = {
                        "25%": round(float(q25), 2),
                        "50%": round(float(q50), 2),
                        "75%": round(float(q75), 2),
                    }

                    # IQR Outlier Detection
                    iqr = q75 - q25
                    if iqr > 0:
                        lower_bound = q25 - 1.5 * iqr
                        upper_bound = q75 + 1.5 * iqr
                        outliers = clean_s[(clean_s < lower_bound) | (clean_s > upper_bound)]
                        outlier_cnt = int(len(outliers))
                        if outlier_cnt > 0:
                            warnings.append(f"Column '{col}' contains {outlier_cnt} statistical outlier(s).")
            else:
                # Categorical/Text min & max string representation
                clean_s = series.dropna()
                if not clean_s.empty:
                    min_val = str(clean_s.min())
                    max_val = str(clean_s.max())

            # Top 5 frequencies
            top_counts = series.value_counts(dropna=True).head(5)
            top_freqs = [{"value": str(k), "count": int(v)} for k, v in top_counts.items()]

            column_profiles.append(
                ColumnProfile(
                    name=str(col),
                    data_type=str(series.dtype),
                    total_count=total_rows,
                    null_count=null_cnt,
                    null_percentage=null_pct,
                    unique_count=uniq_cnt,
                    distinct_percentage=dist_pct,
                    min_value=min_val,
                    max_value=max_val,
                    mean_value=mean_val,
                    std_dev=std_val,
                    quantiles=quantiles,
                    top_frequencies=top_freqs,
                    outlier_count=outlier_cnt,
                )
            )

        overall_null_pct = round((total_null_cells / (total_rows * total_cols)) * 100, 2)

        # Health score calculation (100 - penalties for nulls, duplicates, and outliers)
        health_score = 100.0 - (overall_null_pct * 0.4) - (min(dup_count / total_rows, 0.2) * 100 * 0.3)
        health_score = max(0.0, min(100.0, round(health_score, 1)))

        return DataQualityReport(
            dataset_id=dataset_id,
            dataset_name=dataset.name,
            total_rows=total_rows,
            total_columns=total_cols,
            health_score=health_score,
            overall_null_percentage=overall_null_pct,
            duplicate_row_count=dup_count,
            column_profiles=column_profiles,
            warnings=warnings,
        )
