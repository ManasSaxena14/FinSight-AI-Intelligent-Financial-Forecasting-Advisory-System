/* eslint-disable react-refresh/only-export-components */
import { inr, inrCompact } from '../lib/format';

export const AXIS = {
  stroke: 'transparent',
  tick: { fill: '#6f7682', fontSize: 11, fontFamily: 'Geist Mono, monospace' },
  tickLine: false,
  axisLine: false,
};

export const GRID = { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 6', vertical: false };

export const yMoney = { ...AXIS, tickFormatter: inrCompact, width: 56 };

export function ChartTooltip({ active, payload, label, labelFormatter, hide = [] }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && !hide.includes(p.dataKey));
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-line-strong bg-ink-850/95 px-3 py-2.5 shadow-2xl backdrop-blur">
      <p className="mb-1.5 text-[11px] text-fg-faint">{labelFormatter ? labelFormatter(label) : label}</p>
      {rows.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 text-[13px]">
          <span className="flex items-center gap-2 text-fg-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />
            {p.name}
          </span>
          <span className="num text-fg">{Array.isArray(p.value) ? `${inr(p.value[0])} – ${inr(p.value[1])}` : inr(p.value)}</span>
        </div>
      ))}
    </div>
  );
}
