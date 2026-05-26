import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Package, Wrench, AlertTriangle, ClipboardCheck, X } from "lucide-react";
import {
  useWorkOrder, useUpdateWO, useIssueWOParts, useAddMaintenanceCost,
  useInventory, useBERAnalyze, useProcurementCheck, useWarehouses,
} from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { PriorityBadge, WOStatusBadge } from "../components/ui/StatusBadge";
import { formatDate, formatDateTime, formatSAR } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import VerdictBadge from "./procurement/VerdictBadge";

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const woId = Number(id);
  const nav = useNavigate();
  const { data: wo, isLoading } = useWorkOrder(woId);
  const updateWO = useUpdateWO();
  const addCost = useAddMaintenanceCost();
  const toast = useToast();

  const [issueModal, setIssueModal] = useState<{ wo_part_id: number; part_id: number; max: number; part_number?: string | null } | null>(null);
  const [showBER, setShowBER] = useState(false);
  const [showProcCheck, setShowProcCheck] = useState(false);
  const [costForm, setCostForm] = useState({ cost_type: "LABOR", amount: "", description: "" });

  if (isLoading || !wo) {
    return (
      <>
        <Skeleton className="h-10 w-1/3 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="h-96 lg:col-span-3" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </>
    );
  }

  async function close() {
    try {
      await updateWO.mutateAsync({ id: woId, body: { status: "CLOSED" } });
      toast.push({ kind: "success", title: "WO closed" });
    } catch (e: any) {
      toast.push({ kind: "error", title: "Cannot close", description: e?.response?.data?.detail });
    }
  }

  async function progress(next: string) {
    try {
      await updateWO.mutateAsync({ id: woId, body: { status: next } });
      toast.push({ kind: "success", title: `Status → ${next}` });
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  async function submitCost(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addCost.mutateAsync({ id: woId, body: { ...costForm, amount: Number(costForm.amount) } });
      toast.push({ kind: "success", title: "Cost logged" });
      setCostForm({ cost_type: "LABOR", amount: "", description: "" });
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  const allIssued = wo.parts.every((p) => p.quantity_issued >= p.quantity_required);

  return (
    <>
      <button className="btn btn-ghost mb-3" onClick={() => nav("/work-orders")}>
        <ArrowLeft size={14} /> Back to Work Orders
      </button>
      <PageHeader
        eyebrow={wo.wo_number}
        title={wo.title}
        subtitle={wo.description || undefined}
        actions={
          <>
            <WOStatusBadge s={wo.status} />
            <PriorityBadge p={wo.priority} />
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT */}
        <div className="lg:col-span-3 space-y-4">
          {/* Parts */}
          <div className="panel overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Package size={16} color="var(--gold)" />
                <h3 className="display text-base" style={{ color: "var(--text-primary)" }}>Parts</h3>
              </div>
              <span className="text-[11px] mono" style={{ color: "var(--text-muted)" }}>
                {wo.parts.filter(p => p.quantity_issued >= p.quantity_required).length} / {wo.parts.length} fulfilled
              </span>
            </div>
            {wo.parts.length === 0 ? (
              <div className="p-6 text-[13px] text-center" style={{ color: "var(--text-muted)" }}>
                No parts required.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part #</th>
                    <th>Description</th>
                    <th className="num">Required</th>
                    <th className="num">Issued</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {wo.parts.map((p) => {
                    const full = p.quantity_issued >= p.quantity_required;
                    return (
                      <tr key={p.id} style={{ cursor: "default" }}>
                        <td className="mono">{p.part_number}</td>
                        <td className="text-[12px]">{p.description_en}</td>
                        <td className="num">{p.quantity_required}</td>
                        <td className="num">{p.quantity_issued}</td>
                        <td>
                          {full
                            ? <span className="badge badge-fmc">FULFILLED</span>
                            : <span className="badge badge-pmc">OPEN</span>}
                        </td>
                        <td>
                          {!full && (
                            <button
                              className="btn btn-sm btn-gold"
                              onClick={() => setIssueModal({
                                wo_part_id: p.id, part_id: p.part_id,
                                max: p.quantity_required - p.quantity_issued, part_number: p.part_number,
                              })}
                            >
                              Issue
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Activity */}
          <div className="panel p-5">
            <h3 className="display text-base mb-3" style={{ color: "var(--text-primary)" }}>Activity Log</h3>
            {wo.activity.length === 0 ? (
              <div className="text-[13px]" style={{ color: "var(--text-muted)" }}>No activity yet.</div>
            ) : (
              <ol className="space-y-3">
                {wo.activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-[13px]">
                    <span className="mono text-[11px] mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)", width: 110 }}>
                      {formatDateTime(a.created_at)}
                    </span>
                    <div className="flex-1">
                      <div style={{ color: "var(--text-primary)" }}>{a.activity}</div>
                      {a.actor && <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>by {a.actor}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vehicle card */}
          <div className="panel p-5">
            <div className="section-title mb-2">Vehicle</div>
            <div className="display text-lg" style={{ color: "var(--text-primary)" }}>{wo.vehicle_registration}</div>
            <div className="text-[13px]">{wo.vehicle_name}</div>
            <div className="text-[12px] mt-2" style={{ color: "var(--text-muted)" }}>
              {wo.vehicle_type} · {wo.sector}
            </div>
          </div>

          {/* Actions */}
          <div className="panel p-5 space-y-2">
            <div className="section-title mb-2">Actions</div>
            {wo.status !== "CLOSED" && (
              <>
                {wo.status === "OPEN" && (
                  <button className="btn w-full justify-start" onClick={() => progress("IN_PROGRESS")}>
                    <Wrench size={14} /> Mark In Progress
                  </button>
                )}
                {wo.status === "IN_PROGRESS" && (
                  <button className="btn w-full justify-start" onClick={() => progress("WAITING_PARTS")}>
                    <Package size={14} /> Mark Waiting Parts
                  </button>
                )}
                {wo.status === "WAITING_PARTS" && (
                  <button className="btn w-full justify-start" onClick={() => progress("IN_PROGRESS")}>
                    <Wrench size={14} /> Resume Work
                  </button>
                )}
                <button
                  className="btn w-full justify-start"
                  onClick={close}
                  disabled={!allIssued}
                  title={allIssued ? "" : "All parts must be issued first"}
                  style={!allIssued ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                >
                  <CheckCircle size={14} /> Close WO
                </button>
              </>
            )}
            <button className="btn w-full justify-start" onClick={() => setShowBER(true)}>
              <AlertTriangle size={14} /> Run BER Analysis
            </button>
            <button className="btn w-full justify-start" onClick={() => setShowProcCheck(true)} disabled={wo.parts.length === 0}>
              <ClipboardCheck size={14} /> Run Procurement Check
            </button>
          </div>

          {/* Cost form */}
          <div className="panel p-5">
            <div className="section-title mb-3">Log Maintenance Cost</div>
            <form onSubmit={submitCost} className="space-y-3">
              <select className="input" value={costForm.cost_type}
                      onChange={(e) => setCostForm({ ...costForm, cost_type: e.target.value })}>
                <option value="LABOR">LABOR</option>
                <option value="PARTS">PARTS</option>
                <option value="EXTERNAL">EXTERNAL</option>
                <option value="OTHER">OTHER</option>
              </select>
              <input className="input" placeholder="Amount (SAR)"
                     value={costForm.amount} type="number" min="0"
                     onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} />
              <input className="input" placeholder="Description (optional)"
                     value={costForm.description}
                     onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} />
              <button type="submit" className="btn btn-gold w-full" disabled={addCost.isPending}>
                {addCost.isPending ? "Logging…" : "Log Cost"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {issueModal && (
        <IssuePartsModal
          woId={woId}
          partId={issueModal.part_id}
          woPartId={issueModal.wo_part_id}
          maxQty={issueModal.max}
          partNumber={issueModal.part_number}
          onClose={() => setIssueModal(null)}
        />
      )}
      {showBER && wo && (
        <BERQuickModal vehicleId={wo.vehicle_id} woId={woId} onClose={() => setShowBER(false)} />
      )}
      {showProcCheck && wo && (
        <ProcurementQuickModal wo={wo} onClose={() => setShowProcCheck(false)} />
      )}
    </>
  );
}

function IssuePartsModal({ woId, partId, woPartId, maxQty, partNumber, onClose }:
  { woId: number; partId: number; woPartId: number; maxQty: number; partNumber?: string | null; onClose: () => void }) {
  const { data: inv } = useInventory({ });
  const issue = useIssueWOParts();
  const toast = useToast();
  const candidates = (inv || []).filter(
    (i) => i.part_id === partId && i.condition === "SERVICEABLE" && i.quantity_on_hand > 0,
  );
  const [warehouseId, setWarehouseId] = useState<number | "">(candidates[0]?.warehouse_id ?? "");
  const [qty, setQty] = useState(maxQty);

  async function submit() {
    if (!warehouseId) {
      toast.push({ kind: "error", title: "Pick a warehouse" }); return;
    }
    try {
      const r = await issue.mutateAsync({
        id: woId,
        body: { wo_part_id: woPartId, quantity: Number(qty), warehouse_id: Number(warehouseId) },
      });
      toast.push({ kind: "success", title: "Parts issued", description: `Journal #${r.journal_id} posted` });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title="Issue Parts"
      description={partNumber ? `Part ${partNumber}` : undefined}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={submit} disabled={issue.isPending}>
            {issue.isPending ? "Issuing…" : "Issue + Post Journal"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {candidates.length === 0 ? (
          <div className="text-[13px] p-3 rounded" style={{ background: "rgba(107,31,31,0.18)", color: "var(--status-nmc-t)" }}>
            No serviceable stock for this part in any warehouse. Initiate procurement first.
          </div>
        ) : (
          <>
            <div>
              <label className="section-title block mb-1.5">Warehouse</label>
              <select className="input" value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))}>
                {candidates.map((c) => (
                  <option key={c.id} value={c.warehouse_id}>
                    {c.warehouse_name} — {c.quantity_on_hand} on hand
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-title block mb-1.5">Quantity (max {maxQty})</label>
              <input className="input" type="number" min={1} max={maxQty} value={qty}
                     onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div className="text-[12px] p-3 rounded" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
              On confirm: inventory decremented AND IPSAS journal posted (Dr 6200 Maintenance / Cr 1310 Inventory) in a single transaction.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function BERQuickModal({ vehicleId, woId, onClose }: { vehicleId: number; woId: number; onClose: () => void }) {
  const analyze = useBERAnalyze();
  const toast = useToast();
  const [cost, setCost] = useState("");
  const [result, setResult] = useState<any>(null);

  async function run() {
    try {
      const r = await analyze.mutateAsync({ vehicle_id: vehicleId, wo_id: woId, repair_cost: Number(cost) });
      setResult(r);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  const recColor: Record<string, string> = {
    WRITE_OFF: "var(--status-nmc-t)",
    FINANCE_REVIEW: "var(--status-pmc-t)",
    ENGINEERING_REVIEW: "var(--gold)",
    CONTINUE_REPAIR: "var(--status-fmc-t)",
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title="Quick BER Analysis" description="Inputs auto-populated where available."
      width={580}
      footer={
        <>
          <button className="btn" onClick={onClose}>Close</button>
          <Link to="/ber" className="btn btn-gold">Open full BER Engine →</Link>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="section-title block mb-1.5">Repair Cost Estimate (SAR)</label>
          <input className="input" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <button className="btn btn-gold w-full" onClick={run} disabled={!cost || analyze.isPending}>
          {analyze.isPending ? "Analyzing…" : "Run Analysis"}
        </button>
        {result && (
          <div className="panel p-4" style={{ background: "var(--bg-primary)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="section-title">BER Score</div>
                <div className="display text-4xl mt-1" style={{ color: recColor[result.recommendation] }}>{result.ber_score.toFixed(0)}</div>
              </div>
              <span className="badge" style={{ background: "rgba(196,154,26,0.2)", color: recColor[result.recommendation], border: "1px solid rgba(196,154,26,0.3)" }}>
                {result.recommendation.replace("_", " ")}
              </span>
            </div>
            <div className="mt-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
              Triggered rules: {result.triggered_rules.length ? result.triggered_rules.join(", ") : "none"}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ProcurementQuickModal({ wo, onClose }: { wo: any; onClose: () => void }) {
  const check = useProcurementCheck();
  const { data: warehouses } = useWarehouses();
  const toast = useToast();
  const [results, setResults] = useState<any[] | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | "">("");

  async function run() {
    if (!warehouseId) return toast.push({ kind: "error", title: "Pick a warehouse" });
    try {
      const out: any[] = [];
      for (const p of wo.parts) {
        const r = await check.mutateAsync({
          part_id: p.part_id, warehouse_id: Number(warehouseId),
          quantity: p.quantity_required - p.quantity_issued || p.quantity_required,
          urgency: wo.priority, wo_id: wo.id, sector: wo.sector,
        });
        out.push({ wo_part: p, result: r });
      }
      setResults(out);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title="15-Point Procurement Check" description="Run against every part on this WO."
      width={680}
      footer={
        <>
          <button className="btn" onClick={onClose}>Close</button>
          <Link to="/procurement" className="btn btn-gold">Open Procurement →</Link>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="section-title block mb-1.5">Source warehouse</label>
          <select className="input" value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))}>
            <option value="">— select —</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </div>
        <button className="btn btn-gold w-full" onClick={run} disabled={check.isPending}>
          {check.isPending ? "Running 15-point check…" : `Run on ${wo.parts.length} part(s)`}
        </button>
        {results && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((r) => (
              <div key={r.wo_part.id} className="panel p-3" style={{ background: "var(--bg-primary)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mono text-[12px]">{r.wo_part.part_number}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.wo_part.description_en}</div>
                  </div>
                  <VerdictBadge verdict={r.result.verdict} />
                </div>
                <div className="text-[11px] mt-2" style={{ color: "var(--text-body)" }}>
                  {r.result.checks_passed.length} pass · {r.result.checks_failed.length} fail · {r.result.checks_flagged.length} flag · save SAR {formatSAR(r.result.estimated_saving)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
