import { NavLink } from "react-router-dom";
import {
  LayoutGrid, Truck, ClipboardList, Wrench, Package, Warehouse, ShoppingCart,
  FileText, Building2, BookOpen, BarChart3, AlertTriangle, Activity,
  TrendingUp, Clock, Shield, Settings,
} from "lucide-react";
import { clsx } from "../../lib/format";

const groups = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
      { to: "/fleet", label: "Fleet Management", icon: Truck },
      { to: "/work-orders", label: "Work Orders", icon: ClipboardList },
      { to: "/maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { to: "/inventory", label: "Inventory", icon: Package },
      { to: "/warehouses", label: "Warehouses", icon: Warehouse },
      { to: "/procurement", label: "Procurement", icon: ShoppingCart },
      { to: "/rfq-po", label: "RFQ / PO", icon: FileText },
    ],
  },
  {
    label: "Finance & Compliance",
    items: [
      { to: "/assets", label: "Fixed Assets", icon: Building2 },
      { to: "/ipsas", label: "IPSAS Journal", icon: BookOpen },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/ber", label: "BER Engine", icon: AlertTriangle },
      { to: "/fracas", label: "FRACAS", icon: Activity },
      { to: "/predictive", label: "Predictive", icon: TrendingUp },
      { to: "/obsolescence", label: "Obsolescence", icon: Clock },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/audit", label: "Audit Trail", icon: Shield },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside
      className="w-[240px] flex-shrink-0 h-full flex flex-col"
      style={{ background: "var(--bg-secondary)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo block */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <Shield size={22} color="var(--gold)" strokeWidth={1.6} />
          <div>
            <div className="display text-xl leading-none" style={{ color: "var(--text-primary)" }}>DSOS</div>
            <div className="text-[10px] tracking-section uppercase mt-1" style={{ color: "var(--text-muted)" }}>
              Defense Sustainment
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-5 py-2 section-title">{g.label}</div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "relative flex items-center gap-3 px-5 py-2 text-[13px] transition",
                    isActive
                      ? "text-[var(--gold)] bg-[var(--bg-hover)]"
                      : "text-[var(--text-body)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-0 bottom-0 w-[2px]"
                        style={{ background: "var(--gold)" }}
                      />
                    )}
                    <item.icon size={16} strokeWidth={1.7} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer mark */}
      <div className="px-5 py-3 text-[10px] tracking-section uppercase"
           style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
        v0.1 · Demo Build
      </div>
    </aside>
  );
}
