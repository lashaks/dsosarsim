import { clsx } from "../../lib/format";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={clsx("skeleton", className)} style={style} />;
}

export function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}><Skeleton className="h-4 w-[80%]" /></td>
      ))}
    </tr>
  );
}

export function SkeletonCard({ h = 120 }: { h?: number }) {
  return <Skeleton className="w-full" style={{ height: h } as any} />;
}
