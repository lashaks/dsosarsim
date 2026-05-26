import { ReactNode } from "react";

export default function PageHeader({
  eyebrow, title, subtitle, actions,
}: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
      <div>
        {eyebrow && <div className="section-title mb-2">{eyebrow}</div>}
        <h1 className="display text-3xl leading-none" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {subtitle && <p className="mt-2 text-[13px] max-w-2xl" style={{ color: "var(--text-body)" }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
