from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Warehouse, Bin, Inventory, PartMaster
from schemas import WarehouseOut, WarehouseCreate, BinOut, BinBase
from auth import get_current_user
from services import audit_service

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])


def _to_out(db: Session, w: Warehouse) -> WarehouseOut:
    skus = db.query(func.count(Inventory.id)).filter(Inventory.warehouse_id == w.id).scalar() or 0
    rows = (
        db.query(Inventory, PartMaster)
        .join(PartMaster, Inventory.part_id == PartMaster.id)
        .filter(Inventory.warehouse_id == w.id)
        .all()
    )
    total_value = sum((r[0].quantity_on_hand or 0) * (r[1].unit_cost or 0) for r in rows)
    serviceable_qty = sum(r[0].quantity_on_hand for r in rows if r[0].condition == "SERVICEABLE")
    total_qty = sum(r[0].quantity_on_hand for r in rows) or 0
    serviceable_pct = (serviceable_qty / total_qty * 100) if total_qty else 0
    return WarehouseOut(
        id=w.id, code=w.code, name=w.name, sector=w.sector, location=w.location,
        manager=w.manager, created_at=w.created_at,
        total_skus=int(skus), total_value=round(total_value, 2),
        serviceable_pct=round(serviceable_pct, 1),
    )


@router.get("", response_model=List[WarehouseOut])
def list_warehouses(db: Session = Depends(get_db), current=Depends(get_current_user)):
    return [_to_out(db, w) for w in db.query(Warehouse).order_by(Warehouse.code).all()]


@router.get("/{warehouse_id}", response_model=WarehouseOut)
def get_warehouse(warehouse_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    w = db.get(Warehouse, warehouse_id)
    if not w:
        raise HTTPException(404, "Not found")
    return _to_out(db, w)


@router.get("/{warehouse_id}/bins", response_model=List[BinOut])
def list_bins(warehouse_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    return db.query(Bin).filter(Bin.warehouse_id == warehouse_id).all()


@router.post("", response_model=WarehouseOut, status_code=201)
def create_warehouse(body: WarehouseCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    w = Warehouse(**body.model_dump())
    db.add(w)
    db.flush()
    audit_service.log_action(
        db, action="CREATE_WAREHOUSE", entity_type="Warehouse", entity_id=w.id,
        user_id=current.id, username=current.username, new_values=body.model_dump(),
    )
    db.commit()
    db.refresh(w)
    return _to_out(db, w)


@router.post("/{warehouse_id}/bins", response_model=BinOut, status_code=201)
def create_bin(warehouse_id: int, body: BinBase, db: Session = Depends(get_db), current=Depends(get_current_user)):
    if body.warehouse_id != warehouse_id:
        raise HTTPException(400, "warehouse_id mismatch")
    b = Bin(**body.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b
