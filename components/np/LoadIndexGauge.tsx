'use client';

// components/np/LoadIndexGauge.tsx — ADP Load Index (0–100), our own day-load
// scale (lib/load-index.ts). Three zones — Light 0–40 (subdued blue), Optimal
// 41–75 (electric blue), Overload 76–100 (heat gradient) — today's marker and
// the recommended corridor for today drawn as a bracket above the bar.

import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { LOAD_ZONES, loadZone, type LoadZone } from '@/lib/load-index';
import { LOCALE, NP } from './copy';
import { Overline } from './ui';

const GAP = 4; // px between zone segments
const FILL: Record<LoadZone, { track: string; fill: string }> = {
  light: { track: 'bg-np-strain/10', fill: 'bg-np-strain/45' },
  optimal: { track: 'bg-np-strain/15', fill: 'bg-linear-to-r from-np-strain to-np-strain-light' },
  overload: { track: 'bg-np-heat/15', fill: 'bg-linear-to-r from-np-heat to-np-heat-2' },
};
const PILL: Record<LoadZone, string> = { light: 'np-pill-strain', optimal: 'np-pill-strain', overload: 'np-pill-heat' };

/** x-position of a 0–100 value on the segmented bar, accounting for the gaps. */
function xAt(v: number): string {
  const clamped = Math.max(0, Math.min(100, v));
  const zoneIdx = LOAD_ZONES.findIndex((z) => clamped <= z.to);
  const gapsBefore = Math.max(0, zoneIdx);
  return `calc((100% - ${GAP * (LOAD_ZONES.length - 1)}px) * ${(clamped / 100).toFixed(4)} + ${gapsBefore * GAP}px)`;
}

export default function LoadIndexGauge({
  lang,
  index,
  target,
  dailyLoad,
  usualDay,
  title,
}: {
  lang: Lang;
  /** 0–100 or null when the base is still building. */
  index: number | null;
  target: { from: number; to: number } | null;
  /** AU of the day (RPE × minutes). */
  dailyLoad: number | null;
  /** AU of an ordinary day for this athlete. */
  usualDay: number | null;
  title?: string;
}): ReactElement {
  const t = NP[lang].load;
  const nf = new Intl.NumberFormat(LOCALE[lang]);
  const z = index !== null ? loadZone(index) : null;
  const vsTarget = index !== null && target ? (index < target.from ? 'below' : index > target.to ? 'above' : 'in') : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Overline>{title ?? t.title}</Overline>
          <p className="mt-0.5 text-[11px] text-np-text-3">{t.scale}</p>
        </div>
        {z && <span className={`np-pill ${PILL[z]}`}>{t.zones[z]}</span>}
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="np-num text-4xl">{index !== null ? nf.format(index) : '—'}</span>
        <span className="text-sm text-np-text-3">/ 100</span>
      </p>

      <div className="relative mt-7" role="img" aria-label={index !== null ? `${t.title}: ${index} / 100, ${t.zones[z as LoadZone]}${target ? `. ${t.target(target.from, target.to)}` : ''}` : t.noBase}>
        {target && (
          <span
            aria-hidden
            className="absolute -top-5 h-3 rounded-t-[4px] border border-b-0 border-dashed border-np-text-2/70"
            style={{ left: xAt(target.from), width: `calc(${xAt(target.to)} - ${xAt(target.from)})` }}
          >
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap text-[10px] font-semibold text-np-text-2">
              {t.targetShort} {target.from}–{target.to}
            </span>
          </span>
        )}
        <div className="flex gap-1">
          {LOAD_ZONES.map((zone) => {
            const span = zone.key === 'light' ? zone.to : zone.to - zone.from + 1;
            const start = zone.key === 'light' ? 0 : zone.from - 1;
            const fill = index === null ? 0 : Math.max(0, Math.min(100, ((index - start) / span) * 100));
            return (
              <div key={zone.key} className="min-w-0" style={{ flex: `${span} 1 0%` }}>
                <div className={`relative h-2.5 overflow-hidden rounded-full ${FILL[zone.key].track}`}>
                  <span className={`absolute inset-y-0 left-0 rounded-full ${FILL[zone.key].fill}`} style={{ width: `${fill}%` }} />
                </div>
                <p className={`mt-2 whitespace-nowrap text-[10px] font-semibold text-np-text-2 ${zone.key === 'overload' ? 'flex justify-end' : ''}`}>
                  {t.zones[zone.key]}
                  <span className="ml-1 font-normal text-np-text-3">
                    {zone.from}–{zone.to}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
        {index !== null && (
          <span
            aria-hidden
            className="absolute top-[5px] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-np-surface bg-np-text"
            style={{ left: xAt(index), boxShadow: `0 0 12px ${z === 'overload' ? 'rgb(255 107 0 / 0.9)' : 'rgb(255 197 61 / 0.9)'}` }}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-np-text-3">
        {target && (
          <span className="np-pill">
            {t.target(target.from, target.to)}
            {vsTarget && <span className="font-normal text-np-text-3">· {t.vsTarget[vsTarget]}</span>}
          </span>
        )}
        {index === null && <span>{t.noBase}</span>}
        {usualDay !== null && <span>{t.usual(nf.format(Math.round(usualDay)))}</span>}
        {dailyLoad !== null && <span>{t.dayAu(nf.format(Math.round(dailyLoad)))}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arc variant: the same three zones on a 180° instrument arc — semi-transparent
// tracks with rounded caps, a lit fill up to today's value, a glowing marker and the
// dashed target bracket just outside the arc. Used on the check-in result and /progress.
// ---------------------------------------------------------------------------

const CX = 110;
const CY = 112;
const RA = 90;
const RB = 104; // target bracket radius
const ARC_GAP = 2.6; // index units cut at internal zone borders (room for the round caps)

function pt(v: number, r: number): [number, number] {
  const th = Math.PI + (Math.max(0, Math.min(100, v)) / 100) * Math.PI;
  return [CX + r * Math.cos(th), CY + r * Math.sin(th)];
}
function arcPath(a: number, b: number, r: number): string {
  if (b <= a) return '';
  const [x1, y1] = pt(a, r);
  const [x2, y2] = pt(b, r);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}
const ARC_COLOR: Record<LoadZone, { track: string; fill: string }> = {
  light: { track: 'rgb(255 197 61 / 0.14)', fill: 'rgb(255 197 61 / 0.5)' },
  optimal: { track: 'rgb(255 197 61 / 0.18)', fill: 'url(#np-arc-blue)' },
  overload: { track: 'rgb(255 122 89 / 0.18)', fill: 'url(#np-arc-heat)' },
};

export function LoadIndexArc({
  lang,
  index,
  target,
  title,
}: {
  lang: Lang;
  index: number | null;
  target: { from: number; to: number } | null;
  title?: string;
}): ReactElement {
  const t = NP[lang].load;
  const z = index !== null ? loadZone(index) : null;
  const seg = (k: LoadZone) => {
    const zz = LOAD_ZONES.find((q) => q.key === k)!;
    const a = zz.key === 'light' ? 0 : zz.from - 1 + ARC_GAP / 2;
    const b = zz.key === 'overload' ? 100 : zz.to - ARC_GAP / 2;
    return [a, b] as const;
  };
  const marker = index !== null ? pt(index, RA) : null;
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="flex items-center justify-between gap-2">
        <span className="np-label">{title ?? t.title}</span>
        {z && <span className={`np-pill ${PILL[z]}`}>{t.zones[z]}</span>}
      </div>
      <svg
        viewBox="0 0 220 128"
        className="mt-1 w-full"
        role="img"
        aria-label={index !== null ? `${t.title}: ${index} / 100, ${t.zones[z as LoadZone]}${target ? `. ${t.target(target.from, target.to)}` : ''}` : t.noBase}
      >
        <defs>
          <linearGradient id="np-arc-blue" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="200" y2="0">
            <stop offset="0" stopColor="#FFC53D" />
            <stop offset="1" stopColor="#FFC53D" />
          </linearGradient>
          <linearGradient id="np-arc-heat" gradientUnits="userSpaceOnUse" x1="150" y1="0" x2="205" y2="0">
            <stop offset="0" stopColor="#FF7A59" />
            <stop offset="1" stopColor="#C77400" />
          </linearGradient>
        </defs>
        {LOAD_ZONES.map((zz) => {
          const [a, b] = seg(zz.key);
          const fillTo = index === null ? a : Math.min(b, index);
          return (
            <g key={zz.key}>
              <path d={arcPath(a, b, RA)} stroke={ARC_COLOR[zz.key].track} strokeWidth="6" strokeLinecap="round" fill="none" />
              {index !== null && fillTo > a && (
                <path d={arcPath(a, fillTo, RA)} stroke={ARC_COLOR[zz.key].fill} strokeWidth="6" strokeLinecap="round" fill="none" />
              )}
            </g>
          );
        })}
        {target && (
          <g className="np-svg-tick" stroke="rgb(17 19 24 / 0.45)" strokeWidth="1.5" fill="none" strokeLinecap="round">
            <path d={arcPath(target.from, target.to, RB)} strokeDasharray="3 4" />
            {[target.from, target.to].map((v) => {
              const [x1, y1] = pt(v, RB - 4);
              const [x2, y2] = pt(v, RB + 4);
              return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
        )}
        {marker && (
          <circle
            cx={marker[0]}
            cy={marker[1]}
            r="7"
            fill="#FFFFFF"
            stroke={z === 'overload' ? '#FF7A59' : '#FFC53D'}
            strokeWidth="3.5"
            style={{ filter: 'drop-shadow(0 2px 4px rgb(0 0 0 / 0.4))' }}
          />
        )}
        <text x={CX} y={CY - 18} textAnchor="middle" fontSize="44" fontWeight="300" className="np-svg-text" fill="#111318" style={{ letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
          {index !== null ? index : '—'}
        </text>
        <text x={CX} y={CY} textAnchor="middle" fontSize="10" className="np-svg-text-3" fill="#6B7280" style={{ letterSpacing: '0.12em' }}>
          / 100
        </text>
      </svg>
      <p className="mt-1 text-center text-xs text-np-text-2">
        {target ? t.target(target.from, target.to) : index === null ? t.noBase : ' '}
      </p>
    </div>
  );
}
