"""
backend/tests/test_alerts.py
Unit tests for AlertService threshold evaluation logic.
"""
import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from app.services.alert_service import AlertService
from app.models.alert import AlertRuleModel
from app.schemas.alert import AlertEvalResult


def _make_rule(op: str, threshold: float, agg: str = "AVG") -> AlertRuleModel:
    rule = MagicMock(spec=AlertRuleModel)
    rule.id = "rule_001"
    rule.name = "Test Rule"
    rule.dataset_id = "ds_001"
    rule.metric_column = "sales"
    rule.aggregate_fn = agg
    rule.operator = op
    rule.threshold = threshold
    rule.severity = "warning"
    return rule


def _make_db(df: pd.DataFrame):
    mock_dataset = MagicMock()
    mock_dataset.table_name = "tbl_test"
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = mock_dataset
    return mock_db


def test_alert_triggers_when_avg_exceeds_threshold():
    df = pd.DataFrame({"sales": [100, 200, 300]})  # AVG = 200
    rule = _make_rule(">", 150)
    db = _make_db(df)

    with patch("app.services.alert_service.engine"), \
         patch("app.services.alert_service.pd.read_sql_table", return_value=df):
        result = AlertService.evaluate_rule(rule, db)

    assert result.triggered is True
    assert result.current_value == pytest.approx(200.0)


def test_alert_does_not_trigger_when_below_threshold():
    df = pd.DataFrame({"sales": [10, 20, 30]})  # AVG = 20
    rule = _make_rule(">", 50)
    db = _make_db(df)

    with patch("app.services.alert_service.engine"), \
         patch("app.services.alert_service.pd.read_sql_table", return_value=df):
        result = AlertService.evaluate_rule(rule, db)

    assert result.triggered is False


def test_alert_max_aggregate():
    df = pd.DataFrame({"sales": [5, 10, 999]})  # MAX = 999
    rule = _make_rule(">", 500, "MAX")
    db = _make_db(df)

    with patch("app.services.alert_service.engine"), \
         patch("app.services.alert_service.pd.read_sql_table", return_value=df):
        result = AlertService.evaluate_rule(rule, db)

    assert result.triggered is True
    assert result.current_value == pytest.approx(999.0)


def test_alert_less_than_operator():
    df = pd.DataFrame({"sales": [3, 4, 5]})  # AVG = 4
    rule = _make_rule("<", 10)
    db = _make_db(df)

    with patch("app.services.alert_service.engine"), \
         patch("app.services.alert_service.pd.read_sql_table", return_value=df):
        result = AlertService.evaluate_rule(rule, db)

    assert result.triggered is True


def test_alert_equal_operator():
    df = pd.DataFrame({"sales": [100, 100, 100]})  # AVG = 100
    rule = _make_rule("==", 100)
    db = _make_db(df)

    with patch("app.services.alert_service.engine"), \
         patch("app.services.alert_service.pd.read_sql_table", return_value=df):
        result = AlertService.evaluate_rule(rule, db)

    assert result.triggered is True
