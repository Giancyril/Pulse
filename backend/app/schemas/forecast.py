"""
backend/app/schemas/forecast.py
Pydantic schemas for trend analysis and time-series forecasting.
"""
from typing import List, Optional
from pydantic import BaseModel


class ForecastPoint(BaseModel):
    label: str
    actual: Optional[float] = None     # None for future projected periods
    predicted: float
    is_forecast: bool = False


class TrendSummary(BaseModel):
    direction: str          # "upward", "downward", "stable"
    slope: float            # units per period
    r_squared: float        # linear fit quality (0-1)
    change_pct: float       # % change from first to last actual value


class ForecastResponse(BaseModel):
    column: str
    label_column: str
    points: List[ForecastPoint]
    trend: TrendSummary
    forecast_periods: int
    method: str             # "linear_regression" | "moving_average"
