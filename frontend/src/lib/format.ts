export function formatSAR(n: number | undefined | null, opts: { decimals?: number } = {}): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  const d = opts.decimals ?? 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: d, maximumFractionDigits: d,
  }).format(Number(n));
}

export function formatPct(n: number | undefined | null, decimals = 1): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return `${Number(n).toFixed(decimals)}%`;
}

export function formatDate(iso: string | Date | undefined | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | Date | undefined | null): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function daysAgo(iso: string | Date | undefined | null): number {
  if (!iso) return 0;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function readinessColor(pct: number): string {
  if (pct >= 80) return "var(--status-fmc-t)";
  if (pct >= 60) return "var(--status-pmc-t)";
  return "var(--status-nmc-t)";
}

export function clsx(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}
