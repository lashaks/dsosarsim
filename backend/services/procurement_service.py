"""ENGINE 2 — 15-point procurement necessity check.

Runs on every purchase request. No bypass.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import (
    Inventory, PartMaster, Warehouse, RFQ, PurchaseOrder, POLine,
    ObsolescenceRisk, WorkOrder
)


# Approval thresholds (SAR)
APPROVAL_LEVELS = [
    (10000, "Storekeeper"),
    (50000, "Procurement Officer"),
    (250000, "Sector Commander"),
    (1000000, "Director of Sustainment"),
    (float("inf"), "Chief of Defense Acquisition"),
]

# Strategic reserve policy: HIGH-criticality parts must keep >= 20% of max_stock
STRATEGIC_RESERVE_PCT = 0.20

# Simplified budget pool (SAR) — in real life pulled from finance system
DEFAULT_BUDGET = 5_000_000.0


def _approval_authority(amount: float) -> str:
    for threshold, role in APPROVAL_LEVELS:
        if amount <= threshold:
            return role
    return "Chief of Defense Acquisition"


def run_check(
    db: Session,
    *,
    part_id: int,
    warehouse_id: int,
    quantity: float,
    urgency: str = "MEDIUM",
    wo_id: Optional[int] = None,
    sector: Optional[str] = None,
    requested_by: Optional[str] = None,
) -> dict:
    part: PartMaster = db.get(PartMaster, part_id)
    warehouse: Warehouse = db.get(Warehouse, warehouse_id)
    if not part:
        raise ValueError("Part not found")
    if not warehouse:
        raise ValueError("Warehouse not found")

    checks_passed: List[dict] = []
    checks_failed: List[dict] = []
    checks_flagged: List[dict] = []
    alternatives: List[dict] = []
    reasons: List[str] = []
    estimated_saving = 0.0

    purchase_value = round(part.unit_cost * quantity, 2)

    # 1 — Stock on hand in same warehouse (SERVICEABLE)
    same_wh = (
        db.query(Inventory)
        .filter(
            Inventory.part_id == part_id,
            Inventory.warehouse_id == warehouse_id,
            Inventory.condition == "SERVICEABLE",
        )
        .first()
    )
    same_wh_qty = (same_wh.quantity_on_hand - same_wh.quantity_reserved) if same_wh else 0
    if same_wh_qty >= quantity:
        checks_failed.append({
            "check_number": 1, "check_name": "Stock on hand — same warehouse",
            "status": "FAIL",
            "detail": f"{same_wh_qty:.0f} units available locally — purchase not needed",
        })
        alternatives.append({
            "action": "USE_LOCAL_STOCK",
            "detail": f"Issue {quantity:.0f} from {warehouse.name}",
            "estimated_saving": purchase_value,
        })
        estimated_saving += purchase_value
        reasons.append(f"Sufficient serviceable stock in {warehouse.name}")
    else:
        checks_passed.append({
            "check_number": 1, "check_name": "Stock on hand — same warehouse",
            "status": "PASS",
            "detail": f"Only {same_wh_qty:.0f} on hand vs {quantity:.0f} required",
        })

    # 2 — Stock on hand in OTHER warehouses
    other_wh_rows = (
        db.query(Inventory)
        .filter(
            Inventory.part_id == part_id,
            Inventory.warehouse_id != warehouse_id,
            Inventory.condition == "SERVICEABLE",
        )
        .all()
    )
    total_other = sum((r.quantity_on_hand - r.quantity_reserved) for r in other_wh_rows)
    if total_other >= quantity:
        checks_flagged.append({
            "check_number": 2, "check_name": "Stock on hand — other warehouses",
            "status": "FLAG",
            "detail": f"{total_other:.0f} units in other warehouses — consider transfer",
        })
        wh_names = []
        for r in other_wh_rows:
            wh = db.get(Warehouse, r.warehouse_id)
            avail = r.quantity_on_hand - r.quantity_reserved
            if avail > 0 and wh:
                wh_names.append(f"{wh.code}={avail:.0f}")
        alternatives.append({
            "action": "TRANSFER_FROM_OTHER_WAREHOUSE",
            "detail": "Available at: " + ", ".join(wh_names),
            "estimated_saving": purchase_value * 0.85,  # transfer is ~85% saving (minor logistics cost)
        })
        if estimated_saving == 0:
            estimated_saving += purchase_value * 0.85
        reasons.append("Stock available in other warehouses")
    else:
        checks_passed.append({
            "check_number": 2, "check_name": "Stock on hand — other warehouses",
            "status": "PASS",
            "detail": f"Only {total_other:.0f} units distributed elsewhere",
        })

    # 3 — Open RFQ for this part
    open_rfq = (
        db.query(RFQ)
        .filter(RFQ.part_id == part_id, RFQ.status.in_(["DRAFT", "SENT", "RECEIVED"]))
        .first()
    )
    if open_rfq:
        checks_flagged.append({
            "check_number": 3, "check_name": "Open RFQ exists",
            "status": "FLAG",
            "detail": f"{open_rfq.rfq_number} for {open_rfq.quantity:.0f} units is {open_rfq.status}",
        })
        alternatives.append({
            "action": "JOIN_EXISTING_RFQ",
            "detail": f"Add to {open_rfq.rfq_number} instead of issuing duplicate",
            "estimated_saving": purchase_value * 0.10,
        })
        reasons.append(f"Existing RFQ {open_rfq.rfq_number} for same part")
    else:
        checks_passed.append({
            "check_number": 3, "check_name": "Open RFQ exists",
            "status": "PASS",
            "detail": "No open RFQ for this part",
        })

    # 4 — Open PO for this part
    open_po_line = (
        db.query(POLine)
        .join(PurchaseOrder, POLine.po_id == PurchaseOrder.id)
        .filter(
            POLine.part_id == part_id,
            PurchaseOrder.status.in_(["DRAFT", "APPROVED", "SENT"]),
        )
        .first()
    )
    if open_po_line:
        po = db.get(PurchaseOrder, open_po_line.po_id)
        outstanding = open_po_line.quantity_ordered - open_po_line.quantity_received
        checks_flagged.append({
            "check_number": 4, "check_name": "Open PO exists",
            "status": "FLAG",
            "detail": f"{po.po_number} has {outstanding:.0f} units inbound from {po.supplier}",
        })
        alternatives.append({
            "action": "AWAIT_OPEN_PO",
            "detail": f"PO {po.po_number} delivers {outstanding:.0f} units (status {po.status})",
            "estimated_saving": purchase_value,
        })
        if outstanding >= quantity:
            estimated_saving += purchase_value
        reasons.append(f"Open PO {po.po_number} covers requirement")
    else:
        checks_passed.append({
            "check_number": 4, "check_name": "Open PO exists",
            "status": "PASS",
            "detail": "No open purchase order for this part",
        })

    # 5 — Repairable stock available
    repairable = (
        db.query(Inventory)
        .filter(
            Inventory.part_id == part_id,
            Inventory.condition == "REPAIRABLE",
            Inventory.quantity_on_hand > 0,
        )
        .all()
    )
    repairable_qty = sum(r.quantity_on_hand for r in repairable)
    if repairable_qty > 0:
        checks_flagged.append({
            "check_number": 5, "check_name": "Repairable stock available",
            "status": "FLAG",
            "detail": f"{repairable_qty:.0f} repairable units could be refurbished",
        })
        alternatives.append({
            "action": "REPAIR_INSTEAD",
            "detail": f"Send {min(repairable_qty, quantity):.0f} units to workshop",
            "estimated_saving": purchase_value * 0.40,  # repair typically ~60% of new
        })
        reasons.append(f"{repairable_qty:.0f} repairable units exist")
    else:
        checks_passed.append({
            "check_number": 5, "check_name": "Repairable stock available",
            "status": "PASS",
            "detail": "No repairable units in any warehouse",
        })

    # 6 — Reorder point logic
    if same_wh:
        post_purchase_qty = (same_wh.quantity_on_hand - same_wh.quantity_reserved) + quantity - quantity
        # request quantity required vs reorder point
        if same_wh.quantity_on_hand <= same_wh.reorder_point:
            checks_passed.append({
                "check_number": 6, "check_name": "Reorder point logic",
                "status": "PASS",
                "detail": f"On-hand {same_wh.quantity_on_hand:.0f} ≤ reorder point {same_wh.reorder_point:.0f}",
            })
        elif same_wh.quantity_on_hand + quantity > same_wh.max_stock and same_wh.max_stock > 0:
            checks_flagged.append({
                "check_number": 6, "check_name": "Reorder point logic",
                "status": "FLAG",
                "detail": f"Order would exceed max stock {same_wh.max_stock:.0f}",
            })
        else:
            checks_passed.append({
                "check_number": 6, "check_name": "Reorder point logic",
                "status": "PASS",
                "detail": f"Within reorder/max bounds",
            })
    else:
        checks_passed.append({
            "check_number": 6, "check_name": "Reorder point logic",
            "status": "PASS",
            "detail": "No inventory record — first-time stocking",
        })

    # 7 — Lead time vs urgency
    urgency_max_days = {"CRITICAL": 7, "HIGH": 14, "MEDIUM": 30, "LOW": 90}
    max_days = urgency_max_days.get(urgency, 30)
    if part.lead_time_days > max_days:
        checks_flagged.append({
            "check_number": 7, "check_name": "Lead time vs urgency",
            "status": "FLAG",
            "detail": f"Lead time {part.lead_time_days}d > {urgency} window {max_days}d",
        })
        alternatives.append({
            "action": "EXPEDITE_OR_CANNIBALIZE",
            "detail": f"Lead time exceeds urgency window — consider cannibalization or expedited shipping",
            "estimated_saving": 0,
        })
        reasons.append(f"Lead time {part.lead_time_days}d exceeds {urgency} requirement")
    else:
        checks_passed.append({
            "check_number": 7, "check_name": "Lead time vs urgency",
            "status": "PASS",
            "detail": f"Lead time {part.lead_time_days}d within {urgency} window",
        })

    # 8 — Last purchase price vs current cost
    last_po_line = (
        db.query(POLine)
        .join(PurchaseOrder, POLine.po_id == PurchaseOrder.id)
        .filter(POLine.part_id == part_id, PurchaseOrder.status == "RECEIVED")
        .order_by(PurchaseOrder.received_at.desc())
        .first()
    )
    if last_po_line:
        delta_pct = ((part.unit_cost - last_po_line.unit_price) / last_po_line.unit_price) * 100 if last_po_line.unit_price else 0
        if abs(delta_pct) > 15:
            checks_flagged.append({
                "check_number": 8, "check_name": "Last purchase price comparison",
                "status": "FLAG",
                "detail": f"Catalog {part.unit_cost:.2f} vs last paid {last_po_line.unit_price:.2f} ({delta_pct:+.1f}%)",
            })
            reasons.append(f"Unit cost shifted {delta_pct:+.1f}% vs last PO")
        else:
            checks_passed.append({
                "check_number": 8, "check_name": "Last purchase price comparison",
                "status": "PASS",
                "detail": f"Catalog price within ±15% of last PO ({delta_pct:+.1f}%)",
            })
    else:
        checks_passed.append({
            "check_number": 8, "check_name": "Last purchase price comparison",
            "status": "INFO",
            "detail": "No prior PO history — using catalog price",
        })

    # 9 — Obsolescence risk
    obs = db.query(ObsolescenceRisk).filter(ObsolescenceRisk.part_id == part_id).first()
    if obs and obs.risk_level in ("HIGH", "MEDIUM"):
        alt_text = ""
        if obs.alternative_part_id:
            alt = db.get(PartMaster, obs.alternative_part_id)
            if alt:
                alt_text = f" — alternative {alt.part_number} available"
        checks_flagged.append({
            "check_number": 9, "check_name": "Obsolescence risk",
            "status": "FLAG",
            "detail": f"Risk level {obs.risk_level}{alt_text}",
        })
        if obs.alternative_part_id:
            alt = db.get(PartMaster, obs.alternative_part_id)
            if alt:
                alternatives.append({
                    "action": "USE_ALTERNATIVE_PART",
                    "detail": f"Switch to {alt.part_number} — {alt.description_en}",
                    "estimated_saving": 0,
                })
        reasons.append(f"Part flagged {obs.risk_level} obsolescence risk")
    else:
        checks_passed.append({
            "check_number": 9, "check_name": "Obsolescence risk",
            "status": "PASS",
            "detail": "No obsolescence flag" if not obs else f"Risk level {obs.risk_level}",
        })

    # 10 — Duplicate request from same sector in last 30 days
    if sector:
        cutoff = datetime.utcnow() - timedelta(days=30)
        recent_rfq = (
            db.query(RFQ)
            .join(Warehouse, RFQ.warehouse_id == Warehouse.id)
            .filter(
                RFQ.part_id == part_id,
                RFQ.created_at >= cutoff,
                Warehouse.sector == sector,
            )
            .count()
        )
        if recent_rfq > 0:
            checks_flagged.append({
                "check_number": 10, "check_name": "Duplicate request — last 30 days",
                "status": "FLAG",
                "detail": f"{recent_rfq} RFQ(s) for this part raised by {sector} in last 30 days",
            })
            reasons.append(f"Duplicate request in {sector} sector")
        else:
            checks_passed.append({
                "check_number": 10, "check_name": "Duplicate request — last 30 days",
                "status": "PASS",
                "detail": "No duplicates found",
            })
    else:
        checks_passed.append({
            "check_number": 10, "check_name": "Duplicate request — last 30 days",
            "status": "INFO",
            "detail": "Sector not specified — skipping",
        })

    # 11 — Budget availability (simplified: sum of all DRAFT+APPROVED+SENT PO totals vs default budget)
    committed = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status.in_(["DRAFT", "APPROVED", "SENT"]))
        .all()
    )
    committed_total = sum(p.total_amount for p in committed)
    remaining_budget = DEFAULT_BUDGET - committed_total
    if purchase_value > remaining_budget:
        checks_failed.append({
            "check_number": 11, "check_name": "Budget availability",
            "status": "FAIL",
            "detail": f"Need {purchase_value:.0f} SAR but only {remaining_budget:.0f} SAR remaining",
        })
        reasons.append("Insufficient budget")
    else:
        checks_passed.append({
            "check_number": 11, "check_name": "Budget availability",
            "status": "PASS",
            "detail": f"{remaining_budget:.0f} SAR remaining of {DEFAULT_BUDGET:.0f} budget",
        })

    # 12 — Minimum order quantity vs requested
    if quantity < part.minimum_order_qty:
        checks_flagged.append({
            "check_number": 12, "check_name": "Minimum order quantity",
            "status": "FLAG",
            "detail": f"Requested {quantity:.0f} < MOQ {part.minimum_order_qty}",
        })
        reasons.append(f"Below supplier MOQ ({part.minimum_order_qty})")
    else:
        checks_passed.append({
            "check_number": 12, "check_name": "Minimum order quantity",
            "status": "PASS",
            "detail": f"Quantity {quantity:.0f} meets MOQ {part.minimum_order_qty}",
        })

    # 13 — Preferred supplier availability
    if part.preferred_supplier:
        checks_passed.append({
            "check_number": 13, "check_name": "Preferred supplier",
            "status": "PASS",
            "detail": f"Preferred supplier: {part.preferred_supplier}",
        })
    else:
        checks_flagged.append({
            "check_number": 13, "check_name": "Preferred supplier",
            "status": "FLAG",
            "detail": "No preferred supplier on file — open tender required",
        })

    # 14 — Strategic reserve compliance
    if part.is_critical and same_wh:
        reserve_min = same_wh.max_stock * STRATEGIC_RESERVE_PCT
        if (same_wh.quantity_on_hand - quantity) < reserve_min:
            checks_flagged.append({
                "check_number": 14, "check_name": "Strategic reserve policy",
                "status": "FLAG",
                "detail": f"Post-issue stock {(same_wh.quantity_on_hand - quantity):.0f} below reserve floor {reserve_min:.0f}",
            })
            reasons.append("Strategic reserve floor breach")
        else:
            checks_passed.append({
                "check_number": 14, "check_name": "Strategic reserve policy",
                "status": "PASS",
                "detail": f"Strategic reserve preserved (≥{reserve_min:.0f})",
            })
    else:
        checks_passed.append({
            "check_number": 14, "check_name": "Strategic reserve policy",
            "status": "PASS",
            "detail": "Not a strategic-reserve item" if not part.is_critical else "No baseline inventory to evaluate",
        })

    # 15 — Approval authority level required
    authority = _approval_authority(purchase_value)
    checks_passed.append({
        "check_number": 15, "check_name": "Approval authority required",
        "status": "INFO",
        "detail": f"{purchase_value:.0f} SAR → requires {authority} approval",
    })

    # ─── Determine verdict ─────────────────────────────────────
    # Priority order:
    #   AVAILABLE_IN_STOCK > REPAIR_INSTEAD > DUPLICATE_RISK > NOT_RECOMMENDED > REVIEW_REQUIRED > NECESSARY
    fail_count = len(checks_failed)
    flag_count = len(checks_flagged)
    same_wh_available = same_wh_qty >= quantity
    other_wh_available = total_other >= quantity
    has_repairable = repairable_qty >= quantity
    has_duplicate = any(c["check_number"] == 10 and c["status"] == "FLAG" for c in checks_flagged)

    if same_wh_available or other_wh_available:
        verdict = "AVAILABLE_IN_STOCK"
    elif has_repairable:
        verdict = "REPAIR_INSTEAD"
    elif has_duplicate:
        verdict = "DUPLICATE_RISK"
    elif fail_count > 0:
        verdict = "NOT_RECOMMENDED"
    elif flag_count >= 3:
        verdict = "NOT_RECOMMENDED"
    elif flag_count > 0:
        verdict = "REVIEW_REQUIRED"
    else:
        verdict = "NECESSARY"
        reasons.append("All 15 checks passed — purchase justified")

    return {
        "verdict": verdict,
        "reasons": reasons,
        "checks_passed": checks_passed,
        "checks_failed": checks_failed,
        "checks_flagged": checks_flagged,
        "alternative_actions": alternatives,
        "estimated_saving": round(estimated_saving, 2),
        "requested_part": part,
        "requested_quantity": quantity,
        "requested_warehouse": warehouse,
    }
