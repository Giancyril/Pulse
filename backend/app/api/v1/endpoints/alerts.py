"""
backend/app/api/v1/endpoints/alerts.py
CRUD and evaluation endpoints for metric alert rules.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.alert import AlertRuleModel
from app.services.alert_service import AlertService
from app.schemas.alert import AlertRuleCreate, AlertRuleResponse, AlertEvalResult

router = APIRouter()


@router.get("/alerts", response_model=List[AlertRuleResponse], tags=["Alerts"])
def list_alert_rules(db: Session = Depends(get_db)):
    return db.query(AlertRuleModel).order_by(AlertRuleModel.created_at.desc()).all()


@router.post("/alerts", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED, tags=["Alerts"])
def create_alert_rule(payload: AlertRuleCreate, db: Session = Depends(get_db)):
    return AlertService.create_rule(payload, db)


@router.delete("/alerts/{rule_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Alerts"])
def delete_alert_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(AlertRuleModel).filter(AlertRuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    db.delete(rule)
    db.commit()


@router.post("/alerts/{rule_id}/evaluate", response_model=AlertEvalResult, tags=["Alerts"])
def evaluate_single_rule(rule_id: str, db: Session = Depends(get_db)):
    """Evaluates a single alert rule against live dataset data."""
    rule = db.query(AlertRuleModel).filter(AlertRuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found")
    try:
        return AlertService.evaluate_rule(rule, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/alerts/evaluate-all", response_model=List[AlertEvalResult], tags=["Alerts"])
def evaluate_all_rules(db: Session = Depends(get_db)):
    """Evaluates all active alert rules in a single batch check."""
    return AlertService.evaluate_all(db)
