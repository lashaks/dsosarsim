import { useState, useMemo } from "react";
import { Search, Plus, ArrowDownToLine, ArrowUpFromLine, Trash2, AlertCircle, Globe } from "lucide-react";
import {
  useWarehouses, useInventory, useInventoryMovements,
  useReceiveStock, useIssueStock, useWriteDown, useParts,
} from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { ConditionBadge } from "../components/ui/StatusBadge";
import { useToast } from "../components/ui/Toast";
import { useI18n } from "../lib/i18n";
import { formatSAR, formatDate, clsx } from "../lib/format";
import type { Inventory } from "../api/types";

export default function InventoryPage() {
  const { data: warehouses } = useWarehouses();
  const [tabId, setTabId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState<string>("");
  const [reorderOnly, setReorderOnly] = useState(false);
  const { lang } = useI18n();

  const wid = tabId ?? warehouses?.[0]?.id ?? null;
  const { data: inv, isLoading } = useInventory({
    warehouse_id: wid || undefined,
    condition: condition || undefined,
    search: search || undefined,
    reorder_alert: reorderOnly || undefined,
  });
  const { data: movements } = useInventoryMovements({ warehouse_id: wid || undefined, limit: 30 });

  const [receive, setReceive] = useState<Inventory | "new" | null>(null);
  const [issue, setIssue] = useState<Inventory | null>(null);
  const [writeDown, setWriteDown] = useState<Inventory | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Supply Chain"
        title="Inventory"
        subtitle="Stock posture across all warehouses. Every transaction posts a paired IPSAS journal entry."
        actions={
          <button className="btn btn-gold" onClick={() => setReceive("new")}>
            <Plus size={14} /> Receive Stock
          </button>
        }
      />

      {/* Warehouse tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {warehouses?.map((w) => {
          const active = wid === w.id;
          return (
            <button
              key={w.id}
              onClick={() => setTabId(w.id)}
              className={clsx(
                "panel p-4 text-left transition",
                active && "border-[var(--gold-dim)]"
              )}
              style={active ? { borderColor: "var(--gold-dim)", background: "var(--bg-hover)" } : {}}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="mono text-[12px]" style={{ color: "var(--text-muted)" }}>{w.code}</span>
                {active && <span className="badge badge-gold">ACTIVE</span>}
              </div>
              <div className="display text-base" style={{ color: "var(--text-primary)" }}>{w.name}</div>
              <div className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>{w.sector} · {w.location}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <KPI label="SKUs" v={w.total_skus} />
                <KPI label="Value" v={formatSAR(w.total_value)} mono />
                <KPI label="Service%" v={`${w.serviceable_pct.toFixed(0)}%`} mono />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="panel p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
          <input className="input pl-9" placeholder="Search part number, NSN, description…"
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: "auto" }}
                value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="">All conditions</option>
          <option value="SERVICEABLE">SERVICEABLE</option>
          <option value="REPAIRABLE">REPAIRABLE</option>
          <option value="UNSERVICEABLE">UNSERVICEABLE</option>
        </select>
        <label className="btn btn-ghost gap-2 cursor-pointer">
          <input type="checkbox" checked={reorderOnly} onChange={(e) => setReorderOnly(e.target.checked)} />
          <AlertCircle size={13} color="var(--status-pmc-t)" /> Reorder alerts
        </label>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden mb-6">
        {isLoading ? (
          <div className="p-5 space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Part #</th>
                <th>NSN</th>
                <th>
                  Description
                  <Globe size={10} className="inline ml-1" />
                  <span className="text-[9px] ml-1" style={{ color: "var(--gold)" }}>{lang.toUpperCase()}</span>
                </th>
                <th>Bin</th>
                <th>Condition</th>
                <th className="num">On Hand</th>
                <th className="num">Reserved</th>
                <th className="num">Available</th>
                <th className="num">Reorder Pt</th>
                <th className="num">Unit Cost</th>
                <th className="num">Total Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inv?.length === 0 && (
                <tr><td colSpan={12} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  No inventory matches.
                </td></tr>
              )}
              {inv?.map((r) => {
                const desc = lang === "ar" && r.description_ar ? r.description_ar : r.description_en;
                const alert = r.reorder_alert;
                return (
                  <tr key={r.id} style={alert ? { background: "rgba(107,31,31,0.15)" } : {}}>
                    <td className="mono" style={{ color: "var(--text-primary)" }}>{r.part_number}</td>
                    <td className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>{r.nsn}</td>
                    <td className="text-[12px]">{desc}</td>
                    <td className="mono text-[12px]">{r.bin_code || "—"}</td>
                    <td><ConditionBadge c={r.condition} /></td>
                    <td className="num" style={{ color: alert ? "var(--status-nmc-t)" : "var(--text-primary)" }}>{r.quantity_on_hand}</td>
                    <td className="num">{r.quantity_reserved}</td>
                    <td className="num">{r.available}</td>
                    <td className="num">{r.reorder_point}</td>
                    <td className="num">{formatSAR(r.unit_cost || 0, { decimals: 2 })}</td>
                    <td className="num">{formatSAR(r.total_value, { decimals: 2 })}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-sm" title="Receive" onClick={() => setReceive(r)}>
                          <ArrowDownToLine size={12} />
                        </button>
                        <button className="btn btn-sm" title="Issue" onClick={() => setIssue(r)} disabled={r.condition !== "SERVICEABLE" || r.quantity_on_hand <= 0}>
                          <ArrowUpFromLine size={12} />
                        </button>
                        <button className="btn btn-sm" title="Write down" onClick={() => setWriteDown(r)} disabled={r.quantity_on_hand <= 0}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent movements */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="section-title">Recent Movements</div>
          <h3 className="display text-base mt-1" style={{ color: "var(--text-primary)" }}>
            {warehouses?.find(w => w.id === wid)?.name || "All Warehouses"}
          </h3>
        </div>
        {movements && movements.length === 0 ? (
          <div className="p-6 text-[13px] text-center" style={{ color: "var(--text-muted)" }}>
            No movements yet for this warehouse.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Part</th>
                <th>Type</th>
                <th className="num">Qty</th>
                <th>Reference</th>
                <th className="num">Journal #</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {movements?.map((m) => (
                <tr key={m.id} style={{ cursor: "default" }}>
                  <td className="mono text-[11px]">{formatDate(m.created_at)}</td>
                  <td>
                    <div className="mono text-[12px]">{m.part_number}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{m.description_en}</div>
                  </td>
                  <td>
                    <span className={clsx(
                      "badge",
                      m.movement_type === "RECEIPT" ? "badge-fmc" :
                      m.movement_type === "ISSUE" ? "badge-info" :
                      m.movement_type === "WRITE_DOWN" ? "badge-nmc" : "badge-muted",
                    )}>{m.movement_type}</span>
                  </td>
                  <td className="num">{m.quantity}</td>
                  <td className="mono text-[12px]">{m.reference_type || "—"} {m.reference_id || ""}</td>
                  <td className="num mono text-[11px]" style={{ color: "var(--gold)" }}>#{m.journal_id}</td>
                  <td className="text-[12px]">{m.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {receive && <ReceiveModal inv={receive === "new" ? null : receive} defaultWarehouseId={wid ?? undefined} onClose={() => setReceive(null)} />}
      {issue && <IssueModal inv={issue} onClose={() => setIssue(null)} />}
      {writeDown && <WriteDownModal inv={writeDown} onClose={() => setWriteDown(null)} />}
    </>
  );
}

function KPI({ label, v, mono }: { label: string; v: any; mono?: boolean }) {
  return (
    <div>
      <div className="section-title">{label}</div>
      <div className={clsx("text-[13px] mt-0.5", mono && "mono")} style={{ color: "var(--text-primary)" }}>{v}</div>
    </div>
  );
}

function ReceiveModal({ inv, defaultWarehouseId, onClose }: { inv: Inventory | null; defaultWarehouseId?: number; onClose: () => void }) {
  const { data: parts } = useParts();
  const { data: warehouses } = useWarehouses();
  const receive = useReceiveStock();
  const toast = useToast();
  const [form, setForm] = useState({
    part_id: inv?.part_id || 0,
    warehouse_id: inv?.warehouse_id || defaultWarehouseId || 0,
    quantity: 1,
    condition: inv?.condition || "SERVICEABLE",
    unit_cost: inv?.unit_cost || 0,
    po_reference: "",
  });

  async function submit() {
    try {
      const r = await receive.mutateAsync({ ...form, part_id: Number(form.part_id), warehouse_id: Number(form.warehouse_id), quantity: Number(form.quantity), unit_cost: Number(form.unit_cost) });
      toast.push({ kind: "success", title: "Stock received", description: `Journal #${r.journal_id} posted (Dr 1310 / Cr 2110)` });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title="Receive Stock" description="Adds stock and posts Dr 1310 Inventory / Cr 2110 GR-IR."
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={submit} disabled={receive.isPending}>
            {receive.isPending ? "Posting…" : "Receive + Post Journal"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Part">
          <select className="input" value={form.part_id} onChange={(e) => {
            const id = Number(e.target.value);
            const p = parts?.find((x) => x.id === id);
            setForm({ ...form, part_id: id, unit_cost: p?.unit_cost ?? form.unit_cost });
          }}>
            <option value={0}>— select part —</option>
            {parts?.map((p) => <option key={p.id} value={p.id}>{p.part_number} — {p.description_en}</option>)}
          </select>
        </Field>
        <Field label="Warehouse">
          <select className="input" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: Number(e.target.value) })}>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input className="input" type="number" min={0.01} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Condition">
            <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              <option value="SERVICEABLE">SERVICEABLE</option>
              <option value="REPAIRABLE">REPAIRABLE</option>
              <option value="UNSERVICEABLE">UNSERVICEABLE</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit cost (SAR)">
            <input className="input" type="number" step={0.01} min={0} value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })} />
          </Field>
          <Field label="PO reference (optional)">
            <input className="input" value={form.po_reference} onChange={(e) => setForm({ ...form, po_reference: e.target.value })} />
          </Field>
        </div>
        <div className="text-[12px] p-3 rounded mono" style={{ background: "var(--bg-primary)", color: "var(--gold)" }}>
          Total: SAR {formatSAR(form.quantity * form.unit_cost, { decimals: 2 })}
        </div>
      </div>
    </Modal>
  );
}

function IssueModal({ inv, onClose }: { inv: Inventory; onClose: () => void }) {
  const issue = useIssueStock();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [woRef, setWoRef] = useState("");

  async function submit() {
    try {
      const r = await issue.mutateAsync({ inventory_id: inv.id, quantity: Number(qty), wo_reference: woRef || undefined });
      toast.push({ kind: "success", title: "Stock issued", description: `Journal #${r.journal_id} posted (Dr 6200 / Cr 1310)` });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title="Issue Stock" description={`${inv.part_number} from ${inv.warehouse_name}`}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={submit} disabled={issue.isPending}>
            {issue.isPending ? "Posting…" : "Issue + Post Journal"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Available: <span className="mono" style={{ color: "var(--text-primary)" }}>{inv.available}</span>  ·
          Unit cost: <span className="mono" style={{ color: "var(--text-primary)" }}>SAR {formatSAR(inv.unit_cost || 0, { decimals: 2 })}</span>
        </div>
        <Field label="Quantity">
          <input className="input" type="number" min={1} max={inv.available} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </Field>
        <Field label="Work order reference (optional)">
          <input className="input" placeholder="WO-2026-0003" value={woRef} onChange={(e) => setWoRef(e.target.value)} />
        </Field>
        <div className="text-[12px] p-3 rounded mono" style={{ background: "var(--bg-primary)", color: "var(--gold)" }}>
          Journal amount: SAR {formatSAR(qty * (inv.unit_cost || 0), { decimals: 2 })}
        </div>
      </div>
    </Modal>
  );
}

function WriteDownModal({ inv, onClose }: { inv: Inventory; onClose: () => void }) {
  const wd = useWriteDown();
  const toast = useToast();
  const [form, setForm] = useState({ quantity: 1, nrv_estimate: 0, reason: "" });

  async function submit() {
    if (!form.reason) return toast.push({ kind: "error", title: "Reason required" });
    try {
      const r = await wd.mutateAsync({ inventory_id: inv.id, ...form, quantity: Number(form.quantity), nrv_estimate: Number(form.nrv_estimate) });
      toast.push({ kind: "success", title: "Stock written down", description: `Journal #${r.journal_id} posted (Dr 6900 / Cr 1310)` });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title="Write Down" description={`${inv.part_number} — NRV impairment`}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={submit} disabled={wd.isPending}>
            {wd.isPending ? "Posting…" : "Write Down + Post"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Quantity to write down">
          <input className="input" type="number" min={1} max={inv.quantity_on_hand} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
        </Field>
        <Field label="NRV estimate per unit (SAR)">
          <input className="input" type="number" min={0} step={0.01} value={form.nrv_estimate} onChange={(e) => setForm({ ...form, nrv_estimate: Number(e.target.value) })} />
        </Field>
        <Field label="Reason">
          <textarea className="input" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Damaged in transit, obsolete, expired…" />
        </Field>
      </div>
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
