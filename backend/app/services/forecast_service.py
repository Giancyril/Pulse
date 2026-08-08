"""
backend/app/services/forecast_service.py
Linear regression trend analysis and moving-average forecasting engine.
"""
from typing import List, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.dataset import DatasetModel
from app.schemas.forecast import ForecastPoint, TrendSummary, ForecastResponse


class ForecastService:
    @staticmethod
    def forecast(
        dataset_id: str,
        value_column: str,
        label_column: Optional[str],
        forecast_periods: int,
        method: str,
        db: Session,
    ) -> ForecastResponse:
        """
        Runs linear regression or moving-average forecast on a numeric column.
        Returns actual + projected ForecastPoint series with TrendSummary.
        """
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        if value_column not in df.columns:
            raise ValueError(f"Column '{value_column}' not found in dataset.")

        series = pd.to_numeric(df[value_column], errors="coerce").dropna()
        if len(series) < 2:
            raise ValueError("Insufficient numeric data for forecasting (min 2 rows required).")

        # Label series
        if label_column and label_column in df.columns:
            labels = df.loc[series.index, label_column].astype(str).tolist()
        else:
            labels = [str(i + 1) for i in range(len(series))]

        y = series.values.astype(float)
        x = np.arange(len(y), dtype=float)

        # --- Linear regression ---
        coeffs = np.polyfit(x, y, 1)
        slope = float(coeffs[0])
        intercept = float(coeffs[1])
        y_hat = slope * x + intercept

        ss_res = float(np.sum((y - y_hat) ** 2))
        ss_tot = float(np.sum((y - np.mean(y)) ** 2))
        r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

        # Forecast future periods
        x_future = np.arange(len(y), len(y) + forecast_periods, dtype=float)
        future_lr = slope * x_future + intercept

        # Moving average baseline
        window = min(3, len(y))
        ma_base = float(np.mean(y[-window:]))

        # Build forecast labels for future periods
        future_labels = [f"F+{i + 1}" for i in range(forecast_periods)]

        points: List[ForecastPoint] = []
        for i, (lbl, actual, pred) in enumerate(zip(labels, y.tolist(), y_hat.tolist())):
            points.append(ForecastPoint(label=lbl, actual=round(actual, 4), predicted=round(pred, 4), is_forecast=False))

        for i in range(forecast_periods):
            pred_val = float(future_lr[i]) if method == "linear_regression" else ma_base
            points.append(ForecastPoint(label=future_labels[i], actual=None, predicted=round(pred_val, 4), is_forecast=True))

        # Trend summary
        if len(y) > 0:
            change_pct = round(((float(y[-1]) - float(y[0])) / abs(float(y[0])) * 100), 2) if y[0] != 0 else 0.0
        else:
            change_pct = 0.0

        direction = "stable" if abs(slope) < 0.01 else ("upward" if slope > 0 else "downward")

        trend = TrendSummary(
            direction=direction,
            slope=round(slope, 4),
            r_squared=round(r_squared, 4),
            change_pct=change_pct,
        )

        return ForecastResponse(
            column=value_column,
            label_column=label_column or "index",
            points=points,
            trend=trend,
            forecast_periods=forecast_periods,
            method=method,
        )
