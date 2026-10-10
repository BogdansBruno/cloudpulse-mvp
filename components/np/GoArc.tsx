'use client';

// components/np/GoArc.tsx — the readiness gauge of Lotus: a 240° arc split into the three engine bands
// (red < 50 = Recover · yellow 50–74 = Steady · green ≥ 75 = Push), lit up to today's score, with a pointer at the score.
// No score → three dim segments and "—" (never a guessed number).

import { useId, type ReactElement } from 'react';
import { GO_HEX, goOf, type Go } from './modeCopy';
import { useReducedMotion } from './ui';

const START = 150; // degrees, SVG coordinates (clockwise): bottom-left …
const SWEEP = 240; // … over the top to bottom-right
const BANDS: { go: Go; from: number; to: number }[] = [
  { go: 'recover', from: 0, to: 50 },
  { go: 'steady', from: 50, to: 75 },
  { go: 'push', from: 75, to: 100 },
];
const ang = (v: number): number => START + (SWEEP * v) / 100;
const pt = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

function arc(cx: number, cy: number, r: number, a: number, b: number): string {
  const [x1, y1] = pt(cx, cy, r, a);
  const [x2, y2] = pt(cx, cy, r, b);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export default function GoArc({
  value,
  zone,
  size = 232,
  label,
  names,
}: {
  value: number | null;
  zone: 'green' | 'yellow' | 'red' | null;
  size?: number;
  /** accessible name, e.g. "Readiness: 88 of 100" */
  label: string;
  /** the three band words, shown under the number */
  names: Record<Go, string>;
}): ReactElement {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const cx = size / 2;
  const cy = size / 2 + 4;
  const r = size / 2 - 22;
  const sw = 14;
  const gap = 1.6; // degrees between bands
  const go = goOf(zone);
  const v = value === null ? null : Math.max(0, Math.min(100, value));

  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 0.86 }}>
      <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size * 0.86}`} width={size} height={size * 0.86} className="overflow-visible">
        <defs>
          {BANDS.map((b) => (
            <filter key={b.go} id={`${id}-g-${b.go}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          ))}
        </defs>
        {/* dim tracks of the three bands */}
        {BANDS.map((b) => (
          <path key={`t-${b.go}`} d={arc(cx, cy, r, ang(b.from) + gap, ang(b.to) - gap)} fill="none" stroke={GO_HEX[b.go]} strokeOpacity="0.2" strokeWidth={sw} strokeLinecap="round" />
        ))}
        {/* lit part of every band the score has reached */}
        {v !== null &&
          BANDS.map((b) => {
            if (v <= b.from) return null;
            const end = Math.min(v, b.to);
            const a = ang(b.from) + gap;
            const z = Math.max(a + 0.1, ang(end) - (end === b.to ? gap : 0));
            const d = arc(cx, cy, r, a, z);
            return (
              <g key={`l-${b.go}`} style={reduce ? undefined : { animation: 'np-fade-up 0.6s both' }}>
                <path d={d} fill="none" stroke={GO_HEX[b.go]} strokeWidth={sw} strokeLinecap="round" opacity="0.5" filter={`url(#${id}-g-${b.go})`} />
                <path d={d} fill="none" stroke={GO_HEX[b.go]} strokeWidth={sw} strokeLinecap="round" />
              </g>
            );
          })}
        {/* pointer at the score */}
        {v !== null && (() => {
          const [px, py] = pt(cx, cy, r, ang(v));
          return (
            <g>
              <circle cx={px} cy={py} r={sw / 2 + 5} fill="#0B0D11" />
              <circle cx={px} cy={py} r={sw / 2 + 1} fill="#fff" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }} />
            </g>
          );
        })()}
        {/* band thresholds */}
        {[50, 75].map((t) => {
          const [x1, y1] = pt(cx, cy, r - sw / 2 - 5, ang(t));
          const [x2, y2] = pt(cx, cy, r - sw / 2 - 11, ang(t));
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center" style={{ top: cy - 36 }}>
        <span className="font-semibold leading-none tracking-[-0.05em] text-white" style={{ fontSize: size * 0.27, fontVariantNumeric: 'tabular-nums' }}>
          {v === null ? '—' : v}
        </span>
        {go && (
          <span className="mt-2 text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: GO_HEX[go] }}>
            {names[go]}
          </span>
        )}
      </div>
    </div>
  );
}
