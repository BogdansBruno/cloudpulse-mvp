'use client';

// adp/src/components/PlayerRadarCard.tsx
//
// The athlete's radar card: four axes (Physical, Consistency, Academics,
// Recovery), now vs the same athlete a month ago (PRD 2, zone 5).
//
// Product rules this component enforces on its own, even if a caller passes
// more than it should:
//   - It compares the athlete only with themselves. There is no prop for a
//     team average or another player — no leaderboards (PRD risk 3).
//   - audience="shared" drops the Recovery axis (built on health data).
//   - A missing value is shown as "no data", never drawn as a zero.
//   - The shape is never the only carrier of meaning: every axis is also
//     listed as text with its trend word, for screen readers and colour-blind
//     users.
//
// Purely presentational: no fetching, no Supabase. Values come from the
// engines through the page that renders this card.

import { useId, type ReactElement } from 'react';
import { RADAR_LABELS, type AdpLang } from './labels';
import {
  axisPoint,
  cleanLevel,
  knownPoints,
  polygonPoints,
  trendOf,
  visibleAxes,
  type RadarAudience,
  type RadarAxis,
  type RadarValues,
  type Trend,
} from './radar';

export type PlayerRadarCardProps = {
  current: RadarValues;
  lastMonth: RadarValues;
  audience?: RadarAudience;
  lang?: AdpLang;
  /** Shown in the header for shared views ("Max · Athlete passport"). */
  playerName?: string;
  className?: string;
};

// Wider than tall: axis names sit left and right of the shape and are long
// in Latvian and Russian ("Atjaunošanās", "Восстановление").
const WIDTH = 410;
const HEIGHT = 290;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const RADIUS = 92;
const RINGS = [0.25, 0.5, 0.75, 1] as const;

// CloudPulse palette: lime = now, zinc = the past.
const LIME = '#CCFF00';
const PAST = '#A1A1AA';
const GRID = 'rgba(255,255,255,0.10)';

const TREND_GLYPH: Readonly<Record<Trend, string>> = { up: '↑', down: '↓', same: '→', no_data: '·' };
const TREND_TONE: Readonly<Record<Trend, string>> = {
  up: 'text-[#CCFF00]',
  down: 'text-[#FFB020]',
  same: 'text-zinc-300',
  no_data: 'text-zinc-500',
};

export default function PlayerRadarCard({
  current,
  lastMonth,
  audience = 'athlete',
  lang = 'lv',
  playerName,
  className = '',
}: PlayerRadarCardProps): ReactElement {
  const t = RADAR_LABELS[lang];
  const titleId = useId(); // unique per card, so several cards can share a page
  const axes = visibleAxes(audience);
  const n = axes.length;

  const nowShape = polygonPoints(current, axes, RADIUS, CENTER);
  const pastShape = polygonPoints(lastMonth, axes, RADIUS, CENTER);
  const nowDots = nowShape === null ? knownPoints(current, axes, RADIUS, CENTER) : [];
  const incomplete = nowShape === null;

  const trendWord = (tr: Trend): string =>
    tr === 'up' ? t.trendUp : tr === 'down' ? t.trendDown : tr === 'same' ? t.trendSame : t.noData;

  const rows = axes.map((axis: RadarAxis) => ({
    axis,
    name: t.axes[axis],
    trend: trendOf(current[axis], lastMonth[axis]),
    known: cleanLevel(current[axis]) !== null,
  }));

  const summary = rows.map((r) => `${r.name}: ${trendWord(r.trend)}`).join('; ');

  // Axis label anchor: left / middle / right depending on which side it sits.
  const labelFor = (i: number) => {
    const p = axisPoint(i, n, 1.2, RADIUS, CENTER);
    const anchor: 'start' | 'middle' | 'end' =
      Math.abs(p.x - CENTER.x) < 1 ? 'middle' : p.x > CENTER.x ? 'start' : 'end';
    return { ...p, anchor };
  };

  return (
    <section
      className={`rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl ${className}`}
      aria-labelledby={titleId}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em] text-zinc-50">
          {playerName ? `${playerName} · ${t.title}` : t.title}
        </h2>
        <p className="text-xs text-zinc-400">{t.subtitle}</p>
      </header>

      <div className="mt-4 flex flex-col items-center gap-5 md:flex-row md:items-start">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full max-w-[410px] shrink-0"
          role="img"
          aria-label={`${t.title}. ${summary}`}
        >
          {/* Grid rings and spokes */}
          {RINGS.map((r) => (
            <polygon
              key={r}
              points={axes.map((_, i) => axisPoint(i, n, r, RADIUS, CENTER)).map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          ))}
          {axes.map((axis, i) => {
            const end = axisPoint(i, n, 1, RADIUS, CENTER);
            return <line key={axis} x1={CENTER.x} y1={CENTER.y} x2={end.x} y2={end.y} stroke={GRID} strokeWidth={1} />;
          })}

          {/* A month ago: dashed outline only */}
          {pastShape !== null && (
            <polygon points={pastShape} fill="none" stroke={PAST} strokeWidth={1.5} strokeDasharray="4 4" />
          )}

          {/* Now: filled shape, or only the known dots */}
          {nowShape !== null && (
            <polygon points={nowShape} fill={LIME} fillOpacity={0.14} stroke={LIME} strokeWidth={2} strokeLinejoin="round" />
          )}
          {nowDots.map(({ axis, point }) => (
            <circle key={axis} cx={point.x} cy={point.y} r={4} fill={LIME} />
          ))}

          {/* Axis names */}
          {axes.map((axis, i) => {
            const p = labelFor(i);
            return (
              <text
                key={axis}
                x={p.x}
                y={p.y + 4}
                textAnchor={p.anchor}
                fontSize={12}
                fill="#D4D4D8"
              >
                {t.axes[axis]}
              </text>
            );
          })}
        </svg>

        <div className="w-full min-w-0 flex-1">
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.axis} className="flex items-center justify-between gap-3 text-sm">
                <span className={r.known ? 'text-zinc-200' : 'text-zinc-500'}>{r.name}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${TREND_TONE[r.trend]}`}>
                  <span aria-hidden>{TREND_GLYPH[r.trend]}</span>
                  {trendWord(r.trend)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded" style={{ backgroundColor: LIME }} />
              {t.current}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-0 w-4 border-t border-dashed" style={{ borderColor: PAST }} />
              {t.lastMonth}
            </span>
          </div>

          {incomplete && <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">{t.incomplete}</p>}
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            {audience === 'athlete' ? t.privacyNote : t.sharedNote}
          </p>
        </div>
      </div>
    </section>
  );
}
