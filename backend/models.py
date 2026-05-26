from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
)
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False)  # admin/commander/technician/storekeeper/procurement_officer
    sector = Column(String(64), nullable=True)
    full_name = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True)
    registration = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    type = Column(String(64), nullable=False)  # MBT/APC/IFV/SPH/SUPPORT
    sector = Column(String(64), nullable=False)
    brigade = Column(String(64), nullable=True)
    criticality = Column(String(16), nullable=False, default="MEDIUM")  # HIGH/MEDIUM/LOW
    op_status = Column(String(8), nullable=False, default="FMC")  # FMC/PMC/NMC
    acquisition_cost = Column(Float, nullable=False, default=0.0)
    acquisition_date = Column(DateTime, nullable=False, default=utcnow)
    useful_life_years = Column(Integer, nullable=False, default=20)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    work_orders = relationship("WorkOrder", back_populates="vehicle")
    maintenance_costs = relationship("MaintenanceCost", back_populates="vehicle")
    ber_reviews = relationship("BERReview", back_populates="vehicle")
    fracas_entries = relationship("FRACAS", back_populates="vehicle")


class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True)
    wo_number = Column(String(32), unique=True, nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="OPEN")  # OPEN/IN_PROGRESS/WAITING_PARTS/CLOSED
    priority = Column(String(16), nullable=False, default="MEDIUM")  # CRITICAL/HIGH/MEDIUM/LOW
    sector = Column(String(64), nullable=True)
    assigned_to = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)

    vehicle = relationship("Vehicle", back_populates="work_orders")
    parts = relationship("WOPart", back_populates="work_order", cascade="all, delete-orphan")
    activity = relationship("WOActivity", back_populates="work_order", cascade="all, delete-orphan")


class WOPart(Base):
    __tablename__ = "wo_parts"
    id = Column(Integer, primary_key=True)
    wo_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    part_id = Column(Integer, ForeignKey("part_master.id"), nullable=False)
    quantity_required = Column(Float, nullable=False)
    quantity_issued = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)

    work_order = relationship("WorkOrder", back_populates="parts")
    part = relationship("PartMaster")


class WOActivity(Base):
    __tablename__ = "wo_activity"
    id = Column(Integer, primary_key=True)
    wo_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    activity = Column(String(255), nullable=False)
    actor = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    work_order = relationship("WorkOrder", back_populates="activity")


class PartMaster(Base):
    __tablename__ = "part_master"
    id = Column(Integer, primary_key=True)
    part_number = Column(String(64), unique=True, nullable=False, index=True)
    nsn = Column(String(32), nullable=True, index=True)
    oem_number = Column(String(64), nullable=True)
    description_en = Column(String(255), nullable=False)
    description_ar = Column(String(255), nullable=True)
    category = Column(String(64), nullable=True)
    unit_of_measure = Column(String(16), nullable=False, default="EA")
    unit_cost = Column(Float, nullable=False, default=0.0)
    vehicle_type = Column(String(64), nullable=True)
    is_critical = Column(Boolean, nullable=False, default=False)
    lead_time_days = Column(Integer, nullable=False, default=30)
    minimum_order_qty = Column(Integer, nullable=False, default=1)
    preferred_supplier = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True)
    code = Column(String(16), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    sector = Column(String(64), nullable=False)
    location = Column(String(128), nullable=True)
    manager = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    bins = relationship("Bin", back_populates="warehouse", cascade="all, delete-orphan")


class Bin(Base):
    __tablename__ = "bins"
    id = Column(Integer, primary_key=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    code = Column(String(32), nullable=False)
    location = Column(String(64), nullable=True)
    capacity = Column(Integer, nullable=False, default=1000)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    warehouse = relationship("Warehouse", back_populates="bins")


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True)
    part_id = Column(Integer, ForeignKey("part_master.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    bin_id = Column(Integer, ForeignKey("bins.id"), nullable=True)
    quantity_on_hand = Column(Float, nullable=False, default=0.0)
    quantity_reserved = Column(Float, nullable=False, default=0.0)
    reorder_point = Column(Float, nullable=False, default=0.0)
    max_stock = Column(Float, nullable=False, default=0.0)
    condition = Column(String(16), nullable=False, default="SERVICEABLE")  # SERVICEABLE/REPAIRABLE/UNSERVICEABLE
    last_counted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    part = relationship("PartMaster")
    warehouse = relationship("Warehouse")
    bin = relationship("Bin")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id = Column(Integer, primary_key=True)
    part_id = Column(Integer, ForeignKey("part_master.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    movement_type = Column(String(32), nullable=False)  # RECEIPT/ISSUE/WRITE_DOWN/TRANSFER/ADJUSTMENT
    quantity = Column(Float, nullable=False)
    reference_type = Column(String(32), nullable=True)  # WO/PO/MANUAL
    reference_id = Column(String(64), nullable=True)
    journal_id = Column(Integer, ForeignKey("ipsas_events.id"), nullable=True)
    actor = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class RFQ(Base):
    __tablename__ = "rfqs"
    id = Column(Integer, primary_key=True)
    rfq_number = Column(String(32), unique=True, nullable=False, index=True)
    part_id = Column(Integer, ForeignKey("part_master.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    status = Column(String(16), nullable=False, default="DRAFT")  # DRAFT/SENT/RECEIVED/AWARDED/CANCELLED
    requested_by = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    awarded_at = Column(DateTime, nullable=True)

    part = relationship("PartMaster")
    warehouse = relationship("Warehouse")
    lines = relationship("RFQLine", back_populates="rfq", cascade="all, delete-orphan")


class RFQLine(Base):
    __tablename__ = "rfq_lines"
    id = Column(Integer, primary_key=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=False)
    supplier = Column(String(128), nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    lead_days = Column(Integer, nullable=False, default=30)
    notes = Column(Text, nullable=True)
    is_awarded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    rfq = relationship("RFQ", back_populates="lines")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True)
    po_number = Column(String(32), unique=True, nullable=False, index=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=True)
    supplier = Column(String(128), nullable=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    status = Column(String(16), nullable=False, default="DRAFT")  # DRAFT/APPROVED/SENT/RECEIVED/CLOSED
    expected_delivery = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    received_at = Column(DateTime, nullable=True)

    lines = relationship("POLine", back_populates="po", cascade="all, delete-orphan")
    rfq = relationship("RFQ")


class POLine(Base):
    __tablename__ = "po_lines"
    id = Column(Integer, primary_key=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    part_id = Column(Integer, ForeignKey("part_master.id"), nullable=False)
    quantity_ordered = Column(Float, nullable=False)
    quantity_received = Column(Float, nullable=False, default=0.0)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    po = relationship("PurchaseOrder", back_populates="lines")
    part = relationship("PartMaster")


class MaintenanceCost(Base):
    __tablename__ = "maintenance_costs"
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    wo_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    cost_type = Column(String(32), nullable=False)  # LABOR/PARTS/EXTERNAL/OTHER
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime, nullable=False, default=utcnow)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="maintenance_costs")


class BERReview(Base):
    __tablename__ = "ber_reviews"
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    wo_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    repair_cost = Column(Float, nullable=False)
    replacement_value = Column(Float, nullable=False)
    cumulative_maintenance_cost = Column(Float, nullable=False)
    acquisition_cost = Column(Float, nullable=False)
    remaining_life_years = Column(Float, nullable=False)
    recurrence_count = Column(Integer, nullable=False, default=0)
    downtime_days = Column(Integer, nullable=False, default=0)
    obsolete_parts = Column(Boolean, nullable=False, default=False)
    ber_score = Column(Float, nullable=False)
    recommendation = Column(String(32), nullable=False)  # WRITE_OFF/FINANCE_REVIEW/ENGINEERING_REVIEW/CONTINUE_REPAIR
    triggered_rules = Column(JSON, nullable=True)
    rule_details = Column(JSON, nullable=True)
    reviewed_by = Column(String(64), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="ber_reviews")


class FRACAS(Base):
    __tablename__ = "fracas"
    id = Column(Integer, primary_key=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    failure_mode = Column(String(255), nullable=False)
    failure_cause = Column(String(255), nullable=True)
    failure_effect = Column(String(255), nullable=True)
    severity = Column(String(16), nullable=False, default="MAJOR")  # CRITICAL/MAJOR/MINOR
    corrective_action = Column(Text, nullable=True)
    recurrence_count = Column(Integer, nullable=False, default=1)
    first_occurrence = Column(DateTime, nullable=False, default=utcnow)
    last_occurrence = Column(DateTime, nullable=False, default=utcnow)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="fracas_entries")


class ObsolescenceRisk(Base):
    __tablename__ = "obsolescence_risks"
    id = Column(Integer, primary_key=True)
    part_id = Column(Integer, ForeignKey("part_master.id"), nullable=False, unique=True)
    risk_level = Column(String(16), nullable=False, default="LOW")  # HIGH/MEDIUM/LOW
    last_manufacturer_date = Column(DateTime, nullable=True)
    estimated_eol = Column(DateTime, nullable=True)
    alternative_part_id = Column(Integer, ForeignKey("part_master.id"), nullable=True)
    recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    part = relationship("PartMaster", foreign_keys=[part_id])
    alternative_part = relationship("PartMaster", foreign_keys=[alternative_part_id])


class IPSASEvent(Base):
    __tablename__ = "ipsas_events"
    id = Column(Integer, primary_key=True)
    event_type = Column(String(32), nullable=False)  # GOODS_RECEIPT/ISSUE/WRITE_DOWN/DEPRECIATION/DISPOSAL
    reference_id = Column(String(64), nullable=True)
    reference_type = Column(String(32), nullable=True)
    description = Column(String(255), nullable=False)
    debit_account = Column(String(16), nullable=False)
    debit_account_name = Column(String(64), nullable=False)
    credit_account = Column(String(16), nullable=False)
    credit_account_name = Column(String(64), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(8), nullable=False, default="SAR")
    posted_at = Column(DateTime, default=utcnow, nullable=False)
    posted_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(64), nullable=True)
    action = Column(String(64), nullable=False)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(64), nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)


class ReadinessSnapshot(Base):
    __tablename__ = "readiness_snapshots"
    id = Column(Integer, primary_key=True)
    snapshot_date = Column(DateTime, nullable=False, index=True)
    scope = Column(String(32), nullable=False, default="FLEET")  # FLEET/SECTOR/BRIGADE/TYPE
    scope_value = Column(String(64), nullable=True)
    readiness_pct = Column(Float, nullable=False)
    total_vehicles = Column(Integer, nullable=False)
    fmc_count = Column(Integer, nullable=False)
    pmc_count = Column(Integer, nullable=False)
    nmc_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
