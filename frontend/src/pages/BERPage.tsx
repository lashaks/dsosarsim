import { useState, useMemo } from "react";
import { AlertTriangle, Play, Save, Check, X } from "lucide-react";
import { useVehicles, useWorkOrders, useBERAnalyze, useSaveBERReview, useBERReviews } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import BERGauge from "../components/charts/BERGauge";
import { formatSAR, formatDate, clsx } from "../lib/format";
import type { BERAnalyzeResult } from "../api/types";
import { useToast } from "../components/ui/Toast";

export default function BERPage() {
  const { data: vehicles } = useVehicles();
  const { data: wos } = useWorkOrders();
  const analyze = useBERAnalyze();
  const save = useSaveBERReview();
  const toast = useToast();
  const { data: reviews } = useBERReviews();

  const [form, setForm] = useState({
    vehicle_id: 0, wo_id: 0,
    repair_cost: 0, replacement_value: 0, cumulative_maintenance_cost: 0,
    acquisition_cost: 0, remaining_life_years: 0, recurrence_count: 0,
    downtime_days: 0, obsolete_parts: false,
  });
  const [result, setResult] = useState<BERAnalyzeResult | null>(null);

  const woOptions = useMemo(
    () => (wos || []).filter((w) => !form.vehicle_id || w.vehicle_id === Number(form.vehicle_id)),
    [wos, form.vehicle_id],
  );

  async function run() {
    if (!form.vehicle_id || !form.repair_cost) {
      toast.push({ kind: "error", title: "Vehicle + repair cost required" });
      return;
    }
    try {
      const payload: any = { vehicle_id: Number(form.vehicle_id), repair_cost: Number(form.repair_cost), downtime_days: Number(form.downtime_days), obsolete_parts: form.obsolete_parts };
      if (form.wo_id) payload.wo_id = Number(form.wo_id);
      if (form.replacement_value) payload.replacement_value = Number(form.replacement_value);
      if (form.cumulative_maintenance_cost) payload.cumulative_maintenance_cost = Number(form.cumulative_maintenance_cost);
      if (form.acquisition_cost) payload.acquisition_cost = Number(form.acquisition_cost);
      if (form.remaining_life_years) payload.remaining_life_years = Number(form.remaining_life_years);
      if (form.recurrence_count) payload.recurrence_count = Number(form.recurrence_count);
      const r = await analyze.mutateAsync(payload);
      setResult(r);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  async function persist() {
    if (!result) return;
    try {
      const payload: any = { vehicle_id: result.vehicle_id, repair_cost: result.inputs.repair_cost,
        replacement_value: result.inputs.replacement_value, cumulative_maintenance_cost: result.inputs.cumulative_maintenance_cost,
        acquisition_cost: result.inputs.acquisition_cost, remaining_life_years: result.inputs.remaining_life_years,
        recurrence_count: result.inputs.recurrence_count, downtime_days: result.inputs.downtime_days,
        obsolete_parts: result.inputs.obsolete_parts };
      if (result.inputs.wo_id) payload.wo_id = result.inputs.wo_id;
      await save.mutateAsync(payload);
      toast.push({ kind: "success", title: "BER review saved", description: "Audit trail recorded all inputs." });
    } catch (e: any) {
      toast.push({ kind: "error", title: "Failed", description: e?.response?.data?.detail });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Intelligence — Engine 3"
        title="BER Engine"
        subtitle="Beyond Economical Repair: 5-rule scoring (0–100) that drives write-off, finance review, engineering review, or continue-repair decisions. All inputs and rule outcomes are persisted for audit."
        actions={<AlertTriangle size={28} color="var(--gold)" strokeWidth={1.3} />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        {/* INPUT FORM */}
        <div className="panel p-5 xl:col-span-2">
          <div className="section-title mb-3">Inputs</div>
          <div className="space-y-3">
            <Field label="Vehicle">
              <select className="input" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: Number(e.target.value) })}>
                <option value={0}>— select vehicle —</option>
                {vehicles?.map((v) => <option key={v.id} value={v.id}>{v.registration} — {v.name}</option>)}
              </select>
            </Field>
            <Field label="Work order (optional)">
              <select className="input" value={form.wo_id} onChange={(e) => setForm({ ...form, wo_id: Number(e.target.value) })}>
                <option value={0}>—</option>
                {woOptions.map((w) => <option key={w.id} value={w.id}>{w.wo_number} — {w.title}</option>)}
              </select>
            </Field>
            <Field label="Repair cost estimate (SAR) *">
              <input className="input" type="number" min={0} value={form.repair_cost} onChange={(e) => setForm({ ...form, repair_cost: Number(e.target.value) })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Replacement value (auto)">
                <input className="input" type="number" min={0} value={form.replacement_value} onChange={(e) => setForm({ ...form, replacement_value: Number(e.target.value) })} placeholder="auto" />
              </Field>
              <Field label="Cumulative maint. (auto)">
                <input className="input" type="number" min={0} value={form.cumulative_maintenance_cost} onChange={(e) => setForm({ ...form, cumulative_maintenance_cost: Number(e.target.value) })} placeholder="auto" />
              </Field>
              <Field label="Acquisition cost (auto)">
                <input className="input" type="number" min={0} value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: Number(e.target.value) })} placeholder="auto" />
              </Field>
              <Field label="Remaining life yrs (auto)">
                <input className="input" type="number" min={0} step={0.5} value={form.remaining_life_years} onChange={(e) => setForm({ ...form, remaining_life_years: Number(e.target.value) })} placeholder="auto" />
              </Field>
              <Field label="Recurrence count (auto)">
                <input className="input" type="number" min={0} value={form.recurrence_count} onChange={(e) => setForm({ ...form, recurrence_count: Number(e.target.value) })} placeholder="auto" />
              </Field>
              <Field label="Downtime days">
                <input className="input" type="number" min={0} value={form.downtime_days} onChange={(e) => setForm({ ...form, downtime_days: Number(e.target.value) })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={form.obsolete_parts} onChange={(e) => setForm({ ...form, obsolete_parts: e.target.checked })} />
              <span>Critical parts confirmed obsolete</span>
            </label>
            <button className="btn btn-gold w-full justify-center" onClick={run} disabled={analyze.isPending}>
              <Play size={14} /> {analyze.isPending ? "Analyzing…" : "Run BER Analysis"}
            </button>
            <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
              Leave a field blank/0 to auto-populate from the vehicle record, FRACAS history, and IPSAS 17 depreciation schedule.
            </p>
          </div>
        </div>

        {/* RESULT */}
        <div className="xl:col-span-3 space-y-4">
          {!result ? (
            <div className="panel p-10 text-center">
              <AlertTriangle size={40} color="var(--text-muted)" strokeWidth={1.2} className="mx-auto mb-3" />
              <div className="display text-lg" style={{ color: "var(--text-primary)" }}>Awaiting analysis</div>
              <p className="text-[13px] mt-2" style={{ color: "var(--text-muted)" }}>
                Run the engine to see the score, triggered rules, and lifecycle context.
              </p>
            </div>
          ) : (
            <>
              <div className="panel p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <BERGauge score={result.ber_score} recommendation={result.recommendation} />
                  <div>
                    <div className="section-title mb-3">Triggered Rules</div>
                    <div className="space-y-2">
                      {result.rule_details.map((r) => (
                        <div key={r.rule_number}
                             className={clsx("flex items-start gap-3 px-3 py-2 rounded text-[12px]")}
                             style={{
                               background: r.triggered ? "rgba(224,80,80,0.1)" : "var(--bg-primary)",
                               border: `1px solid ${r.triggered ? "rgba(224,80,80,0.3)" : "var(--border)"}`,
                               opacity: r.triggered ? 1 : 0.5,
                             }}>
                          <div className="mt-0.5">
                            {r.triggered ? <Check size={14} color="var(--status-nmc-t)" /> : <X size={12} color="var(--text-muted)" />}
                          </div>
                          <div className="flex-1">
                            <div style={{ color: "var(--text-primary)" }}>
                              <span className="mono mr-2">#{r.rule_number}</span> {r.rule_name}
                            </div>
                            <div className="mt-1" style={{ color: "var(--text-muted)" }}>{r.detail}</div>
                          </div>
                          <div className="mono text-[12px] font-bold whitespace-nowrap"
                               style={{ color: r.triggered ? "var(--status-nmc-t)" : "var(--text-muted)" }}>
                            +{r.points}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost comparison */}
              <div className="panel p-5">
                <div className="section-title mb-3">Cost Comparison</div>
                <CostBars c={result.cost_comparison} />
              </div>

              {/* Lifecycle */}
              <div className="panel p-5">
                <div className="section-title mb-3">Lifecycle Summary</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Kpi k="Age" v={`${result.lifecycle_summary.age_years.toFixed(1)} yr`} />
                  <Kpi k="Useful life" v={`${result.lifecycle_summary.useful_life_years} yr`} />
                  <Kpi k="Remaining life" v={`${result.lifecycle_summary.remaining_life_years.toFixed(1)} yr`} />
                  <Kpi k="% depreciated" v={`${result.lifecycle_summary.pct_depreciated.toFixed(1)}%`} accent />
                  <Kpi k="Accum. depreciation" v={`SAR ${formatSAR(result.lifecycle_summary.accumulated_depreciation)}`} />
                  <Kpi k="NBV" v={`SAR ${formatSAR(result.lifecycle_summary.nbv)}`} accent />
                </div>
              </div>

              {/* Actions */}
              <div className="panel p-4 flex flex-wrap gap-2 justify-end">
                <button className="btn btn-gold" onClick={persist} disabled={save.isPending}>
                  <Save size={14} /> {save.isPending ? "Saving…" : "Save Review"}
                </button>
                {result.recommendation === "WRITE_OFF" && (
                  <button className="btn btn-danger">Initiate Disposal</button>
                )}
                {result.recommendation === "ENGINEERING_REVIEW" && (
                  <button className="btn">Request Engineering Review</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* History */}
      <div className="panel overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="section-title">BER History</div>
          <h3 className="display text-base mt-1" style={{ color: "var(--text-primary)" }}>Recorded Reviews</h3>
        </div>
        {!reviews ? <Skeleton className="h-40 m-3" /> : reviews.length === 0 ? (
          <div className="p-6 text-[13px] text-center" style={{ color: "var(--text-muted)" }}>
            No BER reviews yet.
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Vehicle</th><th>Date</th><th className="num">Score</th><th>Recommendation</th>
              <th className="num">Repair Cost</th><th className="num">Replacement</th><th>Reviewed By</th>
            </tr></thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} style={{ cursor: "default" }}>
                  <td>
                    <div className="mono text-[12px]">{r.vehicle_registration}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.vehicle_name}</div>
                  </td>
                  <td className="text-[11px]">{formatDate(r.created_at)}</td>
                  <td className="num mono font-bold"
                      style={{ color: r.ber_score >= 70 ? "var(--status-nmc-t)" : r.ber_score >= 50 ? "var(--status-pmc-t)" : r.ber_score >= 30 ? "var(--gold)" : "var(--status-fmc-t)" }}>
                    {r.ber_score.toFixed(0)}
                  </td>
                  <td>
                    <span className={clsx("badge", r.recommendation === "WRITE_OFF" ? "badge-nmc" : r.recommendation === "FINANCE_REVIEW" ? "badge-pmc" : r.recommendation === "ENGINEERING_REVIEW" ? "badge-gold" : "badge-fmc")}>
                      {r.recommendation.replace("_", " ")}
                    </span>
                  </td>
                  <td className="num">{formatSAR(r.repair_cost)}</td>
                  <td className="num">{formatSAR(r.replacement_value)}</td>
                  <td className="text-[12px]">{r.reviewed_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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

function Kpi({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="section-title">{k}</div>
      <div className={clsx("mono mt-1 text-[14px]")} style={{ color: accent ? "var(--gold)" : "var(--text-primary)" }}>{v}</div>
    </div>
  );
}

function CostBars({ c }: { c: any }) {
  const max = Math.max(c.repair_cost, c.replacement_value, c.cumulative_maintenance, c.acquisition_cost, 1);
  const bars = [
    { label: "Repair cost", value: c.repair_cost, color: "var(--status-nmc-t)" },
    { label: "Cumulative maintenance", value: c.cumulative_maintenance, color: "var(--status-pmc-t)" },
    { label: "Acquisition cost", value: c.acquisition_cost, color: "var(--text-muted)" },
    { label: "Replacement value", value: c.replacement_value, color: "var(--status-fmc-t)" },
  ];
  return (
    <div className="space-y-3">
      {bars.map((b) => (
        <div key={b.label}>
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span style={{ color: "var(--text-body)" }}>{b.label}</span>
            <span className="mono" style={{ color: "var(--text-primary)" }}>SAR {formatSAR(b.value)}</span>
          </div>
          <div className="h-2 rounded" style={{ background: "var(--bg-primary)" }}>
            <div className="h-full rounded transition-all"
                 style={{ width: `${(b.value / max) * 100}%`, background: b.color }} />
          </div>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="text-[12px]">
          Repair / Replacement: <span className="mono font-bold ml-1"
            style={{ color: c.repair_vs_replacement_pct > 60 ? "var(--status-nmc-t)" : "var(--text-primary)" }}>
            {c.repair_vs_replacement_pct.toFixed(1)}%
          </span>
        </div>
        <div className="text-[12px]">
          Cum.Maint / Acquisition: <span className="mono font-bold ml-1"
            style={{ color: c.maintenance_vs_acquisition_pct > 50 ? "var(--status-pmc-t)" : "var(--text-primary)" }}>
            {c.maintenance_vs_acquisition_pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
