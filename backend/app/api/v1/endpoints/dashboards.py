"""
backend/app/api/v1/endpoints/dashboards.py
Endpoints for saving, listing, pinning, and loading dashboards with live query re-execution.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db, engine
from app.models.dashboard import DashboardModel, DashboardCardModel
from app.schemas.dashboard import DashboardResponse, DashboardCardResponse, CreateDashboardRequest, PinCardRequest, ChartSpecSchema

router = APIRouter()


@router.get("/dashboards", response_model=List[DashboardResponse], tags=["Dashboards"])
def list_dashboards(db: Session = Depends(get_db)):
    """List all saved user dashboards."""
    dashboards = db.query(DashboardModel).order_by(DashboardModel.created_at.desc()).all()
    return [d.to_dict() for d in dashboards]


@router.post("/dashboards", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED, tags=["Dashboards"])
def create_dashboard(payload: CreateDashboardRequest, db: Session = Depends(get_db)):
    """Create a new saved dashboard board."""
    dash = DashboardModel(name=payload.name, description=payload.description)
    db.add(dash)
    db.commit()
    db.refresh(dash)
    return dash.to_dict()


@router.post("/dashboards/{dashboard_id}/cards", response_model=DashboardCardResponse, status_code=status.HTTP_201_CREATED, tags=["Dashboards"])
def pin_chart_card(dashboard_id: str, payload: PinCardRequest, db: Session = Depends(get_db)):
    """Pin a chart card to a saved dashboard."""
    dash = db.query(DashboardModel).filter(DashboardModel.id == dashboard_id).first()
    if not dash:
        # Create default dashboard if not exists
        dash = DashboardModel(id=dashboard_id, name="Default Dashboard")
        db.add(dash)
        db.commit()

    card_cnt = db.query(DashboardCardModel).filter(DashboardCardModel.dashboard_id == dashboard_id).count()

    card = DashboardCardModel(
        dashboard_id=dashboard_id,
        title=payload.title or payload.chart_spec.title or "Chart Card",
        dataset_id=payload.dataset_id,
        sql=payload.sql,
        chart_spec=payload.chart_spec.dict(),
        columns=payload.columns,
        position=card_cnt,
    )

    db.add(card)
    db.commit()
    db.refresh(card)

    return DashboardCardResponse(
        id=card.id,
        dashboard_id=card.dashboard_id,
        title=card.title,
        dataset_id=card.dataset_id,
        sql=card.sql,
        chart_spec=ChartSpecSchema(**card.chart_spec),
        columns=card.columns,
        position=card.position,
        created_at=card.created_at.isoformat() if card.created_at else None,
    )


@router.get("/dashboards/{dashboard_id}", response_model=DashboardResponse, tags=["Dashboards"])
def get_dashboard(dashboard_id: str, db: Session = Depends(get_db)):
    """Retrieve saved dashboard with live re-executed SQL query chart cards."""
    dash = db.query(DashboardModel).filter(DashboardModel.id == dashboard_id).first()
    if not dash:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dashboard '{dashboard_id}' not found.",
        )

    res_cards = []
    for card in dash.cards:
        rows = []
        try:
            with engine.connect() as conn:
                qres = conn.execute(text(card.sql))
                cols = list(qres.keys())
                r_raw = qres.fetchall()
                rows = [dict(zip(cols, r)) for r in r_raw]
        except Exception:
            rows = []

        res_cards.append(
            DashboardCardResponse(
                id=card.id,
                dashboard_id=card.dashboard_id,
                title=card.title,
                dataset_id=card.dataset_id,
                sql=card.sql,
                chart_spec=ChartSpecSchema(**card.chart_spec),
                columns=card.columns,
                position=card.position,
                rows=rows,
                created_at=card.created_at.isoformat() if card.created_at else None,
            )
        )

    return DashboardResponse(
        id=dash.id,
        name=dash.name,
        description=dash.description,
        created_at=dash.created_at.isoformat() if dash.created_at else None,
        cards=res_cards,
    )
