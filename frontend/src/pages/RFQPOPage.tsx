import { useState } from "react";
import { Plus, Award, Truck } from "lucide-react";
import {
  useRFQs, useRFQ, usePOs, useCreateRFQ, useAddRFQLine, useAwardRFQ,
  useReceivePO, useParts, useWarehouses,
} from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { formatSAR, formatDate, clsx } from "../lib/format";
import { useToast } from "../components/ui/Toast";

export default function RFQPOPage() {
  const [tab, setTab] = useState<"rfq" | "po">("rfq");
  const { data: rfqs, isLoading: lr } = useRFQs();
  const { data: pos, isLoading: lp } = usePOs();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<number | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Supply Chain"
        title="RFQ / Purchase Orders"
        subtitle="Quotation lifecycle from RFQ → award → PO → receipt + journal posting."
        actions={
          tab === "rfq" && <button className="btn btn-gold" onClick={() => setShowCreate(true)}><Plus size={14} /> New RFQ</button>
        }
      />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("rfq")} className={clsx("btn", tab === "rfq" && "btn-gold")}>RFQs</button>
        <button onClick={() => setTab("po")} className={clsx("btn", tab === "po" && "btn-gold")}>Purchase Orders</button>
      </div>

      {tab === "rfq" ? (
        <div className="panel overflow-hidden">
          {lr ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
            <table className="data-table">
              <thead><tr>
                <th>RFQ #</th><th>Part</th><th className="num">Qty</th><th>Status</th>
                <th className="num">Suppliers</th><th>Created</th><th></th>
              </tr></thead>
              <tbody>
                {rfqs?.map((r) => (
                  <tr key={r.id} onClick={() => setSelectedRFQ(r.id)}>
                    <td className="mono">{r.rfq_number}</td>
                    <td>
                      <div className="mono text-[12px]">{r.part_number}</div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.description_en}</div>
                    </td>
                    <td className="num">{r.quantity}</td>
                    <td><span className={clsx("badge", r.status === "AWARDED" ? "badge-fmc" : r.status === "SENT" ? "badge-info" : r.status === "RECEIVED" ? "badge-gold" : "badge-muted")}>{r.status}</span></td>
                    <td className="num mono">{r.suppliers_count}</td>
                    <td className="text-[11px]">{formatDate(r.created_at)}</td>
                    <td><button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedRFQ(r.id); }}>Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {lp ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
            <table className="data-table">
              <thead><tr>
                <th>PO #</th><th>Supplier</th><th className="num">Total SAR</th><th>Status</th>
                <th>Expected</th><th>Lines</th><th></th>
              </tr></thead>
              <tbody>
                {pos?.map((p) => (
                  <tr key={p.id} style={{ cursor: "default" }}>
                    <td className="mono">{p.po_number}</td>
                    <td>{p.supplier}</td>
                    <td className="num">{formatSAR(p.total_amount, { decimals: 2 })}</td>
                    <td><span className={clsx("badge", p.status === "RECEIVED" ? "badge-fmc" : p.status === "SENT" ? "badge-info" : "badge-gold")}>{p.status}</span></td>
                    <td className="text-[11px]">{formatDate(p.expected_delivery)}</td>
                    <td className="text-[11px]">{p.lines.length} line(s)</td>
                    <td>
                      {p.status === "SENT" || p.status === "APPROVED" ? (
                        <ReceivePOAction po={p} />
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCreate && <CreateRFQModal onClose={() => setShowCreate(false)} />}
      {selectedRFQ && <RFQDetailModal id={selectedRFQ} onClose={() => setSelectedRFQ(null)} />}
    </>
  );
}

function CreateRFQModal({ onClose }: { onClose: () => void }) {
  const { data: parts } = useParts();
  const { data: warehouses } = useWarehouses();
  const create = useCreateRFQ();
  const toast = useToast();
  const [form, setForm] = useState({ part_id: 0, warehouse_id: 0, quantity: 1, notes: "" });

  async function submit() {
    if (!form.part_id || !form.warehouse_id) return toast.push({ kind: "error", title: "Select part and warehouse" });
    try {
      const r = await create.mutateAsync({ ...form, part_id: Number(form.part_id), warehouse_id: Number(form.warehouse_id), quantity: Number(form.quantity) });
      toast.push({ kind: "success", title: "RFQ created", description: r.rfq_number });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title="Create RFQ" description="Issued in DRAFT state — add supplier quotes next."
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-gold" onClick={submit} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</button></>}
    >
      <div className="space-y-3">
        <Field label="Part">
          <select className="input" value={form.part_id} onChange={(e) => setForm({ ...form, part_id: Number(e.target.value) })}>
            <option value={0}>— select part —</option>
            {parts?.map((p) => <option key={p.id} value={p.id}>{p.part_number} — {p.description_en}</option>)}
          </select>
        </Field>
        <Field label="Destination warehouse">
          <select className="input" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: Number(e.target.value) })}>
            <option value={0}>—</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </Field>
        <Field label="Quantity">
          <input className="input" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
        </Field>
        <Field label="Notes (optional)">
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function RFQDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: rfq } = useRFQ(id);
  const addLine = useAddRFQLine();
  const award = useAwardRFQ();
  const toast = useToast();
  const [line, setLine] = useState({ supplier: "", unit_price: 0, total_price: 0, lead_days: 30 });

  if (!rfq) return null;
  const rfqId = rfq.id;
  const rfqQty = rfq.quantity;

  async function add() {
    if (!line.supplier || !line.unit_price) return toast.push({ kind: "error", title: "Supplier + price required" });
    try {
      const total = line.total_price || line.unit_price * rfqQty;
      await addLine.mutateAsync({ id: rfqId, body: { ...line, total_price: total } });
      toast.push({ kind: "success", title: "Quote added" });
      setLine({ supplier: "", unit_price: 0, total_price: 0, lead_days: 30 });
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  async function doAward(lineId: number) {
    try {
      const po = await award.mutateAsync({ rfqId, lineId });
      toast.push({ kind: "success", title: "Awarded", description: `PO ${po.po_number} created` });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  const cheapest = rfq.lines.reduce<any>((best, l) => (!best || l.unit_price < best.unit_price ? l : best), null);

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}
      title={rfq.rfq_number} description={`${rfq.part_number} — qty ${rfq.quantity}`}
      width={680} footer={<button className="btn" onClick={onClose}>Close</button>}
    >
      <div className="space-y-4">
        <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Status: <span className="badge badge-info">{rfq.status}</span>
          {rfq.awarded_at && <span className="ml-3">Awarded {formatDate(rfq.awarded_at)}</span>}
        </div>

        <div>
          <div className="section-title mb-2">Supplier quotes ({rfq.lines.length})</div>
          {rfq.lines.length === 0 ? (
            <div className="text-[13px] py-4 text-center" style={{ color: "var(--text-muted)" }}>No quotes yet.</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Supplier</th><th className="num">Unit SAR</th><th className="num">Total SAR</th><th className="num">Lead (d)</th><th></th></tr></thead>
              <tbody>
                {rfq.lines.map((l) => (
                  <tr key={l.id} style={{ cursor: "default", background: l === cheapest ? "rgba(45,106,63,0.1)" : undefined }}>
                    <td>
                      {l.supplier}
                      {l === cheapest && <span className="badge badge-fmc ml-2">BEST</span>}
                      {l.is_awarded && <span className="badge badge-gold ml-2">AWARDED</span>}
                    </td>
                    <td className="num">{formatSAR(l.unit_price, { decimals: 2 })}</td>
                    <td className="num">{formatSAR(l.total_price, { decimals: 2 })}</td>
                    <td className="num">{l.lead_days}</td>
                    <td>
                      {rfq.status !== "AWARDED" && (
                        <button className="btn btn-sm btn-gold" onClick={() => doAward(l.id)} disabled={award.isPending}>
                          <Award size={12} /> Award
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rfq.status !== "AWARDED" && (
          <div className="panel p-4" style={{ background: "var(--bg-primary)" }}>
            <div className="section-title mb-3">Add supplier quote</div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input col-span-2" placeholder="Supplier" value={line.supplier}
                     onChange={(e) => setLine({ ...line, supplier: e.target.value })} />
              <input className="input" type="number" step={0.01} min={0} placeholder="Unit price (SAR)"
                     value={line.unit_price || ""} onChange={(e) => setLine({ ...line, unit_price: Number(e.target.value) })} />
              <input className="input" type="number" min={1} placeholder="Lead days"
                     value={line.lead_days} onChange={(e) => setLine({ ...line, lead_days: Number(e.target.value) })} />
            </div>
            <button className="btn btn-gold mt-3" onClick={add} disabled={addLine.isPending}>
              {addLine.isPending ? "Adding…" : "Add Quote"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ReceivePOAction({ po }: { po: any }) {
  const { data: warehouses } = useWarehouses();
  const receive = useReceivePO();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [wid, setWid] = useState<number | "">(warehouses?.[0]?.id ?? "");

  async function submit() {
    if (!wid) return toast.push({ kind: "error", title: "Pick warehouse" });
    try {
      await receive.mutateAsync({ id: po.id, warehouseId: Number(wid) });
      toast.push({ kind: "success", title: "PO received", description: "Inventory + journal posted" });
      setOpen(false);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <>
      <button className="btn btn-sm btn-gold" onClick={() => setOpen(true)}><Truck size={12} /> Receive</button>
      {open && (
        <Modal open onOpenChange={(o) => !o && setOpen(false)} title={`Receive ${po.po_number}`}
          footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-gold" onClick={submit} disabled={receive.isPending}>{receive.isPending ? "Posting…" : "Receive + Journal"}</button></>}
        >
          <div className="space-y-3">
            <Field label="Receiving warehouse">
              <select className="input" value={wid} onChange={(e) => setWid(Number(e.target.value))}>
                {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
              </select>
            </Field>
            <div className="text-[12px] p-3 rounded" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
              All {po.lines.length} PO line(s) will be received in full. Inventory updated + Dr 1310 / Cr 2110 posted per line.
            </div>
          </div>
        </Modal>
      )}
    </>
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
