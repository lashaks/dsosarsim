"""ENGINE 3 — BER (Beyond Economical Repair) scoring.

Rules and weights are exactly as specified. ALL inputs are persisted with
the score so the audit trail can reconstruct exactly what produced the
recommendation.
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Vehicle, MaintenanceCost, FRACAS, ObsolescenceRisk
from services.depreciation_service import compute_depreciation


def analyze(
    db: Session,
    *,
    vehicle_id: int,
    wo_id: Optional[int] = None,
    repair_cost: float,
    replacement_value: Optional[float] = None,
    cumulative_maintenance_cost: Optional[float] = None,
    acquisition_cost: Optional[float] = None,
    remaining_life_years: Optional[float] = None,
    recurrence_count: Optional[int] = None,
    downtime_days: int = 0,
    obsolete_parts: bool = False,
) -> dict:
    vehicle: Vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise ValueError("Vehicle not found")

    # Auto-populate any missing inputs from the database
    dep = compute_depreciation(vehicle)
    if acquisition_cost is None:
        acquisition_cost = vehicle.acquisition_cost
    if replacement_value is None:
        # Heuristic: today's replacement = acquisition * 1.6 (defence inflation factor)
        replacement_value = round(vehicle.acquisition_cost * 1.6, 2)
    if cumulative_maintenance_cost is None:
        cumulative_maintenance_cost = float(
            db.query(func.coalesce(func.sum(MaintenanceCost.amount), 0.0))
            .filter(MaintenanceCost.vehicle_id == vehicle_id)
            .scalar() or 0.0
        )
    if remaining_life_years is None:
        remaining_life_years = dep["remaining_life_years"]
    if recurrence_count is None:
        recurrence_count = int(
            db.query(func.coalesce(func.sum(FRACAS.recurrence_count), 0))
            .filter(FRACAS.vehicle_id == vehicle_id)
            .scalar() or 0
        )

    # Score
    score = 0.0
    triggered: list[int] = []
    rule_details: list[dict] = []

    # Rule 1: repair_cost > 60% of replacement_value → +35
    r1_ratio = (repair_cost / replacement_value) if replacement_value else 0
    r1_trig = r1_ratio > 0.60
    if r1_trig:
        score += 35
        triggered.append(1)
    rule_details.append({
        "rule_number": 1,
        "rule_name": "Repair cost exceeds 60% of replacement value",
        "triggered": r1_trig,
        "points": 35,
        "detail": f"Repair {repair_cost:.0f} / Replacement {replacement_value:.0f} = {r1_ratio*100:.1f}% "
                  f"(threshold 60%)",
    })

    # Rule 2: cumulative_maintenance > 50% of acquisition → +25
    r2_ratio = (cumulative_maintenance_cost / acquisition_cost) if acquisition_cost else 0
    r2_trig = r2_ratio > 0.50
    if r2_trig:
        score += 25
        triggered.append(2)
    rule_details.append({
        "rule_number": 2,
        "rule_name": "Cumulative maintenance exceeds 50% of acquisition cost",
        "triggered": r2_trig,
        "points": 25,
        "detail": f"Cum. maintenance {cumulative_maintenance_cost:.0f} / Acquisition {acquisition_cost:.0f} = "
                  f"{r2_ratio*100:.1f}% (threshold 50%)",
    })

    # Rule 3: remaining_life ≤ 5 yrs AND repair > 30% replacement → +20
    r3_trig = (remaining_life_years <= 5) and ((repair_cost / replacement_value) > 0.30 if replacement_value else False)
    if r3_trig:
        score += 20
        triggered.append(3)
    rule_details.append({
        "rule_number": 3,
        "rule_name": "Late-life with significant repair (≤5yr life AND repair >30% replacement)",
        "triggered": r3_trig,
        "points": 20,
        "detail": f"Remaining life {remaining_life_years:.1f}y, repair ratio {r1_ratio*100:.1f}%",
    })

    # Rule 4: recurrence ≥ 4 AND downtime > 30 days → +15
    r4_trig = (recurrence_count >= 4) and (downtime_days > 30)
    if r4_trig:
        score += 15
        triggered.append(4)
    rule_details.append({
        "rule_number": 4,
        "rule_name": "High recurrence with extended downtime (≥4 recurrences AND >30 days)",
        "triggered": r4_trig,
        "points": 15,
        "detail": f"{recurrence_count} recurrences, {downtime_days} downtime days",
    })

    # Rule 5: part obsolete → +5
    # If not explicitly passed, check if vehicle has any HIGH-risk obsolescence on its parts type
    r5_trig = obsolete_parts
    if not r5_trig:
        # Heuristic: any HIGH-risk obsolescence in catalogue applicable to this vehicle type
        from models import PartMaster
        obs_count = (
            db.query(ObsolescenceRisk)
            .join(PartMaster, ObsolescenceRisk.part_id == PartMaster.id)
            .filter(
                ObsolescenceRisk.risk_level == "HIGH",
                PartMaster.vehicle_type == vehicle.type,
            )
            .count()
        )
        r5_trig = obs_count > 0
    if r5_trig:
        score += 5
        triggered.append(5)
    rule_details.append({
        "rule_number": 5,
        "rule_name": "Critical parts obsolete (no stock, no supplier)",
        "triggered": r5_trig,
        "points": 5,
        "detail": "Obsolete parts confirmed" if r5_trig else "No obsolescence flagged",
    })

    # Recommendation
    if score >= 70:
        recommendation = "WRITE_OFF"
    elif score >= 50:
        recommendation = "FINANCE_REVIEW"
    elif score >= 30:
        recommendation = "ENGINEERING_REVIEW"
    else:
        recommendation = "CONTINUE_REPAIR"

    cost_comparison = {
        "repair_cost": round(repair_cost, 2),
        "replacement_value": round(replacement_value, 2),
        "cumulative_maintenance": round(cumulative_maintenance_cost, 2),
        "acquisition_cost": round(acquisition_cost, 2),
        "repair_vs_replacement_pct": round(r1_ratio * 100, 1),
        "maintenance_vs_acquisition_pct": round(r2_ratio * 100, 1),
    }

    lifecycle = {
        "age_years": dep["age_years"],
        "useful_life_years": vehicle.useful_life_years,
        "remaining_life_years": round(remaining_life_years, 2),
        "accumulated_depreciation": dep["accumulated_depreciation"],
        "nbv": dep["nbv"],
        "pct_depreciated": dep["pct_depreciated"],
    }

    inputs = {
        "vehicle_id": vehicle_id,
        "wo_id": wo_id,
        "repair_cost": repair_cost,
        "replacement_value": replacement_value,
        "cumulative_maintenance_cost": cumulative_maintenance_cost,
        "acquisition_cost": acquisition_cost,
        "remaining_life_years": remaining_life_years,
        "recurrence_count": recurrence_count,
        "downtime_days": downtime_days,
        "obsolete_parts": r5_trig,
    }

    return {
        "vehicle_id": vehicle_id,
        "ber_score": round(score, 2),
        "recommendation": recommendation,
        "triggered_rules": triggered,
        "rule_details": rule_details,
        "cost_comparison": cost_comparison,
        "lifecycle_summary": lifecycle,
        "inputs": inputs,
    }
