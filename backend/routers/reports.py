"""Lightweight CSV exports (no Excel libs to keep deps slim — UI can call print to PDF)."""
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from database import get_db
from models import Vehicle, WorkOrder, Inventory, PartMaster, IPSASEvent, BERReview
from auth import get_current_user
from services.readiness_service import compute_readiness, vehicle_readiness_contribution

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _csv_response(rows: list[dict], filename: str) -> Response:
    if not rows:
        return Response(content="", media_type="text/csv")
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/readiness.csv")
def report_readiness(db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = []
    for v in db.query(Vehicle).order_by(Vehicle.sector, Vehicle.registration).all():
        rows.append({
            "registration": v.registration, "name": v.name, "type": v.type,
            "sector": v.sector, "brigade": v.brigade or "",
            "criticality": v.criticality, "op_status": v.op_status,
            "readiness_contribution": vehicle_readiness_contribution(v),
            "acquisition_cost": v.acquisition_cost,
        })
    return _csv_response(rows, f"dsos-readiness-{datetime.utcnow().date()}.csv")


@router.get("/work-orders.csv")
def report_wos(db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = []
    for wo in db.query(WorkOrder).order_by(WorkOrder.created_at.desc()).all():
        v = db.get(Vehicle, wo.vehicle_id)
        rows.append({
            "wo_number": wo.wo_number, "vehicle": v.registration if v else "",
            "title": wo.title, "status": wo.status, "priority": wo.priority,
            "sector": wo.sector or "", "assigned_to": wo.assigned_to or "",
            "created_at": wo.created_at.isoformat(),
            "closed_at": wo.closed_at.isoformat() if wo.closed_at else "",
        })
    return _csv_response(rows, f"dsos-work-orders-{datetime.utcnow().date()}.csv")


@router.get("/inventory.csv")
def report_inv(db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = []
    for inv in db.query(Inventory).all():
        p = db.get(PartMaster, inv.part_id)
        rows.append({
            "part_number": p.part_number if p else "",
            "description": p.description_en if p else "",
            "warehouse_id": inv.warehouse_id,
            "condition": inv.condition,
            "on_hand": inv.quantity_on_hand,
            "reorder_point": inv.reorder_point,
            "unit_cost": p.unit_cost if p else 0,
            "total_value": round((p.unit_cost if p else 0) * inv.quantity_on_hand, 2),
        })
    return _csv_response(rows, f"dsos-inventory-{datetime.utcnow().date()}.csv")


@router.get("/ipsas-journal.csv")
def report_ipsas(db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = []
    for e in db.query(IPSASEvent).order_by(IPSASEvent.posted_at.desc()).all():
        rows.append({
            "posted_at": e.posted_at.isoformat(), "event_type": e.event_type,
            "reference": e.reference_id or "", "description": e.description,
            "debit_account": e.debit_account, "credit_account": e.credit_account,
            "amount": e.amount, "currency": e.currency, "posted_by": e.posted_by or "",
        })
    return _csv_response(rows, f"dsos-ipsas-{datetime.utcnow().date()}.csv")


@router.get("/ber.csv")
def report_ber(db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = []
    for r in db.query(BERReview).order_by(BERReview.created_at.desc()).all():
        v = db.get(Vehicle, r.vehicle_id)
        rows.append({
            "vehicle": v.registration if v else "", "date": r.created_at.isoformat(),
            "score": r.ber_score, "recommendation": r.recommendation,
            "repair_cost": r.repair_cost, "replacement_value": r.replacement_value,
            "cumulative_maintenance": r.cumulative_maintenance_cost,
            "reviewed_by": r.reviewed_by or "",
        })
    return _csv_response(rows, f"dsos-ber-{datetime.utcnow().date()}.csv")
