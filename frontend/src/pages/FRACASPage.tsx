import { useState } from "react";
import { Plus, Activity } from "lucide-react";
import { useFRACAS, useFRACASTrends, useCreateFRACAS, useVehicles } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { formatDate, clsx } from "../lib/format";
import { useToast } from "../components/ui/Toast";

export default function FRACASPage() {
  const [severity, setSeverity] = useState("");
  const { data, isLoading } = useFRACAS({ severity: severity || undefined });
  const { data: trends } = useFRACASTrends();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="FRACAS"
        subtitle="Failure Reporting, Analysis & Corrective Action System. Recurrence drives BER Rule 4."
        actions={<button className="btn btn-gold" onClick={() => setShowCreate(true)}><Plus size={14} /> New Entry</button>}
      />

      {/* Trend cards */}
      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="panel p-5">
            <div className="section-title mb-3">By severity</div>
            <div className="grid grid-cols-3 gap-3">
              {trends.by_severity?.map((s: any) => (
                <div key={s.severity} className="text-center p-3"
                     style={{ background: "var(--bg-primary)", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <div className="display text-2xl mono font-bold"
                       style={{ color: s.severity === "CRITICAL" ? "var(--status-nmc-t)" : s.severity === "MAJOR" ? "var(--status-pmc-t)" : "var(--text-muted)" }}>
                    {s.count}
                  </div>
                  <div className="section-title mt-1">{s.severity}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-5">
            <div className="section-title mb-3">Top failure modes</div>
            <ul className="space-y-2 text-[12px]">
              {trends.by_mode?.slice(0, 6).map((m: any, i: number) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{m.mode}</span>
                  <span className="mono" style={{ color: "var(--gold)" }}>{m.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="panel p-3 mb-3">
        <select className="input" style={{ width: "auto" }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="MAJOR">MAJOR</option>
          <option value="MINOR">MINOR</option>
        </select>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {isLoading ? <Skeleton className="h-40 m-3" /> : (
          <table className="data-table">
            <thead><tr>
              <th>Vehicle</th><th>Failure Mode</th><th>Cause</th><th>Effect</th>
              <th>Severity</th><th className="num">Recurrence</th><th>First</th><th>Last</th>
            </tr></thead>
            <tbody>
              {data?.map((f) => (
                <tr key={f.id} style={{ cursor: "default" }}>
                  <td className="mono text-[12px]">{f.vehicle_registration}</td>
                  <td>{f.failure_mode}</td>
                  <td className="text-[12px]">{f.failure_cause}</td>
                  <td className="text-[12px]">{f.failure_effect}</td>
                  <td><span className={clsx("badge", f.severity === "CRITICAL" ? "badge-nmc" : f.severity === "MAJOR" ? "badge-pmc" : "badge-muted")}>{f.severity}</span></td>
                  <td className="num mono">{f.recurrence_count}</td>
                  <td className="text-[11px]">{formatDate(f.first_occurrence)}</td>
                  <td className="text-[11px]">{formatDate(f.last_occurrence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const { data: vehicles } = useVehicles();
  const create = useCreateFRACAS();
  const toast = useToast();
  const [form, setForm] = useState({
    vehicle_id: 0, failure_mode: "", failure_cause: "", failure_effect: "",
    severity: "MAJOR", corrective_action: "",
  });

  async function submit() {
    if (!form.vehicle_id || !form.failure_mode) return toast.push({ kind: "error", title: "Vehicle + mode required" });
    try {
      await create.mutateAsync({ ...form, vehicle_id: Number(form.vehicle_id) });
      toast.push({ kind: "success", title: "FRACAS entry created" });
      onClose();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="New FRACAS Entry"
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-gold" onClick={submit} disabled={create.isPending}>{create.isPending ? "Saving…" : "Save"}</button></>}
    >
      <div className="space-y-3">
        <Field label="Vehicle">
          <select className="input" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: Number(e.target.value) })}>
            <option value={0}>— select —</option>
            {vehicles?.map((v) => <option key={v.id} value={v.id}>{v.registration}</option>)}
          </select>
        </Field>
        <Field label="Failure mode">
          <input className="input" value={form.failure_mode} onChange={(e) => setForm({ ...form, failure_mode: e.target.value })} />
        </Field>
        <Field label="Cause">
          <input className="input" value={form.failure_cause} onChange={(e) => setForm({ ...form, failure_cause: e.target.value })} />
        </Field>
        <Field label="Effect">
          <input className="input" value={form.failure_effect} onChange={(e) => setForm({ ...form, failure_effect: e.target.value })} />
        </Field>
        <Field label="Severity">
          <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="CRITICAL">CRITICAL</option>
            <option value="MAJOR">MAJOR</option>
            <option value="MINOR">MINOR</option>
          </select>
        </Field>
        <Field label="Corrective action">
          <textarea className="input" rows={3} value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="section-title block mb-1.5">{label}</label>{children}</div>;
}
