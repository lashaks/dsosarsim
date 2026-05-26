import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Props { fmc: number; pmc: number; nmc: number; }

export default function FleetDonut({ fmc, pmc, nmc }: Props) {
  const data = [
    { name: "FMC", value: fmc, color: "#5CAF72" },
    { name: "PMC", value: pmc, color: "#F0A030" },
    { name: "NMC", value: nmc, color: "#E05050" },
  ];
  const total = fmc + pmc + nmc;

  return (
    <div className="relative" style={{ height: 220 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data} dataKey="value" innerRadius={64} outerRadius={92}
            stroke="#0D1117" strokeWidth={3} startAngle={90} endAngle={-270}
          >
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="mono font-bold text-4xl" style={{ color: "var(--text-primary)" }}>{total}</div>
        <div className="section-title mt-1">Vehicles</div>
      </div>
    </div>
  );
}
