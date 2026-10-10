'use client';

// components/np/PainMap.tsx — "where does it hurt?" on a 2D body (Lotus check-in, step 4).
//
// Opens under the "I have pain or discomfort" switch. Same figure as the tightness map (adp
// SorenessSilhouette: front | back, muscle zones) plus three joint hot spots — knee, ankle, elbow —
// because pain in a joint is exactly what the athlete has to be able to point at. Tap an area to mark
// it, tap again to remove it. The result is only a place name in the athlete's language ("Knee · left"),
// written into the existing pain-zone field; no new data is collected, and nothing here is a diagnosis.
// At most MAX areas; for anything else the athlete is pointed to the coach / school nurse / physio.

import { useState, type KeyboardEvent, type ReactElement } from 'react';
import { BodyOutline, MIRROR, SILHOUETTE_H, SILHOUETTE_SHAPES, SILHOUETTE_W, ShapeEl, ViewTabs } from '@/adp/src/components/SorenessSilhouette';
import { SORENESS_LABELS } from '@/adp/src/components/labels';
import { PAIRED_ZONES, type BodyZone, type SilhouetteView } from '@/adp/src/types/sportProfile';
import type { Lang } from '@/lib/i18n/translations';
import { POLISH } from './polishCopy';

export const PAIN_MAX = 3;

type Joint = 'knee' | 'ankle' | 'elbow';
// hot spots on the LEFT half of the drawing (the right half is its mirror); same place front and back
const JOINTS: { id: Joint; cx: number; cy: number; r: number }[] = [
  { id: 'elbow', cx: 45, cy: 138, r: 7 },
  { id: 'knee', cx: 83, cy: 289, r: 9 },
  { id: 'ankle', cx: 83, cy: 374, r: 8 },
];

type Half = 'left' | 'right' | 'center';
/** The athlete's own side: facing you (front) their left is on your right; seen from behind it is the opposite. */
function sideOf(view: SilhouetteView, drawnOnViewerRight: boolean): 'left' | 'right' {
  if (view === 'front') return drawnOnViewerRight ? 'left' : 'right';
  return drawnOnViewerRight ? 'right' : 'left';
}

const keyOf = (id: string, half: Half) => `${id}:${half}`;

export default function PainMap({
  lang,
  selected,
  onChange,
}: {
  lang: Lang;
  /** keys like "knee:left", "hamstrings:right", "lower_back:center" */
  selected: string[];
  /** next keys + their place names in the athlete's language, in order */
  onChange: (keys: string[], names: string[]) => void;
}): ReactElement {
  const t = SORENESS_LABELS[lang];
  const pc = POLISH[lang].checkin;
  const [view, setView] = useState<SilhouetteView>('front');
  const [full, setFull] = useState(false);

  const nameOf = (key: string): string => {
    const [id, half] = key.split(':') as [string, Half];
    const base = (id in pc.joints ? pc.joints[id as Joint] : t.zones[id as BodyZone]) ?? id;
    return half === 'center' ? base : `${base} · ${t.sides[half]}`;
  };

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      setFull(false);
      const next = selected.filter((k) => k !== key);
      onChange(next, next.map(nameOf));
      return;
    }
    if (selected.length >= PAIN_MAX) {
      setFull(true);
      return;
    }
    setFull(false);
    const next = [...selected, key];
    onChange(next, next.map(nameOf));
  };

  const onKey = (e: KeyboardEvent, key: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(key);
    }
  };

  const zoneEl = (zone: BodyZone, shape: (typeof SILHOUETTE_SHAPES)['front'][number]['shape'], half: Half, mirrored: boolean) => {
    const key = keyOf(zone, half);
    const on = selected.includes(key);
    const el = (
      <ShapeEl
        shape={shape}
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={nameOf(key)}
        onClick={() => toggle(key)}
        onKeyDown={(e: KeyboardEvent) => onKey(e, key)}
        className={`cursor-pointer outline-none transition-[fill,stroke] duration-150 focus-visible:stroke-white ${
          on
            ? 'fill-[#E0705F]/60 stroke-[#E0705F] stroke-2 [filter:drop-shadow(0_0_6px_rgba(224,112,95,0.6))]'
            : 'fill-white/[0.07] stroke-white/25 hover:fill-[#2FD8F0]/35 hover:stroke-[#2FD8F0]'
        }`}
      >
        <title>{nameOf(key)}</title>
      </ShapeEl>
    );
    return mirrored ? (
      <g key={`${zone}-${half}-m`} transform={MIRROR}>
        {el}
      </g>
    ) : (
      <g key={`${zone}-${half}`}>{el}</g>
    );
  };

  const jointEl = (j: (typeof JOINTS)[number], mirrored: boolean) => {
    const half = sideOf(view, mirrored);
    const key = keyOf(j.id, half);
    const on = selected.includes(key);
    const el = (
      <g
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={nameOf(key)}
        onClick={() => toggle(key)}
        onKeyDown={(e) => onKey(e, key)}
        className="cursor-pointer outline-none focus-visible:[&_circle]:stroke-white"
      >
        {/* a wide invisible ring keeps the small joint easy to hit with a thumb */}
        <circle cx={j.cx} cy={j.cy} r={j.r + 6} fill="transparent" />
        <circle
          cx={j.cx}
          cy={j.cy}
          r={j.r}
          fill={on ? 'rgba(217,105,92,0.7)' : 'rgba(79,178,231,0.18)'}
          stroke={on ? '#FF3D5A' : 'rgba(79,178,231,0.85)'}
          strokeWidth={on ? 2 : 1.5}
          style={on ? { filter: 'drop-shadow(0 0 6px #FF3D5A)' } : undefined}
        />
        <title>{nameOf(key)}</title>
      </g>
    );
    return mirrored ? (
      <g key={`${j.id}-m`} transform={MIRROR}>
        {el}
      </g>
    ) : (
      <g key={j.id}>{el}</g>
    );
  };

  const zones = SILHOUETTE_SHAPES[view];
  const leftEdge = view === 'front' ? t.rightMark : t.leftMark;
  const rightEdge = view === 'front' ? t.leftMark : t.rightMark;

  return (
    <div className="-mx-2 space-y-3 rounded-2xl bg-black/20 px-2 py-3">
      <div>
        <p className="text-sm font-medium text-white">{pc.map.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/75">{pc.map.hint}</p>
      </div>
      <ViewTabs view={view} onChange={setView} front={pc.map.front} back={pc.map.back} />
      <svg viewBox={`0 0 ${SILHOUETTE_W} ${SILHOUETTE_H}`} className="mx-auto block h-auto w-full max-w-[320px]" role="group" aria-label={view === 'front' ? t.front : t.back}>
        <BodyOutline />
        {zones.map((z) =>
          PAIRED_ZONES.has(z.zone)
            ? [zoneEl(z.zone, z.shape, sideOf(view, false), false), zoneEl(z.zone, z.shape, sideOf(view, true), true)]
            : zoneEl(z.zone, z.shape, 'center', false)
        )}
        {JOINTS.map((j) => [jointEl(j, false), jointEl(j, true)])}
        <text x={10} y={394} className="fill-white/75 text-[13px] font-semibold">
          {leftEdge}
        </text>
        <text x={SILHOUETTE_W - 10} y={394} textAnchor="end" className="fill-white/75 text-[13px] font-semibold">
          {rightEdge}
        </text>
      </svg>
      <ul className="flex flex-wrap gap-2" aria-live="polite">
        {selected.length === 0 && <li className="text-xs text-white/75">{pc.map.none}</li>}
        {selected.map((k) => (
          <li key={k}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF3D5A]/40 bg-[#FF3D5A]/12 py-1 pl-3 pr-1 text-xs text-white">
              {nameOf(k)}
              <button
                type="button"
                aria-label={`${pc.map.remove}: ${nameOf(k)}`}
                onClick={() => toggle(k)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>
      {full && (
        <p role="alert" className="text-xs leading-relaxed text-[#FFC53D]">
          {pc.map.max(PAIN_MAX)}
        </p>
      )}
    </div>
  );
}
