"""ENGINE 1 — Weighted Readiness Formula.

readiness_pct = Σ(weight[criticality] × capability[op_status])
                ─────────────────────────────────────────────── × 100
                            Σ(weight[criticality])
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models import Vehicle


CRITICALITY_WEIGHTS = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
CAPABILITY = {"FMC": 1.0, "PMC": 0.5, "NMC": 0.0}


def compute_readiness(
    db: Session,
    sector: Optional[str] = None,
    brigade: Optional[str] = None,
    vehicle_type: Optional[str] = None,
) -> dict:
    q = db.query(Vehicle)
    scope = "FLEET"
    scope_value: Optional[str] = None
    if sector:
        q = q.filter(Vehicle.sector == sector)
        scope, scope_value = "SECTOR", sector
    if brigade:
        q = q.filter(Vehicle.brigade == brigade)
        scope, scope_value = "BRIGADE", brigade
    if vehicle_type:
        q = q.filter(Vehicle.type == vehicle_type)
        scope, scope_value = "TYPE", vehicle_type

    vehicles: List[Vehicle] = q.all()

    if not vehicles:
        return {
            "scope": scope,
            "scope_value": scope_value,
            "readiness_pct": 0.0,
            "total_vehicles": 0,
            "fmc_count": 0,
            "pmc_count": 0,
            "nmc_count": 0,
            "critical_nmc_list": [],
        }

    numerator = 0.0
    denominator = 0.0
    fmc = pmc = nmc = 0
    critical_nmc: List[Vehicle] = []

    for v in vehicles:
        weight = CRITICALITY_WEIGHTS.get(v.criticality, 1)
        capability = CAPABILITY.get(v.op_status, 0.0)
        numerator += weight * capability
        denominator += weight
        if v.op_status == "FMC":
            fmc += 1
        elif v.op_status == "PMC":
            pmc += 1
        else:
            nmc += 1
            if v.criticality == "HIGH":
                critical_nmc.append(v)

    readiness_pct = (numerator / denominator) * 100 if denominator > 0 else 0.0

    return {
        "scope": scope,
        "scope_value": scope_value,
        "readiness_pct": round(readiness_pct, 2),
        "total_vehicles": len(vehicles),
        "fmc_count": fmc,
        "pmc_count": pmc,
        "nmc_count": nmc,
        "critical_nmc_list": critical_nmc,
    }


def vehicle_readiness_contribution(v: Vehicle) -> float:
    weight = CRITICALITY_WEIGHTS.get(v.criticality, 1)
    capability = CAPABILITY.get(v.op_status, 0.0)
    return round(weight * capability, 2)
