import { Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { useWarehouses } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { formatSAR } from "../lib/format";

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses();

  return (
    <>
      <PageHeader
        eyebrow="Supply Chain"
        title="Warehouses"
        subtitle="Storage facilities across all sectors with on-hand value and serviceability metrics."
      />
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[0,1,2].map(i => <Skeleton key={i} className="h-48" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouses?.map((w) => (
            <div key={w.id} className="panel p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="mono text-[12px]" style={{ color: "var(--text-muted)" }}>{w.code}</div>
                <Building2 size={18} color="var(--gold)" strokeWidth={1.5} />
              </div>
              <div className="display text-lg" style={{ color: "var(--text-primary)" }}>{w.name}</div>
              <div className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
                {w.sector} · {w.location}
              </div>
              <div className="text-[12px] mt-1" style={{ color: "var(--text-body)" }}>
                Manager: {w.manager || "—"}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <div>
                  <div className="section-title">SKUs</div>
                  <div className="mono font-bold text-lg mt-1" style={{ color: "var(--text-primary)" }}>{w.total_skus}</div>
                </div>
                <div>
                  <div className="section-title">Value SAR</div>
                  <div className="mono text-[13px] mt-1" style={{ color: "var(--text-primary)" }}>{formatSAR(w.total_value)}</div>
                </div>
                <div>
                  <div className="section-title">Service %</div>
                  <div className="mono font-bold text-lg mt-1"
                       style={{ color: w.serviceable_pct >= 80 ? "var(--status-fmc-t)" : w.serviceable_pct >= 50 ? "var(--status-pmc-t)" : "var(--status-nmc-t)" }}>
                    {w.serviceable_pct.toFixed(0)}%
                  </div>
                </div>
              </div>

              <Link to={`/inventory`} className="btn w-full justify-center mt-4">
                Open inventory <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
