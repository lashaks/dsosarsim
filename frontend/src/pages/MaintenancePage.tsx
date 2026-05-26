import { useWorkOrders, useVehicles } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { PriorityBadge, WOStatusBadge } from "../components/ui/StatusBadge";
import { formatDate } from "../lib/format";
import { useNavigate } from "react-router-dom";

export default function MaintenancePage() {
  const nav = useNavigate();
  const { data: vehicles } = useVehicles();
  const { data: wos, isLoading } = useWorkOrders();

  const upcoming = (wos || []).filter((w) => w.status !== "CLOSED");

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Maintenance"
        subtitle="Consolidated maintenance schedule across the fleet. Pulls from active work orders."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Card label="Vehicles tracked" v={vehicles?.length || 0} />
        <Card label="Open jobs" v={upcoming.length} accent="amber" />
        <Card label="Critical/High priority" v={upcoming.filter((w) => w.priority === "CRITICAL" || w.priority === "HIGH").length} accent="red" />
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? <Skeleton className="h-40 m-3" /> : (
          <table className="data-table">
            <thead><tr><th>WO #</th><th>Vehicle</th><th>Title</th><th>Status</th><th>Priority</th><th className="num">Created</th><th className="num">Age</th></tr></thead>
            <tbody>
              {upcoming.map((wo) => (
                <tr key={wo.id} onClick={() => nav(`/work-orders/${wo.id}`)}>
                  <td className="mono">{wo.wo_number}</td>
                  <td className="mono">{wo.vehicle_registration}</td>
                  <td>{wo.title}</td>
                  <td><WOStatusBadge s={wo.status} /></td>
                  <td><PriorityBadge p={wo.priority} /></td>
                  <td className="text-[11px]">{formatDate(wo.created_at)}</td>
                  <td className="num">{wo.age_days}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Card({ label, v, accent }: { label: string; v: number; accent?: "amber" | "red" }) {
  return (
    <div className="panel p-4">
      <div className="section-title">{label}</div>
      <div className="display text-3xl mt-1 mono font-bold"
           style={{ color: accent === "red" ? "var(--status-nmc-t)" : accent === "amber" ? "var(--status-pmc-t)" : "var(--text-primary)" }}>
        {v}
      </div>
    </div>
  );
}
