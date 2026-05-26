import { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { clsx } from "../../lib/format";

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  accent?: "default" | "green" | "amber" | "red" | "gold";
  hint?: ReactNode;
  icon?: ReactNode;
}

export default function StatCard({ label, value, unit, trend, trendValue, accent = "default", hint, icon }: Props) {
  const accentColor = {
    default: "var(--text-primary)",
    green: "var(--status-fmc-t)",
    amber: "var(--status-pmc-t)",
    red: "var(--status-nmc-t)",
    gold: "var(--gold)",
  }[accent];

  return (
    <div className="panel p-5 h-full flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="section-title">{label}</div>
        {icon}
      </div>
      <div className="mt-3">
        <div className="display tracking-wide leading-none flex items-baseline gap-2"
             style={{ fontSize: 38, color: accentColor }}>
          <span className="mono font-bold">{value}</span>
          {unit && <span className="text-base" style={{ color: "var(--text-muted)" }}>{unit}</span>}
        </div>
        <div className="mt-3 flex items-center gap-3 text-[12px]">
          {trend && (
            <span
              className={clsx(
                "inline-flex items-center gap-1",
              )}
              style={{ color: trend === "up" ? "var(--status-fmc-t)" : trend === "down" ? "var(--status-nmc-t)" : "var(--text-muted)" }}
            >
              {trend === "up" && <ArrowUp size={12} />}
              {trend === "down" && <ArrowDown size={12} />}
              {trend === "flat" && <Minus size={12} />}
              {trendValue}
            </span>
          )}
          {hint && <span style={{ color: "var(--text-muted)" }}>{hint}</span>}
        </div>
      </div>
    </div>
  );
}
