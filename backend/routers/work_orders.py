from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models import (
    WorkOrder, WOPart, WOActivity, Vehicle, PartMaster, Inventory, MaintenanceCost
)
from schemas import (
    WorkOrderOut, WorkOrderCreate, WorkOrderUpdate, WorkOrderDetail,
    WOPartOut, WOActivityOut, WOPartCreate, IssuePartsRequest
)
from auth import get_current_user
from services import audit_service, inventory_service

router = APIRouter(prefix="/api/work-orders", tags=["work_orders"])


def _next_wo_number(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(func.count(WorkOrder.id)).scalar() or 0
    return f"WO-{year}-{(count + 1):04d}"


def _to_out(db: Session, wo: WorkOrder) -> WorkOrderOut:
    v = db.get(Vehicle, wo.vehicle_id)
    age = (datetime.utcnow() - wo.created_at).days
    return WorkOrderOut(
        id=wo.id, wo_number=wo.wo_number, vehicle_id=wo.vehicle_id, title=wo.title,
        description=wo.description, status=wo.status, priority=wo.priority,
        sector=wo.sector, assigned_to=wo.assigned_to, created_at=wo.created_at,
        closed_at=wo.closed_at,
        vehicle_name=v.name if v else None,
        vehicle_registration=v.registration if v else None,
        vehicle_type=v.type if v else None,
        age_days=age, parts_count=len(wo.parts),
    )


@router.get("", response_model=List[WorkOrderOut])
def list_work_orders(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    sector: Optional[str] = None,
    vehicle_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    q = db.query(WorkOrder)
    if status:
        q = q.filter(WorkOrder.status == status)
    if priority:
        q = q.filter(WorkOrder.priority == priority)
    if sector:
        q = q.filter(WorkOrder.sector == sector)
    if vehicle_id:
        q = q.filter(WorkOrder.vehicle_id == vehicle_id)
    if search:
        like = f"%{search}%"
        q = q.filter((WorkOrder.title.ilike(like)) | (WorkOrder.wo_number.ilike(like)))
    return [_to_out(db, wo) for wo in q.order_by(desc(WorkOrder.created_at)).all()]


@router.get("/{wo_id}", response_model=WorkOrderDetail)
def get_work_order(wo_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "Not found")
    base = _to_out(db, wo)
    parts_out = []
    for wp in wo.parts:
        p = db.get(PartMaster, wp.part_id)
        parts_out.append(WOPartOut(
            id=wp.id, part_id=wp.part_id, quantity_required=wp.quantity_required,
            quantity_issued=wp.quantity_issued, notes=wp.notes,
            part_number=p.part_number if p else None,
            description_en=p.description_en if p else None,
            description_ar=p.description_ar if p else None,
            unit_cost=p.unit_cost if p else None,
        ))
    activity_out = [WOActivityOut.model_validate(a) for a in
                    sorted(wo.activity, key=lambda x: x.created_at, reverse=True)]
    return WorkOrderDetail(**base.model_dump(), parts=parts_out, activity=activity_out)


@router.post("", response_model=WorkOrderOut, status_code=201)
def create_work_order(body: WorkOrderCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    v = db.get(Vehicle, body.vehicle_id)
    if not v:
        raise HTTPException(404, "Vehicle not found")
    wo = WorkOrder(
        wo_number=_next_wo_number(db),
        vehicle_id=body.vehicle_id, title=body.title, description=body.description,
        priority=body.priority, sector=v.sector, assigned_to=body.assigned_to,
        status="OPEN",
    )
    db.add(wo)
    db.flush()
    for p in body.parts:
        db.add(WOPart(
            wo_id=wo.id, part_id=p.part_id, quantity_required=p.quantity_required,
            quantity_issued=p.quantity_issued, notes=p.notes,
        ))
    db.add(WOActivity(wo_id=wo.id, activity=f"Work order created by {current.username}",
                      actor=current.username))
    audit_service.log_action(
        db, action="CREATE_WO", entity_type="WorkOrder", entity_id=wo.id,
        user_id=current.id, username=current.username,
        new_values={"wo_number": wo.wo_number, "vehicle_id": wo.vehicle_id, "title": wo.title},
    )
    db.commit()
    db.refresh(wo)
    return _to_out(db, wo)


@router.patch("/{wo_id}", response_model=WorkOrderOut)
def update_work_order(
    wo_id: int, body: WorkOrderUpdate, db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "Not found")
    old = {"status": wo.status, "priority": wo.priority, "assigned_to": wo.assigned_to}
    data = body.model_dump(exclude_unset=True)
    new_status = data.get("status")
    for k, v in data.items():
        setattr(wo, k, v)
    if new_status == "CLOSED":
        # Validate: every part must have quantity_issued >= quantity_required
        for wp in wo.parts:
            if wp.quantity_issued < wp.quantity_required:
                raise HTTPException(400, f"Part {wp.part_id} not fully issued ({wp.quantity_issued}/{wp.quantity_required})")
        wo.closed_at = datetime.utcnow()
    if new_status and new_status != old["status"]:
        db.add(WOActivity(
            wo_id=wo.id,
            activity=f"Status changed: {old['status']} → {new_status}",
            actor=current.username,
        ))
    audit_service.log_action(
        db, action="UPDATE_WO", entity_type="WorkOrder", entity_id=wo.id,
        user_id=current.id, username=current.username,
        old_values=old, new_values=data,
    )
    db.commit()
    db.refresh(wo)
    return _to_out(db, wo)


@router.post("/{wo_id}/parts", response_model=WOPartOut, status_code=201)
def add_part(
    wo_id: int, body: WOPartCreate, db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "WO not found")
    p = db.get(PartMaster, body.part_id)
    if not p:
        raise HTTPException(404, "Part not found")
    wp = WOPart(wo_id=wo_id, part_id=body.part_id, quantity_required=body.quantity_required,
                quantity_issued=body.quantity_issued, notes=body.notes)
    db.add(wp)
    db.add(WOActivity(wo_id=wo_id, activity=f"Added part {p.part_number} qty {body.quantity_required}",
                      actor=current.username))
    db.commit()
    db.refresh(wp)
    return WOPartOut(
        id=wp.id, part_id=wp.part_id, quantity_required=wp.quantity_required,
        quantity_issued=wp.quantity_issued, notes=wp.notes,
        part_number=p.part_number, description_en=p.description_en,
        description_ar=p.description_ar, unit_cost=p.unit_cost,
    )


@router.post("/{wo_id}/issue-parts")
def issue_part(
    wo_id: int, body: IssuePartsRequest, db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "WO not found")
    wp = db.get(WOPart, body.wo_part_id)
    if not wp or wp.wo_id != wo_id:
        raise HTTPException(404, "WO part not found")
    inv = (
        db.query(Inventory)
        .filter(
            Inventory.part_id == wp.part_id,
            Inventory.warehouse_id == body.warehouse_id,
            Inventory.condition == "SERVICEABLE",
        )
        .first()
    )
    if not inv:
        raise HTTPException(400, "No serviceable inventory in this warehouse")
    result = inventory_service.issue_to_wo(
        db, inventory_id=inv.id, quantity=body.quantity,
        wo_reference=wo.wo_number, wo_part_id=wp.id,
        actor=current.username, user_id=current.id,
    )
    # Auto-progress WO if any parts issued
    if wo.status == "OPEN":
        wo.status = "IN_PROGRESS"
        db.add(WOActivity(wo_id=wo.id, activity="Auto-progressed: OPEN → IN_PROGRESS on first issue",
                          actor="system"))
        db.commit()
    return {"detail": "issued", "journal_id": result["journal"].id, "movement_id": result["movement"].id}


@router.post("/{wo_id}/maintenance-cost")
def add_maintenance_cost(
    wo_id: int, body: dict, db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    wo = db.get(WorkOrder, wo_id)
    if not wo:
        raise HTTPException(404, "WO not found")
    mc = MaintenanceCost(
        vehicle_id=wo.vehicle_id, wo_id=wo_id,
        cost_type=body.get("cost_type", "OTHER"),
        amount=float(body.get("amount", 0)),
        description=body.get("description"),
        date=datetime.utcnow(),
    )
    db.add(mc)
    db.add(WOActivity(
        wo_id=wo_id,
        activity=f"Cost logged: {mc.cost_type} {mc.amount:.2f} SAR",
        actor=current.username,
    ))
    audit_service.log_action(
        db, action="ADD_MAINTENANCE_COST", entity_type="MaintenanceCost",
        entity_id=None, user_id=current.id, username=current.username,
        new_values={"wo_id": wo_id, "amount": mc.amount, "cost_type": mc.cost_type},
    )
    db.commit()
    db.refresh(mc)
    return {"id": mc.id, "amount": mc.amount, "date": mc.date}
