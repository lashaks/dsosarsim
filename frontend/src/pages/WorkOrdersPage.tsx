import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LayoutGrid, List as ListIcon, Search } from "lucide-react";
import { useWorkOrders, useVehicles, useCreateWO } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import Modal from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { PriorityBadge, WOStatusBadge } from "../components/ui/StatusBadge";
import { formatDate, clsx } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import type { WorkOrder, WOStatus } from "../api/types";

const COLUMNS: { key: WOStatus; label: string; accent: string }[] = [
  { key: "OPEN", label: "Open", accent: "var(--status-info-t)" },
  { key: "IN_PROGRESS", label: "In Progress", accent: "var(--gold)" },
  { key: "WAITING_PARTS", label: "Waiting Parts", accent: "var(--status-pmc-t)" },
  { key: "CLOSED", label: "Closed", accent: "var(--text-muted)" },
];

export default function WorkOrdersPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: wos, isLoading } = useWorkOrders({ search: search || undefined });
  const byStatus = useMemo(() => {
    const m: Record<string, WorkOrder[]> = { OPEN: [], IN_PROGRESS: [], WAITING_PARTS: [], CLOSED: [] };
    (wos || []).forEach((w) => m[w.status].push(w));
    return m;
  }, [wos]);
  const nav = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Work Orders"
        subtitle="Lifecycle tracking from open to closed. Parts issuance triggers IPSAS journal entries automatically."
        actions={
          <>
            <div className="panel flex p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={clsx("btn btn-sm btn-ghost", view === "kanban" && "btn")}
                style={view === "kanban" ? { background: "var(--bg-hover)", color: "var(--text-primary)" } : {}}
              >
                <LayoutGrid size={13} /> Kanban
              </button>
              <button
                onClick={() => setView("list")}
                className={clsx("btn btn-sm btn-ghost", view === "list" && "btn")}
                style={view === "list" ? { background: "var(--bg-hover)", color: "var(--text-primary)" } : {}}
              >
                <ListIcon size={13} /> List
              </button>
            </div>
            <button className="btn btn-gold" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create WO
            </button>
          </>
        }
      />

      <div className="panel p-3 mb-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
          <input
            className="input pl-9" placeholder="Search WO number, title…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="panel p-3 min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="section-title flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: col.accent }} />
                  {col.label}
                </div>
                <span className="mono text-[12px]" style={{ color: "var(--text-muted)" }}>
                  {byStatus[col.key]?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {isLoading && [0,1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                {byStatus[col.key]?.map((wo) => (
                  <button
                    key={wo.id}
                    onClick={() => nav(`/work-orders/${wo.id}`)}
                    className="w-full text-left rounded p-3 transition hover:bg-[var(--bg-hover)]"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>{wo.wo_number}</span>
                      <PriorityBadge p={wo.priority} />
                    </div>
                    <div className="text-[13px] mb-2" style={{ color: "var(--text-primary)" }}>{wo.title}</div>
                    <div className="text-[11px] mono" style={{ color: "var(--text-muted)" }}>
                      {wo.vehicle_registration} · {wo.vehicle_type} · {wo.age_days}d
                    </div>
                  </button>
                ))}
                {byStatus[col.key]?.length === 0 && !isLoading && (
                  <div className="text-[12px] text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No work orders
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>WO #</th>
                <th>Vehicle</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Sector</th>
                <th>Assigned</th>
                <th className="num">Created</th>
                <th className="num">Age (d)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [0,1,2,3,4].map(i => (
                <tr key={i}><td colSpan={9}><Skeleton className="h-6 w-full" /></td></tr>
              ))}
              {wos?.map((wo) => (
                <tr key={wo.id} onClick={() => nav(`/work-orders/${wo.id}`)}>
                  <td className="mono" style={{ color: "var(--text-primary)" }}>{wo.wo_number}</td>
                  <td className="mono">{wo.vehicle_registration}</td>
                  <td>{wo.title}</td>
                  <td><WOStatusBadge s={wo.status} /></td>
                  <td><PriorityBadge p={wo.priority} /></td>
                  <td className="text-[12px]" style={{ color: "var(--text-muted)" }}>{wo.sector}</td>
                  <td className="text-[12px]" style={{ color: "var(--text-muted)" }}>{wo.assigned_to || "—"}</td>
                  <td className="num">{formatDate(wo.created_at)}</td>
                  <td className="num">{wo.age_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateWOModal onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateWOModal({ onClose }: { onClose: () => void }) {
  const { data: vehicles } = useVehicles();
  const createWO = useCreateWO();
  const toast = useToast();
  const [form, setForm] = useState({
    vehicle_id: 0, title: "", description: "", priority: "MEDIUM", assigned_to: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicle_id || !form.title) {
      toast.push({ kind: "error", title: "Missing fields", description: "Vehicle and title are required." });
      return;
    }
    try {
      const created = await createWO.mutateAsync({ ...form, vehicle_id: Number(form.vehicle_id) });
      toast.push({ kind: "success", title: "Work order created", description: created.wo_number });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed to create", description: e?.response?.data?.detail || e?.message });
    }
  }

  return (
    <Modal
      open onOpenChange={(o) => !o && onClose()}
      title="Create Work Order"
      description="A new WO number will be auto-generated."
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={submit as any} disabled={createWO.isPending}>
            {createWO.isPending ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Vehicle">
          <select className="input" value={form.vehicle_id || ""} onChange={(e) => setForm({ ...form, vehicle_id: Number(e.target.value) })}>
            <option value="">— select vehicle —</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>{v.registration} — {v.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Description (optional)">
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </Field>
          <Field label="Assigned to">
            <input className="input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="section-title block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
