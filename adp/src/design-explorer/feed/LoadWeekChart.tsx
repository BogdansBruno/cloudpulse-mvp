'use client';

// Night Feed — the week's training load. One capsule bar per day (load =
// session RPE × minutes, from the check-in), a dashed line for the usual
// daily load over 4 weeks (what ACWR compares against), and today's bar lit
// white with a glowing point and its value. Past days stay amber and quiet.

import { useId, type ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { THEMES } from '../themeStyles';
import { FEED } from './copy';
import { METRIC } from './ui';

const t = THEMES.feed;
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

export default function LoadWeekChart({ lang, loads, usual }: { lang: AdpLang; loads: readonly number[]; usual: number }): ReactElement {
  const f = FEED[lang].chart;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = 320;
  const H = 168;
  const top = 26;
  const base = 136;
  const n = loads.length;
  const slot = W / n;
  const bar = 22;
  const max = Math.max(...loads, usual) * 1.15 || 1;
  const y = (v: number) => base - (v / max) * (base - top);
  const today = new Date();
  const dayName = (i: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return d.toLocaleDateString(LOCALE[lang], { weekday: 'short' }).replace('.', '');
  };
  const last = loads[n - 1] ?? 0;
  const cx = slot * (n - 1) + slot / 2;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${f.title}: ${loads.join(', ')} ${f.unit}`}>
        <defs>
          <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={METRIC.load[0]} stopOpacity="0.85" />
            <stop offset="100%" stopColor={METRIC.load[1]} stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`t${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.35" />
          </linearGradient>
          <filter id={`g${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {loads.map((v, i) => {
          const isToday = i === n - 1;
          const h = Math.max(3, base - y(v));
          const x = slot * i + (slot - bar) / 2;
          return (
            <g key={i}>
              <rect x={x} y={top} width={bar} height={base - top} rx={bar / 2} fill="rgba(255,255,255,0.04)" />
              <rect x={x} y={base - h} width={bar} height={h} rx={bar / 2} fill={isToday ? `url(#t${uid})` : `url(#b${uid})`} opacity={isToday ? 1 : 0.8} />
              <text x={x + bar / 2} y={base + 20} textAnchor="middle" fontSize="11" fill={isToday ? '#FFFFFF' : t.colors.textFaint} fontWeight={isToday ? 600 : 400}>
                {isToday ? f.today : dayName(i)}
              </text>
            </g>
          );
        })}

        {/* usual daily load (chronic) */}
        <line x1="4" x2={W - 4} y1={y(usual)} y2={y(usual)} stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 4" />
        {/* legend for the dashed line, above the plot so it never covers a bar */}
        <line x1="4" x2="22" y1="10" y2="10" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeDasharray="3 4" />
        <text x="28" y="14" fontSize="11" fill={t.colors.textMuted} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {f.usual} ≈ {Math.round(usual)} {f.unit}
        </text>

        {/* today's point */}
        <circle cx={cx} cy={y(last)} r="9" fill="#FFFFFF" opacity="0.55" filter={`url(#g${uid})`} />
        <circle cx={cx} cy={y(last)} r="4.5" fill="#FFFFFF" />
        <text x={cx} y={y(last) - 12} textAnchor="middle" fontSize="12" fontWeight="600" fill="#FFFFFF" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {last}
        </text>
      </svg>
      <figcaption className="mt-2 text-[12px] leading-relaxed" style={{ color: t.colors.textFaint }}>
        {f.caption} {f.formula}
      </figcaption>
    </figure>
  );
}
