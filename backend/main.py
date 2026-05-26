import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, SessionLocal
from models import User
from routers import (
    auth, dashboard, vehicles, work_orders, inventory, warehouses,
    procurement, assets, ber, fracas, ipsas, reports, audit
)

# Create tables on startup (SQLite + first-run)
Base.metadata.create_all(bind=engine)


def _bootstrap_seed_if_empty():
    """If the DB has no users (i.e. fresh container start), run the seed."""
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            from seed_data import seed
            db.close()
            seed()
    finally:
        try:
            db.close()
        except Exception:
            pass


_bootstrap_seed_if_empty()

app = FastAPI(
    title="DSOS — Defense Sustainment Operating System",
    description="Saudi-made military sustainment platform for SAF, SANG, MoI, and GCC defense forces.",
    version="0.1.0",
)

# CORS — allow localhost dev + any configured production origins
_default_origins = [
    "http://localhost:5173", "http://127.0.0.1:5173",
]
_env_origins = [o.strip() for o in os.getenv("DSOS_CORS_ORIGINS", "").split(",") if o.strip()]
_allow_all = os.getenv("DSOS_CORS_ALLOW_ALL", "").lower() in ("1", "true", "yes")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else (_default_origins + _env_origins),
    allow_origin_regex=r"https://.*\.vercel\.app" if not _allow_all else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(vehicles.router)
app.include_router(work_orders.router)
app.include_router(inventory.router)
app.include_router(warehouses.router)
app.include_router(procurement.router)
app.include_router(assets.router)
app.include_router(ber.router)
app.include_router(fracas.router)
app.include_router(ipsas.router)
app.include_router(reports.router)
app.include_router(audit.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "DSOS"}
