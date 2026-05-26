import { Bell, Globe, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../lib/i18n";
import { useDashboardSummary } from "../../api/hooks";
import { clsx } from "../../lib/format";

const SECTORS = ["All Sectors", "Central Command", "Eastern Province", "Western Province"];

export default function Topbar({
  sector, onSector,
}: { sector: string; onSector: (s: string) => void }) {
  const { user, logout } = useAuth();
  const { lang, toggle } = useI18n();
  const { data } = useDashboardSummary();
  const alerts = (data?.critical_nmc_count ?? 0) + (data?.procurement_alerts ?? 0);

  return (
    <header
      className="h-[56px] flex items-center px-6 justify-between flex-shrink-0"
      style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
    >
      {/* LEFT: sector selector */}
      <div className="flex items-center gap-4">
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button className="btn btn-ghost gap-2">
              <span className="section-title">Sector</span>
              <span style={{ color: "var(--text-primary)" }}>{sector}</span>
              <ChevronDown size={14} />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="start" sideOffset={8}
              className="panel py-1 min-w-[200px] z-50"
            >
              {SECTORS.map((s) => (
                <Dropdown.Item
                  key={s}
                  onSelect={() => onSector(s)}
                  className={clsx(
                    "px-3 py-2 text-[13px] cursor-pointer outline-none",
                    sector === s ? "text-[var(--gold)]" : "text-[var(--text-body)]",
                    "hover:bg-[var(--bg-hover)]",
                  )}
                >
                  {s}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost gap-2" onClick={toggle} title="Toggle language">
          <Globe size={14} />
          <span className="text-[12px] tracking-section uppercase">{lang === "en" ? "EN" : "AR"}</span>
        </button>

        <button className="btn btn-ghost gap-2 relative" title="Alerts">
          <Bell size={16} />
          {alerts > 0 && (
            <span
              className="absolute -top-1 -right-1 text-[9px] mono rounded-full px-1.5 py-[1px]"
              style={{ background: "var(--status-nmc)", color: "var(--text-primary)" }}
            >
              {alerts}
            </span>
          )}
        </button>

        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button className="btn btn-ghost gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{ background: "var(--gold-dim)", color: "var(--bg-primary)", fontWeight: 700 }}
              >
                {(user?.full_name || user?.username || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="text-left leading-tight hidden md:block">
                <div className="text-[12px]" style={{ color: "var(--text-primary)" }}>
                  {user?.full_name || user?.username}
                </div>
                <div className="text-[10px] tracking-section uppercase" style={{ color: "var(--text-muted)" }}>
                  {user?.role}
                </div>
              </div>
              <ChevronDown size={14} />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content align="end" sideOffset={8} className="panel py-1 min-w-[200px] z-50">
              <Dropdown.Label className="px-3 py-2 section-title">Signed in</Dropdown.Label>
              <div className="px-3 pb-2 text-[12px]" style={{ color: "var(--text-body)" }}>
                {user?.email}
              </div>
              <Dropdown.Separator className="divider my-1" />
              <Dropdown.Item className="px-3 py-2 text-[13px] cursor-pointer hover:bg-[var(--bg-hover)]">
                <UserIcon size={13} className="inline mr-2" /> Profile
              </Dropdown.Item>
              <Dropdown.Item
                onSelect={logout}
                className="px-3 py-2 text-[13px] cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ color: "var(--status-nmc-t)" }}
              >
                <LogOut size={13} className="inline mr-2" /> Sign out
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </div>
    </header>
  );
}
