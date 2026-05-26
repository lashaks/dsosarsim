from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Vehicle
from auth import get_current_user
from services.depreciation_service import compute_depreciation

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("")
def list_assets(db: Session = Depends(get_db), current=Depends(get_current_user)):
    vehicles = db.query(Vehicle).order_by(Vehicle.acquisition_date).all()
    out = []
    for v in vehicles:
        d = compute_depreciation(v)
        out.append({
            "id": v.id, "registration": v.registration, "name": v.name,
            "type": v.type, "sector": v.sector,
            "acquisition_cost": v.acquisition_cost,
            "acquisition_date": v.acquisition_date,
            "useful_life_years": v.useful_life_years,
            **d,
        })
    return out


@router.get("/{vehicle_id}/depreciation")
def asset_depreciation(vehicle_id: int, db: Session = Depends(get_db), current=Depends(get_current_user)):
    v = db.get(Vehicle, vehicle_id)
    if not v:
        raise HTTPException(404, "Not found")
    return {"vehicle_id": v.id, **compute_depreciation(v)}
