import { Download, FileText, BarChart3, Package, BookOpen, AlertTriangle } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { API_BASE } from "../api/client";

const REPORTS = [
  { id: "readiness",     label: "Readiness register",   icon: BarChart3,     desc: "Vehicle-level weighted readiness contribution per the Engine 1 formula.", url: "/api/reports/readiness.csv" },
  { id: "work-orders",   label: "Work order ledger",    icon: FileText,      desc: "All work orders with status, priority, assignment, and lifecycle dates.", url: "/api/reports/work-orders.csv" },
  { id: "inventory",     label: "Inventory snapshot",   icon: Package,       desc: "Quantity, condition, reorder points, and value across every warehouse.", url: "/api/reports/inventory.csv" },
  { id: "ipsas",         label: "IPSAS journal",        icon: BookOpen,      desc: "Append-only ledger of all sustainment-driven postings (IPSAS 12 + 17).", url: "/api/reports/ipsas-journal.csv" },
  { id: "ber",           label: "BER review history",   icon: AlertTriangle, desc: "Beyond-Economical-Repair reviews with score, recommendation, and inputs.", url: "/api/reports/ber.csv" },
];

export default function ReportsPage() {
  function download(url: string) {
    const t = localStorage.getItem("dsos-token");
    fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.blob())
      .then((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = url.split("/").pop() || "report.csv";
        a.click();
      });
  }

  return (
    <>
      <PageHeader
        eyebrow="Finance & Compliance"
        title="Reports"
        subtitle="Authoritative CSV exports for downstream reporting, audit, and integration."
      />

      <div className="panel p-4 mb-5 text-[12px]" style={{ background: "rgba(196,154,26,0.06)", color: "var(--text-body)", borderColor: "var(--gold-dim)" }}>
        Reports are generated live from the operational database. Open the file in Excel or your reporting tool;
        a PDF can be produced via your browser's print-to-PDF on any module page.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.id} className="panel p-5">
              <div className="flex items-start justify-between mb-3">
                <Icon size={22} color="var(--gold)" strokeWidth={1.5} />
                <button className="btn btn-gold btn-sm" onClick={() => download(r.url)}>
                  <Download size={13} /> Download CSV
                </button>
              </div>
              <div className="display text-base" style={{ color: "var(--text-primary)" }}>{r.label}</div>
              <p className="text-[13px] mt-2" style={{ color: "var(--text-body)" }}>{r.desc}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
