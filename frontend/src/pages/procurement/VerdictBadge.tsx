const MAP: Record<string, { cls: string; label: string }> = {
  NECESSARY:          { cls: "badge-fmc",   label: "● Necessary" },
  AVAILABLE_IN_STOCK: { cls: "badge-info",  label: "✓ Available in stock" },
  REPAIR_INSTEAD:     { cls: "badge-pmc",   label: "↻ Repair instead" },
  DUPLICATE_RISK:     { cls: "badge-pmc",   label: "⚠ Duplicate risk" },
  REVIEW_REQUIRED:    { cls: "badge-gold",  label: "✎ Review required" },
  NOT_RECOMMENDED:    { cls: "badge-nmc",   label: "✕ Not recommended" },
};

export default function VerdictBadge({ verdict }: { verdict: string }) {
  const m = MAP[verdict] || { cls: "badge-muted", label: verdict };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}
