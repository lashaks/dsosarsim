interface Props {
  score: number; // 0-100
  recommendation: string;
}

export default function BERGauge({ score, recommendation }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 180 - 90; // -90deg to +90deg
  const color =
    clamped >= 70 ? "#E05050" :
    clamped >= 50 ? "#F0A030" :
    clamped >= 30 ? "#C49A1A" :
    "#5CAF72";

  const recLabel: Record<string, string> = {
    WRITE_OFF: "Write-Off",
    FINANCE_REVIEW: "Finance Review",
    ENGINEERING_REVIEW: "Engineering Review",
    CONTINUE_REPAIR: "Continue Repair",
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg width={240} height={140} viewBox="0 0 240 140">
        {/* Background arc */}
        <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="#253548" strokeWidth={14} strokeLinecap="round" />
        {/* Zones */}
        <path d="M 20 120 A 100 100 0 0 1 80 33" fill="none" stroke="rgba(92,175,114,0.6)" strokeWidth={14} strokeLinecap="butt" />
        <path d="M 80 33 A 100 100 0 0 1 120 20" fill="none" stroke="rgba(196,154,26,0.6)" strokeWidth={14} strokeLinecap="butt" />
        <path d="M 120 20 A 100 100 0 0 1 165 33" fill="none" stroke="rgba(240,160,48,0.6)" strokeWidth={14} strokeLinecap="butt" />
        <path d="M 165 33 A 100 100 0 0 1 220 120" fill="none" stroke="rgba(224,80,80,0.6)" strokeWidth={14} strokeLinecap="butt" />

        {/* Needle */}
        <g transform={`translate(120 120) rotate(${angle})`}>
          <line x1={0} y1={0} x2={0} y2={-90} stroke={color} strokeWidth={4} strokeLinecap="round" />
          <circle cx={0} cy={0} r={8} fill={color} stroke="#0D1117" strokeWidth={2} />
        </g>

        {/* Tick labels */}
        <text x={20} y={138} textAnchor="middle" fontSize={9} fill="#5A6878" fontFamily="JetBrains Mono">0</text>
        <text x={120} y={12} textAnchor="middle" fontSize={9} fill="#5A6878" fontFamily="JetBrains Mono">50</text>
        <text x={220} y={138} textAnchor="middle" fontSize={9} fill="#5A6878" fontFamily="JetBrains Mono">100</text>
      </svg>
      <div className="-mt-4 text-center">
        <div className="display text-5xl mono font-bold" style={{ color }}>
          {clamped.toFixed(0)}
        </div>
        <div className="section-title mt-1">BER Score</div>
        <div className="badge mt-3" style={{ background: `${color}22`, color, borderColor: `${color}55`, border: `1px solid ${color}55` }}>
          {recLabel[recommendation] || recommendation}
        </div>
      </div>
    </div>
  );
}
