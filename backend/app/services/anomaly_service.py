"""
backend/app/services/anomaly_service.py
Automated Z-score statistical anomaly and outlier detection engine.
"""
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.dataset import DatasetModel
from app.schemas.anomaly import AnomalyPoint, AnomalySummary, AnomalyResponse


class AnomalyService:
    @staticmethod
    def detect_anomalies(
        dataset_id: str,
        threshold_z: float,
        target_columns: Optional[List[str]],
        db: Session,
    ) -> AnomalyResponse:
        """
        Scans numeric columns in dataset using Z-Score statistical analysis.
        Surfaces record anomalies with severity ratings (Extreme, Moderate, Mild).
        """
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        if df.empty:
            return AnomalyResponse(
                dataset_id=dataset_id,
                dataset_name=dataset.name,
                analyzed_columns=[],
                threshold_z=threshold_z,
                anomalies=[],
                summary=AnomalySummary(
                    total_anomalies=0,
                    extreme_count=0,
                    moderate_count=0,
                    mild_count=0,
                    anomaly_rate_pct=0.0,
                    most_anomalous_column=None,
                ),
            )

        # Select numeric columns
        numeric_df = df.select_dtypes(include=[np.number])
        if target_columns:
            valid_cols = [c for c in target_columns if c in numeric_df.columns]
            numeric_df = numeric_df[valid_cols]

        analyzed_columns = list(numeric_df.columns)
        anomalies: List[AnomalyPoint] = []
        col_anomaly_counts: Dict[str, int] = {c: 0 for c in analyzed_columns}

        extreme_count = 0
        moderate_count = 0
        mild_count = 0

        for col in analyzed_columns:
            series = numeric_df[col].dropna()
            if len(series) < 3:
                continue

            mean = float(series.mean())
            std = float(series.std())
            if std == 0:
                continue

            # Calculate Z-scores
            z_scores = (series - mean) / std

            for idx, val in series.items():
                z = float(z_scores[idx])
                abs_z = abs(z)

                if abs_z >= threshold_z:
                    if abs_z >= 3.5:
                        severity = "EXTREME"
                        extreme_count += 1
                    elif abs_z >= 2.5:
                        severity = "MODERATE"
                        moderate_count += 1
                    else:
                        severity = "MILD"
                        mild_count += 1

                    col_anomaly_counts[col] += 1
                    row_dict = df.loc[idx].to_dict()
                    # Sanitize non-JSON types in row dict
                    clean_row = {k: (str(v) if isinstance(v, (pd.Timestamp, np.datetime64)) else v) for k, v in row_dict.items()}

                    anomalies.append(
                        AnomalyPoint(
                            row_index=int(idx),
                            column_name=col,
                            value=round(float(val), 4),
                            mean=round(mean, 4),
                            std_dev=round(std, 4),
                            z_score=round(z, 4),
                            severity=severity,
                            row_data=clean_row,
                        )
                    )

        # Sort anomalies by absolute Z-score descending
        anomalies.sort(key=lambda a: abs(a.z_score), reverse=True)

        total_anomalies = len(anomalies)
        total_rows = len(df)
        anomaly_rate_pct = round((total_anomalies / (total_rows * max(1, len(analyzed_columns)))) * 100, 2) if total_rows > 0 else 0.0

        most_anomalous_col = (
            max(col_anomaly_counts.items(), key=lambda x: x[1])[0]
            if col_anomaly_counts and max(col_anomaly_counts.values(), default=0) > 0
            else None
        )

        return AnomalyResponse(
            dataset_id=dataset_id,
            dataset_name=dataset.name,
            analyzed_columns=analyzed_columns,
            threshold_z=threshold_z,
            anomalies=anomalies,
            summary=AnomalySummary(
                total_anomalies=total_anomalies,
                extreme_count=extreme_count,
                moderate_count=moderate_count,
                mild_count=mild_count,
                anomaly_rate_pct=anomaly_rate_pct,
                most_anomalous_column=most_anomalous_col,
            ),
        )
