from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import RFQ, RFQLine, PurchaseOrder, POLine, PartMaster, Warehouse
from schemas import (
    ProcurementCheckRequest, ProcurementCheckResult,
    RFQOut, RFQDetail, RFQCreate, RFQLineBase, RFQLineOut,
    POOut, POLineOut, PartOut, WarehouseOut, CheckResult, AlternativeAction
)
from auth import get_current_user
from services import procurement_service, inventory_service, audit_service

router = APIRouter(prefix="/api/procurement", tags=["procurement"])


@router.post("/check", response_model=ProcurementCheckResult)
def run_procurement_check(
    body: ProcurementCheckRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current_user),
):
    try:
        result = procurement_service.run_check(
            db,
            part_id=body.part_id, warehouse_id=body.warehouse_id,
            quantity=body.quantity, urgency=body.urgency,
            wo_id=body.wo_id, sector=body.sector, requested_by=body.requested_by or current.username,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    audit_service.log_action(
        db, action="PROCUREMENT_CHECK", entity_type="Part", entity_id=body.part_id,
        user_id=current.id, username=current.username,
        new_values={"verdict": result["verdict"], "quantity": body.quantity, "urgency": body.urgency},
    )
    db.commit()
    return ProcurementCheckResult(
        verdict=result["verdict"], reasons=result["reasons"],
        checks_passed=[CheckResult(**c) for c in result["checks_passed"]],
        checks_failed=[CheckResult(**c) for c in result["checks_failed"]],
        checks_flagged=[CheckResult(**c) for c in result["checks_flagged"]],
        alternative_actions=[AlternativeAction(**a) for a in result["alternative_actions"]],
        estimated_saving=result["estimated_saving"],
        requested_part=PartOut.model_validate(result["requested_part"]),
        requested_quantity=result["requested_quantity"],
        requested_warehouse=WarehouseOut(
            id=result["requested_warehouse"].id,
            code=result["requested_warehouse"].code,
            name=result["requested_warehouse"].name,
            sector=result["requested_warehouse"].sector,
            location=result["requested_warehouse"].location,
            manager=result["requested_warehouse"].manager,
            created_at=result["requested_warehouse"].created_at,
        ),
    )


# ─── RFQ ────────────────────────────────────────────────────────

def _next_rfq_number(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(func.count(RFQ.id)).scalar() or 0
    return f"RFQ-{year}-{(count + 1):04d}"


def _rfq_to_out(db: Session, r: RFQ) -> RFQOut:
    p = db.get(PartMaster, r.part_id)
    w = db.get(Warehouse, r.warehouse_id)
    return RFQOut(
        id=r.id, rfq_number=r.rfq_number, part_id=r.part_id,
        warehouse_id=r.warehouse_id, quantity=r.quantity, status=r.status,
        requested_by=r.requested_by, notes=r.notes,
        created_at=r.created_at, awarded_at=r.awarded_at,
        part_number=p.part_number if p else None,
        description_en=p.description_en if p else None,
        warehouse_name=w.name if w else None,
        suppliers_count=len(r.lines),
    )


@router.get("/rfqs", response_model=List[RFQOut])
def list_rfqs(status: Optional[str] = None, db: Session = Depends(get_db), current=Depends(get_current_user)):
    q = db.query(RFQ)
    if status:
        q = q.filter(RFQ.status == status)
    return [_rfq_to_out(db, r) for r in q.order_by(RFQ.created_at.desc()).all()]


@router.get("/rfqs/{rfq_id}", response_model=RFQDetail)
def get_rfq(rfq_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    r = db.get(RFQ, rfq_id)
    if not r:
        raise HTTPException(404, "Not found")
    base = _rfq_to_out(db, r)
    return RFQDetail(**base.model_dump(), lines=[RFQLineOut.model_validate(l) for l in r.lines])


@router.post("/rfqs", response_model=RFQOut, status_code=201)
def create_rfq(body: RFQCreate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rfq = RFQ(
        rfq_number=_next_rfq_number(db),
        part_id=body.part_id, warehouse_id=body.warehouse_id,
        quantity=body.quantity, status="DRAFT",
        requested_by=body.requested_by or current.username, notes=body.notes,
    )
    db.add(rfq)
    db.flush()
    audit_service.log_action(
        db, action="CREATE_RFQ", entity_type="RFQ", entity_id=rfq.id,
        user_id=current.id, username=current.username,
        new_values={"rfq_number": rfq.rfq_number, "part_id": rfq.part_id, "quantity": rfq.quantity},
    )
    db.commit()
    db.refresh(rfq)
    return _rfq_to_out(db, rfq)


@router.post("/rfqs/{rfq_id}/lines", response_model=RFQLineOut, status_code=201)
def add_rfq_line(rfq_id: int, body: RFQLineBase, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rfq = db.get(RFQ, rfq_id)
    if not rfq:
        raise HTTPException(404, "RFQ not found")
    line = RFQLine(rfq_id=rfq_id, **body.model_dump())
    db.add(line)
    if rfq.status == "DRAFT":
        rfq.status = "RECEIVED"
    db.commit()
    db.refresh(line)
    return line


@router.post("/rfqs/{rfq_id}/award/{line_id}", response_model=POOut)
def award_rfq(rfq_id: int, line_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    rfq = db.get(RFQ, rfq_id)
    line = db.get(RFQLine, line_id)
    if not rfq or not line or line.rfq_id != rfq_id:
        raise HTTPException(404, "Not found")
    line.is_awarded = True
    rfq.status = "AWARDED"
    rfq.awarded_at = datetime.utcnow()

    po_number = f"PO-{datetime.utcnow().year}-{(db.query(func.count(PurchaseOrder.id)).scalar() + 1):04d}"
    po = PurchaseOrder(
        po_number=po_number, rfq_id=rfq_id, supplier=line.supplier,
        total_amount=line.total_price, status="APPROVED",
    )
    db.add(po)
    db.flush()
    pl = POLine(
        po_id=po.id, part_id=rfq.part_id, quantity_ordered=rfq.quantity,
        quantity_received=0, unit_price=line.unit_price, total_price=line.total_price,
    )
    db.add(pl)
    audit_service.log_action(
        db, action="AWARD_RFQ", entity_type="RFQ", entity_id=rfq.id,
        user_id=current.id, username=current.username,
        new_values={"awarded_supplier": line.supplier, "po_number": po_number, "total": line.total_price},
    )
    db.commit()
    db.refresh(po)
    return _po_to_out(db, po)


# ─── PO ─────────────────────────────────────────────────────────

def _po_to_out(db: Session, po: PurchaseOrder) -> POOut:
    lines_out = []
    for l in po.lines:
        p = db.get(PartMaster, l.part_id)
        lines_out.append(POLineOut(
            id=l.id, part_id=l.part_id,
            part_number=p.part_number if p else None,
            description_en=p.description_en if p else None,
            quantity_ordered=l.quantity_ordered,
            quantity_received=l.quantity_received,
            unit_price=l.unit_price, total_price=l.total_price,
        ))
    return POOut(
        id=po.id, po_number=po.po_number, rfq_id=po.rfq_id,
        supplier=po.supplier, total_amount=po.total_amount, status=po.status,
        expected_delivery=po.expected_delivery, created_at=po.created_at,
        received_at=po.received_at, lines=lines_out,
    )


@router.get("/pos", response_model=List[POOut])
def list_pos(status: Optional[str] = None, db: Session = Depends(get_db), current=Depends(get_current_user)):
    q = db.query(PurchaseOrder)
    if status:
        q = q.filter(PurchaseOrder.status == status)
    return [_po_to_out(db, p) for p in q.order_by(PurchaseOrder.created_at.desc()).all()]


@router.get("/pos/{po_id}", response_model=POOut)
def get_po(po_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    po = db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(404, "Not found")
    return _po_to_out(db, po)


@router.post("/pos/{po_id}/receive", response_model=POOut)
def receive_po(po_id: int, warehouse_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    po = db.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(404, "Not found")
    if po.status == "RECEIVED":
        raise HTTPException(400, "Already received")
    for l in po.lines:
        remaining = l.quantity_ordered - l.quantity_received
        if remaining <= 0:
            continue
        inventory_service.receive_stock(
            db, part_id=l.part_id, warehouse_id=warehouse_id,
            quantity=remaining, condition="SERVICEABLE",
            unit_cost=l.unit_price, po_reference=po.po_number,
            actor=current.username, user_id=current.id,
        )
        l.quantity_received = l.quantity_ordered
    po.status = "RECEIVED"
    po.received_at = datetime.utcnow()
    audit_service.log_action(
        db, action="RECEIVE_PO", entity_type="PO", entity_id=po.id,
        user_id=current.id, username=current.username,
        new_values={"po_number": po.po_number, "warehouse_id": warehouse_id},
    )
    db.commit()
    db.refresh(po)
    return _po_to_out(db, po)
