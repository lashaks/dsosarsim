"""Seed DSOS with realistic Saudi military data.

Run:  python seed_data.py    (wipes & reseeds)
"""
import os
import sys
import random
from datetime import datetime, timedelta

# Make sure local imports resolve when running directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from models import (
    User, Vehicle, WorkOrder, WOPart, WOActivity, PartMaster, Warehouse, Bin,
    Inventory, RFQ, RFQLine, PurchaseOrder, POLine, MaintenanceCost,
    BERReview, FRACAS, ObsolescenceRisk, IPSASEvent, AuditLog, ReadinessSnapshot,
    InventoryMovement,
)
from auth import hash_password
from services.readiness_service import CRITICALITY_WEIGHTS, CAPABILITY, compute_readiness
from services import ipsas_service


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed():
    print("→ Resetting database…")
    reset_db()
    db = SessionLocal()
    random.seed(42)

    # ── USERS ────────────────────────────────────────────────
    print("→ Seeding users…")
    users = [
        ("admin",      "admin@dsos.sa",      "admin",                "Central Command",   "System Administrator"),
        ("commander",  "commander@dsos.sa",  "commander",            "Central Command",   "Brig. Gen. Khalid Al-Otaibi"),
        ("technician", "tech@dsos.sa",       "technician",           "Eastern Province",  "Sgt. Faisal Al-Harbi"),
        ("storekeeper","store@dsos.sa",      "storekeeper",          "Central Command",   "WO. Saad Al-Qahtani"),
        ("procurement","proc@dsos.sa",       "procurement_officer",  "Western Province",  "Maj. Yousef Al-Ghamdi"),
    ]
    for u, e, r, s, fn in users:
        db.add(User(username=u, email=e, hashed_password=hash_password("dsos2026"),
                    role=r, sector=s, full_name=fn))
    db.commit()

    # ── WAREHOUSES + BINS ────────────────────────────────────
    print("→ Seeding warehouses…")
    warehouses = [
        Warehouse(code="CD-01", name="Central Depot Riyadh",   sector="Central Command",  location="Riyadh",   manager="WO. Saad Al-Qahtani"),
        Warehouse(code="EF-01", name="Eastern Field Store",    sector="Eastern Province", location="Dhahran",  manager="Sgt. Mohammed Al-Dosari"),
        Warehouse(code="WF-01", name="Western Field Store",    sector="Western Province", location="Tabuk",    manager="WO. Bandar Al-Shehri"),
    ]
    for w in warehouses:
        db.add(w)
    db.commit()
    for w in warehouses:
        for code in ("A-01", "A-02", "B-01", "B-02"):
            db.add(Bin(warehouse_id=w.id, code=code, location=f"Row {code[0]}", capacity=500))
    db.commit()

    # ── PARTS ─────────────────────────────────────────────────
    print("→ Seeding parts…")
    parts_seed = [
        ("ENG-OIL-FILTER-MBT",  "5330-01-234-5678", "OEM-MBT-OF-001",  "Engine oil filter — MBT main propulsion",        "فلتر زيت محرك — دبابة قتال رئيسية",         "FILTERS",       "EA",  185.00, "MBT",     True,  21, 4,  "Saudi Defense Suppliers Co."),
        ("BRK-PAD-APC-FRONT",   "2530-01-456-7890", "OEM-APC-BP-002",  "Brake pad set — APC front axle",                 "مجموعة وسادات الفرامل — محور أمامي ناقلة جند", "BRAKES",        "SET", 2450.00, "APC",     True,  30, 2,  "Al-Faisaliah Auto Parts"),
        ("TRACK-LINK-MBT-A",    "2530-01-789-0123", "OEM-MBT-TL-003",  "Track link assembly — MBT (A-pattern)",          "وصلة جنزير — دبابة (نمط أ)",                 "TRACKS",        "EA",  3800.00, "MBT",     True,  45, 8,  None),
        ("FUEL-PUMP-IFV",       "2910-01-345-6789", "OEM-IFV-FP-004",  "High-pressure fuel pump — IFV",                  "مضخة وقود عالية الضغط — مركبة قتال مشاة",     "FUEL",          "EA",  6700.00, "IFV",     True,  60, 1,  "MENA Diesel Systems"),
        ("HYD-SEAL-SPH-KIT",    "5330-01-901-2345", "OEM-SPH-HS-005",  "Hydraulic seal kit — SPH turret traverse",       "طقم حشيات هيدروليكية — مدفع ذاتي الحركة",   "HYDRAULICS",    "KIT", 920.00, "SPH",     False, 25, 1,  "Saudi Defense Suppliers Co."),
        ("ALT-24V-SUPPORT",     "2920-01-234-5670", "OEM-SUP-AL-006",  "24V alternator — support vehicle",                "مولد كهربائي 24 فولت — مركبة دعم",            "ELECTRICAL",    "EA",  1850.00, "SUPPORT", False, 18, 2,  "Al-Faisaliah Auto Parts"),
        ("COOLANT-HOSE-MBT",    "4720-01-567-8901", "OEM-MBT-CH-007",  "Reinforced coolant hose — MBT engine bay",        "خرطوم تبريد مقوى — حجرة محرك دبابة",         "COOLING",       "EA",  340.00, "MBT",     False, 15, 5,  None),
        ("TRANS-FLUID-50L",     "9150-01-678-9012", "OEM-LUB-TF-008",  "Transmission fluid — 50L drum (mil-spec)",       "زيت ناقل حركة — برميل 50 لتر (مواصفات عسكرية)", "LUBRICANTS",  "DRUM", 1100.00, None,      False, 20, 4,  "MENA Diesel Systems"),
        ("FIRE-EXT-UNIT-AFV",   "4210-01-789-0124", "OEM-AFV-FE-009",  "Automatic fire-suppression unit — AFV crew cab",  "وحدة إطفاء آلية — كابينة طاقم مركبة مدرعة",   "SAFETY",        "EA",  4200.00, None,      True,  40, 1,  "Saudi Defense Suppliers Co."),
        ("COMMS-BATT-VHF",      "6140-01-890-1235", "OEM-COMM-BT-010", "VHF tactical radio battery pack — 14.4V",         "بطارية جهاز اتصال تكتيكي VHF — 14.4 فولت",   "COMMUNICATIONS","EA",  680.00, None,      True,  28, 6,  "Al-Riyadh Electronics"),
    ]
    parts = []
    for pn, nsn, oem, en, ar, cat, uom, cost, vtype, crit, lead, moq, supplier in parts_seed:
        p = PartMaster(
            part_number=pn, nsn=nsn, oem_number=oem,
            description_en=en, description_ar=ar, category=cat,
            unit_of_measure=uom, unit_cost=cost, vehicle_type=vtype,
            is_critical=crit, lead_time_days=lead,
            minimum_order_qty=moq, preferred_supplier=supplier,
        )
        db.add(p)
        parts.append(p)
    db.commit()

    # ── VEHICLES ──────────────────────────────────────────────
    print("→ Seeding vehicles (targeting readiness 52–62%)…")
    # 15 vehicles, mix of FMC/PMC/NMC to land readiness in 52–62%
    vehicles_seed = [
        # registration,        name,                     type,      sector,              brigade,                   criticality, op_status, acq_cost,    acq_yrs_ago, life
        ("MBT-1A-001",  "Al-Faris MBT #001",       "MBT",     "Central Command",   "1st Armored Brigade",     "HIGH",   "FMC", 28_000_000,  6,  25),
        ("MBT-1A-002",  "Al-Faris MBT #002",       "MBT",     "Central Command",   "1st Armored Brigade",     "HIGH",   "NMC", 28_000_000,  7,  25),
        ("MBT-1A-003",  "Al-Faris MBT #003",       "MBT",     "Eastern Province",  "4th Armored Brigade",     "HIGH",   "PMC", 28_000_000,  5,  25),
        ("MBT-1A-004",  "Al-Faris MBT #004",       "MBT",     "Eastern Province",  "4th Armored Brigade",     "HIGH",   "PMC", 28_000_000,  4,  25),
        ("MBT-1A-005",  "Al-Faris MBT #005",       "MBT",     "Western Province",  "20th Mechanized Brigade", "HIGH",   "NMC", 28_000_000, 14,  25),

        ("IFV-2B-101",  "Al-Asad IFV #101",        "IFV",     "Central Command",   "1st Armored Brigade",     "HIGH",   "FMC", 12_500_000,  3,  20),
        ("IFV-2B-102",  "Al-Asad IFV #102",        "IFV",     "Eastern Province",  "4th Armored Brigade",     "MEDIUM", "PMC", 12_500_000,  5,  20),
        ("IFV-2B-103",  "Al-Asad IFV #103",        "IFV",     "Western Province",  "20th Mechanized Brigade", "MEDIUM", "FMC", 12_500_000,  2,  20),

        ("APC-3C-201",  "Al-Saqr APC #201",        "APC",     "Central Command",   "5th Infantry Brigade",    "MEDIUM", "FMC", 4_200_000,   4,  18),
        ("APC-3C-202",  "Al-Saqr APC #202",        "APC",     "Eastern Province",  "8th Infantry Brigade",    "MEDIUM", "NMC", 4_200_000,  10,  18),
        ("APC-3C-203",  "Al-Saqr APC #203",        "APC",     "Western Province",  "20th Mechanized Brigade", "MEDIUM", "FMC", 4_200_000,   2,  18),

        ("SPH-4D-301",  "Al-Ra'd SPH #301",        "SPH",     "Central Command",   "Artillery Regiment",      "HIGH",   "PMC", 18_000_000,  8,  30),
        ("SPH-4D-302",  "Al-Ra'd SPH #302",        "SPH",     "Eastern Province",  "Artillery Regiment",      "HIGH",   "PMC", 18_000_000,  3,  30),

        ("SUP-5E-401",  "Al-Mas'ud Logistics Truck", "SUPPORT", "Central Command", "Logistics Battalion",     "LOW",    "FMC",   650_000,   2,  15),
        ("SUP-5E-402",  "Al-Mas'ud Recovery Vehicle", "SUPPORT","Eastern Province","Logistics Battalion",     "LOW",    "PMC", 1_400_000,   6,  15),
    ]
    vehicles: list[Vehicle] = []
    today = datetime.utcnow()
    for reg, name, typ, sector, brigade, crit, status, cost, yrs_ago, life in vehicles_seed:
        v = Vehicle(
            registration=reg, name=name, type=typ, sector=sector, brigade=brigade,
            criticality=crit, op_status=status, acquisition_cost=float(cost),
            acquisition_date=today - timedelta(days=int(yrs_ago * 365.25)),
            useful_life_years=life,
        )
        db.add(v)
        vehicles.append(v)
    db.commit()

    # Validate the target readiness band — log it, but don't fail
    snap = compute_readiness(db)
    print(f"   Fleet readiness on seed = {snap['readiness_pct']:.1f}% "
          f"(target 52–62%)")

    # ── INVENTORY ─────────────────────────────────────────────
    print("→ Seeding inventory…")
    for w in warehouses:
        for p in parts:
            # 2–3 conditions per part per warehouse
            mix = [("SERVICEABLE", random.randint(8, 40))]
            if random.random() < 0.7:
                mix.append(("REPAIRABLE", random.randint(1, 8)))
            if random.random() < 0.3:
                mix.append(("UNSERVICEABLE", random.randint(1, 5)))
            for cond, qty in mix:
                # Make some serviceable lines hit reorder
                reorder = max(5, qty // 2)
                if cond == "SERVICEABLE" and random.random() < 0.25:
                    qty = max(1, reorder - random.randint(1, 4))
                db.add(Inventory(
                    part_id=p.id, warehouse_id=w.id, bin_id=None,
                    quantity_on_hand=float(qty), quantity_reserved=0.0,
                    reorder_point=float(reorder), max_stock=float(qty * 3 if qty else 30),
                    condition=cond,
                    last_counted_at=today - timedelta(days=random.randint(7, 60)),
                ))
    db.commit()

    # Initial inventory value journal (post a single GR for the seeded stock to back the IPSAS summary)
    for w in warehouses:
        wh_value = 0.0
        for inv in db.query(Inventory).filter(Inventory.warehouse_id == w.id,
                                              Inventory.condition == "SERVICEABLE").all():
            p = db.get(PartMaster, inv.part_id)
            wh_value += p.unit_cost * inv.quantity_on_hand
        if wh_value > 0:
            ipsas_service.post_receipt(
                db, amount=round(wh_value, 2),
                reference_id=f"OPENING-BAL-{w.code}", posted_by="system",
            )
    db.commit()

    # ── WORK ORDERS ───────────────────────────────────────────
    print("→ Seeding work orders…")
    wo_specs = [
        # (vehicle_idx, title, status, priority, age_days)
        (1,  "Replace damaged engine oil filter",       "WAITING_PARTS", "HIGH",     12),
        (4,  "Engine warning lights diagnostic",        "OPEN",          "CRITICAL", 3),
        (2,  "Brake pad replacement front axle",        "IN_PROGRESS",   "HIGH",     8),
        (9,  "Hydraulic seal leak repair turret",       "WAITING_PARTS", "MEDIUM",   25),
        (6,  "Fuel pump pressure test failure",         "IN_PROGRESS",   "CRITICAL", 5),
        (11, "Coolant hose replacement",                "CLOSED",        "MEDIUM",   45),
        (0,  "Scheduled 1000-hour service",             "CLOSED",        "LOW",      90),
        (14, "Recovery winch hydraulic service",        "OPEN",          "MEDIUM",   2),
        (7,  "VHF radio battery pack replacement",      "CLOSED",        "LOW",      30),
        (12, "Turret traverse oil top-up + seal check", "IN_PROGRESS",   "MEDIUM",   6),
    ]
    wos: list[WorkOrder] = []
    for i, (vi, title, st, pr, age) in enumerate(wo_specs, start=1):
        v = vehicles[vi]
        created = today - timedelta(days=age)
        wo = WorkOrder(
            wo_number=f"WO-2026-{i:04d}",
            vehicle_id=v.id, title=title,
            description=f"Detailed task brief for {title} on {v.registration}.",
            status=st, priority=pr, sector=v.sector,
            assigned_to=random.choice(["technician", "Sgt. Al-Rashid", "WO. Al-Otaibi"]),
            created_at=created,
            closed_at=(today - timedelta(days=age // 2)) if st == "CLOSED" else None,
        )
        db.add(wo)
        db.flush()
        # Add 1-2 parts
        chosen_parts = random.sample(parts, k=random.randint(1, 2))
        for cp in chosen_parts:
            qty_req = random.randint(1, 4)
            issued = qty_req if st == "CLOSED" else (qty_req if st == "IN_PROGRESS" and random.random() > 0.4 else 0)
            db.add(WOPart(
                wo_id=wo.id, part_id=cp.id,
                quantity_required=qty_req, quantity_issued=issued,
            ))
        db.add(WOActivity(wo_id=wo.id, activity="Work order created", actor="commander",
                          created_at=created))
        if st in ("IN_PROGRESS", "WAITING_PARTS", "CLOSED"):
            db.add(WOActivity(
                wo_id=wo.id, activity=f"Status → {st}", actor="technician",
                created_at=created + timedelta(days=1),
            ))
        if st == "CLOSED":
            db.add(WOActivity(
                wo_id=wo.id, activity="Work order closed", actor="commander",
                created_at=wo.closed_at,
            ))
        wos.append(wo)
    db.commit()

    # ── RFQ + PO ──────────────────────────────────────────────
    print("→ Seeding RFQs and POs…")
    rfq_specs = [
        (parts[0], warehouses[0], 20, "SENT"),
        (parts[2], warehouses[1], 8, "RECEIVED"),
        (parts[3], warehouses[0], 4, "AWARDED"),
        (parts[6], warehouses[2], 30, "SENT"),
    ]
    rfqs: list[RFQ] = []
    for i, (p, w, qty, st) in enumerate(rfq_specs, start=1):
        r = RFQ(
            rfq_number=f"RFQ-2026-{i:04d}", part_id=p.id, warehouse_id=w.id,
            quantity=qty, status=st, requested_by="procurement",
            created_at=today - timedelta(days=random.randint(5, 40)),
        )
        db.add(r)
        db.flush()
        if st in ("RECEIVED", "AWARDED"):
            suppliers = [("Saudi Defense Suppliers Co.", 1.0), ("Al-Faisaliah Auto Parts", 1.08), ("MENA Diesel Systems", 0.95)]
            for sup, mul in suppliers:
                line_total = round(p.unit_cost * qty * mul, 2)
                db.add(RFQLine(
                    rfq_id=r.id, supplier=sup,
                    unit_price=round(p.unit_cost * mul, 2),
                    total_price=line_total, lead_days=random.randint(14, 60),
                    is_awarded=(st == "AWARDED" and sup == "MENA Diesel Systems"),
                ))
        if st == "AWARDED":
            r.awarded_at = today - timedelta(days=2)
        rfqs.append(r)
    db.commit()

    # POs
    po1 = PurchaseOrder(
        po_number="PO-2026-0001", rfq_id=rfqs[2].id,
        supplier="MENA Diesel Systems",
        total_amount=round(parts[3].unit_cost * 4 * 0.95, 2),
        status="RECEIVED", expected_delivery=today - timedelta(days=5),
        created_at=today - timedelta(days=20),
        received_at=today - timedelta(days=4),
    )
    po2 = PurchaseOrder(
        po_number="PO-2026-0002", rfq_id=None,
        supplier="Al-Riyadh Electronics",
        total_amount=round(parts[9].unit_cost * 25, 2),
        status="SENT", expected_delivery=today + timedelta(days=10),
        created_at=today - timedelta(days=8),
    )
    db.add(po1)
    db.add(po2)
    db.flush()
    db.add(POLine(po_id=po1.id, part_id=parts[3].id, quantity_ordered=4,
                  quantity_received=4, unit_price=round(parts[3].unit_cost * 0.95, 2),
                  total_price=po1.total_amount))
    db.add(POLine(po_id=po2.id, part_id=parts[9].id, quantity_ordered=25,
                  quantity_received=0, unit_price=parts[9].unit_cost,
                  total_price=po2.total_amount))
    db.commit()

    # GR journal for received PO
    ipsas_service.post_receipt(db, amount=po1.total_amount, reference_id=po1.po_number, posted_by="procurement")
    db.commit()

    # ── MAINTENANCE COSTS (last 6 months) ─────────────────────
    print("→ Seeding maintenance costs…")
    for v in vehicles:
        if v.criticality == "LOW":
            n_costs = random.randint(1, 3)
        else:
            n_costs = random.randint(3, 8)
        for _ in range(n_costs):
            db.add(MaintenanceCost(
                vehicle_id=v.id, wo_id=None,
                cost_type=random.choice(["LABOR", "PARTS", "EXTERNAL", "OTHER"]),
                amount=round(random.uniform(2000, 65000), 2),
                description="Routine sustainment cost",
                date=today - timedelta(days=random.randint(1, 180)),
            ))
    db.commit()

    # ── BER REVIEWS ───────────────────────────────────────────
    print("→ Seeding BER reviews…")
    # One WRITE_OFF, two CONTINUE_REPAIR
    from services.ber_service import analyze as ber_analyze

    # write-off candidate — old MBT 005 (14 years old, NMC)
    v_writeoff = vehicles[4]
    res1 = ber_analyze(
        db, vehicle_id=v_writeoff.id, repair_cost=22_000_000,
        replacement_value=30_000_000, downtime_days=42, obsolete_parts=True,
        recurrence_count=6,
    )
    db.add(BERReview(
        vehicle_id=v_writeoff.id, wo_id=None,
        repair_cost=res1["inputs"]["repair_cost"],
        replacement_value=res1["inputs"]["replacement_value"],
        cumulative_maintenance_cost=res1["inputs"]["cumulative_maintenance_cost"],
        acquisition_cost=res1["inputs"]["acquisition_cost"],
        remaining_life_years=res1["inputs"]["remaining_life_years"],
        recurrence_count=res1["inputs"]["recurrence_count"],
        downtime_days=res1["inputs"]["downtime_days"],
        obsolete_parts=res1["inputs"]["obsolete_parts"],
        ber_score=res1["ber_score"], recommendation=res1["recommendation"],
        triggered_rules=res1["triggered_rules"], rule_details=res1["rule_details"],
        reviewed_by="commander", reviewed_at=today - timedelta(days=3),
    ))

    # continue-repair — newer IFV
    v_cont = vehicles[7]
    res2 = ber_analyze(
        db, vehicle_id=v_cont.id, repair_cost=180_000,
        replacement_value=14_000_000, downtime_days=8, recurrence_count=1,
    )
    db.add(BERReview(
        vehicle_id=v_cont.id, wo_id=None,
        repair_cost=res2["inputs"]["repair_cost"],
        replacement_value=res2["inputs"]["replacement_value"],
        cumulative_maintenance_cost=res2["inputs"]["cumulative_maintenance_cost"],
        acquisition_cost=res2["inputs"]["acquisition_cost"],
        remaining_life_years=res2["inputs"]["remaining_life_years"],
        recurrence_count=res2["inputs"]["recurrence_count"],
        downtime_days=res2["inputs"]["downtime_days"],
        obsolete_parts=res2["inputs"]["obsolete_parts"],
        ber_score=res2["ber_score"], recommendation=res2["recommendation"],
        triggered_rules=res2["triggered_rules"], rule_details=res2["rule_details"],
        reviewed_by="commander", reviewed_at=today - timedelta(days=10),
    ))

    # continue-repair — APC
    v_cont2 = vehicles[8]
    res3 = ber_analyze(
        db, vehicle_id=v_cont2.id, repair_cost=85_000,
        replacement_value=5_200_000, downtime_days=4, recurrence_count=2,
    )
    db.add(BERReview(
        vehicle_id=v_cont2.id, wo_id=None,
        repair_cost=res3["inputs"]["repair_cost"],
        replacement_value=res3["inputs"]["replacement_value"],
        cumulative_maintenance_cost=res3["inputs"]["cumulative_maintenance_cost"],
        acquisition_cost=res3["inputs"]["acquisition_cost"],
        remaining_life_years=res3["inputs"]["remaining_life_years"],
        recurrence_count=res3["inputs"]["recurrence_count"],
        downtime_days=res3["inputs"]["downtime_days"],
        obsolete_parts=res3["inputs"]["obsolete_parts"],
        ber_score=res3["ber_score"], recommendation=res3["recommendation"],
        triggered_rules=res3["triggered_rules"], rule_details=res3["rule_details"],
        reviewed_by="commander", reviewed_at=today - timedelta(days=18),
    ))
    db.commit()

    # ── FRACAS ────────────────────────────────────────────────
    print("→ Seeding FRACAS entries…")
    fracas_specs = [
        (vehicles[2].id,  "Engine overheat — coolant loop",   "Hose hairline crack",     "Reduced mission window",   "MAJOR",    "Replace coolant hose + pressure test", 4),
        (vehicles[1].id,  "Fuel pump pressure drop",          "Pump diaphragm wear",     "Engine fails to start",    "CRITICAL", "Replace pump unit + flush lines",        3),
        (vehicles[6].id,  "Brake pad rapid wear",             "Heavy desert convoy use", "Stopping distance ↑",       "MAJOR",    "Replace pad set + inspect rotors",       5),
        (vehicles[11].id, "Turret traverse hesitation",       "Hydraulic seal fatigue",  "Targeting cycle ↑ by 4s",   "MAJOR",    "Replace seal kit + bleed system",        2),
        (vehicles[9].id,  "VHF radio drop-out at range",      "Battery pack degradation","Loss of comms ≥5km",        "CRITICAL", "Swap battery, recalibrate squelch",      6),
    ]
    for vid, mode, cause, eff, sev, ca, rec in fracas_specs:
        db.add(FRACAS(
            vehicle_id=vid, failure_mode=mode, failure_cause=cause,
            failure_effect=eff, severity=sev, corrective_action=ca,
            recurrence_count=rec,
            first_occurrence=today - timedelta(days=random.randint(120, 365)),
            last_occurrence=today - timedelta(days=random.randint(1, 30)),
        ))
    db.commit()

    # ── OBSOLESCENCE ──────────────────────────────────────────
    print("→ Seeding obsolescence flags…")
    db.add(ObsolescenceRisk(
        part_id=parts[2].id, risk_level="HIGH",
        last_manufacturer_date=today - timedelta(days=2*365),
        estimated_eol=today + timedelta(days=180),
        alternative_part_id=parts[0].id,
        recommendation="Migrate to compatible track link pattern B by FY 2027.",
    ))
    db.add(ObsolescenceRisk(
        part_id=parts[8].id, risk_level="MEDIUM",
        last_manufacturer_date=today - timedelta(days=365),
        estimated_eol=today + timedelta(days=540),
        recommendation="Monitor supply; identify alternative supplier.",
    ))
    db.add(ObsolescenceRisk(
        part_id=parts[6].id, risk_level="LOW",
        recommendation="No action — multiple suppliers.",
    ))
    db.commit()

    # ── READINESS SNAPSHOTS (30 days history) ─────────────────
    print("→ Seeding 30-day readiness history…")
    today_snap = compute_readiness(db)
    base_pct = today_snap["readiness_pct"]
    fmc = today_snap["fmc_count"]
    pmc = today_snap["pmc_count"]
    nmc = today_snap["nmc_count"]
    total = today_snap["total_vehicles"]
    for d in range(30, -1, -1):
        # Walk the score with a small random delta around base
        delta = random.uniform(-4, 4)
        pct = max(min(base_pct + delta, 99.5), 5.0)
        # Distribute FMC/PMC/NMC roughly proportionate
        f = max(0, fmc + random.randint(-2, 2))
        n = max(0, nmc + random.randint(-2, 2))
        p_ = max(0, total - f - n)
        db.add(ReadinessSnapshot(
            snapshot_date=today - timedelta(days=d, hours=random.randint(0, 5)),
            scope="FLEET", scope_value=None,
            readiness_pct=round(pct, 2),
            total_vehicles=total, fmc_count=f, pmc_count=p_, nmc_count=n,
        ))
    # Final entry is the real today value
    db.add(ReadinessSnapshot(
        snapshot_date=today, scope="FLEET", scope_value=None,
        readiness_pct=base_pct, total_vehicles=total,
        fmc_count=fmc, pmc_count=pmc, nmc_count=nmc,
    ))
    db.commit()

    # ── Final summary ─────────────────────────────────────────
    final = compute_readiness(db)
    print()
    print("════════════════════════════════════════")
    print(f" DSOS seeded.")
    print(f"  Fleet readiness:  {final['readiness_pct']:.1f}%   (target 52–62%)")
    print(f"  Vehicles:         {final['total_vehicles']}  (FMC {final['fmc_count']}  PMC {final['pmc_count']}  NMC {final['nmc_count']})")
    print(f"  Critical NMC:     {len(final['critical_nmc_list'])}")
    print(f"  Login: admin / dsos2026   (other users use same password)")
    print("════════════════════════════════════════")
    db.close()


if __name__ == "__main__":
    seed()
