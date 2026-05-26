import { TrendingUp } from "lucide-react";
import { useFRACAS, useVehicles } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate, clsx } from "../lib/format";

export default function PredictivePage() {
  const { data: fracas } = useFRACAS();
  const { data: vehicles } = useVehicles();

  // Naïve predictive signals from FRACAS recurrence + vehicle status
  const signals = (fracas || [])
    .filter((f) => f.recurrence_count >= 3 || f.severity === "CRITICAL")
    .slice(0, 12);

  const atRiskVehicles = (vehicles || []).filter((v) => v.op_status === "PMC" && v.criticality !== "LOW");

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="Predictive Maintenance"
        subtitle="Heuristic signals derived from FRACAS recurrence and partial-mission-capable patterns. Will be replaced by an ML model in a later release."
        actions={<TrendingUp size={28} color="var(--gold)" strokeWidth={1.3} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="section-title">Failure-recurrence signals</div>
            <h3 className="display text-base mt-1" style={{ color: "var(--text-primary)" }}>High-recurrence / Critical FRACAS</h3>
          </div>
          {!fracas ? <Skeleton className="h-40 m-3" /> : signals.length === 0 ? (
            <div className="p-6 text-[13px] text-center" style={{ color: "var(--text-muted)" }}>No predictive signals.</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Vehicle</th><th>Mode</th><th>Severity</th><th className="num">Recurrence</th><th>Last seen</th></tr></thead>
              <tbody>
                {signals.map((f) => (
                  <tr key={f.id} style={{ cursor: "default" }}>
                    <td className="mono text-[12px]">{f.vehicle_registration}</td>
                    <td className="text-[12px]">{f.failure_mode}</td>
                    <td><span className={clsx("badge", f.severity === "CRITICAL" ? "badge-nmc" : "badge-pmc")}>{f.severity}</span></td>
                    <td className="num">{f.recurrence_count}</td>
                    <td className="text-[11px]">{formatDate(f.last_occurrence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="section-title">PMC vehicles at risk</div>
            <h3 className="display text-base mt-1" style={{ color: "var(--text-primary)" }}>Mission-impacting drift watchlist</h3>
          </div>
          {!vehicles ? <Skeleton className="h-40 m-3" /> : atRiskVehicles.length === 0 ? (
            <div className="p-6 text-[13px] text-center" style={{ color: "var(--text-muted)" }}>No PMC vehicles at risk.</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Registration</th><th>Name</th><th>Type</th><th>Sector</th></tr></thead>
              <tbody>
                {atRiskVehicles.map((v) => (
                  <tr key={v.id} style={{ cursor: "default" }}>
                    <td className="mono">{v.registration}</td>
                    <td>{v.name}</td>
                    <td>{v.type}</td>
                    <td className="text-[12px]">{v.sector}</td>
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
