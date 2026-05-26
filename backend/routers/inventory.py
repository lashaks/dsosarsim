from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models import Inventory, PartMaster, Warehouse, Bin, InventoryMovement
from schemas import (
    InventoryOut, ReceiveStockRequest, IssueStockRequest, WriteDownRequest,
    InventoryMovementOut
)
from auth import get_current_user
from services import inventory_service

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _to_out(db: Session, inv: Inventory) -> InventoryOut:
    p = db.get(PartMaster, inv.part_id)
    w = db.get(Warehouse, inv.warehouse_id)
    b = db.get(Bin, inv.bin_id) if inv.bin_id else None
    available = max((inv.quantity_on_hand or 0) - (inv.quantity_reserved or 0), 0)
    return InventoryOut(
        id=inv.id, part_id=inv.part_id, warehouse_id=inv.warehouse_id,
        bin_id=inv.bin_id, quantity_on_hand=inv.quantity_on_hand,
        quantity_reserved=inv.quantity_reserved, reorder_point=inv.reorder_point,
        max_stock=inv.max_stock, condition=inv.condition, updated_at=inv.updated_at,
        part_number=p.part_number if p else None, nsn=p.nsn if p else None,
        description_en=p.description_en if p else None,
        description_ar=p.description_ar if p else None,
        unit_cost=p.unit_cost if p else None,
        warehouse_name=w.name if w else None,
        bin_code=b.code if b else None,
        available=available,
        total_value=round((p.unit_cost if p else 0) * inv.quantity_on_hand, 2),
        reorder_alert=inv.quantity_on_hand <= inv.reorder_point,
    )


@router.get("", response_model=List[InventoryOut])
def list_inventory(
    warehouse_id: Optional[int] = None,
    condition: Optional[str] = None,
    reorder_alert: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    q = db.query(Inventory)
    if warehouse_id:
        q = q.filter(Inventory.warehouse_id == warehouse_id)
    if condition:
        q = q.filter(Inventory.condition == condition)
    rows = q.all()
    out = [_to_out(db, r) for r in rows]
    if search:
        s = search.lower()
        out = [r for r in out if s in (r.part_number or "").lower()
               or s in (r.description_en or "").lower()
               or s in (r.nsn or "").lower()]
    if reorder_alert is True:
        out = [r for r in out if r.reorder_alert]
    return out


@router.get("/movements", response_model=List[InventoryMovementOut])
def list_movements(
    limit: int = Query(50, le=500),
    warehouse_id: Optional[int] = None,
    part_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    q = db.query(InventoryMovement)
    if warehouse_id:
        q = q.filter(InventoryMovement.warehouse_id == warehouse_id)
    if part_id:
        q = q.filter(InventoryMovement.part_id == part_id)
    rows = q.order_by(desc(InventoryMovement.created_at)).limit(limit).all()
    out = []
    for r in rows:
        p = db.get(PartMaster, r.part_id)
        w = db.get(Warehouse, r.warehouse_id)
        out.append(InventoryMovementOut(
            id=r.id, part_id=r.part_id,
            part_number=p.part_number if p else None,
            description_en=p.description_en if p else None,
            warehouse_id=r.warehouse_id,
            warehouse_name=w.name if w else None,
            movement_type=r.movement_type, quantity=r.quantity,
            reference_type=r.reference_type, reference_id=r.reference_id,
            journal_id=r.journal_id, actor=r.actor, notes=r.notes,
            created_at=r.created_at,
        ))
    return out


@router.post("/receive")
def receive_stock(body: ReceiveStockRequest, db: Session = Depends(get_db), current=Depends(get_current_user)):
    result = inventory_service.receive_stock(
        db, part_id=body.part_id, warehouse_id=body.warehouse_id,
        quantity=body.quantity, condition=body.condition, unit_cost=body.unit_cost,
        po_reference=body.po_reference, bin_id=body.bin_id, notes=body.notes,
        actor=current.username, user_id=current.id,
    )
    return {
        "detail": "received",
        "inventory_id": result["inventory"].id,
        "journal_id": result["journal"].id,
        "movement_id": result["movement"].id,
    }


@router.post("/issue")
def issue_stock(body: IssueStockRequest, db: Session = Depends(get_db), current=Depends(get_current_user)):
    result = inventory_service.issue_to_wo(
        db, inventory_id=body.inventory_id, quantity=body.quantity,
        wo_reference=body.wo_reference, wo_part_id=body.wo_part_id,
        notes=body.notes, actor=current.username, user_id=current.id,
    )
    return {
        "detail": "issued",
        "journal_id": result["journal"].id,
        "movement_id": result["movement"].id,
    }


@router.post("/write-down")
def write_down(body: WriteDownRequest, db: Session = Depends(get_db), current=Depends(get_current_user)):
    result = inventory_service.write_down(
        db, inventory_id=body.inventory_id, quantity=body.quantity,
        nrv_estimate=body.nrv_estimate, reason=body.reason, notes=body.notes,
        actor=current.username, user_id=current.id,
    )
    return {
        "detail": "written down",
        "journal_id": result["journal"].id,
        "movement_id": result["movement"].id,
    }


@router.get("/parts")
def list_parts(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    q = db.query(PartMaster)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (PartMaster.part_number.ilike(like))
            | (PartMaster.description_en.ilike(like))
            | (PartMaster.nsn.ilike(like))
        )
    return q.order_by(PartMaster.part_number).all()
