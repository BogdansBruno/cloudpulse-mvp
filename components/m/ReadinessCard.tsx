'use client';

// components/m/ReadinessCard.tsx — the one main metric of the Today screen.
// A thin 2px semicircle (no closed ring), the score as a 40px KPI number in
// the zone colour, a short status line and EXACTLY one sentence of advice.
// No engineering text here: how the score is built lives on other screens.

import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { M, ZONE_STROKE, ZONE_TEXT, type Zone } from './copy';

const W = 280;
const R = 124;
const CX = W / 2;
const CY = R + 8;
const H = CY + 4;

function at(p: number, r = R) {
  const a = Math.PI * (1 - p / 100);
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

function Arc({ value, color }: { value: number | null; color: string }): ReactElement {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const d = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const knob = at(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
      <path d={d} fill="none" stroke="rgb(255 255 255 / 0.10)" strokeWidth={2} strokeLinecap="round" />
      {value !== null && <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`} />}
      {/* zone borders of the engine: 50 and 75 */}
      {[50, 75].map((p) => {
        const a = at(p, R - 10);
        const b = at(p, R - 4);
        return <line key={p} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(255 255 255 / 0.28)" strokeWidth={1} />;
      })}
      {value !== null && <circle cx={knob.x} cy={knob.y} r={4} fill="#F2F4F7" />}
    </svg>
  );
}

export default function ReadinessCard({ lang, score, zone }: { lang: Lang; score: number | null; zone: Zone | null }): ReactElement {
  const c = M[lang];
  const has = score !== null && zone !== null;

  return (
    <section className="rounded-card border border-ds-line bg-ds-surface p-6" aria-labelledby="readiness-label">
      <p id="readiness-label" className="text-[11px] font-medium uppercase tracking-[0.06em] text-ds-text-3">
        {c.readiness}
      </p>

      <div className="relative mx-auto mt-4 w-full max-w-[280px]">
        <Arc value={has ? score : null} color={has ? ZONE_STROKE[zone] : '#7D8594'} />
        <div className="absolute inset-x-0 bottom-0 flex items-baseline justify-center gap-1">
          <span
            className={`text-[40px] font-medium leading-[44px] tracking-[-0.02em] ${has ? ZONE_TEXT[zone] : 'text-ds-text-3'}`}
            aria-label={has ? `${c.readiness}: ${score} / 100` : c.noCheckin}
          >
            {has ? score : '—'}
          </span>
          <span className="text-sm text-ds-text-2">/ 100</span>
        </div>
      </div>

      {has ? (
        <>
          <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-ds-text-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ZONE_STROKE[zone] }} aria-hidden />
            <span>
              {c.zone[zone]} · {c.state[zone]}
            </span>
          </p>
          <p className="mt-2 text-center text-[15px] leading-[22px] text-ds-text">{c.advice[zone]}</p>
        </>
      ) : (
        <p className="mt-4 text-center text-[15px] leading-[22px] text-ds-text-2">{c.noCheckin}</p>
      )}
    </section>
  );
}
