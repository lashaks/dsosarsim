"""IPSAS 17 straight-line depreciation."""
from datetime import datetime
from models import Vehicle


def compute_depreciation(v: Vehicle, as_of: datetime = None) -> dict:
    as_of = as_of or datetime.utcnow()
    if not v.acquisition_cost or not v.useful_life_years:
        return {
            "annual_depreciation": 0.0,
            "accumulated_depreciation": 0.0,
            "nbv": v.acquisition_cost or 0.0,
            "age_years": 0.0,
            "pct_depreciated": 0.0,
            "remaining_life_years": float(v.useful_life_years or 0),
        }

    annual = v.acquisition_cost / v.useful_life_years
    age_years = (as_of - v.acquisition_date).days / 365.25
    age_years = max(age_years, 0.0)
    age_capped = min(age_years, v.useful_life_years)
    accumulated = annual * age_capped
    nbv = max(v.acquisition_cost - accumulated, 0.0)
    pct = (accumulated / v.acquisition_cost) * 100 if v.acquisition_cost else 0
    remaining = max(v.useful_life_years - age_years, 0.0)

    return {
        "annual_depreciation": round(annual, 2),
        "accumulated_depreciation": round(accumulated, 2),
        "nbv": round(nbv, 2),
        "age_years": round(age_years, 2),
        "pct_depreciated": round(pct, 2),
        "remaining_life_years": round(remaining, 2),
    }
