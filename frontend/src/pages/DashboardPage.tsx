import { Link } from "react-router-dom";
import {
  Activity, ClipboardList, ShoppingCart, AlertOctagon, TrendingUp,
  TrendingDown, ArrowRight, CircleDollarSign,
} from "lucide-react";
import { useDashboardSummary } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusBadge, PriorityBadge, WOStatusBadge, CriticalityDot } from "../components/ui/StatusBadge";
import { formatSAR, formatPct, formatDate, readinessColor } from "../lib/format";
import ReadinessTrendChart from "../components/charts/ReadinessTrendChart";
import FleetDonut from "../components/charts/FleetDonut";

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Command Dashboard"
                    subtitle="Real-time view of fleet readiness, sustainment operations, and IPSAS posture." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </>
    );
  }

  const trend = data.readiness_trend;
  const last = trend.length ? trend[trend.length - 1].readiness_pct : data.readiness.readiness_pct;
  const prev = trend.length > 1 ? trend[Math.max(0, trend.length - 8)].readiness_pct : last;
  const delta = last - prev;
  const trendDir = Math.abs(delta) < 0.1 ? "flat" : delta > 0 ? "up" : "down";

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Command Dashboard"
        subtitle="Real-time view of fleet readiness, sustainment operations, and IPSAS posture."
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Fleet Readiness"
          value={data.readiness.readiness_pct.toFixed(1)}
          unit="%"
          accent={data.readiness.readiness_pct >= 80 ? "green" : data.readiness.readiness_pct >= 60 ? "amber" : "red"}
          trend={trendDir as any}
          trendValue={`${delta > 0 ? "+" : ""}${delta.toFixed(1)}% 7d`}
          hint={`${data.readiness.total_vehicles} vehicles weighted`}
          icon={<Activity size={18} color="var(--gold)" />}
        />
        <StatCard
          label="Open Work Orders"
          value={data.open_work_orders_count}
          accent={data.open_work_orders_count > 0 ? "gold" : "default"}
          hint={
            <>
              <span className="mono">{data.in_progress_count}</span> in progress ·{" "}
              <span className="mono">{data.waiting_parts_count}</span> waiting parts
            </>
          }
          icon={<ClipboardList size={18} color="var(--gold)" />}
        />
        <StatCard
          label="Procurement Alerts"
          value={data.procurement_alerts}
          accent={data.procurement_alerts > 0 ? "amber" : "default"}
          hint="RFQs in flight + POs awaiting receipt"
          icon={<ShoppingCart size={18} color="var(--gold)" />}
        />
        <StatCard
          label="NMC Critical"
          value={data.critical_nmc_count}
          accent={data.critical_nmc_count > 0 ? "red" : "green"}
          hint="High-criticality vehicles offline"
          icon={<AlertOctagon size={18} color="var(--gold)" />}
        />
      </div>

      {/* Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="panel p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="section-title">Readiness Trend</div>
              <h3 className="display text-lg mt-1" style={{ color: "var(--text-primary)" }}>Last 30 days</h3>
            </div>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-muted)" }}>
              <span className="mono">{last.toFixed(1)}%</span>
              {trendDir === "up" && <TrendingUp size={14} color="var(--status-fmc-t)" />}
              {trendDir === "down" && <TrendingDown size={14} color="var(--status-nmc-t)" />}
            </div>
          </div>
          <ReadinessTrendChart data={trend} />
        </div>

        <div className="panel p-5 lg:col-span-2">
          <div className="section-title">Fleet Status</div>
          <h3 className="display text-lg mt-1 mb-2" style={{ color: "var(--text-primary)" }}>Capability mix</h3>
          <FleetDonut fmc={data.fleet_status.fmc} pmc={data.fleet_status.pmc} nmc={data.fleet_status.nmc} />
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { k: "fmc", lbl: "FMC", v: data.fleet_status.fmc, color: "var(--status-fmc-t)" },
              { k: "pmc", lbl: "PMC", v: data.fleet_status.pmc, color: "var(--status-pmc-t)" },
              { k: "nmc", lbl: "NMC", v: data.fleet_status.nmc, color: "var(--status-nmc-t)" },
            ].map((x) => (
              <div key={x.k} className="text-center py-2 rounded"
                   style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                <div className="mono font-bold text-xl" style={{ color: x.color }}>{x.v}</div>
                <div className="section-title">{x.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open WOs + Recent journal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <div className="section-title">Operations</div>
              <h3 className="display text-lg mt-1" style={{ color: "var(--text-primary)" }}>Open Work Orders</h3>
            </div>
            <Link to="/work-orders" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {data.open_work_orders.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
              No open work orders.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>WO #</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th className="num">Age (d)</th>
                </tr>
              </thead>
              <tbody>
                {data.open_work_orders.map((wo) => (
                  <tr key={wo.id} onClick={() => (window.location.href = `/work-orders/${wo.id}`)}>
                    <td className="mono">{wo.wo_number}</td>
                    <td>
                      <div style={{ color: "var(--text-primary)" }}>{wo.vehicle_registration}</div>
                      <div className="text-xxs" style={{ color: "var(--text-muted)" }}>{wo.title}</div>
                    </td>
                    <td>{wo.vehicle_type}</td>
                    <td><WOStatusBadge s={wo.status} /></td>
                    <td><PriorityBadge p={wo.priority} /></td>
                    <td className="num">{wo.age_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <div className="section-title">Finance</div>
              <h3 className="display text-lg mt-1" style={{ color: "var(--text-primary)" }}>Recent IPSAS Journal</h3>
            </div>
            <Link to="/ipsas" className="btn btn-ghost btn-sm">
              View ledger <ArrowRight size={12} />
            </Link>
          </div>
          {data.recent_journal.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
              No journal entries yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Dr</th>
                  <th>Cr</th>
                  <th className="num">Amount (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_journal.map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{formatDate(e.posted_at)}</td>
                    <td>
                      <span className="badge badge-info">{e.event_type}</span>
                    </td>
                    <td className="mono">{e.debit_account}</td>
                    <td className="mono">{e.credit_account}</td>
                    <td className="num">{formatSAR(e.amount, { decimals: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Critical vehicles */}
      <div className="mb-2">
        <div className="section-title flex items-center gap-2">
          <AlertOctagon size={12} /> Critical Vehicles (High-criticality · NMC)
        </div>
      </div>
      {data.critical_vehicles.length === 0 ? (
        <div className="panel p-6 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
          No critical NMC vehicles. Fleet ready posture maintained.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.critical_vehicles.map((v) => (
            <Link key={v.id} to="/fleet"
                  className="panel p-4 block hover:bg-[var(--bg-hover)] transition">
              <div className="flex items-center justify-between mb-2">
                <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{v.registration}</span>
                <StatusBadge status={v.op_status} compact />
              </div>
              <div className="text-[13px]" style={{ color: "var(--text-body)" }}>{v.name}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span>{v.type}</span>
                <span>·</span>
                <span>{v.sector}</span>
                <span>·</span>
                <CriticalityDot level={v.criticality} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <div>
                  <div className="section-title">Open WOs</div>
                  <div className="mono font-bold text-base mt-1" style={{ color: "var(--status-pmc-t)" }}>{v.open_wo_count}</div>
                </div>
                <div>
                  <div className="section-title">NBV (SAR)</div>
                  <div className="mono text-[13px] mt-1" style={{ color: "var(--text-primary)" }}>{formatSAR(v.nbv)}</div>
                </div>
                <div>
                  <div className="section-title">Maint Spent</div>
                  <div className="mono text-[13px] mt-1" style={{ color: "var(--text-primary)" }}>{formatSAR(v.total_maintenance_cost)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
