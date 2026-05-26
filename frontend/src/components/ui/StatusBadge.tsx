import type { OpStatus, Criticality } from "../../api/types";
import { clsx } from "../../lib/format";

export function StatusBadge({ status, compact }: { status: OpStatus; compact?: boolean }) {
  const map: Record<OpStatus, { cls: string; label: string; symbol: string }> = {
    FMC: { cls: "badge-fmc", label: "Fully Mission Capable", symbol: "●" },
    PMC: { cls: "badge-pmc", label: "Partially Mission Capable", symbol: "◑" },
    NMC: { cls: "badge-nmc", label: "Non-Mission Capable", symbol: "○" },
  };
  const s = map[status];
  return (
    <span className={clsx("badge", s.cls)}>
      {s.symbol} {compact ? status : s.label}
    </span>
  );
}

export function CriticalityDot({ level }: { level: Criticality }) {
  const map: Record<Criticality, { color: string; label: string }> = {
    HIGH: { color: "var(--status-nmc-t)", label: "High" },
    MEDIUM: { color: "var(--status-pmc-t)", label: "Medium" },
    LOW: { color: "var(--text-muted)", label: "Low" },
  };
  const m = map[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-body)" }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ p }: { p: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }) {
  const map = {
    CRITICAL: "badge-nmc",
    HIGH: "badge-pmc",
    MEDIUM: "badge-info",
    LOW: "badge-muted",
  } as const;
  return <span className={clsx("badge", map[p])}>{p}</span>;
}

export function WOStatusBadge({ s }: { s: "OPEN" | "IN_PROGRESS" | "WAITING_PARTS" | "CLOSED" }) {
  const map = {
    OPEN: { cls: "badge-info", label: "OPEN" },
    IN_PROGRESS: { cls: "badge-gold", label: "IN PROGRESS" },
    WAITING_PARTS: { cls: "badge-pmc", label: "WAITING PARTS" },
    CLOSED: { cls: "badge-muted", label: "CLOSED" },
  } as const;
  const m = map[s];
  return <span className={clsx("badge", m.cls)}>{m.label}</span>;
}

export function ConditionBadge({ c }: { c: "SERVICEABLE" | "REPAIRABLE" | "UNSERVICEABLE" }) {
  const map = {
    SERVICEABLE: "badge-fmc",
    REPAIRABLE: "badge-pmc",
    UNSERVICEABLE: "badge-nmc",
  } as const;
  return <span className={clsx("badge", map[c])}>{c}</span>;
}
