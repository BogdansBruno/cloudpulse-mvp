'use client';

// components/np/TrendChart.tsx — v3 analytics charts (pure SVG, no chart library).
//
//   <CorrelationChart>  readiness (smooth cyan curve + gradient area) over ADP Load Index bars
//                       (electric blue; the overload part 76–100 in heat). Both series are 0–100,
//                       so one axis is honest; zone guides 50 / 75; check-in days get a dot.
//   <AcwrChart>         ACWR curve with the 0.8–1.3 band and the 1.5 spike line
//   <AcwrBar>           today's ratio on a 0–2 bar split into the engine bands
//
// Curves use monotone cubic interpolation (no overshoot: a smooth line never shows a value
// that is not between two real ones). Hover / touch shows a crosshair and a tooltip.

import { useEffect, useId, useRef, useState, type ReactElement, type RefObject } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { LOCALE } from './copy';
import { APP } from './appCopy';
import { ACWR_PILL, acwrBand } from './Telemetry';
import { STATUS_HEX, scoreStatus } from './status';

export type CorrPoint = { date: string; readiness: number | null; load: number | null; checkin: boolean };

function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Monotone cubic (Fritsch–Carlson) path through the points. */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = dx[i] / 3;
    d += ` C${(x0 + h).toFixed(1)},${(y0 + t[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - t[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

function runs<T>(arr: T[], has: (v: T) => boolean): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  arr.forEach((v, i) => {
    if (has(v)) cur.push(i);
    else if (cur.length) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
}

/** Engine zones (green ≥ 75, yellow 50–74, red < 50) as line colours on a white card. */
/** Score colour on the Lotus scale (85 / 70 / 60). */
export const zoneColor = (score: number): string => STATUS_HEX[scoreStatus(score)];

const dayLabel = (iso: string, lang: Lang) => new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' });

/** ≤ 5 date labels (3 when narrow), first start-aligned, last end-aligned. */
function labelIdx(n: number, W: number): number[] {
  const want = Math.min(n, W < 480 ? 3 : 5);
  if (want <= 0) return [];
  return Array.from(new Set(Array.from({ length: want }, (_, k) => (want === 1 ? 0 : Math.round((k * (n - 1)) / (want - 1))))));
}

/** Dark glass tooltip: date + values with colour dots. */
function Tooltip({ x, W, children }: { x: number; W: number; children: React.ReactNode }): ReactElement {
  return (
    <div
      className="pointer-events-none absolute -top-1 z-10 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-xl border border-white/10 bg-[#0B0D11]/90 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur-md transition-[left] duration-150 ease-out"
      style={{ left: Math.min(W - 90, Math.max(90, x)) }}
    >
      {children}
    </div>
  );
}
function Dot({ color }: { color: string }): ReactElement {
  return <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}

/** Load Index zone → bar colour: light = amber, optimal = terracotta, overload = red. */
export const loadBarColor = (v: number): string => (v > 75 ? '#FF7A59' : v > 40 ? '#FFC53D' : '#FFC53D');

const AXIS_LABEL = { fontSize: 10, fontWeight: 600, letterSpacing: '0.12em' } as const;
const GRID = { className: 'np-svg-grid', stroke: 'rgb(255 255 255 / 0.06)', strokeDasharray: '3 3' } as const;

export function CorrelationChart({ points, lang, height = 220 }: { points: CorrPoint[]; lang: Lang; height?: number }): ReactElement {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pc = APP[lang].progress;
  const [box, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const L = 6;
  const R = 22;
  const T = 16;
  const B = 24;
  const n = points.length;
  const step = n <= 1 ? 0 : (W - L - R) / (n - 1);
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : i * step);
  const y = (v: number) => T + (1 - v / 100) * (height - T - B);
  const barW = Math.max(3, Math.min(16, step * 0.6));
  const base = y(0);

  const readinessRuns = runs(points, (p) => p.readiness !== null);
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || n === 0) return null;
    return Math.max(0, Math.min(n - 1, Math.round((clientX - r.left - L) / Math.max(1, step || 1))));
  };
  const hp = hover !== null ? points[hover] : null;
  const label = `${pc.chartTitle}. ${pc.chartSub}`;

  return (
    <div ref={box} className="relative w-full select-none" style={{ height }}>
      {W > 0 && (
        <svg
          width={W}
          height={height}
          role="img"
          aria-label={label}
          className="block touch-pan-y overflow-visible"
          onPointerMove={(e) => setHover(pick(e.clientX))}
          onPointerDown={(e) => setHover(pick(e.clientX))}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`ra${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3FE0A8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3FE0A8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* only two faint guides: the engine zone borders 50 and 75 */}
          {[50, 75].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} {...GRID} />
              <text x={W - R + 6} y={y(v) + 3.5} className="np-svg-text-3" fill="#C3C5C7" style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                {v}
              </text>
            </g>
          ))}

          {/* Load Index: rounded capsule bars over a faint full-height ghost bar */}
          {points.map((p, i) => (
            <rect key={`g${p.date}`} x={x(i) - barW / 2} y={T} width={barW} height={base - T} rx={barW / 2} fill="rgb(255 255 255 / 0.05)" />
          ))}
          {points.map((p, i) =>
            p.load === null || p.load <= 0 ? null : (
              <rect
                key={`b${p.date}`}
                x={x(i) - barW / 2}
                y={y(p.load)}
                width={barW}
                height={Math.max(barW, base - y(p.load))}
                rx={barW / 2}
                fill={loadBarColor(p.load)}
                style={{ opacity: hover === null || hover === i ? 0.9 : 0.35, transition: 'opacity 300ms ease-out' }}
              />
            )
          )}

          {/* readiness: thin emerald spline with a fill that fades to nothing */}
          {readinessRuns.map((run, k) => {
            const pts = run.map((i) => [x(i), y(points[i].readiness as number)] as [number, number]);
            const line = smoothPath(pts);
            const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z` : '';
            return (
              <g key={`r${k}`}>
                {area && <path d={area} fill={`url(#ra${uid})`} />}
                <path d={line} fill="none" className="np-svg-line" stroke="#3FE0A8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgb(63 224 168 / 0.5))' }} />
              </g>
            );
          })}

          {/* active point only */}
          {hp && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={base} className="np-svg-tick" stroke="rgb(255 255 255 / 0.25)" />
              {hp.readiness !== null && <circle cx={x(hover)} cy={y(hp.readiness)} r="4.5" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 0 6px rgb(255 255 255 / 0.8))' }} />}
            </g>
          )}

          {labelIdx(n, W).map((i) => (
            <text
              key={`x${points[i].date}`}
              x={x(i)}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="np-svg-text-3"
              fill="#C3C5C7"
              style={AXIS_LABEL}
            >
              {dayLabel(points[i].date, lang).toUpperCase()}
            </text>
          ))}
        </svg>
      )}
      {hp && hover !== null && W > 0 && (
        <Tooltip x={x(hover)} W={W}>
          <span className="text-white/75">{dayLabel(hp.date, lang)}</span>
          <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
            <Dot color="#3FE0A8" />
            {hp.readiness ?? '—'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
            <Dot color={hp.load !== null ? loadBarColor(hp.load) : '#FFC53D'} />
            {hp.load ?? '—'}
          </span>
          {!hp.checkin && <span className="text-white/75">· {APP[lang].calendar.legendNoCheckin.toLowerCase()}</span>}
        </Tooltip>
      )}
    </div>
  );
}

export function AcwrChart({ points, lang, height = 160 }: { points: { date: string; acwr: number | null }[]; lang: Lang; height?: number }): ReactElement {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const L = 6;
  const R = 28;
  const T = 10;
  const B = 22;
  const n = points.length;
  const vals = points.map((p) => p.acwr).filter((v): v is number => v !== null);
  const max = Math.max(1.8, ...vals) * 1.05;
  const step = n <= 1 ? 0 : (W - L - R) / (n - 1);
  const x = (i: number) => L + i * step;
  const y = (v: number) => T + (1 - v / max) * (height - T - B);
  const base = y(0);
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || n === 0) return null;
    return Math.max(0, Math.min(n - 1, Math.round((clientX - r.left - L) / Math.max(1, step || 1))));
  };
  const hp = hover !== null ? points[hover] : null;
  const fmt = (v: number) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt1 = (v: number) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div ref={box} className="relative w-full select-none" style={{ height }}>
      {W > 0 && (
        <svg
          width={W}
          height={height}
          className="block touch-pan-y overflow-visible"
          aria-hidden
          onPointerMove={(e) => setHover(pick(e.clientX))}
          onPointerDown={(e) => setHover(pick(e.clientX))}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`aa${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFC53D" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFC53D" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* the safe 0.8–1.3 band as a whisper of emerald, two faint guides */}
          <rect x={L} y={y(1.3)} width={W - L - R} height={y(0.8) - y(1.3)} rx="6" fill="rgb(63 224 168 / 0.06)" />
          {[0.8, 1.3].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} {...GRID} />
              <text x={W - R + 6} y={y(v) + 3.5} className="np-svg-text-3" fill="#C3C5C7" style={{ fontSize: 10 }}>
                {fmt1(v)}
              </text>
            </g>
          ))}
          <line x1={L} x2={W - R} y1={y(1.5)} y2={y(1.5)} stroke="rgb(255 122 89 / 0.35)" strokeDasharray="3 3" />
          <text x={W - R + 6} y={y(1.5) + 3.5} fill="#FF7A59" style={{ fontSize: 10 }}>
            {fmt1(1.5)}
          </text>
          {runs(points, (p) => p.acwr !== null).map((run, k) => {
            const pts = run.map((i) => [x(i), y(points[i].acwr as number)] as [number, number]);
            const line = smoothPath(pts);
            const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z` : '';
            return (
              <g key={k}>
                {area && <path d={area} fill={`url(#aa${uid})`} />}
                <path d={line} fill="none" stroke="#FFC53D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}
          {hp && hover !== null && hp.acwr !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={base} className="np-svg-tick" stroke="rgb(255 255 255 / 0.25)" />
              <circle cx={x(hover)} cy={y(hp.acwr)} r="4.5" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 0 6px rgb(255 255 255 / 0.8))' }} />
            </g>
          )}
          {labelIdx(n, W).map((i) => (
            <text key={i} x={x(i)} y={height - 5} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="np-svg-text-3" fill="#C3C5C7" style={AXIS_LABEL}>
              {dayLabel(points[i].date, lang).toUpperCase()}
            </text>
          ))}
        </svg>
      )}
      {hp && hover !== null && hp.acwr !== null && W > 0 && (
        <Tooltip x={x(hover)} W={W}>
          <span className="text-white/75">{dayLabel(hp.date, lang)}</span>
          <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
            <Dot color="#FFC53D" />
            {fmt(hp.acwr)}
          </span>
        </Tooltip>
      )}
    </div>
  );
}

const BANDS: { key: 'low' | 'sweet' | 'caution' | 'spike'; from: number; to: number; color: string }[] = [
  { key: 'low', from: 0, to: 0.8, color: '#C3C5C7' },
  { key: 'sweet', from: 0.8, to: 1.3, color: '#3FE0A8' },
  { key: 'caution', from: 1.3, to: 1.5, color: '#FFC53D' },
  { key: 'spike', from: 1.5, to: 2, color: '#FF7A59' },
];

export function AcwrBar({ acwr, lang }: { acwr: number | null; lang: Lang }): ReactElement {
  const tl = APP[lang].v3.telemetry;
  const pc = APP[lang].progress;
  const fmt = (v: number) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const band = acwr !== null ? acwrBand(acwr) : null;
  const pos = acwr !== null ? (Math.min(2, Math.max(0, acwr)) / 2) * 100 : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="np-label">
          {tl.acwr} · {pc.acwrNow}
        </span>
        {band && <span className={`np-pill ${ACWR_PILL[band]}`}>{tl.acwrBand[band]}</span>}
      </div>
      <p className="np-metric mt-2 text-5xl">
        {acwr !== null ? fmt(acwr) : '—'}
      </p>
      <div className="relative mt-4" aria-hidden>
        <div className="flex h-1.5 gap-1">
          {BANDS.map((b) => (
            <span key={b.key} className="h-full rounded-full" style={{ flex: `${b.to - b.from} 1 0%`, backgroundColor: `${b.color}66` }} />
          ))}
        </div>
        {pos !== null && (
          <span
            className="absolute top-[3px] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#121214] bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] transition-[left] duration-300 ease-out"
            style={{ left: `${pos}%`, boxShadow: `0 0 10px ${BANDS.find((b) => b.key === band)?.color ?? '#FFFFFF'}` }}
          />
        )}
        <div className="np-mono relative mt-2 h-3 text-[10px] text-np-text-3">
          {[0, 0.8, 1.3, 1.5, 2].map((v) => (
            <span
              key={v}
              className="absolute top-0"
              style={{ left: `${(v / 2) * 100}%`, transform: v === 0 ? 'none' : v === 2 ? 'translateX(-100%)' : 'translateX(-50%)' }}
            >
              {v === 0 || v === 2 ? v : v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 1 })}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-np-text-3">{pc.acwrSub}</p>
    </div>
  );
}
