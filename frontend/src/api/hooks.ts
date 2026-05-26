import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import * as T from "./types";

// ───────── Auth ─────────
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: async () => (await api.get<T.User>("/api/auth/me")).data });
}

// ───────── Dashboard ─────────
export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await api.get<T.DashboardSummary>("/api/dashboard/summary")).data,
    refetchInterval: 60_000,
  });
}

export function useReadinessTrend(days = 30) {
  return useQuery({
    queryKey: ["dashboard", "trend", days],
    queryFn: async () => (await api.get<T.ReadinessTrendPoint[]>(`/api/dashboard/readiness-trend?days=${days}`)).data,
  });
}

// ───────── Vehicles ─────────
export function useVehicles(filters?: { sector?: string; type?: string; op_status?: string; search?: string }) {
  return useQuery({
    queryKey: ["vehicles", filters],
    queryFn: async () => (await api.get<T.Vehicle[]>("/api/vehicles", { params: filters })).data,
  });
}

export function useVehicle(id?: number | null) {
  return useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => (await api.get<T.VehicleDetail>(`/api/vehicles/${id}`)).data,
    enabled: !!id,
  });
}

export function useReadiness(filters?: { sector?: string; brigade?: string; type?: string }) {
  return useQuery({
    queryKey: ["readiness", filters],
    queryFn: async () => (await api.get<T.ReadinessSummary>("/api/vehicles/readiness", { params: filters })).data,
  });
}

export function useVehicleMaintenanceHistory(id?: number | null) {
  return useQuery({
    queryKey: ["vehicle", id, "maintenance"],
    queryFn: async () => (await api.get(`/api/vehicles/${id}/maintenance-history`)).data,
    enabled: !!id,
  });
}

export function useVehicleWOs(id?: number | null) {
  return useQuery({
    queryKey: ["vehicle", id, "wos"],
    queryFn: async () => (await api.get(`/api/vehicles/${id}/work-orders`)).data,
    enabled: !!id,
  });
}

// ───────── Work Orders ─────────
export function useWorkOrders(filters?: { status?: string; priority?: string; sector?: string; search?: string; vehicle_id?: number }) {
  return useQuery({
    queryKey: ["work-orders", filters],
    queryFn: async () => (await api.get<T.WorkOrder[]>("/api/work-orders", { params: filters })).data,
  });
}

export function useWorkOrder(id?: number | null) {
  return useQuery({
    queryKey: ["work-order", id],
    queryFn: async () => (await api.get<T.WorkOrderDetail>(`/api/work-orders/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateWO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => (await api.post("/api/work-orders", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });
}

export function useUpdateWO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) =>
      (await api.patch(`/api/work-orders/${id}`, body)).data,
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["work-order", id] });
    },
  });
}

export function useIssueWOParts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) =>
      (await api.post(`/api/work-orders/${id}/issue-parts`, body)).data,
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["work-order", id] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["ipsas-journal"] });
    },
  });
}

export function useAddMaintenanceCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) =>
      (await api.post(`/api/work-orders/${id}/maintenance-cost`, body)).data,
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["work-order", id] });
    },
  });
}

// ───────── Inventory ─────────
export function useInventory(filters?: { warehouse_id?: number; condition?: string; search?: string; reorder_alert?: boolean }) {
  return useQuery({
    queryKey: ["inventory", filters],
    queryFn: async () => (await api.get<T.Inventory[]>("/api/inventory", { params: filters })).data,
  });
}

export function useInventoryMovements(filters?: { warehouse_id?: number; part_id?: number; limit?: number }) {
  return useQuery({
    queryKey: ["inventory-movements", filters],
    queryFn: async () => (await api.get<T.InventoryMovement[]>("/api/inventory/movements", { params: filters })).data,
  });
}

export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => (await api.post("/api/inventory/receive", body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["ipsas-journal"] });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });
}

export function useIssueStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => (await api.post("/api/inventory/issue", body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["ipsas-journal"] });
    },
  });
}

export function useWriteDown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => (await api.post("/api/inventory/write-down", body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-movements"] });
      qc.invalidateQueries({ queryKey: ["ipsas-journal"] });
    },
  });
}

export function useParts(search?: string) {
  return useQuery({
    queryKey: ["parts", search],
    queryFn: async () => (await api.get<T.Part[]>("/api/inventory/parts", { params: { search } })).data,
  });
}

// ───────── Warehouses ─────────
export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await api.get<T.Warehouse[]>("/api/warehouses")).data,
  });
}

// ───────── Procurement ─────────
export function useProcurementCheck() {
  return useMutation({
    mutationFn: async (body: any) => (await api.post<T.ProcurementCheckResult>("/api/procurement/check", body)).data,
  });
}

export function useRFQs(status?: string) {
  return useQuery({
    queryKey: ["rfqs", status],
    queryFn: async () => (await api.get<T.RFQ[]>("/api/procurement/rfqs", { params: { status } })).data,
  });
}

export function useRFQ(id?: number | null) {
  return useQuery({
    queryKey: ["rfq", id],
    queryFn: async () => (await api.get<T.RFQDetail>(`/api/procurement/rfqs/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => (await api.post("/api/procurement/rfqs", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rfqs"] }),
  });
}

export function useAddRFQLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) =>
      (await api.post(`/api/procurement/rfqs/${id}/lines`, body)).data,
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["rfq", id] });
      qc.invalidateQueries({ queryKey: ["rfqs"] });
    },
  });
}

export function useAwardRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rfqId, lineId }: { rfqId: number; lineId: number }) =>
      (await api.post(`/api/procurement/rfqs/${rfqId}/award/${lineId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfqs"] });
      qc.invalidateQueries({ queryKey: ["pos"] });
    },
  });
}

export function usePOs(status?: string) {
  return useQuery({
    queryKey: ["pos", status],
    queryFn: async () => (await api.get<T.PO[]>("/api/procurement/pos", { params: { status } })).data,
  });
}

export function useReceivePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, warehouseId }: { id: number; warehouseId: number }) =>
      (await api.post(`/api/procurement/pos/${id}/receive?warehouse_id=${warehouseId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["ipsas-journal"] });
    },
  });
}

// ───────── Assets ─────────
export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await api.get<T.Asset[]>("/api/assets")).data,
  });
}

// ───────── BER ─────────
export function useBERAnalyze() {
  return useMutation({
    mutationFn: async (body: any) => (await api.post<T.BERAnalyzeResult>("/api/ber/analyze", body)).data,
  });
}

export function useSaveBERReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => (await api.post("/api/ber/reviews", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ber-reviews"] }),
  });
}

export function useBERReviews() {
  return useQuery({
    queryKey: ["ber-reviews"],
    queryFn: async () => (await api.get<T.BERReview[]>("/api/ber/reviews")).data,
  });
}

// ───────── FRACAS ─────────
export function useFRACAS(filters?: { severity?: string; vehicle_id?: number }) {
  return useQuery({
    queryKey: ["fracas", filters],
    queryFn: async () => (await api.get<T.FRACAS[]>("/api/fracas", { params: filters })).data,
  });
}

export function useFRACASTrends() {
  return useQuery({
    queryKey: ["fracas", "trends"],
    queryFn: async () => (await api.get("/api/fracas/trends")).data,
  });
}

export function useCreateFRACAS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => (await api.post("/api/fracas", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fracas"] }),
  });
}

// ───────── IPSAS ─────────
export function useIPSASJournal(filters?: { event_type?: string; reference?: string; account?: string; limit?: number }) {
  return useQuery({
    queryKey: ["ipsas-journal", filters],
    queryFn: async () => (await api.get<T.IPSASEvent[]>("/api/ipsas/journal", { params: filters })).data,
  });
}

export function useIPSASSummary() {
  return useQuery({
    queryKey: ["ipsas-summary"],
    queryFn: async () => (await api.get<T.IPSASSummary>("/api/ipsas/summary")).data,
  });
}

// ───────── Audit ─────────
export function useAuditLog(filters?: { user?: string; entity_type?: string; action?: string; limit?: number }) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: async () => (await api.get<T.AuditLog[]>("/api/audit", { params: filters })).data,
  });
}
