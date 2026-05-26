import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useVehicle, useVehicleMaintenanceHistory, useVehicleWOs } from "../../api/hooks";
import { SlideOver } from "../../components/ui/Modal";
import { StatusBadge, CriticalityDot, WOStatusBadge } from "../../components/ui/StatusBadge";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatSAR, formatPct, formatDate } from "../../lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

interface Props {
  vehicleId: number | null;
  onClose: () => void;
}

export default function VehicleDetailPanel({ vehicleId, onClose }: Props) {
  const { data: v, isLoading } = useVehicle(vehicleId);
  const { data: history } = useVehicleMaintenanceHistory(vehicleId);
  const { data: wos } = useVehicleWOs(vehicleId);
  const [tab, setTab] = useState("overview");

  return (
    <SlideOver
      open={!!vehicleId}
      onOpenChange={(o) => !o && onClose()}
      title={v ? v.registration : "Vehicle"}
      description={v?.name}
      width={520}
    >
      {isLoading || !v ? (
        <div className="space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-32 w-full" /></div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <StatusBadge status={v.op_status} />
            <CriticalityDot level={v.criticality} />
            <span className="badge badge-muted">{v.type}</span>
          </div>

          <Tabs.Root value={tab} onValueChange={setTab}>
            <Tabs.List className="flex border-b mb-4" style={{ borderColor: "var(--border)" }}>
              {[
                ["overview", "Overview"],
                ["wos", "Work Orders"],
                ["maintenance", "Maintenance"],
                ["ber", "BER"],
                ["fracas", "FRACAS"],
              ].map(([k, l]) => (
                <Tabs.Trigger
                  key={k}
                  value={k}
                  className="px-3 py-2 text-[13px] -mb-px data-[state=active]:text-[var(--gold)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--gold)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {l}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="overview">
              <Section title="Identity">
                <KV k="Type" v={v.type} />
                <KV k="Sector" v={v.sector} />
                <KV k="Brigade" v={v.brigade || "—"} />
                <KV k="Criticality" v={v.criticality} />
              </Section>
              <Section title="Acquisition (IPSAS 17)">
                <KV k="Acquisition cost" v={`SAR ${formatSAR(v.acquisition_cost)}`} mono />
                <KV k="Acquisition date" v={formatDate(v.acquisition_date)} mono />
                <KV k="Useful life" v={`${v.useful_life_years} years`} mono />
                <KV k="Accumulated depreciation" v={`SAR ${formatSAR(v.accumulated_depreciation)}`} mono />
                <KV k="Net book value (NBV)" v={`SAR ${formatSAR(v.nbv)}`} mono accent />
                <KV k="% depreciated" v={formatPct(v.pct_depreciated)} mono />
              </Section>
              <Section title="Sustainment Posture">
                <KV k="Open work orders" v={String(v.open_wo_count)} mono />
                <KV k="Total maintenance spent" v={`SAR ${formatSAR(v.total_maintenance_cost)}`} mono />
              </Section>
            </Tabs.Content>

            <Tabs.Content value="wos">
              {wos && wos.length === 0 ? (
                <p className="text-[13px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
                  No work orders for this vehicle.
                </p>
              ) : (
                <div className="space-y-2">
                  {wos?.map((w: any) => (
                    <div key={w.id} className="px-3 py-2 rounded"
                         style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between">
                        <div className="mono text-[12px]" style={{ color: "var(--text-primary)" }}>{w.wo_number}</div>
                        <WOStatusBadge s={w.status} />
                      </div>
                      <div className="text-[13px] mt-1">{w.title}</div>
                      <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                        Created {formatDate(w.created_at)} · {w.priority}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Content>

            <Tabs.Content value="maintenance">
              {history && history.length > 0 && (
                <>
                  <div style={{ height: 160 }} className="mb-4">
                    <ResponsiveContainer>
                      <BarChart data={[...history].reverse().map((h: any) => ({
                        date: formatDate(h.date), amount: h.amount,
                      }))}>
                        <XAxis dataKey="date" hide />
                        <Tooltip
                          contentStyle={{ background: "#0D1117", border: "1px solid #253548", color: "#E8E4D8", fontSize: 12 }}
                          formatter={(v: any) => `SAR ${formatSAR(v as number, { decimals: 2 })}`}
                        />
                        <Bar dataKey="amount" fill="#C49A1A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <table className="data-table text-[12px]">
                    <thead>
                      <tr><th>Date</th><th>Type</th><th className="num">Amount</th></tr>
                    </thead>
                    <tbody>
                      {history.map((h: any) => (
                        <tr key={h.id}>
                          <td className="mono">{formatDate(h.date)}</td>
                          <td>{h.cost_type}</td>
                          <td className="num">{formatSAR(h.amount, { decimals: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {history && history.length === 0 && (
                <p className="text-[13px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
                  No maintenance cost entries.
                </p>
              )}
            </Tabs.Content>

            <Tabs.Content value="ber">
              <p className="text-[13px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
                Run the BER analysis from the BER Engine module to record a review.
              </p>
            </Tabs.Content>

            <Tabs.Content value="fracas">
              <p className="text-[13px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
                Recorded failures appear in the FRACAS module.
              </p>
            </Tabs.Content>
          </Tabs.Root>
        </>
      )}
    </SlideOver>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="section-title mb-2">{title}</div>
      <div className="panel" style={{ background: "var(--bg-primary)" }}>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function KV({ k, v, mono, accent }: { k: string; v: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{k}</span>
      <span className={mono ? "mono" : ""} style={{ color: accent ? "var(--gold)" : "var(--text-primary)" }}>{v}</span>
    </div>
  );
}
