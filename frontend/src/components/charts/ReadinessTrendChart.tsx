import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ComposedChart,
} from "recharts";
import type { ReadinessTrendPoint } from "../../api/types";

export default function ReadinessTrendChart({ data }: { data: ReadinessTrendPoint[] }) {
  const rows = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    readiness: d.readiness_pct,
    FMC: d.fmc_count,
    PMC: d.pmc_count,
    NMC: d.nmc_count,
  }));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C49A1A" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#C49A1A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#253548" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date" tickLine={false} axisLine={{ stroke: "#253548" }}
            tick={{ fill: "#5A6878", fontSize: 10, fontFamily: "JetBrains Mono" }}
            interval={Math.max(0, Math.floor(rows.length / 8))}
          />
          <YAxis
            yAxisId="left" domain={[0, 100]}
            tickLine={false} axisLine={{ stroke: "#253548" }}
            tick={{ fill: "#5A6878", fontSize: 10, fontFamily: "JetBrains Mono" }}
            width={36} tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0D1117", border: "1px solid #253548",
              borderRadius: 6, color: "#E8E4D8", fontSize: 12,
            }}
            labelStyle={{ color: "#A8B4C0", fontSize: 11 }}
            formatter={(v: any, name: string) => [name === "readiness" ? `${v}%` : v, name === "readiness" ? "Readiness" : name]}
          />
          <Area
            yAxisId="left" type="monotone" dataKey="readiness"
            stroke="#C49A1A" strokeWidth={2}
            fill="url(#goldFill)" dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
