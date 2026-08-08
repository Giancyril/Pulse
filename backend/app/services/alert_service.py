"""
backend/app/services/alert_service.py
Metric watchdog service: evaluates alert rules against live dataset aggregate values.
"""
from datetime import datetime, UTC
from typing import List
import pandas as pd
from sqlalchemy.orm import Session
from app.core.database import engine
from app.models.alert import AlertRuleModel
from app.schemas.alert import AlertRuleCreate, AlertEvalResult

OPERATORS = {
    ">": lambda v, t: v > t,
    "<": lambda v, t: v < t,
    ">=": lambda v, t: v >= t,
    "<=": lambda v, t: v <= t,
    "==": lambda v, t: abs(v - t) < 1e-9,
}

AGG_FNS = {
    "AVG": lambda s: float(s.mean()),
    "SUM": lambda s: float(s.sum()),
    "MAX": lambda s: float(s.max()),
    "MIN": lambda s: float(s.min()),
    "COUNT": lambda s: float(s.count()),
}


class AlertService:
    @staticmethod
    def create_rule(payload: AlertRuleCreate, db: Session) -> AlertRuleModel:
        rule = AlertRuleModel(
            name=payload.name,
            dataset_id=payload.dataset_id,
            metric_column=payload.metric_column,
            aggregate_fn=payload.aggregate_fn,
            operator=payload.operator,
            threshold=payload.threshold,
            severity=payload.severity,
            description=payload.description,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def evaluate_rule(rule: AlertRuleModel, db: Session) -> AlertEvalResult:
        """Computes aggregate on the rule's dataset column and checks the threshold condition."""
        from app.models.dataset import DatasetModel

        dataset = db.query(DatasetModel).filter(DatasetModel.id == rule.dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{rule.dataset_id}' not found.")

        with engine.connect() as conn:
            df = pd.read_sql_table(dataset.table_name, con=conn)

        if rule.metric_column not in df.columns:
            raise ValueError(f"Column '{rule.metric_column}' not found in dataset.")

        series = pd.to_numeric(df[rule.metric_column], errors="coerce").dropna()
        agg_fn = AGG_FNS.get(rule.aggregate_fn, AGG_FNS["AVG"])
        current_value = agg_fn(series)

        op_fn = OPERATORS.get(rule.operator, OPERATORS[">"])
        triggered = op_fn(current_value, rule.threshold)

        # Persist state
        now = datetime.now(UTC)
        rule.last_checked_at = now
        rule.last_value = current_value
        rule.triggered = triggered
        if triggered:
            rule.last_triggered_at = now
        db.commit()

        message = (
            f"ALERT: {rule.name} — {rule.aggregate_fn}({rule.metric_column}) = {current_value:.4f} {rule.operator} {rule.threshold}"
            if triggered
            else f"OK: {rule.name} — {rule.aggregate_fn}({rule.metric_column}) = {current_value:.4f}"
        )

        return AlertEvalResult(
            rule_id=rule.id,
            rule_name=rule.name,
            current_value=round(current_value, 4),
            threshold=rule.threshold,
            operator=rule.operator,
            triggered=triggered,
            severity=rule.severity,
            message=message,
        )

    @staticmethod
    def evaluate_all(db: Session) -> List[AlertEvalResult]:
        rules = db.query(AlertRuleModel).filter(AlertRuleModel.is_active == True).all()
        results = []
        for rule in rules:
            try:
                results.append(AlertService.evaluate_rule(rule, db))
            except Exception:
                pass
        return results
