from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import (
    Vehicle, WorkOrder, IPSASEvent, ReadinessSnapshot, MaintenanceCost, BERReview
)
from schemas import (
    DashboardSummary, ReadinessSummary, WorkOrderOut, IPSASEventOut,
    VehicleDetail, ReadinessTrendPoint, VehicleOut
)
from auth import get_current_user
from services.readiness_service import compute_readiness
from services.depreciation_service import compute_depreciation


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), current=Depends(get_current_user)):
    readiness = compute_readiness(db)

    in_progress = db.query(func.count(WorkOrder.id)).filter(WorkOrder.status == "IN_PROGRESS").scalar() or 0
    waiting_parts = db.query(func.count(WorkOrder.id)).filter(WorkOrder.status == "WAITING_PARTS").scalar() or 0
    open_count = db.query(func.count(WorkOrder.id)).filter(WorkOrder.status != "CLOSED").scalar() or 0

    # Procurement alerts: open RFQs in SENT/RECEIVED + open POs awaiting receipt
    from models import RFQ, PurchaseOrder
    open_rfq = db.query(func.count(RFQ.id)).filter(RFQ.status.in_(["SENT", "RECEIVED"])).scalar() or 0
    open_po = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.status.in_(["APPROVED", "SENT"])
    ).scalar() or 0

    critical_nmc = (
        db.query(Vehicle)
        .filter(Vehicle.op_status == "NMC", Vehicle.criticality == "HIGH")
        .all()
    )

    fleet_status = {
        "fmc": readiness["fmc_count"],
        "pmc": readiness["pmc_count"],
        "nmc": readiness["nmc_count"],
        "total": readiness["total_vehicles"],
    }

    # Open work orders (top 10 by age)
    open_wos = (
        db.query(WorkOrder)
        .filter(WorkOrder.status != "CLOSED")
        .order_by(WorkOrder.created_at.asc())
        .limit(10)
        .all()
    )
    open_wo_out = []
    for wo in open_wos:
        v = db.get(Vehicle, wo.vehicle_id)
        age = (datetime.utcnow() - wo.created_at).days
        open_wo_out.append(WorkOrderOut(
            id=wo.id, wo_number=wo.wo_number, vehicle_id=wo.vehicle_id,
            title=wo.title, description=wo.description, status=wo.status,
            priority=wo.priority, sector=wo.sector, assigned_to=wo.assigned_to,
            created_at=wo.created_at, closed_at=wo.closed_at,
            vehicle_name=v.name if v else None,
            vehicle_registration=v.registration if v else None,
            vehicle_type=v.type if v else None,
            age_days=age, parts_count=len(wo.parts),
        ))

    # Recent IPSAS journal
    recent_journal = (
        db.query(IPSASEvent).order_by(IPSASEvent.posted_at.desc()).limit(10).all()
    )

    # Critical vehicles detail
    critical_detail = []
    for v in critical_nmc[:6]:
        open_wo_for = db.query(func.count(WorkOrder.id)).filter(
            WorkOrder.vehicle_id == v.id, WorkOrder.status != "CLOSED"
        ).scalar() or 0
        total_maint = db.query(func.coalesce(func.sum(MaintenanceCost.amount), 0)).filter(
            MaintenanceCost.vehicle_id == v.id
        ).scalar() or 0
        dep = compute_depreciation(v)
        critical_detail.append(VehicleDetail(
            **VehicleOut.model_validate(v).model_dump(),
            open_wo_count=int(open_wo_for),
            total_maintenance_cost=float(total_maint),
            accumulated_depreciation=dep["accumulated_depreciation"],
            nbv=dep["nbv"],
            pct_depreciated=dep["pct_depreciated"],
        ))

    # Readiness trend (last 30 days, fleet-wide)
    cutoff = datetime.utcnow() - timedelta(days=31)
    trend_rows = (
        db.query(ReadinessSnapshot)
        .filter(ReadinessSnapshot.scope == "FLEET", ReadinessSnapshot.snapshot_date >= cutoff)
        .order_by(ReadinessSnapshot.snapshot_date.asc())
        .all()
    )
    trend = [ReadinessTrendPoint(
        date=s.snapshot_date, readiness_pct=s.readiness_pct,
        fmc_count=s.fmc_count, pmc_count=s.pmc_count, nmc_count=s.nmc_count,
    ) for s in trend_rows]

    return DashboardSummary(
        readiness=ReadinessSummary(**{k: v for k, v in readiness.items() if k != "critical_nmc_list"},
                                   critical_nmc_list=[VehicleOut.model_validate(x) for x in readiness["critical_nmc_list"]]),
        open_work_orders_count=int(open_count),
        in_progress_count=int(in_progress),
        waiting_parts_count=int(waiting_parts),
        procurement_alerts=int(open_rfq + open_po),
        critical_nmc_count=len(critical_nmc),
        fleet_status=fleet_status,
        open_work_orders=open_wo_out,
        recent_journal=[IPSASEventOut.model_validate(e) for e in recent_journal],
        critical_vehicles=critical_detail,
        readiness_trend=trend,
    )


@router.get("/readiness-trend", response_model=list[ReadinessTrendPoint])
def readiness_trend(days: int = 30, db: Session = Depends(get_db), current=Depends(get_current_user)):
    cutoff = datetime.utcnow() - timedelta(days=days + 1)
    rows = (
        db.query(ReadinessSnapshot)
        .filter(ReadinessSnapshot.scope == "FLEET", ReadinessSnapshot.snapshot_date >= cutoff)
        .order_by(ReadinessSnapshot.snapshot_date.asc())
        .all()
    )
    return [ReadinessTrendPoint(
        date=r.snapshot_date, readiness_pct=r.readiness_pct,
        fmc_count=r.fmc_count, pmc_count=r.pmc_count, nmc_count=r.nmc_count,
    ) for r in rows]
