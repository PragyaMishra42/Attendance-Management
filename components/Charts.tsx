"use client";

interface BarItem {
  label: string;
  value: number;
  secondaryValue?: number;
}

export function SimpleBarChart({
  data,
  height = 220,
  primaryColor = "#4F46E5",
}: {
  data: BarItem[];
  height?: number;
  primaryColor?: string;
}) {
  const maxVal = Math.max(100, ...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div
        className="flex items-end justify-between gap-3 pt-4"
        style={{ height }}
      >
        {data.map((item) => {
          const pct = Math.round((item.value / maxVal) * 100);
          return (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">{item.value}%</span>
              <div className="relative flex h-40 w-full max-w-[44px] items-end overflow-hidden rounded-xl bg-slate-100">
                <div
                  className="w-full rounded-xl transition-all duration-500"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>
              <span className="truncate text-xs font-medium text-slate-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrendLineChart({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  const width = 520;
  const height = 180;
  const padX = 28;
  const padY = 20;

  const points = data.map((d, idx) => {
    const x =
      data.length === 1
        ? width / 2
        : padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y = height - padY - ((d.value - 50) / 50) * (height - padY * 2);
    return { x, y: Math.max(padY, Math.min(height - padY, y)), ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full min-w-[380px]">
        {[60, 75, 90, 100].map((tick) => {
          const y = height - padY - ((tick - 50) / 50) * (height - padY * 2);
          return (
            <g key={tick}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
              />
              <text x={4} y={y + 4} fontSize="10" fill="#94A3B8">
                {tick}%
              </text>
            </g>
          );
        })}

        <polyline
          fill="none"
          stroke="#4F46E5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />

        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="2" />
            <text
              x={p.x}
              y={height + 14}
              textAnchor="middle"
              fontSize="11"
              fill="#64748B"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
