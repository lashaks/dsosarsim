import { useState } from "react";
import { Check, X as XIcon, AlertTriangle, Info, Play, ShoppingCart } from "lucide-react";
import {
  useParts, useWarehouses, useProcurementCheck, useRFQs, usePOs,
} from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import VerdictBadge from "./procurement/VerdictBadge";
import { formatSAR, formatDate, clsx } from "../lib/format";
import type { ProcurementCheckResult } from "../api/types";
import { useToast } from "../components/ui/Toast";
import { Link } from "react-router-dom";

const URGENCY = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function ProcurementPage() {
  const { data: parts } = useParts();
  const { data: warehouses } = useWarehouses();
  const { data: rfqs } = useRFQs();
  const { data: pos } = usePOs();
  const check = useProcurementCheck();
  const toast = useToast();
  const [form, setForm] = useState({
    part_id: 0, warehouse_id: 0, quantity: 1, urgency: "MEDIUM",
  });
  const [result, setResult] = useState<ProcurementCheckResult | null>(null);

  async function run() {
    if (!form.part_id || !form.warehouse_id) {
      toast.push({ kind: "error", title: "Select part + warehouse" });
      return;
    }
    try {
      const sector = warehouses?.find((w) => w.id === Number(form.warehouse_id))?.sector;
      const r = await check.mutateAsync({ ...form, part_id: Number(form.part_id), warehouse_id: Number(form.warehouse_id), quantity: Number(form.quantity), sector });
      setResult(r);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Check failed", description: e?.response?.data?.detail });
    }
  }

  const openRFQs = (rfqs || []).filter((r) => ["DRAFT", "SENT", "RECEIVED"].includes(r.status)).length;
  const openPOs = (pos || []).filter((p) => ["DRAFT", "APPROVED", "SENT"].includes(p.status)).length;

  return (
    <>
      <PageHeader
        eyebrow="Supply Chain"
        title="Procurement Control"
        subtitle="Every purchase request runs through the 15-point necessity check before approval."
        actions={
          <div className="flex gap-2">
            <div className="badge badge-info">{openRFQs} Open RFQs</div>
            <div className="badge badge-gold">{openPOs} Open POs</div>
          </div>
        }
      />

      {/* CHECK PANEL */}
      <div className="panel p-5 mb-6" style={{ borderColor: "var(--gold-dim)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">Engine 2 — Procurement Necessity Check</div>
            <h3 className="display text-xl mt-1" style={{ color: "var(--text-primary)" }}>
              15-Point Justification Workflow
            </h3>
          </div>
          <ShoppingCart size={28} color="var(--gold)" strokeWidth={1.3} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="section-title block mb-1.5">Part</label>
            <select className="input" value={form.part_id} onChange={(e) => setForm({ ...form, part_id: Number(e.target.value) })}>
              <option value={0}>— select —</option>
              {parts?.map((p) => <option key={p.id} value={p.id}>{p.part_number}</option>)}
            </select>
          </div>
          <div>
            <label className="section-title block mb-1.5">Warehouse (destination)</label>
            <select className="input" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: Number(e.target.value) })}>
              <option value={0}>— select —</option>
              {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="section-title block mb-1.5">Quantity</label>
            <input className="input" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <label className="section-title block mb-1.5">Urgency</label>
            <select className="input" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
              {URGENCY.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-gold" onClick={run} disabled={check.isPending}>
          <Play size={14} /> {check.isPending ? "Running 15-point check…" : "Run Check"}
        </button>

        {result && <ProcurementResultCard r={result} />}
      </div>

      {/* RFQ + PO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <div className="section-title">RFQs</div>
              <h3 className="display text-base mt-1" style={{ color: "var(--text-primary)" }}>Request for Quotations</h3>
            </div>
            <Link to="/rfq-po" className="btn btn-sm">View all →</Link>
          </div>
          {!rfqs ? <Skeleton className="h-40 m-3" /> : (
            <table className="data-table">
              <thead><tr><th>RFQ #</th><th>Part</th><th className="num">Qty</th><th>Status</th><th>Suppliers</th></tr></thead>
              <tbody>
                {rfqs.slice(0, 6).map((r) => (
                  <tr key={r.id} style={{ cursor: "default" }}>
                    <td className="mono">{r.rfq_number}</td>
                    <td className="text-[12px]">{r.part_number}</td>
                    <td className="num">{r.quantity}</td>
                    <td><span className={clsx("badge", r.status === "AWARDED" ? "badge-fmc" : r.status === "SENT" ? "badge-info" : r.status === "RECEIVED" ? "badge-gold" : "badge-muted")}>{r.status}</span></td>
                    <td className="num mono">{r.suppliers_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <div className="section-title">POs</div>
              <h3 className="display text-base mt-1" style={{ color: "var(--text-primary)" }}>Purchase Orders</h3>
            </div>
            <Link to="/rfq-po" className="btn btn-sm">View all →</Link>
          </div>
          {!pos ? <Skeleton className="h-40 m-3" /> : (
            <table className="data-table">
              <thead><tr><th>PO #</th><th>Supplier</th><th className="num">Total SAR</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {pos.slice(0, 6).map((p) => (
                  <tr key={p.id} style={{ cursor: "default" }}>
                    <td className="mono">{p.po_number}</td>
                    <td className="text-[12px]">{p.supplier}</td>
                    <td className="num">{formatSAR(p.total_amount, { decimals: 2 })}</td>
                    <td><span className={clsx("badge", p.status === "RECEIVED" ? "badge-fmc" : p.status === "SENT" ? "badge-info" : "badge-gold")}>{p.status}</span></td>
                    <td className="text-[11px]">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function ProcurementResultCard({ r }: { r: ProcurementCheckResult }) {
  return (
    <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="section-title">Verdict</div>
          <div className="mt-2">
            <VerdictBadge verdict={r.verdict} />
          </div>
          <div className="text-[13px] mt-3 max-w-2xl" style={{ color: "var(--text-body)" }}>
            {r.reasons.length ? r.reasons.join(" · ") : "No specific concerns identified."}
          </div>
        </div>
        <div className="text-right">
          <div className="section-title">Estimated saving</div>
          <div className="display text-3xl mt-1 mono" style={{ color: "var(--gold)" }}>
            SAR {formatSAR(r.estimated_saving)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="panel p-4" style={{ background: "var(--bg-primary)" }}>
          <div className="section-title mb-3 flex items-center gap-2">
            <Check size={11} color="var(--status-fmc-t)" /> Passed ({r.checks_passed.length})
          </div>
          <ul className="space-y-2 text-[12px] max-h-72 overflow-y-auto pr-2">
            {r.checks_passed.map((c) => (
              <li key={c.check_number} className="leading-snug">
                <span className="mono" style={{ color: "var(--text-muted)" }}>#{c.check_number}</span>{" "}
                <span style={{ color: "var(--text-primary)" }}>{c.check_name}</span>
                <div style={{ color: "var(--text-muted)" }}>{c.detail}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-4" style={{ background: "var(--bg-primary)" }}>
          <div className="section-title mb-3 flex items-center gap-2">
            <AlertTriangle size={11} color="var(--status-pmc-t)" /> Flagged ({r.checks_flagged.length})
          </div>
          <ul className="space-y-2 text-[12px] max-h-72 overflow-y-auto pr-2">
            {r.checks_flagged.length === 0 && <li style={{ color: "var(--text-muted)" }}>No flags.</li>}
            {r.checks_flagged.map((c) => (
              <li key={c.check_number} className="leading-snug">
                <span className="mono" style={{ color: "var(--text-muted)" }}>#{c.check_number}</span>{" "}
                <span style={{ color: "var(--status-pmc-t)" }}>{c.check_name}</span>
                <div style={{ color: "var(--text-body)" }}>{c.detail}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-4" style={{ background: "var(--bg-primary)" }}>
          <div className="section-title mb-3 flex items-center gap-2">
            <XIcon size={11} color="var(--status-nmc-t)" /> Failed ({r.checks_failed.length})
          </div>
          <ul className="space-y-2 text-[12px] max-h-72 overflow-y-auto pr-2">
            {r.checks_failed.length === 0 && <li style={{ color: "var(--text-muted)" }}>No failures.</li>}
            {r.checks_failed.map((c) => (
              <li key={c.check_number} className="leading-snug">
                <span className="mono" style={{ color: "var(--text-muted)" }}>#{c.check_number}</span>{" "}
                <span style={{ color: "var(--status-nmc-t)" }}>{c.check_name}</span>
                <div style={{ color: "var(--text-body)" }}>{c.detail}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {r.alternative_actions.length > 0 && (
        <div className="panel p-4" style={{ background: "var(--bg-primary)" }}>
          <div className="section-title mb-3 flex items-center gap-2">
            <Info size={11} color="var(--status-info-t)" /> Recommended alternatives
          </div>
          <ul className="space-y-2">
            {r.alternative_actions.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-4 text-[13px] pb-2"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div className="mono text-[12px]" style={{ color: "var(--gold)" }}>{a.action}</div>
                  <div style={{ color: "var(--text-body)" }}>{a.detail}</div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="section-title">Saving</div>
                  <div className="mono text-[13px]" style={{ color: "var(--status-fmc-t)" }}>SAR {formatSAR(a.estimated_saving)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
