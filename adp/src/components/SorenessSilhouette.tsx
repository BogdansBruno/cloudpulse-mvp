'use client';

// adp/src/components/SorenessSilhouette.tsx
//
// Idea A — "Biomechanical Soreness Mapping": a 2D body, front and back, with
// 18 muscle zones. The athlete taps a zone, picks 1..5, and the component
// hands back a SorenessMap — the exact array stored in
// adp.check_ins.soreness_zones and read by the coach module.
//
// Product rules enforced here:
//   - Muscles only. Joints (knees, ankles, elbows, spine bones) cannot be
//     tapped: pain in a joint is a triage question, not "tightness". The
//     footer says so in plain words.
//   - The scale describes tightness, not pain: 5 = "so tight it limits
//     movement". No medical words.
//   - The moment a value means "no drills, only tell your coach / doctor /
//     school nurse / physio" (5/5, or 3/5+ on lower back, neck, shins), the
//     hint appears right under the picker — no surprise later in the plan.
//   - Max SORENESS_RULES.maxZones entries; equal left/right merge into one.
//   - Left and right are the ATHLETE's: on the front view their left is on
//     the viewer's right, so both figures carry small L / R marks.
//   - Every zone is a keyboard-focusable button with a spoken label, and the
//     marked zones are also listed as text below (colour is never the only
//     carrier of meaning).
//
// Controlled component: no fetching, no storage. The page owns the state.

import { useId, useState, type KeyboardEvent, type ReactElement, type SVGProps } from 'react';
import {
  SORENESS_RULES,
  SORENESS_SEVERITIES,
  type BodyZone,
  type SilhouetteView,
  type SorenessSeverity,
} from '../types/sportProfile';
import { SORENESS_LABELS, type AdpLang } from './labels';
import { SEVERITY_COLOR, athleteHalf, halvesOf, isReferred, setSeverity, severityAt, type Half, type SorenessMap } from './sorenessMap';

export type SorenessSilhouetteProps = {
  value: SorenessMap;
  onChange: (next: SorenessMap) => void;
  lang?: AdpLang;
  className?: string;
};

// ---------------------------------------------------------------------------
// Geometry — viewBox 200 × 400. Paired zones are drawn once for the viewer's
// LEFT half and mirrored for the right.
// ---------------------------------------------------------------------------

const W = 200;
const H = 400;
const MIRROR = `matrix(-1 0 0 1 ${W} 0)`;

type Shape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rot?: number }
  | { kind: 'path'; d: string }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number };

type ZoneShape = { zone: BodyZone; shape: Shape };

const FRONT: readonly ZoneShape[] = [
  { zone: 'chest', shape: { kind: 'path', d: 'M72 74 Q100 67 128 74 L131 99 Q116 112 100 105 Q84 112 69 99 Z' } },
  { zone: 'shoulder_front', shape: { kind: 'ellipse', cx: 60, cy: 80, rx: 12, ry: 12 } },
  { zone: 'biceps', shape: { kind: 'ellipse', cx: 49, cy: 110, rx: 8, ry: 20, rot: 8 } },
  { zone: 'forearm', shape: { kind: 'ellipse', cx: 41, cy: 167, rx: 7, ry: 22, rot: 6 } },
  { zone: 'abdominals', shape: { kind: 'rect', x: 87, y: 112, w: 26, h: 64, r: 8 } },
  { zone: 'obliques', shape: { kind: 'ellipse', cx: 76, cy: 146, rx: 6, ry: 25 } },
  { zone: 'hip_flexors', shape: { kind: 'ellipse', cx: 86, cy: 194, rx: 10, ry: 6, rot: -32 } },
  { zone: 'quadriceps', shape: { kind: 'ellipse', cx: 79, cy: 241, rx: 10, ry: 34 } },
  { zone: 'adductors', shape: { kind: 'ellipse', cx: 94, cy: 229, rx: 4.5, ry: 20 } },
  { zone: 'shins', shape: { kind: 'ellipse', cx: 83, cy: 331, rx: 6.5, ry: 30 } },
];

const BACK: readonly ZoneShape[] = [
  {
    zone: 'neck_upper_traps',
    shape: { kind: 'path', d: 'M91 50 L109 50 L111 62 Q125 66 134 72 L100 80 L66 72 Q75 66 89 62 Z' },
  },
  { zone: 'shoulder_back', shape: { kind: 'ellipse', cx: 60, cy: 82, rx: 12, ry: 12 } },
  { zone: 'upper_back', shape: { kind: 'path', d: 'M74 84 L100 82 L126 84 L130 128 L70 128 Z' } },
  { zone: 'triceps', shape: { kind: 'ellipse', cx: 49, cy: 111, rx: 8, ry: 20, rot: 8 } },
  { zone: 'forearm', shape: { kind: 'ellipse', cx: 41, cy: 167, rx: 7, ry: 22, rot: 6 } },
  { zone: 'lower_back', shape: { kind: 'rect', x: 80, y: 134, w: 40, h: 42, r: 9 } },
  { zone: 'glutes', shape: { kind: 'ellipse', cx: 86, cy: 203, rx: 14, ry: 15 } },
  { zone: 'hamstrings', shape: { kind: 'ellipse', cx: 83, cy: 251, rx: 11, ry: 31 } },
  { zone: 'calves', shape: { kind: 'ellipse', cx: 83, cy: 323, rx: 9, ry: 26 } },
];

/** Exported for tests: every BODY_ZONE must be drawn somewhere. */
export const SILHOUETTE_SHAPES: Readonly<Record<SilhouetteView, readonly ZoneShape[]>> = { front: FRONT, back: BACK };

/** The body outline (not tappable): head, neck, torso, pelvis, arms, legs — left half mirrored. */
function BodyOutline(): ReactElement {
  const half = (
    <>
      <rect x={40} y={70} width={18} height={66} rx={9} transform="rotate(8 49 70)" />
      <rect x={33} y={136} width={16} height={62} rx={8} transform="rotate(6 41 136)" />
      <ellipse cx={36} cy={206} rx={7} ry={10} />
      <rect x={68} y={196} width={30} height={90} rx={14} />
      <rect x={72} y={290} width={22} height={86} rx={10} />
      <ellipse cx={82} cy={384} rx={12} ry={6} />
    </>
  );
  return (
    <g fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.12)" strokeWidth={1}>
      <ellipse cx={100} cy={29} rx={16} ry={19} />
      <rect x={92} y={46} width={16} height={16} rx={4} />
      <path d="M64 66 Q100 58 136 66 L141 110 Q134 150 131 184 L69 184 Q66 150 59 110 Z" />
      <path d="M69 182 L131 182 Q135 200 129 214 L100 222 L71 214 Q65 200 69 182 Z" />
      {half}
      <g transform={MIRROR}>{half}</g>
    </g>
  );
}

function ShapeEl({ shape, ...rest }: { shape: Shape } & SVGProps<SVGElement>): ReactElement {
  const common = rest as SVGProps<SVGEllipseElement & SVGPathElement & SVGRectElement>;
  if (shape.kind === 'ellipse') {
    return (
      <ellipse
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx}
        ry={shape.ry}
        transform={shape.rot ? `rotate(${shape.rot} ${shape.cx} ${shape.cy})` : undefined}
        {...common}
      />
    );
  }
  if (shape.kind === 'rect') return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} {...common} />;
  return <path d={shape.d} {...common} />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Active = { zone: BodyZone; half: Half };

export default function SorenessSilhouette({ value, onChange, lang = 'ru', className = '' }: SorenessSilhouetteProps): ReactElement {
  const t = SORENESS_LABELS[lang];
  const titleId = useId();
  const [active, setActive] = useState<Active | null>(null);
  const [bothSides, setBothSides] = useState(false);
  const [tooMany, setTooMany] = useState(false);

  const levelWord = (s: SorenessSeverity | null) => (s === null ? null : `${s}/5 · ${t.severity[s]}`);
  const sideWord = (h: Half | 'both') => (h === 'center' ? '' : t.sides[h]);

  const open = (zone: BodyZone, half: Half) => {
    setTooMany(false);
    if (active && active.zone === zone && active.half === half) {
      setActive(null);
      return;
    }
    setActive({ zone, half });
    // "Both sides" starts on when the zone is already marked the same on both.
    const l = severityAt(value, zone, 'left');
    setBothSides(half !== 'center' && l !== null && l === severityAt(value, zone, 'right'));
  };

  const targetHalves = (a: Active): Half[] => (a.half !== 'center' && bothSides ? ['left', 'right'] : [a.half]);

  const choose = (severity: SorenessSeverity | null) => {
    if (!active) return;
    const r = setSeverity(value, active.zone, targetHalves(active), severity);
    if (!r.ok) {
      setTooMany(true);
      return;
    }
    setTooMany(false);
    onChange(r.map);
    if (severity === null) setActive(null);
  };

  const onKey = (e: KeyboardEvent, zone: BodyZone, half: Half) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(zone, half);
    }
  };

  /** One tappable half. `mirrored` = drawn on the viewer's right. */
  const renderHalf = (view: SilhouetteView, z: ZoneShape, mirrored: boolean) => {
    const half = athleteHalf(z.zone, view, mirrored);
    const sev = severityAt(value, z.zone, half);
    const isActive = active?.zone === z.zone && (active.half === half || (bothSides && active.half !== 'center'));
    const color = sev === null ? null : SEVERITY_COLOR[sev];
    const el = (
      <ShapeEl
        shape={z.shape}
        role="button"
        tabIndex={0}
        aria-pressed={sev !== null}
        aria-label={t.zoneAria(t.zones[z.zone], sideWord(half), levelWord(sev))}
        onClick={() => open(z.zone, half)}
        onKeyDown={(e: KeyboardEvent) => onKey(e, z.zone, half)}
        className="cursor-pointer outline-none transition-[fill,stroke,opacity] duration-150 hover:opacity-90 focus-visible:[stroke:#FFFFFF] focus-visible:[stroke-width:2]"
        style={{
          fill: color ? `${color}8C` : 'rgba(255,255,255,0.07)',
          stroke: isActive ? '#FFFFFF' : color ?? 'rgba(255,255,255,0.22)',
          strokeWidth: isActive ? 2 : 1,
        }}
      >
        <title>{t.zoneAria(t.zones[z.zone], sideWord(half), levelWord(sev))}</title>
      </ShapeEl>
    );
    return mirrored ? (
      <g key={`${z.zone}-${view}-m`} transform={MIRROR}>
        {el}
      </g>
    ) : (
      <g key={`${z.zone}-${view}`}>{el}</g>
    );
  };

  const figure = (view: SilhouetteView, zones: readonly ZoneShape[]) => {
    // Athlete's left/right marks at the viewer's edges.
    const leftEdge = view === 'front' ? t.rightMark : t.leftMark;
    const rightEdge = view === 'front' ? t.leftMark : t.rightMark;
    return (
      <figure className="flex flex-col items-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[190px]" aria-label={view === 'front' ? t.front : t.back}>
          <BodyOutline />
          {zones.map((z) =>
            halvesOf(z.zone)[0] === 'center' ? renderHalf(view, z, false) : [renderHalf(view, z, false), renderHalf(view, z, true)]
          )}
          <text x={10} y={392} className="fill-zinc-500 text-[13px] font-semibold">
            {leftEdge}
          </text>
          <text x={W - 10} y={392} textAnchor="end" className="fill-zinc-500 text-[13px] font-semibold">
            {rightEdge}
          </text>
        </svg>
        <figcaption className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
          {view === 'front' ? t.front : t.back}
        </figcaption>
      </figure>
    );
  };

  const activeSeverity = active ? severityAt(value, active.zone, active.half) : null;
  const showRefer = active !== null && activeSeverity !== null && isReferred(active.zone, activeSeverity);

  return (
    <section
      className={`rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl ${className}`}
      aria-labelledby={titleId}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em] text-zinc-50">
          {t.title}
        </h2>
        <p className="text-xs tabular-nums text-zinc-400">{t.selected(value.length, SORENESS_RULES.maxZones)}</p>
      </header>
      <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-6">
        {figure('front', FRONT)}
        {figure('back', BACK)}
      </div>

      {active && (
        <div className="mt-4 rounded-2xl bg-black/30 p-4 ring-1 ring-inset ring-white/[0.08]" role="group" aria-label={t.pickLevel}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-50">
              {t.zones[active.zone]}
              {active.half !== 'center' && (
                <span className="font-normal text-zinc-400"> · {bothSides ? t.sides.both : t.sides[active.half]}</span>
              )}
            </p>
            {active.half !== 'center' && (
              <button
                type="button"
                onClick={() => setBothSides((b) => !b)}
                aria-pressed={bothSides}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
                  bothSides ? 'bg-[#CCFF00] text-zinc-950 ring-[#CCFF00]' : 'text-zinc-300 ring-white/15 hover:bg-white/5'
                }`}
              >
                {t.bothSides}
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-zinc-400">{t.pickLevel}</p>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {SORENESS_SEVERITIES.map((s) => {
              const on = activeSeverity === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => choose(s)}
                  aria-pressed={on}
                  aria-label={`${s}/5 · ${t.severity[s]}`}
                  className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center ring-1 ring-inset transition-colors ${
                    on ? 'bg-white/10 ring-white/40' : 'ring-white/10 hover:bg-white/5'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-zinc-950" style={{ backgroundColor: SEVERITY_COLOR[s] }}>
                    {s}
                  </span>
                  <span className="text-[10.5px] leading-tight text-zinc-300 [hyphens:auto]">{t.severity[s]}</span>
                </button>
              );
            })}
          </div>

          {showRefer && (
            <p className="mt-3 rounded-xl bg-[#FFB020]/[0.08] p-3 text-xs leading-relaxed text-zinc-200 ring-1 ring-inset ring-[#FFB020]/30">
              {t.referHint}
            </p>
          )}
          {tooMany && (
            <p className="mt-3 rounded-xl bg-[#FF4D5E]/[0.08] p-3 text-xs leading-relaxed text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30" role="alert">
              {t.tooMany(SORENESS_RULES.maxZones)}
            </p>
          )}

          <div className="mt-3 flex justify-end gap-2">
            {activeSeverity !== null && (
              <button type="button" onClick={() => choose(null)} className="rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">
                {t.remove}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActive(null)}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-zinc-50 hover:bg-white/15"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-2" aria-live="polite">
        {value.length === 0 && <li className="text-sm text-zinc-500">{t.empty}</li>}
        {value.map((z) => {
          const half: Half = z.side === 'both' ? 'left' : z.side;
          const referred = isReferred(z.zoneId, z.severity);
          return (
            <li key={`${z.zoneId}:${z.side}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] py-1 pl-2 pr-1 text-xs text-zinc-200 ring-1 ring-inset ring-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setActive({ zone: z.zoneId, half });
                    setBothSides(z.side === 'both');
                  }}
                  className="inline-flex items-center gap-1.5"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[z.severity] }} aria-hidden />
                  <span>
                    {t.zones[z.zoneId]}
                    {z.side !== 'center' && ` · ${t.sides[z.side]}`} · {z.severity}/5
                    {referred && ' ⚑'}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${t.remove}: ${t.zones[z.zoneId]}`}
                  onClick={() => {
                    const r = setSeverity(value, z.zoneId, z.side === 'both' ? ['left', 'right'] : [z.side], null);
                    if (r.ok) onChange(r.map);
                    setActive(null);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
                >
                  ×
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">{t.notPain}</p>
    </section>
  );
}
