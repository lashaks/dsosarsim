import { useMemo, useState } from "react";
import { Search, Plus, Filter, X } from "lucide-react";
import { useVehicles, useReadiness } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusBadge, CriticalityDot } from "../components/ui/StatusBadge";
import VehicleDetailPanel from "./fleet/VehicleDetailPanel";
import { formatSAR, formatPct } from "../lib/format";
import type { Vehicle } from "../api/types";

const SECTORS = ["All", "Central Command", "Eastern Province", "Western Province"];
const TYPES = ["All", "MBT", "IFV", "APC", "SPH", "SUPPORT"];

function readinessContribution(v: Vehicle): number {
  const w = v.criticality === "HIGH" ? 3 : v.criticality === "MEDIUM" ? 2 : 1;
  const c = v.op_status === "FMC" ? 1.0 : v.op_status === "PMC" ? 0.5 : 0.0;
  return w * c;
}

export default function FleetPage() {
  const [sector, setSector] = useState("All");
  const [type, setType] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const filters = useMemo(() => ({
    sector: sector === "All" ? undefined : sector,
    type: type === "All" ? undefined : type,
    search: search || undefined,
  }), [sector, type, search]);

  const { data: vehicles, isLoading } = useVehicles(filters);
  const { data: readiness } = useReadiness({
    sector: sector === "All" ? undefined : sector,
    type: type === "All" ? undefined : type,
  });

  const sectorBreakdown = useMemo(() => {
    if (!vehicles) return [];
    const groups: Record<string, Vehicle[]> = {};
    vehicles.forEach((v) => (groups[v.sector] = [...(groups[v.sector] || []), v]));
    return Object.entries(groups).map(([sec, list]) => {
      let n = 0, d = 0;
      list.forEach((v) => {
        const w = v.criticality === "HIGH" ? 3 : v.criticality === "MEDIUM" ? 2 : 1;
        const c = v.op_status === "FMC" ? 1 : v.op_status === "PMC" ? 0.5 : 0;
        n += w * c; d += w;
      });
      return {
        sector: sec, total: list.length,
        fmc: list.filter((v) => v.op_status === "FMC").length,
        pmc: list.filter((v) => v.op_status === "PMC").length,
        nmc: list.filter((v) => v.op_status === "NMC").length,
        readiness: d > 0 ? (n / d) * 100 : 0,
      };
    });
  }, [vehicles]);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Fleet Management"
        subtitle="Authoritative register of all sustainment-tracked vehicles, weighted by criticality."
        actions={
          <button className="btn btn-gold"><Plus size={14} /> Add Vehicle</button>
        }
      />

      {/* Readiness summary bar */}
      <div className="panel p-5 mb-5">
        <div className="flex items-end justify-between mb-3 gap-4 flex-wrap">
          <div>
            <div className="section-title">Weighted Readiness</div>
            <div className="display text-4xl mt-1" style={{ color: "var(--text-primary)" }}>
              {readiness ? formatPct(readiness.readiness_pct) : "—"}
            </div>
            <div className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
              Σ(weight × capability) ÷ Σ(weight) × 100  —  HIGH=3 · MEDIUM=2 · LOW=1
            </div>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total", v: readiness?.total_vehicles ?? 0, c: "var(--text-primary)" },
              { label: "FMC", v: readiness?.fmc_count ?? 0, c: "var(--status-fmc-t)" },
              { label: "PMC", v: readiness?.pmc_count ?? 0, c: "var(--status-pmc-t)" },
              { label: "NMC", v: readiness?.nmc_count ?? 0, c: "var(--status-nmc-t)" },
            ].map((x) => (
              <div key={x.label} className="text-center px-4 py-2"
                   style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 6 }}>
                <div className="section-title">{x.label}</div>
                <div className="mono font-bold text-xl mt-1" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual readiness bar */}
        <div className="h-2 rounded mt-3 overflow-hidden" style={{ background: "var(--bg-primary)" }}>
          {readiness && (
            <div className="h-full flex">
              <div style={{ width: `${(readiness.fmc_count / readiness.total_vehicles) * 100}%`, background: "var(--status-fmc-t)" }} />
              <div style={{ width: `${(readiness.pmc_count / readiness.total_vehicles) * 100}%`, background: "var(--status-pmc-t)" }} />
              <div style={{ width: `${(readiness.nmc_count / readiness.total_vehicles) * 100}%`, background: "var(--status-nmc-t)" }} />
            </div>
          )}
        </div>

        {/* Sector breakdown */}
        {sectorBreakdown.length > 1 && (
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="section-title mb-3">Per-Sector Readiness</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sectorBreakdown.map((s) => (
                <div key={s.sector} className="px-3 py-2 rounded"
                     style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>{s.sector}</span>
                    <span className="mono font-bold" style={{ color: "var(--gold)" }}>{s.readiness.toFixed(1)}%</span>
                  </div>
                  <div className="text-[11px] mt-1 mono" style={{ color: "var(--text-muted)" }}>
                    {s.total} veh · {s.fmc}F / {s.pmc}P / {s.nmc}N
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="panel p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
          <Filter size={13} /> Filters
        </div>
        <select className="input" style={{ width: "auto" }} value={sector} onChange={(e) => setSector(e.target.value)}>
          {SECTORS.map((s) => <option key={s} value={s}>{s === "All" ? "All sectors" : s}</option>)}
        </select>
        <select className="input" style={{ width: "auto" }} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((s) => <option key={s} value={s}>{s === "All" ? "All types" : s}</option>)}
        </select>
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
          <input
            className="input pl-9" placeholder="Search registration, name, brigade…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1" onClick={() => setSearch("")}>
              <X size={12} color="var(--text-muted)" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-2">
            {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Name</th>
                <th>Type</th>
                <th>Sector</th>
                <th>Brigade</th>
                <th>Criticality</th>
                <th>Status</th>
                <th className="num">Readiness Contribution</th>
                <th className="num">Acq. Cost (SAR)</th>
              </tr>
            </thead>
            <tbody>
              {vehicles?.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  No vehicles match these filters.
                </td></tr>
              )}
              {vehicles?.map((v) => (
                <tr key={v.id} onClick={() => setSelected(v.id)}>
                  <td className="mono" style={{ color: "var(--text-primary)" }}>{v.registration}</td>
                  <td>{v.name}</td>
                  <td>{v.type}</td>
                  <td>{v.sector}</td>
                  <td className="text-[12px]" style={{ color: "var(--text-muted)" }}>{v.brigade || "—"}</td>
                  <td><CriticalityDot level={v.criticality} /></td>
                  <td><StatusBadge status={v.op_status} compact /></td>
                  <td className="num">{readinessContribution(v).toFixed(1)}</td>
                  <td className="num">{formatSAR(v.acquisition_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <VehicleDetailPanel vehicleId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
