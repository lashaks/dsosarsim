from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import FRACAS, Vehicle
from schemas import FRACASOut, FRACASCreate
from auth import get_current_user
from services import audit_service

router = APIRouter(prefix="/api/fracas", tags=["fracas"])


def _to_out(db: Session, f: FRACAS) -> FRACASOut:
    v = db.get(Vehicle, f.vehicle_id)
    return FRACASOut(
        id=f.id, vehicle_id=f.vehicle_id,
        failure_mode=f.failure_mode, failure_cause=f.failure_cause,
        failure_effect=f.failure_effect, severity=f.severity,
        corrective_action=f.corrective_action,
        recurrence_count=f.recurrence_count,
        first_occurrence=f.first_occurrence, last_occurrence=f.last_occurrence,
        created_at=f.created_at,
        vehicle_name=v.name if v else None,
        vehicle_registration=v.registration if v else None,
    )


@router.get("", response_model=List[FRACASOut])
def list_fracas(
    severity: Optional[str] = None, vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db), current=Depends(get_current_user),
):
    q = db.query(FRACAS)
    if severity:
        q = q.filter(FRACAS.severity == severity)
    if vehicle_id:
        q = q.filter(FRACAS.vehicle_id == vehicle_id)
    return [_to_out(db, f) for f in q.order_by(FRACAS.last_occurrence.desc()).all()]


@router.post("", response_model=FRACASOut, status_code=201)
def create_fracas(body: FRACASCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    f = FRACAS(**body.model_dump())
    db.add(f)
    db.flush()
    audit_service.log_action(
        db, action="CREATE_FRACAS", entity_type="FRACAS", entity_id=f.id,
        user_id=current.id, username=current.username,
        new_values=body.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(f)
    return _to_out(db, f)


@router.get("/trends")
def trends(db: Session = Depends(get_db), current=Depends(get_current_user)):
    by_severity = (
        db.query(FRACAS.severity, func.count(FRACAS.id).label("count"))
        .group_by(FRACAS.severity).all()
    )
    by_mode = (
        db.query(FRACAS.failure_mode, func.count(FRACAS.id).label("count"))
        .group_by(FRACAS.failure_mode).order_by(func.count(FRACAS.id).desc()).limit(10).all()
    )
    return {
        "by_severity": [{"severity": s, "count": c} for s, c in by_severity],
        "by_mode": [{"mode": m, "count": c} for m, c in by_mode],
    }
