import { useAssets } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { formatSAR, formatDate, clsx } from "../lib/format";

export default function AssetsPage() {
  const { data, isLoading } = useAssets();
  const totalCost = (data || []).reduce((s, a) => s + a.acquisition_cost, 0);
  const totalNBV = (data || []).reduce((s, a) => s + a.nbv, 0);
  const totalDep = (data || []).reduce((s, a) => s + a.accumulated_depreciation, 0);

  return (
    <>
      <PageHeader
        eyebrow="Finance & Compliance"
        title="Fixed Assets — IPSAS 17"
        subtitle="Straight-line depreciation register. Useful-life based. Net book value rolls into the IPSAS summary."
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card label="Gross book value" v={`SAR ${formatSAR(totalCost)}`} />
        <Card label="Accumulated depreciation" v={`SAR ${formatSAR(totalDep)}`} accent="amber" />
        <Card label="Net book value (NBV)" v={`SAR ${formatSAR(totalNBV)}`} accent="gold" />
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? <Skeleton className="h-60 m-3" /> : (
          <table className="data-table">
            <thead><tr>
              <th>Registration</th><th>Name</th><th>Type</th>
              <th className="num">Acq. cost</th><th>Acq. date</th>
              <th className="num">Life (yr)</th>
              <th className="num">Age (yr)</th>
              <th className="num">Annual dep.</th>
              <th className="num">Accumulated</th>
              <th className="num">NBV</th>
              <th className="num">% depreciated</th>
            </tr></thead>
            <tbody>
              {data?.map((a) => (
                <tr key={a.id} style={{ cursor: "default" }}>
                  <td className="mono" style={{ color: "var(--text-primary)" }}>{a.registration}</td>
                  <td>{a.name}</td>
                  <td>{a.type}</td>
                  <td className="num">{formatSAR(a.acquisition_cost)}</td>
                  <td className="text-[11px]">{formatDate(a.acquisition_date)}</td>
                  <td className="num">{a.useful_life_years}</td>
                  <td className="num">{a.age_years.toFixed(1)}</td>
                  <td className="num">{formatSAR(a.annual_depreciation, { decimals: 0 })}</td>
                  <td className="num">{formatSAR(a.accumulated_depreciation)}</td>
                  <td className="num" style={{ color: "var(--gold)" }}>{formatSAR(a.nbv)}</td>
                  <td className="num">
                    <span style={{ color: a.pct_depreciated > 80 ? "var(--status-nmc-t)" : a.pct_depreciated > 50 ? "var(--status-pmc-t)" : "var(--status-fmc-t)" }}>
                      {a.pct_depreciated.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Card({ label, v, accent }: { label: string; v: string; accent?: "gold" | "amber" }) {
  return (
    <div className="panel p-4">
      <div className="section-title">{label}</div>
      <div className={clsx("display text-2xl mt-1 mono")}
           style={{ color: accent === "gold" ? "var(--gold)" : accent === "amber" ? "var(--status-pmc-t)" : "var(--text-primary)" }}>
        {v}
      </div>
    </div>
  );
}
