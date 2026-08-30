"""
backend/app/services/cleaning_service.py
Guided data cleaning engine: suggestion generation, preview dry-runs, and atomic execution.
"""
from typing import List, Dict, Any, Optional, Tuple
import re
import math
from datetime import datetime, UTC
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
        if re.search(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}", val):
            try:
                pd.to_datetime(val, errors="raise")
                dt_count += 1
            except Exception:
                pass
    return dt_count / min(len(clean_s), 100)


def _clean_row_dict(row: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure row dictionary is clean JSON-serializable."""
    out = {}
    for k, v in row.items():
        if pd.isna(v) or v is None:
            out[k] = None
        elif isinstance(v, (np.floating, float)):
            out[k] = None if math.isnan(v) or math.isinf(v) else float(v)
        elif isinstance(v, (np.integer, int)):
            out[k] = int(v)
        elif isinstance(v, (pd.Timestamp, np.datetime64)):
            out[k] = str(v)
        else:
            out[k] = v
    return out


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


class CleaningExecutionService:
    @staticmethod
    def apply_transformation(df: pd.DataFrame, req: CleaningActionRequest) -> Tuple[pd.DataFrame, int, str, List[CleaningDiffSample]]:
        """
        Executes in-memory dataframe transformation according to action_type.
        Returns: (transformed_df, rows_affected, summary_str, sample_diff)
        """
        df_new = df.copy()
        action = req.action_type
        col = req.column_name or req.parameters.get("column")
        params = req.parameters or {}
        samples: List[CleaningDiffSample] = []
        rows_affected = 0
        summary = ""

        if action == "drop_null_rows":
            target_cols = params.get("columns", [col] if col else list(df.columns))
            valid_cols = [c for c in target_cols if c in df.columns]
            how = params.get("how", "any")
            if how == "all":
                mask = df[valid_cols].isnull().all(axis=1)
            else:
                mask = df[valid_cols].isnull().any(axis=1)

            rows_affected = int(mask.sum())
            dropped_indices = df[mask].index[:5]
            for idx in dropped_indices:
                samples.append(
                    CleaningDiffSample(
                        row_index=int(idx),
                        before=_clean_row_dict(df.loc[idx].to_dict()),
                        after=None,
                    )
                )
            df_new = df[~mask].reset_index(drop=True)
            summary = f"Dropped {rows_affected} row(s) containing missing values in {', '.join(valid_cols)}."

        elif action in ("impute_mean", "impute_median", "impute_mode", "impute_constant"):
            if not col or col not in df.columns:
                raise ValueError(f"Column '{col}' not found in dataset.")

            mask = df[col].isnull()
            rows_affected = int(mask.sum())

            if rows_affected > 0:
                if action == "impute_mean":
                    clean_vals = pd.to_numeric(df[col], errors="coerce").dropna()
                    fill_val = params.get("value", round(float(clean_vals.mean()), 4) if not clean_vals.empty else 0.0)
                    summary = f"Imputed {rows_affected} missing cell(s) in '{col}' with mean value {fill_val}."
                elif action == "impute_median":
                    clean_vals = pd.to_numeric(df[col], errors="coerce").dropna()
                    fill_val = params.get("value", round(float(clean_vals.median()), 4) if not clean_vals.empty else 0.0)
                    summary = f"Imputed {rows_affected} missing cell(s) in '{col}' with median value {fill_val}."
                elif action == "impute_mode":
                    mode_series = df[col].dropna().mode()
                    default_mode = str(mode_series.iloc[0]) if not mode_series.empty else "Unknown"
                    fill_val = params.get("value", default_mode)
                    summary = f"Imputed {rows_affected} missing cell(s) in '{col}' with mode value '{fill_val}'."
                else:  # impute_constant
                    fill_val = params.get("value", 0)
                    summary = f"Imputed {rows_affected} missing cell(s) in '{col}' with constant '{fill_val}'."

                df_new[col] = df_new[col].fillna(fill_val)

                affected_indices = df[mask].index[:5]
                for idx in affected_indices:
                    samples.append(
                        CleaningDiffSample(
                            row_index=int(idx),
                            before=_clean_row_dict(df.loc[idx].to_dict()),
                            after=_clean_row_dict(df_new.loc[idx].to_dict()),
                        )
                    )
            else:
                summary = f"No missing cells found in '{col}'."

        elif action == "drop_duplicates":
            subset = params.get("subset", None)
            keep = params.get("keep", "first")
            mask = df.duplicated(subset=subset, keep=keep)
            rows_affected = int(mask.sum())

            dup_indices = df[mask].index[:5]
            for idx in dup_indices:
                samples.append(
                    CleaningDiffSample(
                        row_index=int(idx),
                        before=_clean_row_dict(df.loc[idx].to_dict()),
                        after=None,
                    )
                )
            df_new = df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)
            summary = f"Removed {rows_affected} duplicate row(s) (keeping {keep} occurrence)."

        elif action == "cast_column_type":
            if not col or col not in df.columns:
                raise ValueError(f"Column '{col}' not found in dataset.")

            target_type = str(params.get("target_type", "FLOAT")).upper()
            errors = params.get("on_error", "coerce")

            series_str = df[col].astype(str).str.strip().str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.replace("%", "", regex=False)

            if "INT" in target_type:
                df_new[col] = pd.to_numeric(series_str, errors=errors).round().astype("Int64")
            elif "FLOAT" in target_type:
                df_new[col] = pd.to_numeric(series_str, errors=errors).astype(float)
            elif "TIME" in target_type or "DATE" in target_type:
                df_new[col] = pd.to_datetime(df[col], errors=errors).dt.strftime("%Y-%m-%d %H:%M:%S")
            else:
                df_new[col] = df[col].astype(str)

            # Detect differences
            diff_mask = df[col].astype(str) != df_new[col].astype(str)
            rows_affected = int(diff_mask.sum())
            diff_indices = df[diff_mask].index[:5]
            for idx in diff_indices:
                samples.append(
                    CleaningDiffSample(
                        row_index=int(idx),
                        before=_clean_row_dict(df.loc[idx].to_dict()),
                        after=_clean_row_dict(df_new.loc[idx].to_dict()),
                    )
                )
            summary = f"Coerced column '{col}' to {target_type} data type ({rows_affected} rows transformed)."

        elif action in ("cap_iqr_outliers", "drop_iqr_outliers"):
            if not col or col not in df.columns:
                raise ValueError(f"Column '{col}' not found in dataset.")

            factor = float(params.get("factor", 1.5))
            num_s = pd.to_numeric(df[col], errors="coerce")
            clean_s = num_s.dropna()

            if len(clean_s) > 3:
                q25, q75 = np.percentile(clean_s, [25, 75])
                iqr = q75 - q25
                lower_b = round(float(q25 - factor * iqr), 4)
                upper_b = round(float(q75 + factor * iqr), 4)

                outlier_mask = (num_s < lower_b) | (num_s > upper_b)
                rows_affected = int(outlier_mask.sum())

                outlier_indices = df[outlier_mask].index[:5]
                if action == "cap_iqr_outliers":
                    df_new[col] = num_s.clip(lower=lower_b, upper=upper_b)
                    for idx in outlier_indices:
                        samples.append(
                            CleaningDiffSample(
                                row_index=int(idx),
                                before=_clean_row_dict(df.loc[idx].to_dict()),
                                after=_clean_row_dict(df_new.loc[idx].to_dict()),
                            )
                        )
                    summary = f"Winsorized/capped {rows_affected} outlier(s) in '{col}' to range [{lower_b}, {upper_b}]."
                else:  # drop_iqr_outliers
                    for idx in outlier_indices:
                        samples.append(
                            CleaningDiffSample(
                                row_index=int(idx),
                                before=_clean_row_dict(df.loc[idx].to_dict()),
                                after=None,
                            )
                        )
                    df_new = df[~outlier_mask].reset_index(drop=True)
                    summary = f"Dropped {rows_affected} row(s) with IQR outlier values in '{col}'."
            else:
                summary = f"Insufficient numeric data in '{col}' for IQR outlier analysis."

        elif action in ("cap_zscore_outliers", "drop_zscore_outliers"):
            if not col or col not in df.columns:
                raise ValueError(f"Column '{col}' not found in dataset.")

            threshold_z = float(params.get("threshold_z", 3.0))
            num_s = pd.to_numeric(df[col], errors="coerce")
            clean_s = num_s.dropna()

            if len(clean_s) > 3 and clean_s.std() > 0:
                mean = float(clean_s.mean())
                std = float(clean_s.std())
                lower_b = round(mean - threshold_z * std, 4)
                upper_b = round(mean + threshold_z * std, 4)

                z_scores = (num_s - mean) / std
                outlier_mask = z_scores.abs() >= threshold_z
                rows_affected = int(outlier_mask.sum())

                outlier_indices = df[outlier_mask].index[:5]
                if action == "cap_zscore_outliers":
                    df_new[col] = num_s.clip(lower=lower_b, upper=upper_b)
                    for idx in outlier_indices:
                        samples.append(
                            CleaningDiffSample(
                                row_index=int(idx),
                                before=_clean_row_dict(df.loc[idx].to_dict()),
                                after=_clean_row_dict(df_new.loc[idx].to_dict()),
                            )
                        )
                    summary = f"Winsorized {rows_affected} extreme anomaly record(s) in '{col}' to ±{threshold_z}σ ([{lower_b}, {upper_b}])."
                else:  # drop_zscore_outliers
                    for idx in outlier_indices:
                        samples.append(
                            CleaningDiffSample(
                                row_index=int(idx),
                                before=_clean_row_dict(df.loc[idx].to_dict()),
                                after=None,
                            )
                        )
                    df_new = df[~outlier_mask].reset_index(drop=True)
                    summary = f"Dropped {rows_affected} row(s) with extreme Z-score anomalies in '{col}'."
            else:
                summary = f"Standard deviation is zero or insufficient data for Z-score analysis in '{col}'."

        else:
            raise ValueError(f"Unknown cleaning action type '{action}'.")

        return df_new, rows_affected, summary, samples

    @staticmethod
    def execute_cleaning_action(
        dataset_id: str,
        req: CleaningActionRequest,
        db: Session,
    ) -> CleaningResultResponse:
        """
        Preview (dry_run=True) or apply (dry_run=False) a guided data cleaning action.
        """
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        rows_before = len(df)
        df_new, rows_affected, summary, sample_diff = CleaningExecutionService.apply_transformation(df, req)
        rows_after = len(df_new)

        if req.dry_run:
            return CleaningResultResponse(
                dry_run=True,
                action_type=req.action_type,
                column_name=req.column_name,
                rows_before=rows_before,
                rows_after=rows_after,
                rows_affected=rows_affected,
                summary=f"[PREVIEW] {summary}",
                sample_diff=sample_diff,
                new_health_score=None,
                action_id=None,
                applied_at=None,
            )

        # APPLY: Atomic table mutation
        df_new.to_sql(
            name=dataset.table_name,
            con=engine,
            if_exists="replace",
            index=False,
            chunksize=5000,
        )

        # Update dataset metadata
        new_cols_meta = []
        for c in df_new.columns:
            sql_type = map_pandas_type_to_sql(str(df_new[c].dtype))
            new_cols_meta.append(
                {
                    "name": c,
                    "type": sql_type,
                    "nullable": bool(df_new[c].isnull().any()),
                }
            )

        dataset.row_count = rows_after
        dataset.columns_metadata = new_cols_meta

        # Invalidate any cached EDA report for this dataset
        db.query(EDAReportModel).filter(EDAReportModel.dataset_id == dataset_id).delete()

        # Record action in audit log
        action_log = CleaningActionModel(
            dataset_id=dataset_id,
            action_type=req.action_type,
            column_name=req.column_name,
            parameters=req.parameters or {},
            rows_affected=rows_affected,
            summary=summary,
        )
        db.add(action_log)
        db.commit()
        db.refresh(action_log)
        db.refresh(dataset)

        # Compute new health score
        new_report = ProfilingService.profile_dataset(dataset_id, db)

        return CleaningResultResponse(
            dry_run=False,
            action_type=req.action_type,
            column_name=req.column_name,
            rows_before=rows_before,
            rows_after=rows_after,
            rows_affected=rows_affected,
            summary=summary,
            sample_diff=sample_diff,
            new_health_score=new_report.health_score,
            action_id=action_log.id,
            applied_at=action_log.applied_at.isoformat() if action_log.applied_at else datetime.now(UTC).isoformat(),
        )

    @staticmethod
    def get_cleaning_history(dataset_id: str, db: Session) -> CleaningHistoryResponse:
        """Returns the chronological audit log of cleaning actions for a dataset."""
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        actions = (
            db.query(CleaningActionModel)
            .filter(CleaningActionModel.dataset_id == dataset_id)
            .order_by(CleaningActionModel.applied_at.desc())
            .all()
        )

        history_items = [
            CleaningActionLog(
                id=a.id,
                dataset_id=a.dataset_id,
                action_type=a.action_type,
                column_name=a.column_name,
                parameters=a.parameters or {},
                rows_affected=a.rows_affected,
                summary=a.summary,
                applied_at=a.applied_at.isoformat() if a.applied_at else None,
            )
            for a in actions
        ]

        return CleaningHistoryResponse(
            dataset_id=dataset_id,
            total_actions=len(history_items),
            history=history_items,
        )
