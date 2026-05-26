import { ReactNode } from "react";

export default function EmptyState({
  icon, title, body, action,
}: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel p-10 text-center">
      <div className="flex justify-center mb-4" style={{ color: "var(--text-muted)" }}>
        {icon}
      </div>
      <div className="display text-xl mb-2" style={{ color: "var(--text-primary)" }}>{title}</div>
      {body && <p className="text-[13px] max-w-md mx-auto" style={{ color: "var(--text-body)" }}>{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
