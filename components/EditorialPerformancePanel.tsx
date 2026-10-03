'use client';

// Chat sidebar in the ADP "Dark Editorial Biohacking" style.
//
// Same data and the same rules as components/PerformancePanel.tsx (that file
// stays for the other pages): readiness from the deterministic engine, ACWR
// with the 0.8–1.3 safe band, the four check-in scales (1–7, higher = better),
// the 7-day trend and the no-rest streak. Only the look changes: editorial
// glass cards, the engine's verdict in the serif, capsule "you are here"
// scales. Every status keeps an icon + words, never colour alone.

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { ArrowRight, Barbell, CheckCircle, Warning, WarningOctagon } from '@phosphor-icons/react';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import type { Lang } from '@/lib/i18n/translations';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { loadStatus, NO_REST_LIMIT } from '@/components/PerformancePanel';
import { COACH_LABELS } from '@/adp/src/components/labels';
import GlassRing from '@/adp/src/components/ui/GlassRing';
import LiquidGlassCard from '@/adp/src/components/ui/LiquidGlassCard';
import { MICRO_LABEL, SLATE_300, SLATE_400, VERDICT_STYLE } from '@/adp/src/components/ui/typography';

type Zone = ReadinessHistoryPoint['zone'];

/** Editorial status colours: teal = optimal, yellow = caution, rose = stop, coral = strain. */
export const ED = {
  teal: '#2DD4BF',
  yellow: '#FACC15',
  rose: '#FB7185',
  coral: '#FB923C',
  indigo: '#A5B4FC',
  track: 'rgba(255,255,255,0.10)',
} as const;

export function edZone(zone: Zone) {
  if (zone === 'green') return { color: ED.teal, Icon: CheckCircle };
  if (zone === 'yellow') return { color: ED.yellow, Icon: Warning };
  return { color: ED.rose, Icon: WarningOctagon };
}

export function edLoadColor(acwr: number): string {
  const s = loadStatus(acwr);
  return s === 'ok' ? ED.teal : s === 'spike' ? ED.rose : ED.yellow;
}

export function edNoRestColor(days: number): string {
  return days > NO_REST_LIMIT ? ED.yellow : SLATE_300;
}

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

/** Capsule scale: light band = normal range, white glowing dot = today. */
function Scale({
  label,
  valueText,
  value,
  min,
  max,
  normFrom,
  normTo,
  color,
  here,
}: {
  label: string;
  valueText: string;
  value: number | null;
  min: number;
  max: number;
  normFrom: number;
  normTo: number;
  color: string;
  here?: string;
}): ReactElement {
  const pos = (v: number) => `${(Math.max(0, Math.min(1, (v - min) / (max - min))) * 100).toFixed(1)}%`;
  const inNorm = value !== null && value >= normFrom && value <= normTo;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs" style={{ color: SLATE_300 }}>
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: value === null ? SLATE_400 : inNorm ? '#FFFFFF' : color }}>
          {valueText}
        </span>
      </div>
      <div className={`relative ${here && value !== null ? 'mt-6' : 'mt-2'}`}>
        <div className="h-2.5 w-full rounded-full bg-white/10" />
        <div
          aria-hidden
          className="absolute top-0 h-2.5 rounded-full"
          style={{ left: pos(normFrom), width: `calc(${pos(normTo)} - ${pos(normFrom)})`, background: `linear-gradient(90deg, ${color}40, ${color}80)`, boxShadow: `0 0 12px -2px ${color}66` }}
        />
        {value !== null && (
          <span
            aria-hidden
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{ left: pos(value), boxShadow: '0 0 0 3px rgba(12,13,18,0.9), 0 0 10px rgba(255,255,255,0.9)' }}
          />
        )}
        {here && value !== null && (
          <span
            className={`absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-white ${MICRO_LABEL}`}
            style={{ left: `clamp(44px, ${pos(value)}, calc(100% - 44px))` }}
          >
            {here}
          </span>
        )}
      </div>
    </div>
  );
}

/** 7-day readiness trend: soft area, thin line, today as a glowing white point. */
function Trend({ points }: { points: ReadinessHistoryPoint[] }): ReactElement {
  const { t, lang } = useLanguage();
  const [hover, setHover] = useState<number | null>(null);
  const W = 280;
  const H = 72;
  const PAD = 10;
  if (points.length < 2) {
    return (
      <p className="py-4 text-center text-xs" style={{ color: SLATE_400 }}>
        {t.hub.notEnoughData}
      </p>
    );
  }
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (points.length - 1);
  const y = (s: number) => PAD + (1 - s / 100) * (H - PAD * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
  const last = points.length - 1;
  const hp = hover !== null ? points[hover] : null;
  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)} role="img" aria-label={t.hub.trend}>
        <defs>
          <linearGradient id="edTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ED.teal} stopOpacity="0.22" />
            <stop offset="100%" stopColor={ED.teal} stopOpacity="0" />
          </linearGradient>
          <filter id="edTrendGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <line x1={PAD} x2={W - PAD} y1={y(75)} y2={y(75)} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
        <line x1={PAD} x2={W - PAD} y1={y(50)} y2={y(50)} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 4" />
        <path d={`${line} L ${x(last)} ${H} L ${x(0)} ${H} Z`} fill="url(#edTrendFill)" />
        <path d={line} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.date}>
            {i === last && <circle cx={x(i)} cy={y(p.score)} r={9} fill="#FFFFFF" opacity={0.6} filter="url(#edTrendGlow)" />}
            <circle cx={x(i)} cy={y(p.score)} r={i === last || hover === i ? 4.5 : 3} fill={i === last ? '#FFFFFF' : edZone(p.zone).color} />
            <rect
              x={x(i) - (W - PAD * 2) / (points.length - 1) / 2}
              y={0}
              width={(W - PAD * 2) / (points.length - 1)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute -top-8 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-[#161721]/95 px-2.5 py-1 text-[11px] text-white"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          {new Date(`${hp.date}T12:00:00`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' })} ·{' '}
          <span className="font-semibold tabular-nums">{hp.score}</span>
        </div>
      )}
    </div>
  );
}

function Skeleton(): ReactElement {
  return (
    <div className="space-y-3" aria-busy>
      <div className="mx-auto h-[184px] w-[184px] animate-pulse rounded-full bg-white/[0.05]" />
      <div className="h-28 animate-pulse rounded-[28px] bg-white/[0.04]" />
      <div className="h-40 animate-pulse rounded-[28px] bg-white/[0.04]" />
    </div>
  );
}

export function EditorialPerformancePanel({ history, loading }: { history: ReadinessHistoryPoint[] | null; loading: boolean }): ReactElement {
  const { t, lang } = useLanguage();
  const coach = COACH_LABELS[lang];
  if (loading || !history) return <Skeleton />;

  const today = history[history.length - 1];
  const hasToday = Boolean(today?.hasCheckin);
  const last7 = history.slice(-7).filter((p) => p.hasCheckin);
  const zone = today ? edZone(today.zone) : null;
  const zoneLabel = today?.zone === 'green' ? t.progress.zoneGreen : today?.zone === 'yellow' ? t.progress.zoneYellow : t.progress.zoneRed;
  const acwr = today?.acwr ?? null;
  const loadLabel =
    acwr === null ? t.hub.notEnoughData : loadStatus(acwr) === 'low' ? t.hub.loadLow : loadStatus(acwr) === 'ok' ? t.hub.loadOk : t.hub.loadHigh;
  const streak = today?.trainingStreak ?? 0;

  return (
    <div className="space-y-3">
      {/* Readiness hero */}
      {hasToday && today && zone ? (
        <LiquidGlassCard tone="editorial" radius={28} className="px-5 pb-5 pt-6">
          <div className="flex flex-col items-center text-center">
            <div style={{ filter: `drop-shadow(0 0 14px ${zone.color}66)` }}>
              <GlassRing value={today.score} size={184} stroke={7} color={zone.color}>
                <span className="text-[56px] font-bold leading-none tracking-tight text-white tabular-nums">{today.score}</span>
                <span className={`mt-2 ${MICRO_LABEL}`} style={{ color: SLATE_400 }}>
                  {t.hub.readiness}
                </span>
              </GlassRing>
            </div>
            <span
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${MICRO_LABEL}`}
              style={{ color: zone.color, background: `${zone.color}1A`, border: `1px solid ${zone.color}4D` }}
            >
              <zone.Icon size={12} weight="fill" />
              {zoneLabel}
            </span>
            <p className="mt-3" style={VERDICT_STYLE}>
              {coach.verdict[today.zone]}
            </p>
            <p className="mt-2 text-xs" style={{ color: SLATE_400 }}>
              {t.hub.readinessHint}
            </p>
          </div>
        </LiquidGlassCard>
      ) : (
        <LiquidGlassCard tone="editorial" radius={28} className="p-6 text-center">
          <p className="text-sm font-semibold text-white">{t.hub.noCheckinTitle}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: SLATE_300 }}>
            {t.hub.noCheckinBody}
          </p>
          <Link
            href="/checkin"
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-3.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-[0.98]"
          >
            {t.hub.doCheckin}
            <ArrowRight size={14} weight="bold" />
          </Link>
        </LiquidGlassCard>
      )}

      {/* Load */}
      <LiquidGlassCard tone="editorial" radius={28} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className={MICRO_LABEL} style={{ color: SLATE_400 }}>
            {t.hub.load}
          </p>
          {acwr !== null && (
            <span className={`rounded-full px-2.5 py-1 ${MICRO_LABEL}`} style={{ color: edLoadColor(acwr), background: `${edLoadColor(acwr)}1A`, border: `1px solid ${edLoadColor(acwr)}4D` }}>
              {loadLabel}
            </span>
          )}
        </div>
        <p className="mt-2 text-4xl font-bold tracking-tight text-white tabular-nums">{acwr !== null ? acwr.toFixed(2) : '--'}</p>
        <div className="mt-2">
          <Scale label={t.hub.loadSafe} valueText="" value={acwr} min={0} max={2} normFrom={0.8} normTo={1.3} color={ED.teal} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums" style={{ color: SLATE_400 }}>
          <span>0</span>
          <span>2.0</span>
        </div>
      </LiquidGlassCard>

      {/* Check-in scales */}
      {hasToday && today && (
        <LiquidGlassCard tone="editorial" radius={28} className="p-5">
          <div className="space-y-5">
            <Scale label={t.hub.sleep} valueText={`${today.sleepQuality ?? '-'}/7`} value={today.sleepQuality} min={1} max={7} normFrom={5} normTo={7} color={ED.indigo} here={HERE[lang]} />
            <Scale label={t.hub.calm} valueText={`${today.stress ?? '-'}/7`} value={today.stress} min={1} max={7} normFrom={5} normTo={7} color={ED.indigo} />
            <Scale label={t.hub.energy} valueText={`${today.fatigue ?? '-'}/7`} value={today.fatigue} min={1} max={7} normFrom={5} normTo={7} color={ED.indigo} />
            <Scale label={t.hub.muscles} valueText={`${today.soreness ?? '-'}/7`} value={today.soreness} min={1} max={7} normFrom={5} normTo={7} color={ED.coral} />
          </div>
        </LiquidGlassCard>
      )}

      {/* Trend + no-rest streak */}
      <LiquidGlassCard tone="editorial" radius={28} className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className={MICRO_LABEL} style={{ color: SLATE_400 }}>
            {t.hub.trend}
          </p>
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: edNoRestColor(streak) }}>
            <Barbell size={13} weight="fill" />
            <span className="font-semibold tabular-nums">{streak}</span>
            <span style={{ color: SLATE_400 }}>{t.hub.streak}</span>
          </span>
        </div>
        <Trend points={last7} />
      </LiquidGlassCard>
    </div>
  );
}

const HERE: Record<Lang, string> = { ru: 'ты сейчас здесь', lv: 'tu esi šeit', en: 'you are here' };

/** Compact strip for phones, above the chat. */
export function EditorialPerformanceStrip({ history }: { history: ReadinessHistoryPoint[] | null }): ReactElement | null {
  const { t } = useLanguage();
  if (!history || history.length === 0) return null;
  const today = history[history.length - 1];

  if (!today.hasCheckin) {
    return (
      <Link
        href="/checkin"
        className="flex items-center justify-between rounded-full border border-white/[0.12] bg-[rgba(22,23,33,0.75)] px-4 py-3 text-sm backdrop-blur-2xl"
      >
        <span style={{ color: SLATE_300 }}>{t.hub.noCheckinTitle}</span>
        <span className="inline-flex items-center gap-1 font-medium text-white">
          {t.hub.doCheckin}
          <ArrowRight size={14} weight="bold" />
        </span>
      </Link>
    );
  }
  const zone = edZone(today.zone);
  return (
    <LiquidGlassCard tone="editorial" radius={28} interactive={false} className="px-3 py-2.5">
      <div className="flex w-full items-center gap-4">
        <GlassRing value={today.score} size={52} stroke={4} color={zone.color}>
          <span className="text-sm font-bold text-white tabular-nums">{today.score}</span>
        </GlassRing>
        <div className="min-w-0">
          <p className={MICRO_LABEL} style={{ color: SLATE_400 }}>
            ACWR
          </p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: today.acwr !== null ? edLoadColor(today.acwr) : SLATE_400 }}>
            {today.acwr !== null ? today.acwr.toFixed(2) : '--'}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className={MICRO_LABEL} style={{ color: SLATE_400 }}>
            {t.hub.streak}
          </p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: edNoRestColor(today.trainingStreak) }}>
            {today.trainingStreak}
          </p>
        </div>
      </div>
    </LiquidGlassCard>
  );
}
