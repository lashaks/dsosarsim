from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import BERReview, Vehicle
from schemas import BERAnalyzeRequest, BERAnalyzeResult, BERReviewOut, BERSaveRequest, BERRuleDetail
from auth import get_current_user
from services import ber_service, audit_service

router = APIRouter(prefix="/api/ber", tags=["ber"])


@router.post("/analyze", response_model=BERAnalyzeResult)
def analyze(body: BERAnalyzeRequest, db: Session = Depends(get_db), current=Depends(get_current_user)):
    try:
        result = ber_service.analyze(
            db, vehicle_id=body.vehicle_id, wo_id=body.wo_id,
            repair_cost=body.repair_cost, replacement_value=body.replacement_value,
            cumulative_maintenance_cost=body.cumulative_maintenance_cost,
            acquisition_cost=body.acquisition_cost,
            remaining_life_years=body.remaining_life_years,
            recurrence_count=body.recurrence_count,
            downtime_days=body.downtime_days,
            obsolete_parts=body.obsolete_parts,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return BERAnalyzeResult(
        vehicle_id=result["vehicle_id"], ber_score=result["ber_score"],
        recommendation=result["recommendation"],
        triggered_rules=result["triggered_rules"],
        rule_details=[BERRuleDetail(**r) for r in result["rule_details"]],
        cost_comparison=result["cost_comparison"],
        lifecycle_summary=result["lifecycle_summary"],
        inputs=result["inputs"],
    )


@router.post("/reviews", response_model=BERReviewOut, status_code=201)
def save_review(body: BERSaveRequest, db: Session = Depends(get_db), current=Depends(get_current_user)):
    result = ber_service.analyze(
        db, vehicle_id=body.vehicle_id, wo_id=body.wo_id,
        repair_cost=body.repair_cost, replacement_value=body.replacement_value,
        cumulative_maintenance_cost=body.cumulative_maintenance_cost,
        acquisition_cost=body.acquisition_cost,
        remaining_life_years=body.remaining_life_years,
        recurrence_count=body.recurrence_count,
        downtime_days=body.downtime_days,
        obsolete_parts=body.obsolete_parts,
    )
    review = BERReview(
        vehicle_id=body.vehicle_id, wo_id=body.wo_id,
        repair_cost=result["inputs"]["repair_cost"],
        replacement_value=result["inputs"]["replacement_value"],
        cumulative_maintenance_cost=result["inputs"]["cumulative_maintenance_cost"],
        acquisition_cost=result["inputs"]["acquisition_cost"],
        remaining_life_years=result["inputs"]["remaining_life_years"],
        recurrence_count=result["inputs"]["recurrence_count"],
        downtime_days=result["inputs"]["downtime_days"],
        obsolete_parts=result["inputs"]["obsolete_parts"],
        ber_score=result["ber_score"], recommendation=result["recommendation"],
        triggered_rules=result["triggered_rules"],
        rule_details=result["rule_details"],
        reviewed_by=current.username, reviewed_at=datetime.utcnow(),
    )
    db.add(review)
    db.flush()
    audit_service.log_action(
        db, action="SAVE_BER_REVIEW", entity_type="BERReview", entity_id=review.id,
        user_id=current.id, username=current.username,
        new_values={
            "vehicle_id": body.vehicle_id, "ber_score": review.ber_score,
            "recommendation": review.recommendation, "inputs": result["inputs"],
        },
    )
    db.commit()
    db.refresh(review)
    return _review_to_out(db, review)


@router.get("/reviews", response_model=List[BERReviewOut])
def list_reviews(db: Session = Depends(get_db), current=Depends(get_current_user)):
    rows = db.query(BERReview).order_by(BERReview.created_at.desc()).all()
    return [_review_to_out(db, r) for r in rows]


def _review_to_out(db: Session, r: BERReview) -> BERReviewOut:
    v = db.get(Vehicle, r.vehicle_id)
    return BERReviewOut(
        id=r.id, vehicle_id=r.vehicle_id,
        vehicle_name=v.name if v else None,
        vehicle_registration=v.registration if v else None,
        wo_id=r.wo_id, repair_cost=r.repair_cost,
        replacement_value=r.replacement_value,
        cumulative_maintenance_cost=r.cumulative_maintenance_cost,
        acquisition_cost=r.acquisition_cost,
        remaining_life_years=r.remaining_life_years,
        recurrence_count=r.recurrence_count, downtime_days=r.downtime_days,
        ber_score=r.ber_score, recommendation=r.recommendation,
        triggered_rules=r.triggered_rules, reviewed_by=r.reviewed_by,
        reviewed_at=r.reviewed_at, created_at=r.created_at,
    )
