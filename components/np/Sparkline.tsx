'use client';

// components/np/Sparkline.tsx — a tiny smooth trend line for metric tiles (no axes, a dot on the last
// value). Missing days are skipped, never filled in. Fewer than two values → nothing is drawn.

import { useId, type ReactElement } from 'react';
import { smoothPath } from './TrendChart';

export default function Sparkline({ values, color, className = '', glow = false }: { values: (number | null)[]; color: string; className?: string; glow?: boolean }): ReactElement | null {
  const gid = useId().replace(/:/g, '');
  const W = 100;
  const H = 30;
  const pts = values.map((v, i) => (v === null ? null : ([i, v] as const))).filter((p): p is readonly [number, number] => p !== null);
  if (pts.length < 2) return null;
  const vs = pts.map((p) => p[1]);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const span = hi - lo || 1;
  const n = Math.max(1, values.length - 1);
  const xy: [number, number][] = pts.map(([i, v]) => [2 + (i / n) * (W - 4), 4 + (1 - (v - lo) / span) * (H - 8)]);
  const line = smoothPath(xy);
  const last = xy[xy.length - 1];
  const area = `${line} L${last[0]},${H} L${xy[0][0]},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`block h-8 w-full overflow-visible ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={glow ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={glow ? { filter: `drop-shadow(0 0 5px ${color})` } : undefined} />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="#FFFFFF" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
