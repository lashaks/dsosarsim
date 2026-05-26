from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from database import get_db
from models import IPSASEvent, Inventory, PartMaster, Vehicle, MaintenanceCost
from schemas import IPSASEventOut, IPSASSummary
from auth import get_current_user
from services.depreciation_service import compute_depreciation

router = APIRouter(prefix="/api/ipsas", tags=["ipsas"])


@router.get("/journal", response_model=List[IPSASEventOut])
def list_journal(
    event_type: Optional[str] = None,
    reference: Optional[str] = None,
    account: Optional[str] = None,
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    q = db.query(IPSASEvent)
    if event_type:
        q = q.filter(IPSASEvent.event_type == event_type)
    if reference:
        q = q.filter(IPSASEvent.reference_id == reference)
    if account:
        q = q.filter(
            (IPSASEvent.debit_account == account) | (IPSASEvent.credit_account == account)
        )
    return q.order_by(IPSASEvent.posted_at.desc()).limit(limit).all()


@router.get("/summary", response_model=IPSASSummary)
def summary(db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = db.query(Inventory, PartMaster).join(PartMaster, Inventory.part_id == PartMaster.id).all()
    inv_value = sum((i.quantity_on_hand or 0) * (p.unit_cost or 0) for i, p in rows)

    nbv_total = 0.0
    for v in db.query(Vehicle).all():
        nbv_total += compute_depreciation(v)["nbv"]

    year = datetime.utcnow().year
    dep_ytd = db.query(func.coalesce(func.sum(IPSASEvent.amount), 0)).filter(
        IPSASEvent.event_type == "DEPRECIATION",
        extract("year", IPSASEvent.posted_at) == year,
    ).scalar() or 0
    maint_ytd = db.query(func.coalesce(func.sum(MaintenanceCost.amount), 0)).filter(
        extract("year", MaintenanceCost.date) == year
    ).scalar() or 0

    return IPSASSummary(
        total_inventory_value=round(inv_value, 2),
        total_asset_nbv=round(nbv_total, 2),
        total_depreciation_ytd=round(float(dep_ytd), 2),
        total_maintenance_expense_ytd=round(float(maint_ytd), 2),
    )
