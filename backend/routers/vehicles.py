from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Vehicle, WorkOrder, MaintenanceCost
from schemas import (
    VehicleOut, VehicleCreate, VehicleUpdate, VehicleDetail, ReadinessSummary
)
from auth import get_current_user
from services import audit_service
from services.readiness_service import compute_readiness, vehicle_readiness_contribution
from services.depreciation_service import compute_depreciation

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("", response_model=List[VehicleOut])
def list_vehicles(
    sector: Optional[str] = None,
    vehicle_type: Optional[str] = Query(None, alias="type"),
    op_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    q = db.query(Vehicle)
    if sector:
        q = q.filter(Vehicle.sector == sector)
    if vehicle_type:
        q = q.filter(Vehicle.type == vehicle_type)
    if op_status:
        q = q.filter(Vehicle.op_status == op_status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Vehicle.registration.ilike(like))
            | (Vehicle.name.ilike(like))
            | (Vehicle.brigade.ilike(like))
        )
    return q.order_by(Vehicle.registration).all()


@router.get("/readiness", response_model=ReadinessSummary)
def readiness(
    sector: Optional[str] = None,
    brigade: Optional[str] = None,
    vehicle_type: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    return compute_readiness(db, sector=sector, brigade=brigade, vehicle_type=vehicle_type)


@router.get("/{vehicle_id}", response_model=VehicleDetail)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    v = db.get(Vehicle, vehicle_id)
    if not v:
        raise HTTPException(404, "Vehicle not found")
    open_wo = db.query(func.count(WorkOrder.id)).filter(
        WorkOrder.vehicle_id == vehicle_id, WorkOrder.status != "CLOSED"
    ).scalar() or 0
    total_maint = db.query(func.coalesce(func.sum(MaintenanceCost.amount), 0.0)).filter(
        MaintenanceCost.vehicle_id == vehicle_id
    ).scalar() or 0.0
    dep = compute_depreciation(v)
    return VehicleDetail(
        **VehicleOut.model_validate(v).model_dump(),
        open_wo_count=int(open_wo),
        total_maintenance_cost=float(total_maint),
        accumulated_depreciation=dep["accumulated_depreciation"],
        nbv=dep["nbv"],
        pct_depreciated=dep["pct_depreciated"],
    )


@router.get("/{vehicle_id}/maintenance-history")
def maintenance_history(vehicle_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = (
        db.query(MaintenanceCost)
        .filter(MaintenanceCost.vehicle_id == vehicle_id)
        .order_by(MaintenanceCost.date.desc())
        .all()
    )
    return [
        {
            "id": r.id, "wo_id": r.wo_id, "cost_type": r.cost_type, "amount": r.amount,
            "description": r.description, "date": r.date,
        }
        for r in rows
    ]


@router.get("/{vehicle_id}/work-orders")
def vehicle_work_orders(vehicle_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = (
        db.query(WorkOrder)
        .filter(WorkOrder.vehicle_id == vehicle_id)
        .order_by(WorkOrder.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id, "wo_number": r.wo_number, "title": r.title, "status": r.status,
            "priority": r.priority, "created_at": r.created_at, "closed_at": r.closed_at,
        }
        for r in rows
    ]


@router.post("", response_model=VehicleOut, status_code=201)
def create_vehicle(body: VehicleCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    v = Vehicle(**body.model_dump())
    db.add(v)
    db.flush()
    audit_service.log_action(
        db, action="CREATE_VEHICLE", entity_type="Vehicle", entity_id=v.id,
        user_id=current.id, username=current.username, new_values=body.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(v)
    return v


@router.patch("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int, body: VehicleUpdate, db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    v = db.get(Vehicle, vehicle_id)
    if not v:
        raise HTTPException(404, "Not found")
    old = {c: getattr(v, c) for c in ["op_status", "criticality", "sector", "brigade", "notes"]}
    for k, val in body.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    audit_service.log_action(
        db, action="UPDATE_VEHICLE", entity_type="Vehicle", entity_id=v.id,
        user_id=current.id, username=current.username,
        old_values=old, new_values=body.model_dump(exclude_unset=True, mode="json"),
    )
    db.commit()
    db.refresh(v)
    return v
