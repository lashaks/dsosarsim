import { useState } from "react";
import { AlertCircle, BookOpen, Search } from "lucide-react";
import { useIPSASJournal, useIPSASSummary } from "../api/hooks";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { Skeleton } from "../components/ui/Skeleton";
import { formatSAR, formatDateTime, clsx } from "../lib/format";

const EVENT_COLORS: Record<string, string> = {
  GOODS_RECEIPT: "badge-fmc",
  ISSUE: "badge-info",
  WRITE_DOWN: "badge-nmc",
  DEPRECIATION: "badge-pmc",
  DISPOSAL: "badge-nmc",
};

export default function IPSASPage() {
  const [eventType, setEventType] = useState("");
  const [reference, setReference] = useState("");
  const [account, setAccount] = useState("");
  const { data: journal, isLoading } = useIPSASJournal({
    event_type: eventType || undefined,
    reference: reference || undefined,
    account: account || undefined,
    limit: 300,
  });
  const { data: summary } = useIPSASSummary();

  return (
    <>
      <PageHeader
        eyebrow="Finance & Compliance"
        title="IPSAS Journal"
        subtitle="Append-only ledger of all sustainment-driven postings. Compliant with IPSAS 12 (Inventories) and IPSAS 17 (PP&E)."
        actions={<BookOpen size={28} color="var(--gold)" strokeWidth={1.3} />}
      />

      {/* DISCLAIMER */}
      <div className="panel p-4 mb-5 flex items-start gap-3"
           style={{ background: "rgba(196,154,26,0.08)", borderColor: "var(--gold-dim)" }}>
        <AlertCircle size={18} color="var(--gold)" className="mt-0.5 flex-shrink-0" />
        <div className="text-[12.5px]" style={{ color: "var(--text-body)" }}>
          <strong style={{ color: "var(--gold)" }}>Account codes are illustrative.</strong>{" "}
          The chart of accounts shown (1310, 1690, 2110, 6100, 6200, 6900, 6950, 1600) is for demonstration only.
          Require sign-off by a qualified public-sector accounting authority before any live financial posting.
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Inventory Value (IPSAS 12)" value={summary ? formatSAR(summary.total_inventory_value) : "—"} unit="SAR" />
        <StatCard label="Total Asset NBV (IPSAS 17)" value={summary ? formatSAR(summary.total_asset_nbv) : "—"} unit="SAR" accent="gold" />
        <StatCard label="Depreciation YTD" value={summary ? formatSAR(summary.total_depreciation_ytd) : "—"} unit="SAR" />
        <StatCard label="Maintenance Expense YTD" value={summary ? formatSAR(summary.total_maintenance_expense_ytd) : "—"} unit="SAR" accent="amber" />
      </div>

      {/* Filters */}
      <div className="panel p-3 mb-3 flex items-center gap-3 flex-wrap">
        <select className="input" style={{ width: "auto" }} value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="">All event types</option>
          <option value="GOODS_RECEIPT">GOODS_RECEIPT</option>
          <option value="ISSUE">ISSUE</option>
          <option value="WRITE_DOWN">WRITE_DOWN</option>
          <option value="DEPRECIATION">DEPRECIATION</option>
          <option value="DISPOSAL">DISPOSAL</option>
        </select>
        <select className="input" style={{ width: "auto" }} value={account} onChange={(e) => setAccount(e.target.value)}>
          <option value="">All accounts</option>
          <option value="1310">1310 — Inventory</option>
          <option value="1600">1600 — PP&E</option>
          <option value="1690">1690 — Accum. Depreciation</option>
          <option value="2110">2110 — GR/IR</option>
          <option value="6100">6100 — Depreciation Exp.</option>
          <option value="6200">6200 — Maintenance Exp.</option>
          <option value="6900">6900 — Inv. Impairment</option>
          <option value="6950">6950 — Disposal Loss</option>
        </select>
        <div className="relative max-w-xs flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
          <input className="input pl-9" placeholder="Reference (PO#, WO#…)" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {isLoading ? <Skeleton className="h-60 m-3" /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Event</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Dr</th>
                <th>Cr</th>
                <th className="num">Amount (SAR)</th>
                <th>Posted By</th>
              </tr>
            </thead>
            <tbody>
              {journal?.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  No journal entries match.
                </td></tr>
              )}
              {journal?.map((e) => (
                <tr key={e.id} style={{ cursor: "default" }}>
                  <td className="mono text-[11px]">{formatDateTime(e.posted_at)}</td>
                  <td><span className={clsx("badge", EVENT_COLORS[e.event_type] || "badge-muted")}>{e.event_type}</span></td>
                  <td className="mono text-[11px]">{e.reference_id || "—"}</td>
                  <td className="text-[12px]">{e.description}</td>
                  <td>
                    <div className="mono text-[12px]" style={{ color: "var(--text-primary)" }}>{e.debit_account}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{e.debit_account_name}</div>
                  </td>
                  <td>
                    <div className="mono text-[12px]" style={{ color: "var(--text-primary)" }}>{e.credit_account}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{e.credit_account_name}</div>
                  </td>
                  <td className="num">{formatSAR(e.amount, { decimals: 2 })}</td>
                  <td className="text-[12px]">{e.posted_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
