// Type definitions mirroring backend schemas.py

export type OpStatus = "FMC" | "PMC" | "NMC";
export type Criticality = "HIGH" | "MEDIUM" | "LOW";
export type WOStatus = "OPEN" | "IN_PROGRESS" | "WAITING_PARTS" | "CLOSED";
export type WOPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Condition = "SERVICEABLE" | "REPAIRABLE" | "UNSERVICEABLE";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  sector?: string | null;
  full_name?: string | null;
  created_at: string;
}

export interface Vehicle {
  id: number;
  registration: string;
  name: string;
  type: string;
  sector: string;
  brigade?: string | null;
  criticality: Criticality;
  op_status: OpStatus;
  acquisition_cost: number;
  acquisition_date: string;
  useful_life_years: number;
  notes?: string | null;
  created_at: string;
}

export interface VehicleDetail extends Vehicle {
  open_wo_count: number;
  total_maintenance_cost: number;
  accumulated_depreciation: number;
  nbv: number;
  pct_depreciated: number;
}

export interface ReadinessSummary {
  scope: string;
  scope_value?: string | null;
  readiness_pct: number;
  total_vehicles: number;
  fmc_count: number;
  pmc_count: number;
  nmc_count: number;
  critical_nmc_list: Vehicle[];
}

export interface ReadinessTrendPoint {
  date: string;
  readiness_pct: number;
  fmc_count: number;
  pmc_count: number;
  nmc_count: number;
}

export interface WorkOrder {
  id: number;
  wo_number: string;
  vehicle_id: number;
  title: string;
  description?: string | null;
  status: WOStatus;
  priority: WOPriority;
  sector?: string | null;
  assigned_to?: string | null;
  created_at: string;
  closed_at?: string | null;
  vehicle_name?: string | null;
  vehicle_registration?: string | null;
  vehicle_type?: string | null;
  age_days: number;
  parts_count: number;
}

export interface WOPart {
  id: number;
  part_id: number;
  quantity_required: number;
  quantity_issued: number;
  notes?: string | null;
  part_number?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  unit_cost?: number | null;
}

export interface WOActivity {
  id: number;
  activity: string;
  actor?: string | null;
  created_at: string;
}

export interface WorkOrderDetail extends WorkOrder {
  parts: WOPart[];
  activity: WOActivity[];
}

export interface Part {
  id: number;
  part_number: string;
  nsn?: string | null;
  oem_number?: string | null;
  description_en: string;
  description_ar?: string | null;
  category?: string | null;
  unit_of_measure: string;
  unit_cost: number;
  vehicle_type?: string | null;
  is_critical: boolean;
  lead_time_days: number;
  minimum_order_qty: number;
  preferred_supplier?: string | null;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  sector: string;
  location?: string | null;
  manager?: string | null;
  total_skus: number;
  total_value: number;
  serviceable_pct: number;
}

export interface Inventory {
  id: number;
  part_id: number;
  warehouse_id: number;
  bin_id?: number | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_point: number;
  max_stock: number;
  condition: Condition;
  updated_at: string;
  part_number?: string | null;
  nsn?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  unit_cost?: number | null;
  warehouse_name?: string | null;
  bin_code?: string | null;
  available: number;
  total_value: number;
  reorder_alert: boolean;
}

export interface InventoryMovement {
  id: number;
  part_id: number;
  part_number?: string | null;
  description_en?: string | null;
  warehouse_id: number;
  warehouse_name?: string | null;
  movement_type: string;
  quantity: number;
  reference_type?: string | null;
  reference_id?: string | null;
  journal_id?: number | null;
  actor?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CheckResult {
  check_number: number;
  check_name: string;
  status: "PASS" | "FAIL" | "FLAG" | "INFO";
  detail: string;
}

export interface AlternativeAction {
  action: string;
  detail: string;
  estimated_saving: number;
}

export interface ProcurementCheckResult {
  verdict: "NECESSARY" | "AVAILABLE_IN_STOCK" | "REPAIR_INSTEAD" | "DUPLICATE_RISK" | "REVIEW_REQUIRED" | "NOT_RECOMMENDED";
  reasons: string[];
  checks_passed: CheckResult[];
  checks_failed: CheckResult[];
  checks_flagged: CheckResult[];
  alternative_actions: AlternativeAction[];
  estimated_saving: number;
  requested_part: Part;
  requested_quantity: number;
  requested_warehouse: Warehouse;
}

export interface RFQ {
  id: number;
  rfq_number: string;
  part_id: number;
  warehouse_id: number;
  quantity: number;
  status: "DRAFT" | "SENT" | "RECEIVED" | "AWARDED" | "CANCELLED";
  requested_by?: string | null;
  notes?: string | null;
  created_at: string;
  awarded_at?: string | null;
  part_number?: string | null;
  description_en?: string | null;
  warehouse_name?: string | null;
  suppliers_count: number;
}

export interface RFQLine {
  id: number;
  supplier: string;
  unit_price: number;
  total_price: number;
  lead_days: number;
  notes?: string | null;
  is_awarded: boolean;
  created_at: string;
}

export interface RFQDetail extends RFQ {
  lines: RFQLine[];
}

export interface POLine {
  id: number;
  part_id: number;
  part_number?: string | null;
  description_en?: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
}

export interface PO {
  id: number;
  po_number: string;
  rfq_id?: number | null;
  supplier: string;
  total_amount: number;
  status: "DRAFT" | "APPROVED" | "SENT" | "RECEIVED" | "CLOSED";
  expected_delivery?: string | null;
  created_at: string;
  received_at?: string | null;
  lines: POLine[];
}

export interface BERRuleDetail {
  rule_number: number;
  rule_name: string;
  triggered: boolean;
  points: number;
  detail: string;
}

export interface BERAnalyzeResult {
  vehicle_id: number;
  ber_score: number;
  recommendation: "WRITE_OFF" | "FINANCE_REVIEW" | "ENGINEERING_REVIEW" | "CONTINUE_REPAIR";
  triggered_rules: number[];
  rule_details: BERRuleDetail[];
  cost_comparison: {
    repair_cost: number; replacement_value: number;
    cumulative_maintenance: number; acquisition_cost: number;
    repair_vs_replacement_pct: number; maintenance_vs_acquisition_pct: number;
  };
  lifecycle_summary: {
    age_years: number; useful_life_years: number; remaining_life_years: number;
    accumulated_depreciation: number; nbv: number; pct_depreciated: number;
  };
  inputs: Record<string, any>;
}

export interface BERReview {
  id: number;
  vehicle_id: number;
  vehicle_name?: string | null;
  vehicle_registration?: string | null;
  wo_id?: number | null;
  repair_cost: number;
  replacement_value: number;
  cumulative_maintenance_cost: number;
  acquisition_cost: number;
  remaining_life_years: number;
  recurrence_count: number;
  downtime_days: number;
  ber_score: number;
  recommendation: string;
  triggered_rules?: number[] | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface FRACAS {
  id: number;
  vehicle_id: number;
  vehicle_name?: string | null;
  vehicle_registration?: string | null;
  failure_mode: string;
  failure_cause?: string | null;
  failure_effect?: string | null;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  corrective_action?: string | null;
  recurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
  created_at: string;
}

export interface IPSASEvent {
  id: number;
  event_type: string;
  reference_id?: string | null;
  reference_type?: string | null;
  description: string;
  debit_account: string;
  debit_account_name: string;
  credit_account: string;
  credit_account_name: string;
  amount: number;
  currency: string;
  posted_at: string;
  posted_by?: string | null;
}

export interface IPSASSummary {
  total_inventory_value: number;
  total_asset_nbv: number;
  total_depreciation_ytd: number;
  total_maintenance_expense_ytd: number;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  username?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string | null;
  created_at: string;
}

export interface DashboardSummary {
  readiness: ReadinessSummary;
  open_work_orders_count: number;
  in_progress_count: number;
  waiting_parts_count: number;
  procurement_alerts: number;
  critical_nmc_count: number;
  fleet_status: { fmc: number; pmc: number; nmc: number; total: number };
  open_work_orders: WorkOrder[];
  recent_journal: IPSASEvent[];
  critical_vehicles: VehicleDetail[];
  readiness_trend: ReadinessTrendPoint[];
}

export interface Asset {
  id: number; registration: string; name: string; type: string; sector: string;
  acquisition_cost: number; acquisition_date: string; useful_life_years: number;
  annual_depreciation: number; accumulated_depreciation: number;
  nbv: number; age_years: number; pct_depreciated: number; remaining_life_years: number;
}

export interface Obsolescence {
  id: number;
  part_id: number;
  part_number?: string | null;
  description_en?: string | null;
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  last_manufacturer_date?: string | null;
  estimated_eol?: string | null;
  alternative_part_id?: number | null;
  alternative_part_number?: string | null;
  recommendation?: string | null;
  created_at: string;
}
