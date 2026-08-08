"""
backend/tests/test_chart_generator.py
Unit tests for automatic chart type inference engine.
"""
from app.services.chart_generator import ChartGeneratorService


def test_kpi_single_metric_inference():
    cols = ["total_revenue"]
    rows = [{"total_revenue": 125000.50}]
    spec = ChartGeneratorService.infer_chart_spec(cols, rows, "Total Revenue")

    assert spec["recommended"] is True
    assert spec["type"] == "kpi"
    assert spec["yAxisKey"] == "total_revenue"


def test_time_series_line_chart_inference():
    cols = ["month", "sales"]
    rows = [
        {"month": "2026-01-01", "sales": 100},
        {"month": "2026-02-01", "sales": 150},
    ]
    spec = ChartGeneratorService.infer_chart_spec(cols, rows, "Monthly Sales")

    assert spec["recommended"] is True
    assert spec["type"] == "line"
    assert spec["xAxisKey"] == "month"
    assert spec["yAxisKey"] == "sales"


def test_categorical_bar_chart_inference():
    cols = ["category", "total_volume"]
    rows = [
        {"category": "Electronics", "total_volume": 420},
        {"category": "Books", "total_volume": 310},
        {"category": "Apparel", "total_volume": 250},
        {"category": "Home", "total_volume": 180},
        {"category": "Toys", "total_volume": 120},
        {"category": "Beauty", "total_volume": 90},
    ]
    spec = ChartGeneratorService.infer_chart_spec(cols, rows, "Volume by Category")

    assert spec["recommended"] is True
    assert spec["type"] == "bar"
    assert spec["xAxisKey"] == "category"
    assert spec["yAxisKey"] == "total_volume"
