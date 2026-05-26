from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ===================== AUTH =====================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str
    sector: Optional[str] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ===================== VEHICLE =====================

class VehicleBase(BaseModel):
    registration: str
    name: str
    type: str
    sector: str
    brigade: Optional[str] = None
    criticality: str = "MEDIUM"
    op_status: str = "FMC"
    acquisition_cost: float = 0.0
    acquisition_date: datetime
    useful_life_years: int = 20
    notes: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    sector: Optional[str] = None
    brigade: Optional[str] = None
    criticality: Optional[str] = None
    op_status: Optional[str] = None
    notes: Optional[str] = None


class VehicleOut(VehicleBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class VehicleDetail(VehicleOut):
    open_wo_count: int = 0
    total_maintenance_cost: float = 0.0
    accumulated_depreciation: float = 0.0
    nbv: float = 0.0
    pct_depreciated: float = 0.0


# ===================== READINESS =====================

class ReadinessSummary(BaseModel):
    scope: str = "FLEET"
    scope_value: Optional[str] = None
    readiness_pct: float
    total_vehicles: int
    fmc_count: int
    pmc_count: int
    nmc_count: int
    critical_nmc_list: List[VehicleOut] = []


class ReadinessTrendPoint(BaseModel):
    date: datetime
    readiness_pct: float
    fmc_count: int
    pmc_count: int
    nmc_count: int


# ===================== WORK ORDERS =====================

class WOPartBase(BaseModel):
    part_id: int
    quantity_required: float
    quantity_issued: float = 0.0
    notes: Optional[str] = None


class WOPartCreate(WOPartBase):
    pass


class WOPartOut(WOPartBase):
    id: int
    part_number: Optional[str] = None
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    unit_cost: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class WOActivityOut(BaseModel):
    id: int
    activity: str
    actor: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WorkOrderBase(BaseModel):
    vehicle_id: int
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    assigned_to: Optional[str] = None


class WorkOrderCreate(WorkOrderBase):
    parts: List[WOPartCreate] = []


class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None


class WorkOrderOut(WorkOrderBase):
    id: int
    wo_number: str
    status: str
    sector: Optional[str] = None
    created_at: datetime
    closed_at: Optional[datetime] = None
    vehicle_name: Optional[str] = None
    vehicle_registration: Optional[str] = None
    vehicle_type: Optional[str] = None
    age_days: int = 0
    parts_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class WorkOrderDetail(WorkOrderOut):
    parts: List[WOPartOut] = []
    activity: List[WOActivityOut] = []


class IssuePartsRequest(BaseModel):
    wo_part_id: int
    quantity: float
    warehouse_id: int


# ===================== PARTS =====================

class PartBase(BaseModel):
    part_number: str
    nsn: Optional[str] = None
    oem_number: Optional[str] = None
    description_en: str
    description_ar: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: str = "EA"
    unit_cost: float = 0.0
    vehicle_type: Optional[str] = None
    is_critical: bool = False
    lead_time_days: int = 30
    minimum_order_qty: int = 1
    preferred_supplier: Optional[str] = None


class PartCreate(PartBase):
    pass


class PartOut(PartBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ===================== WAREHOUSE =====================

class WarehouseBase(BaseModel):
    code: str
    name: str
    sector: str
    location: Optional[str] = None
    manager: Optional[str] = None


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseOut(WarehouseBase):
    id: int
    created_at: datetime
    total_skus: int = 0
    total_value: float = 0.0
    serviceable_pct: float = 0.0
    model_config = ConfigDict(from_attributes=True)


class BinBase(BaseModel):
    warehouse_id: int
    code: str
    location: Optional[str] = None
    capacity: int = 1000


class BinOut(BinBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ===================== INVENTORY =====================

class InventoryBase(BaseModel):
    part_id: int
    warehouse_id: int
    bin_id: Optional[int] = None
    quantity_on_hand: float = 0.0
    quantity_reserved: float = 0.0
    reorder_point: float = 0.0
    max_stock: float = 0.0
    condition: str = "SERVICEABLE"


class InventoryOut(InventoryBase):
    id: int
    updated_at: datetime
    part_number: Optional[str] = None
    nsn: Optional[str] = None
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    unit_cost: Optional[float] = None
    warehouse_name: Optional[str] = None
    bin_code: Optional[str] = None
    available: float = 0.0
    total_value: float = 0.0
    reorder_alert: bool = False
    model_config = ConfigDict(from_attributes=True)


class ReceiveStockRequest(BaseModel):
    part_id: int
    warehouse_id: int
    quantity: float = Field(gt=0)
    condition: str = "SERVICEABLE"
    unit_cost: Optional[float] = None
    po_reference: Optional[str] = None
    bin_id: Optional[int] = None
    notes: Optional[str] = None


class IssueStockRequest(BaseModel):
    inventory_id: int
    quantity: float = Field(gt=0)
    wo_reference: Optional[str] = None
    wo_part_id: Optional[int] = None
    notes: Optional[str] = None


class WriteDownRequest(BaseModel):
    inventory_id: int
    quantity: float = Field(gt=0)
    nrv_estimate: float = 0.0
    reason: str
    notes: Optional[str] = None


class InventoryMovementOut(BaseModel):
    id: int
    part_id: int
    part_number: Optional[str] = None
    description_en: Optional[str] = None
    warehouse_id: int
    warehouse_name: Optional[str] = None
    movement_type: str
    quantity: float
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    journal_id: Optional[int] = None
    actor: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ===================== PROCUREMENT =====================

class ProcurementCheckRequest(BaseModel):
    part_id: int
    warehouse_id: int
    quantity: float = Field(gt=0)
    urgency: str = "MEDIUM"  # CRITICAL/HIGH/MEDIUM/LOW
    wo_id: Optional[int] = None
    sector: Optional[str] = None
    requested_by: Optional[str] = None


class CheckResult(BaseModel):
    check_number: int
    check_name: str
    status: str  # PASS/FAIL/FLAG/INFO
    detail: str


class AlternativeAction(BaseModel):
    action: str
    detail: str
    estimated_saving: float = 0.0


class ProcurementCheckResult(BaseModel):
    verdict: str
    reasons: List[str]
    checks_passed: List[CheckResult]
    checks_failed: List[CheckResult]
    checks_flagged: List[CheckResult]
    alternative_actions: List[AlternativeAction]
    estimated_saving: float
    requested_part: Optional[PartOut] = None
    requested_quantity: float
    requested_warehouse: Optional[WarehouseOut] = None


class RFQLineBase(BaseModel):
    supplier: str
    unit_price: float
    total_price: float
    lead_days: int = 30
    notes: Optional[str] = None


class RFQLineOut(RFQLineBase):
    id: int
    is_awarded: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RFQBase(BaseModel):
    part_id: int
    warehouse_id: int
    quantity: float
    requested_by: Optional[str] = None
    notes: Optional[str] = None


class RFQCreate(RFQBase):
    pass


class RFQOut(RFQBase):
    id: int
    rfq_number: str
    status: str
    created_at: datetime
    awarded_at: Optional[datetime] = None
    part_number: Optional[str] = None
    description_en: Optional[str] = None
    warehouse_name: Optional[str] = None
    suppliers_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class RFQDetail(RFQOut):
    lines: List[RFQLineOut] = []


class POLineOut(BaseModel):
    id: int
    part_id: int
    part_number: Optional[str] = None
    description_en: Optional[str] = None
    quantity_ordered: float
    quantity_received: float
    unit_price: float
    total_price: float
    model_config = ConfigDict(from_attributes=True)


class POOut(BaseModel):
    id: int
    po_number: str
    rfq_id: Optional[int] = None
    supplier: str
    total_amount: float
    status: str
    expected_delivery: Optional[datetime] = None
    created_at: datetime
    received_at: Optional[datetime] = None
    lines: List[POLineOut] = []
    model_config = ConfigDict(from_attributes=True)


# ===================== BER =====================

class BERAnalyzeRequest(BaseModel):
    vehicle_id: int
    wo_id: Optional[int] = None
    repair_cost: float = Field(ge=0)
    replacement_value: Optional[float] = None
    cumulative_maintenance_cost: Optional[float] = None
    acquisition_cost: Optional[float] = None
    remaining_life_years: Optional[float] = None
    recurrence_count: Optional[int] = None
    downtime_days: int = 0
    obsolete_parts: bool = False


class BERRuleDetail(BaseModel):
    rule_number: int
    rule_name: str
    triggered: bool
    points: int
    detail: str


class BERAnalyzeResult(BaseModel):
    vehicle_id: int
    ber_score: float
    recommendation: str
    triggered_rules: List[int]
    rule_details: List[BERRuleDetail]
    cost_comparison: dict
    lifecycle_summary: dict
    inputs: dict


class BERReviewOut(BaseModel):
    id: int
    vehicle_id: int
    vehicle_name: Optional[str] = None
    vehicle_registration: Optional[str] = None
    wo_id: Optional[int] = None
    repair_cost: float
    replacement_value: float
    cumulative_maintenance_cost: float
    acquisition_cost: float
    remaining_life_years: float
    recurrence_count: int
    downtime_days: int
    ber_score: float
    recommendation: str
    triggered_rules: Optional[Any] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BERSaveRequest(BERAnalyzeRequest):
    pass


# ===================== FRACAS =====================

class FRACASBase(BaseModel):
    vehicle_id: int
    failure_mode: str
    failure_cause: Optional[str] = None
    failure_effect: Optional[str] = None
    severity: str = "MAJOR"
    corrective_action: Optional[str] = None


class FRACASCreate(FRACASBase):
    pass


class FRACASOut(FRACASBase):
    id: int
    recurrence_count: int
    first_occurrence: datetime
    last_occurrence: datetime
    created_at: datetime
    vehicle_name: Optional[str] = None
    vehicle_registration: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# ===================== OBSOLESCENCE =====================

class ObsolescenceOut(BaseModel):
    id: int
    part_id: int
    part_number: Optional[str] = None
    description_en: Optional[str] = None
    risk_level: str
    last_manufacturer_date: Optional[datetime] = None
    estimated_eol: Optional[datetime] = None
    alternative_part_id: Optional[int] = None
    alternative_part_number: Optional[str] = None
    recommendation: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ===================== IPSAS =====================

class IPSASEventOut(BaseModel):
    id: int
    event_type: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    description: str
    debit_account: str
    debit_account_name: str
    credit_account: str
    credit_account_name: str
    amount: float
    currency: str
    posted_at: datetime
    posted_by: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class IPSASSummary(BaseModel):
    total_inventory_value: float
    total_asset_nbv: float
    total_depreciation_ytd: float
    total_maintenance_expense_ytd: float


# ===================== AUDIT =====================

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ===================== DASHBOARD =====================

class DashboardSummary(BaseModel):
    readiness: ReadinessSummary
    open_work_orders_count: int
    in_progress_count: int
    waiting_parts_count: int
    procurement_alerts: int
    critical_nmc_count: int
    fleet_status: dict
    open_work_orders: List[WorkOrderOut]
    recent_journal: List[IPSASEventOut]
    critical_vehicles: List[VehicleDetail]
    readiness_trend: List[ReadinessTrendPoint]


# Resolve forward refs
Token.model_rebuild()
