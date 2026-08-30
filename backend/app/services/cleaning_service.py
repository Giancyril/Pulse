"""
backend/app/services/cleaning_service.py
Guided data cleaning engine: suggestion generation, preview dry-runs, and atomic execution.
"""
from typing import List, Dict, Any, Optional, Tuple
import re
import math
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.dataset import DatasetModel
from app.models.cleaning_action import CleaningActionModel
from app.models.eda_report import EDAReportModel
from app.services.profiling_service import ProfilingService
from app.services.anomaly_service import AnomalyService
from app.services.ingestion_service import map_pandas_type_to_sql
from app.schemas.cleaning import (
    CleaningSuggestion,
    CleaningActionOption,
    CleaningSuggestionsResponse,
    CleaningActionRequest,
    CleaningResultResponse,
    CleaningDiffSample,
    CleaningHistoryResponse,
    CleaningActionLog,
)


def _try_parse_numeric_ratio(series: pd.Series) -> float:
    """Returns ratio of non-null text values that can be parsed into float."""
    clean_s = series.dropna().astype(str)
    if len(clean_s) == 0:
        return 0.0

    numeric_count = 0
    for val in clean_s.head(200):  # sample up to 200 values for performance
        v = val.strip().replace("$", "").replace(",", "").replace("%", "")
        try:
            float(v)
            numeric_count += 1
        except ValueError:
            pass
    return numeric_count / min(len(clean_s), 200)


def _try_parse_datetime_ratio(series: pd.Series) -> float:
    """Returns ratio of non-null text values that can be parsed into datetime."""
    clean_s = series.dropna().astype(str)
    if len(clean_s) == 0:
        return 0.0

    dt_count = 0
    for val in clean_s.head(100):
        # quick regex check before expensive pd.to_datetime
        if re.search(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}", val):
            try:
                pd.to_datetime(val, errors="raise")
                dt_count += 1
            except Exception:
                pass
    return dt_count / min(len(clean_s), 100)


class CleaningSuggestionService:
    @staticmethod
    def generate_suggestions(dataset_id: str, db: Session) -> CleaningSuggestionsResponse:
        """
        Generates structured data cleaning recommendations by analyzing profiling
        and anomaly detection outputs.
        """
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        # Re-use existing Profiling and Anomaly services
        report = ProfilingService.profile_dataset(dataset_id, db)
        anomalies_resp = AnomalyService.detect_anomalies(dataset_id, threshold_z=3.0, target_columns=None, db=db)

        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        suggestions: List[CleaningSuggestion] = []

        # 1. Check for duplicate rows
        if report.duplicate_row_count > 0:
            dup_pct = round((report.duplicate_row_count / max(1, report.total_rows)) * 100, 1)
            suggestions.append(
                CleaningSuggestion(
                    id=f"sug_dup_{dataset_id}",
                    issue_type="DUPLICATE_ROWS",
                    severity="HIGH" if dup_pct >= 10 else "MEDIUM",
                    column_name=None,
                    title="Duplicate Rows Detected",
                    description=f"Found {report.duplicate_row_count} duplicate row(s) ({dup_pct}% of total records).",
                    metrics={"duplicate_count": report.duplicate_row_count, "duplicate_percentage": dup_pct},
                    recommended_action="drop_duplicates",
                    available_actions=[
                        CleaningActionOption(
                            action_type="drop_duplicates",
                            label="Remove Duplicate Rows (Keep First)",
                            description="De-duplicates the dataset by removing identical rows, keeping the first occurrence.",
                            parameters={"subset": None, "keep": "first"},
                            is_recommended=True,
                        ),
                        CleaningActionOption(
                            action_type="drop_duplicates",
                            label="Remove Duplicate Rows (Keep Last)",
                            description="De-duplicates the dataset, keeping the last occurrence.",
                            parameters={"subset": None, "keep": "last"},
                            is_recommended=False,
                        ),
                    ],
                )
            )

        # 2. Check column-level missing values and type mismatches
        for col_prof in report.column_profiles:
            col_name = col_prof.name
            is_numeric = "int" in col_prof.data_type.lower() or "float" in col_prof.data_type.lower()

            # Missing values
            if col_prof.null_count > 0:
                severity = "HIGH" if col_prof.null_percentage >= 20 else ("MEDIUM" if col_prof.null_percentage >= 5 else "LOW")
                options: List[CleaningActionOption] = []

                if is_numeric:
                    median_val = col_prof.quantiles.get("50%", 0.0) if col_prof.quantiles else (col_prof.mean_value or 0.0)
                    mean_val = col_prof.mean_value or 0.0

                    options.append(
                        CleaningActionOption(
                            action_type="impute_median",
                            label=f"Impute with Median ({median_val})",
                            description=f"Fills missing cells in '{col_name}' with the median ({median_val}), robust against skew.",
                            parameters={"column": col_name, "value": median_val},
                            is_recommended=True,
                        )
                    )
                    options.append(
                        CleaningActionOption(
                            action_type="impute_mean",
                            label=f"Impute with Mean ({mean_val})",
                            description=f"Fills missing cells in '{col_name}' with the mean average ({mean_val}).",
                            parameters={"column": col_name, "value": mean_val},
                            is_recommended=False,
                        )
                    )
                    options.append(
                        CleaningActionOption(
                            action_type="impute_constant",
                            label="Impute with Constant (0)",
                            description=f"Fills missing cells in '{col_name}' with zero.",
                            parameters={"column": col_name, "value": 0},
                            is_recommended=False,
                        )
                    )
                else:
                    mode_val = col_prof.top_frequencies[0]["value"] if col_prof.top_frequencies else "Unknown"
                    options.append(
                        CleaningActionOption(
                            action_type="impute_mode",
                            label=f"Impute with Mode ('{mode_val}')",
                            description=f"Fills missing cells in '{col_name}' with the most frequent value ('{mode_val}').",
                            parameters={"column": col_name, "value": mode_val},
                            is_recommended=True,
                        )
                    )
                    options.append(
                        CleaningActionOption(
                            action_type="impute_constant",
                            label="Impute with 'Unknown'",
                            description=f"Fills missing cells in '{col_name}' with string 'Unknown'.",
                            parameters={"column": col_name, "value": "Unknown"},
                            is_recommended=False,
                        )
                    )

                options.append(
                    CleaningActionOption(
                        action_type="drop_null_rows",
                        label=f"Drop Rows with Missing '{col_name}'",
                        description=f"Removes the {col_prof.null_count} row(s) where '{col_name}' is empty.",
                        parameters={"columns": [col_name], "how": "any"},
                        is_recommended=False,
                    )
                )

                suggestions.append(
                    CleaningSuggestion(
                        id=f"sug_null_{col_name}",
                        issue_type="MISSING_VALUES",
                        severity=severity,
                        column_name=col_name,
                        title=f"Missing Values in '{col_name}'",
                        description=f"Column '{col_name}' has {col_prof.null_count} missing value(s) ({col_prof.null_percentage}%).",
                        metrics={"null_count": col_prof.null_count, "null_percentage": col_prof.null_percentage},
                        recommended_action=options[0].action_type,
                        available_actions=options,
                    )
                )

            # Check Type Mismatches for string/object columns
            if not is_numeric and col_name in df.columns:
                num_ratio = _try_parse_numeric_ratio(df[col_name])
                if num_ratio >= 0.75:
                    suggestions.append(
                        CleaningSuggestion(
                            id=f"sug_type_{col_name}",
                            issue_type="TYPE_MISMATCH",
                            severity="MEDIUM",
                            column_name=col_name,
                            title=f"Mismatched Type in '{col_name}'",
                            description=f"Column '{col_name}' is stored as TEXT but contains {round(num_ratio * 100)}% numeric values (e.g. formatted currency or numbers).",
                            metrics={"numeric_ratio": num_ratio},
                            recommended_action="cast_column_type",
                            available_actions=[
                                CleaningActionOption(
                                    action_type="cast_column_type",
                                    label="Convert to Numeric (FLOAT)",
                                    description=f"Strips currency/commas and coerces '{col_name}' to standard SQL FLOAT.",
                                    parameters={"column": col_name, "target_type": "FLOAT", "on_error": "coerce"},
                                    is_recommended=True,
                                ),
                                CleaningActionOption(
                                    action_type="cast_column_type",
                                    label="Convert to Integer (INTEGER)",
                                    description=f"Coerces '{col_name}' to whole numbers.",
                                    parameters={"column": col_name, "target_type": "INTEGER", "on_error": "coerce"},
                                    is_recommended=False,
                                ),
                            ],
                        )
                    )
                else:
                    dt_ratio = _try_parse_datetime_ratio(df[col_name])
                    if dt_ratio >= 0.75:
                        suggestions.append(
                            CleaningSuggestion(
                                id=f"sug_dt_{col_name}",
                                issue_type="TYPE_MISMATCH",
                                severity="LOW",
                                column_name=col_name,
                                title=f"Datetime Type in '{col_name}'",
                                description=f"Column '{col_name}' contains {round(dt_ratio * 100)}% timestamp strings.",
                                metrics={"datetime_ratio": dt_ratio},
                                recommended_action="cast_column_type",
                                available_actions=[
                                    CleaningActionOption(
                                        action_type="cast_column_type",
                                        label="Convert to Timestamp (TIMESTAMP)",
                                        description=f"Parses and standardizes '{col_name}' as SQL TIMESTAMP.",
                                        parameters={"column": col_name, "target_type": "TIMESTAMP", "on_error": "coerce"},
                                        is_recommended=True,
                                    )
                                ],
                            )
                        )

            # Check IQR Outliers
            if is_numeric and col_prof.outlier_count and col_prof.outlier_count > 0:
                suggestions.append(
                    CleaningSuggestion(
                        id=f"sug_iqr_{col_name}",
                        issue_type="IQR_OUTLIERS",
                        severity="MEDIUM" if col_prof.outlier_count >= 5 else "LOW",
                        column_name=col_name,
                        title=f"Statistical Outliers in '{col_name}'",
                        description=f"Detected {col_prof.outlier_count} statistical outlier(s) beyond 1.5x IQR bounds.",
                        metrics={"outlier_count": col_prof.outlier_count},
                        recommended_action="cap_iqr_outliers",
                        available_actions=[
                            CleaningActionOption(
                                action_type="cap_iqr_outliers",
                                label="Cap Outliers at 1.5x IQR (Winsorize)",
                                description=f"Caps extreme values in '{col_name}' to [Q1 - 1.5*IQR, Q3 + 1.5*IQR] without dropping rows.",
                                parameters={"column": col_name, "factor": 1.5},
                                is_recommended=True,
                            ),
                            CleaningActionOption(
                                action_type="drop_iqr_outliers",
                                label="Drop Rows with IQR Outliers",
                                description=f"Removes rows with values outside 1.5x IQR in '{col_name}'.",
                                parameters={"column": col_name, "factor": 1.5},
                                is_recommended=False,
                            ),
                        ],
                    )
                )

        # 3. Check Extreme Z-Score Anomalies
        if anomalies_resp.summary.extreme_count > 0:
            most_anom_col = anomalies_resp.summary.most_anomalous_column
            if most_anom_col:
                suggestions.append(
                    CleaningSuggestion(
                        id=f"sug_zscore_{most_anom_col}",
                        issue_type="ZSCORE_ANOMALIES",
                        severity="HIGH",
                        column_name=most_anom_col,
                        title=f"Extreme Z-Score Anomalies in '{most_anom_col}'",
                        description=f"Identified {anomalies_resp.summary.extreme_count} record(s) with |Z-score| >= 3.5 in '{most_anom_col}'.",
                        metrics={"extreme_anomalies": anomalies_resp.summary.extreme_count},
                        recommended_action="cap_zscore_outliers",
                        available_actions=[
                            CleaningActionOption(
                                action_type="cap_zscore_outliers",
                                label="Cap Extreme Z-Score Outliers (3.0σ)",
                                description=f"Winsorizes extreme anomalies in '{most_anom_col}' to ±3.0 standard deviations.",
                                parameters={"column": most_anom_col, "threshold_z": 3.0},
                                is_recommended=True,
                            ),
                            CleaningActionOption(
                                action_type="drop_zscore_outliers",
                                label="Drop Rows with Extreme Z-Score (|Z| >= 3.0)",
                                description=f"Removes rows containing extreme anomaly values in '{most_anom_col}'.",
                                parameters={"column": most_anom_col, "threshold_z": 3.0},
                                is_recommended=False,
                            ),
                        ],
                    )
                )

        return CleaningSuggestionsResponse(
            dataset_id=dataset.id,
            dataset_name=dataset.name,
            total_suggestions=len(suggestions),
            health_score=report.health_score,
            suggestions=suggestions,
        )
