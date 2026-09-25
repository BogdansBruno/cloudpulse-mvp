'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle, Warning, WarningOctagon, Flame, ArrowRight } from '@phosphor-icons/react';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import type { Lang } from '@/lib/i18n/translations';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// ---------------------------------------------------------------------------
// Design tokens for the performance hub. Kept here (not in Tailwind config)
// so every chart in this file draws from the same four values.
// Status colours always ship with an icon + text label, never colour alone.
// ---------------------------------------------------------------------------
export const HUB = {
  lime: '#CCFF00', // brand accent + "good"
  amber: '#FFB020', // "watch"
  red: '#FF4D5E', // "stop"
  track: 'rgba(255,255,255,0.07)',
} as const;

type Zone = ReadinessHistoryPoint['zone'];

export function zoneMeta(zone: Zone) {
  if (zone === 'green') return { color: HUB.lime, Icon: CheckCircle };
  if (zone === 'yellow') return { color: HUB.amber, Icon: Warning };
  return { color: HUB.red, Icon: WarningOctagon };
}

type LoadStatus = 'low' | 'ok' | 'high' | 'spike';

export function loadStatus(acwr: number): LoadStatus {
  if (acwr < 0.8) return 'low';
  if (acwr <= 1.3) return 'ok';
  if (acwr <= 1.5) return 'high';
  return 'spike';
}

function loadColor(s: LoadStatus) {
  return s === 'ok' ? HUB.lime : s === 'spike' ? HUB.red : HUB.amber;
}

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

function formatDay(iso: string, lang: Lang) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' });
}

const SPRING = { type: 'spring', bounce: 0, duration: 0.5 } as const;

// ---------------------------------------------------------------------------
// Readiness ring: the one bold element of the hub.
// ---------------------------------------------------------------------------
export function ReadinessRing({ score, zone, size = 200 }: { score: number; zone: Zone; size?: number }) {
  const reduce = useReducedMotion();
  const stroke = size > 100 ? 11 : 6;
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const target = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const { color } = zoneMeta(zone);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={HUB.track} strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: reduce ? target : c }}
        animate={{ strokeDashoffset: target }}
        transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 1.2, delay: 0.1 }}
        style={{ filter: size > 100 ? `drop-shadow(0 0 10px ${color}55)` : undefined }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ACWR gauge: semicircle 0-2.0 with the 0.8-1.3 safe band marked.
// ---------------------------------------------------------------------------
function LoadGauge({ acwr }: { acwr: number | null }) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const W = 220;
  const H = 122;
  const cx = W / 2;
  const cy = 110;
  const r = 92;
  const MAX = 2;

  const pt = (v: number) => {
    const theta = Math.PI * (1 - Math.max(0, Math.min(MAX, v)) / MAX);
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
  };
  const arc = (a: number, b: number) => {
    const p1 = pt(a);
    const p2 = pt(b);
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
  };

  const status = acwr !== null ? loadStatus(acwr) : null;
  const marker = acwr !== null ? pt(acwr) : null;
  const statusLabel =
    status === null
      ? t.hub.notEnoughData
      : status === 'low'
        ? t.hub.loadLow
        : status === 'ok'
          ? t.hub.loadOk
          : t.hub.loadHigh;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.hub.load}: ${acwr?.toFixed(2) ?? statusLabel}`}>
        <path d={arc(0, MAX)} fill="none" stroke={HUB.track} strokeWidth={8} strokeLinecap="round" />
        <path d={arc(0.8, 1.3)} fill="none" stroke={HUB.lime} strokeOpacity={0.35} strokeWidth={8} />
        {marker && status && (
          <motion.circle
            r={8}
            fill={loadColor(status)}
            stroke="#0D0F13"
            strokeWidth={3}
            initial={reduce ? { cx: marker.x, cy: marker.y } : { cx: pt(0).x, cy: pt(0).y }}
            animate={{ cx: marker.x, cy: marker.y }}
            transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 1, delay: 0.2 }}
          />
        )}
        <text x={pt(0).x} y={cy + 12} textAnchor="middle" className="fill-zinc-500 font-mono" fontSize="10">
          0
        </text>
        <text x={pt(MAX).x} y={cy + 12} textAnchor="middle" className="fill-zinc-500 font-mono" fontSize="10">
          2.0
        </text>
      </svg>
      <div className="-mt-12 flex flex-col items-center">
        <span className="font-mono text-3xl font-light tabular-nums tracking-tight text-zinc-50">
          {acwr !== null ? acwr.toFixed(2) : '--'}
        </span>
        <span className="mt-1 text-xs" style={{ color: status ? loadColor(status) : undefined }}>
          <span className={status ? '' : 'text-zinc-500'}>{statusLabel}</span>
        </span>
      </div>
      <p className="mt-3 text-center text-[11px] text-zinc-500">{t.hub.loadSafe}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hooper sub-scores from today's check-in, all 1-7 where higher is better.
// ---------------------------------------------------------------------------
function HooperTile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06]">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="font-mono text-sm tabular-nums text-zinc-100">
          {value ?? '-'}
          <span className="text-zinc-600">/7</span>
        </span>
      </div>
      <div className="mt-2.5 flex gap-[3px]" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${value !== null && i < value ? 'bg-zinc-200' : 'bg-white/[0.07]'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7-day readiness sparkline with a per-point hover tooltip.
// ---------------------------------------------------------------------------
function TrendSparkline({ points }: { points: ReadinessHistoryPoint[] }) {
  const { t, lang } = useLanguage();
  const [hover, setHover] = useState<number | null>(null);
  const W = 280;
  const H = 64;
  const PAD = 8;

  if (points.length < 2) {
    return <p className="py-4 text-center text-xs text-zinc-500">{t.hub.notEnoughData}</p>;
  }

  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (points.length - 1);
  const y = (s: number) => PAD + (1 - s / 100) * (H - PAD * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.score)}`).join(' ');
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)} role="img" aria-label={t.hub.trend}>
        <line x1={PAD} x2={W - PAD} y1={y(50)} y2={y(50)} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
        <path d={d} fill="none" stroke={HUB.lime} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.date}>
            <circle
              cx={x(i)}
              cy={y(p.score)}
              r={hover === i ? 5 : 3.5}
              fill={hover === i ? HUB.lime : '#0D0F13'}
              stroke={HUB.lime}
              strokeWidth={2}
            />
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
          className="pointer-events-none absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 ring-1 ring-white/10"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          {formatDay(hp.date, lang)}: <span className="font-mono tabular-nums text-zinc-50">{hp.score}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton that matches the final layout's shape.
// ---------------------------------------------------------------------------
function PanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-full bg-white/[0.04]" />
      <div className="h-36 animate-pulse rounded-3xl bg-white/[0.03]" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full sidebar (desktop).
// ---------------------------------------------------------------------------
export function PerformancePanel({ history, loading }: { history: ReadinessHistoryPoint[] | null; loading: boolean }) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  if (loading || !history) return <PanelSkeleton />;

  const today = history[history.length - 1];
  const hasToday = Boolean(today?.hasCheckin);
  const last7 = history.slice(-7).filter((p) => p.hasCheckin);
  const zone = today ? zoneMeta(today.zone) : null;
  const zoneLabel =
    today?.zone === 'green' ? t.progress.zoneGreen : today?.zone === 'yellow' ? t.progress.zoneYellow : t.progress.zoneRed;

  const item = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 12 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING, delay: reduce ? 0 : i * 0.06 },
  });

  return (
    <div className="space-y-4">
      {/* Readiness */}
      <motion.section {...item(0)} className="relative flex flex-col items-center pt-2">
        {hasToday && today && zone ? (
          <>
            <div className="relative">
              <ReadinessRing score={today.score} zone={today.zone} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[56px] font-light leading-none tabular-nums tracking-[-0.04em] text-zinc-50">
                  {today.score}
                </span>
                <span className="mt-2 text-xs text-zinc-400">{t.hub.readiness}</span>
              </div>
            </div>
            <div
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs ring-1 ring-inset ring-white/[0.08]"
              style={{ color: zone.color }}
            >
              <zone.Icon size={14} weight="fill" />
              <span>{zoneLabel}</span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">{t.hub.readinessHint}</p>
          </>
        ) : (
          <div className="w-full rounded-3xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-sm font-medium text-zinc-100">{t.hub.noCheckinTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{t.hub.noCheckinBody}</p>
            <Link
              href="/checkin"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#CCFF00] px-4 py-2 text-sm font-medium text-zinc-950 transition-transform active:scale-95"
            >
              {t.hub.doCheckin}
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        )}
      </motion.section>

      {/* Load */}
      <motion.section {...item(1)} className="rounded-3xl bg-white/[0.025] p-4 ring-1 ring-inset ring-white/[0.06]">
        <h3 className="text-xs text-zinc-400">{t.hub.load}</h3>
        <LoadGauge acwr={today?.acwr ?? null} />
      </motion.section>

      {/* Hooper sub-scores */}
      {hasToday && today && (
        <motion.section {...item(2)} className="grid grid-cols-2 gap-2">
          <HooperTile label={t.hub.sleep} value={today.sleepQuality} />
          <HooperTile label={t.hub.calm} value={today.stress} />
          <HooperTile label={t.hub.energy} value={today.fatigue} />
          <HooperTile label={t.hub.muscles} value={today.soreness} />
        </motion.section>
      )}

      {/* Trend + streak */}
      <motion.section {...item(3)} className="rounded-3xl bg-white/[0.025] p-4 ring-1 ring-inset ring-white/[0.06]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs text-zinc-400">{t.hub.trend}</h3>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-300">
            <Flame size={14} weight="fill" className="text-[#CCFF00]" />
            <span className="font-mono tabular-nums">{today?.trainingStreak ?? 0}</span>
            <span className="text-zinc-500">{t.hub.streak}</span>
          </span>
        </div>
        <TrendSparkline points={last7} />
      </motion.section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact strip for mobile, shown above the chat.
// ---------------------------------------------------------------------------
export function PerformanceStrip({ history }: { history: ReadinessHistoryPoint[] | null }) {
  const { t } = useLanguage();
  if (!history || history.length === 0) return null;
  const today = history[history.length - 1];

  if (!today.hasCheckin) {
    return (
      <Link
        href="/checkin"
        className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3 text-sm ring-1 ring-inset ring-white/[0.06]"
      >
        <span className="text-zinc-300">{t.hub.noCheckinTitle}</span>
        <span className="inline-flex items-center gap-1 font-medium text-[#CCFF00]">
          {t.hub.doCheckin}
          <ArrowRight size={14} weight="bold" />
        </span>
      </Link>
    );
  }

  const status = today.acwr !== null ? loadStatus(today.acwr) : null;

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-inset ring-white/[0.06]">
      <div className="relative shrink-0">
        <ReadinessRing score={today.score} zone={today.zone} size={52} />
        <span className="absolute inset-0 flex items-center justify-center font-mono text-sm tabular-nums text-zinc-50">
          {today.score}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-500">{t.hub.load}</p>
        <p className="font-mono text-sm tabular-nums" style={{ color: status ? loadColor(status) : undefined }}>
          {today.acwr !== null ? today.acwr.toFixed(2) : '--'}
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="text-[11px] text-zinc-500">{t.hub.streak}</p>
        <p className="font-mono text-sm tabular-nums text-zinc-100">{today.trainingStreak}</p>
      </div>
    </div>
  );
}
