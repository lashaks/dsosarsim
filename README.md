# DSOS — Defense Sustainment Operating System

Saudi-made military sustainment platform for the Saudi Armed Forces, SANG, Ministry of Interior, and GCC defense forces.

## Architecture

- **Backend** — FastAPI + SQLAlchemy + SQLite, deployed to Railway
- **Frontend** — React + Vite + TailwindCSS, deployed to Vercel

## Engines

1. **Readiness Engine** — weighted formula `Σ(weight × capability) / Σ(weight) × 100` (HIGH=3, MEDIUM=2, LOW=1; FMC=1.0, PMC=0.5, NMC=0.0)
2. **Procurement Control** — 15-point necessity check before any purchase is approved
3. **BER Engine** — 5-rule scoring (0–100) for Beyond-Economical-Repair decisions

## Local Development

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_data.py
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and sign in with `admin / dsos2026`.

## Demo Users

All users use password `dsos2026`:

- `admin` — System Administrator
- `commander` — Brig. Gen. Khalid Al-Otaibi
- `technician` — Sgt. Faisal Al-Harbi
- `storekeeper` — WO. Saad Al-Qahtani
- `procurement` — Maj. Yousef Al-Ghamdi

## Deployment Environment Variables

### Backend (Railway)

- `DSOS_SECRET` — JWT signing secret (required in production)
- `DSOS_CORS_ORIGINS` — comma-separated list of additional allowed origins
- `DSOS_CORS_ALLOW_ALL` — set to `1` to allow all origins (demo only)
- `DSOS_DATABASE_URL` — defaults to `sqlite:///./dsos.db`

### Frontend (Vercel)

- `VITE_API_BASE` — backend URL (e.g. `https://dsos-backend.up.railway.app`)

## Compliance

IPSAS account codes (1310, 2110, 6200, etc.) shown throughout are **illustrative**. Real-world deployment requires sign-off by a qualified public-sector accounting authority before live financial posting.
