'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import {
  Info,
  Warning,
  Sparkle,
  WarningOctagon,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { generateInsight, insightMessage } from '@/lib/generate-insight';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { ReadinessRing, zoneMeta, HUB } from '@/components/PerformancePanel';

type HistoryPoint = ReadinessHistoryPoint;

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };
const SPRING = { type: 'spring', bounce: 0, duration: 0.5 } as const;

// Zone thresholds from lib/readiness-engine.ts: red < 50, yellow < 75.
const ZONE_LINES = [50, 75];

function formatDay(iso: string, lang: Lang) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' });
}

function average(points: HistoryPoint[]) {
  const withData = points.filter((p) => p.hasCheckin);
  if (withData.length === 0) return null;
  return Math.round(withData.reduce((s, p) => s + p.score, 0) / withData.length);
}

const INSIGHT_STYLE = {
  warning: { Icon: Warning, color: HUB.amber },
  positive: { Icon: Sparkle, color: HUB.lime },
  info: { Icon: Info, color: '#A1A1AA' },
} as const;

// ---------------------------------------------------------------------------
// 30-day readiness histogram. Bars coloured by zone (legend + tooltip carry
// the label, so identity is never colour alone). Days without a check-in are
// drawn as neutral ghosts: the engine has a number for them, but no signal.
// ---------------------------------------------------------------------------
function ReadinessBars({ history }: { history: HistoryPoint[] }) {
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const zoneLabel = (z: HistoryPoint['zone']) =>
    z === 'green' ? t.progress.zoneGreen : z === 'yellow' ? t.progress.zoneYellow : t.progress.zoneRed;
  const hp = hover !== null ? history[hover] : null;

  return (
    <div>
      <div className="relative h-48" onMouseLeave={() => setHover(null)}>
        {/* Zone threshold guides */}
        {ZONE_LINES.map((v) => (
          <div key={v} className="pointer-events-none absolute inset-x-0" style={{ bottom: `${v}%` }}>
            <div className="border-t border-dashed border-white/[0.07]" />
            <span className="absolute right-0 -translate-y-full pb-0.5 font-mono text-[10px] tabular-nums text-zinc-600">
              {v}
            </span>
          </div>
        ))}

        {/* Soft floor glow under the bars */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#CCFF00]/[0.05] to-transparent" />

        <div className="relative flex h-full items-end gap-[2px]">
          {history.map((p, i) => {
            const color = p.hasCheckin ? zoneMeta(p.zone).color : 'rgba(255,255,255,0.12)';
            const dimmed = hover !== null && hover !== i;
            return (
              <div
                key={p.date}
                className="flex h-full flex-1 items-end focus:outline-none"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${formatDay(p.date, lang)}: ${p.hasCheckin ? `${p.score}, ${zoneLabel(p.zone)}` : t.progress.noCheckinDay}`}
              >
                <motion.div
                  className="w-full origin-bottom rounded-t-[4px] transition-[opacity,transform] duration-150"
                  style={{
                    backgroundColor: color,
                    opacity: dimmed ? 0.35 : p.hasCheckin ? 0.9 : 1,
                    scaleY: hover === i ? 1.04 : 1,
                  }}
                  initial={reduce ? false : { height: 0 }}
                  animate={{ height: `${Math.max(p.score, 3)}%` }}
                  transition={reduce ? { duration: 0 } : { ...SPRING, delay: i * 0.015 }}
                />
              </div>
            );
          })}
        </div>

        {hp && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-zinc-900/95 px-3 py-2 text-xs ring-1 ring-white/10 backdrop-blur"
            style={{
              left: `${Math.min(92, Math.max(8, ((hover + 0.5) / history.length) * 100))}%`,
              bottom: `calc(${Math.max(hp.score, 3)}% + 10px)`,
            }}
          >
            <p className="text-zinc-400">{formatDay(hp.date, lang)}</p>
            {hp.hasCheckin ? (
              <p className="mt-0.5 flex items-center gap-1.5">
                <span className="font-mono text-sm tabular-nums text-zinc-50">{hp.score}</span>
                <span style={{ color: zoneMeta(hp.zone).color }}>{zoneLabel(hp.zone)}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-zinc-300">{t.progress.noCheckinDay}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
        <span>{formatDay(history[0].date, lang)}</span>
        <span>{formatDay(history[history.length - 1].date, lang)}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
        {(['green', 'yellow', 'red'] as const).map((z) => {
          const { color, Icon } = zoneMeta(z);
          return (
            <span key={z} className="inline-flex items-center gap-1.5">
              <Icon size={14} weight="fill" style={{ color }} />
              {zoneLabel(z)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ACWR trend with the 0.8-1.3 safe band and a crosshair tooltip.
// ---------------------------------------------------------------------------
function AcwrChart({ history }: { history: HistoryPoint[] }) {
  const { t, lang } = useLanguage();
  const [hover, setHover] = useState<number | null>(null);
  const points = history.filter((p) => p.acwr !== null);

  if (points.length < 2) {
    return <p className="py-10 text-center text-sm text-zinc-500">{t.progress.insightNotEnoughData}</p>;
  }

  const W = 600;
  const H = 160;
  const maxVal = Math.max(2, ...points.map((p) => p.acwr as number)) * 1.05;
  const xFor = (i: number) => (i / (history.length - 1 || 1)) * W;
  const yFor = (v: number) => H - (v / maxVal) * H;

  const d = history
    .map((p, i) => {
      if (p.acwr === null) return null;
      const prev = history[i - 1];
      return `${i === 0 || !prev || prev.acwr === null ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.acwr).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  const hp = hover !== null ? history[hover] : null;
  const showHover = hp !== null && hover !== null && hp.acwr !== null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full" onMouseLeave={() => setHover(null)}>
        <rect x={0} y={yFor(1.3)} width={W} height={yFor(0.8) - yFor(1.3)} fill={HUB.lime} opacity={0.08} />
        <line
          x1={0}
          x2={W}
          y1={yFor(1)}
          y2={yFor(1)}
          stroke="rgba(255,255,255,0.12)"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={d}
          fill="none"
          stroke={HUB.lime}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {showHover && hover !== null && (
          <line x1={xFor(hover)} x2={xFor(hover)} y1={0} y2={H} stroke="rgba(255,255,255,0.25)" vectorEffect="non-scaling-stroke" />
        )}
        {history.map((p, i) => (
          <rect
            key={p.date}
            x={xFor(i) - W / history.length / 2}
            y={0}
            width={W / history.length}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {showHover && hp && hover !== null && hp.acwr !== null && (
        <>
          <span
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[#0D0F13]"
            style={{ left: `${(xFor(hover) / W) * 100}%`, top: `${(yFor(hp.acwr) / H) * 100}%`, backgroundColor: HUB.lime }}
          />
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-zinc-900/95 px-3 py-2 text-xs ring-1 ring-white/10"
            style={{ left: `${Math.min(92, Math.max(8, (xFor(hover) / W) * 100))}%` }}
          >
            <span className="text-zinc-400">{formatDay(hp.date, lang)}</span>{' '}
            <span className="font-mono tabular-nums text-zinc-50">{hp.acwr.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="h-16 animate-pulse rounded-3xl bg-white/[0.03]" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/[0.03]" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-white/[0.03]" />
    </div>
  );
}

export default function ProgressPage() {
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch('/api/checkin?days=30', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        if (!cancelled) setHistory(data.history ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const last7 = history?.slice(-7) ?? [];
  const prev7 = history?.slice(-14, -7) ?? [];
  const today = history?.[history.length - 1] ?? null;
  const avg7 = average(last7);
  const avgPrev = average(prev7);
  const delta = avg7 !== null && avgPrev !== null ? avg7 - avgPrev : null;
  const redDaysLast7 = last7.filter((p) => p.hasCheckin && p.zone === 'red').length;
  const insight = history ? generateInsight(history) : null;
  const insightStyle = insight ? INSIGHT_STYLE[insight.severity] : null;
  const todayZone = today ? zoneMeta(today.zone) : null;

  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';
  const rise = (i: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 10 } as const),
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING, delay: reduce ? 0 : i * 0.06 },
  });

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-4xl">
            {t.progress.title}
          </h1>
          <span
            title={t.progress.subtitle}
            className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-zinc-400 ring-1 ring-inset ring-white/[0.08]"
          >
            <Info size={13} />
            {t.progress.badge}
          </span>
        </header>

        {error && (
          <div className="mb-6 flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
            <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
            <span>{error}</span>
          </div>
        )}

        {!history && !error && <Skeleton />}

        {history && history.length > 0 && (
          <div className="space-y-3">
            {insight && insightStyle && (
              <motion.div {...rise(0)} className={`${card} flex gap-3`}>
                <insightStyle.Icon size={20} weight="fill" className="mt-0.5 shrink-0" style={{ color: insightStyle.color }} />
                <p className="text-[15px] leading-relaxed text-zinc-200">{insightMessage(insight, t.progress)}</p>
              </motion.div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Today */}
              <motion.div {...rise(1)} className={card}>
                <p className="text-xs text-zinc-400">{t.progress.today}</p>
                {today && today.hasCheckin && todayZone ? (
                  <div className="mt-3 flex items-center gap-3">
                    <ReadinessRing score={today.score} zone={today.zone} size={60} />
                    <div>
                      <p className="font-mono text-4xl font-light leading-none tabular-nums tracking-[-0.04em] text-zinc-50">
                        {today.score}
                      </p>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs" style={{ color: todayZone.color }}>
                        <todayZone.Icon size={12} weight="fill" />
                        {today.zone === 'green'
                          ? t.progress.zoneGreen
                          : today.zone === 'yellow'
                            ? t.progress.zoneYellow
                            : t.progress.zoneRed}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Link href="/checkin" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#CCFF00]">
                    {t.hub.doCheckin}
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                )}
              </motion.div>

              {/* 7-day average */}
              <motion.div {...rise(2)} className={card}>
                <p className="text-xs text-zinc-400">{t.progress.avg7d}</p>
                <p className="mt-3 font-mono text-4xl font-light leading-none tabular-nums tracking-[-0.04em] text-zinc-50">
                  {avg7 ?? '--'}
                </p>
                {delta !== null && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400">
                    {delta >= 0 ? (
                      <ArrowUpRight size={13} weight="bold" style={{ color: HUB.lime }} />
                    ) : (
                      <ArrowDownRight size={13} weight="bold" style={{ color: HUB.amber }} />
                    )}
                    <span className="font-mono tabular-nums text-zinc-200">
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                    {t.progress.vsPrevWeek}
                  </p>
                )}
              </motion.div>

              {/* Red days */}
              <motion.div {...rise(3)} className={card}>
                <p className="text-xs text-zinc-400">{t.progress.redDays}</p>
                <p className="mt-3 font-mono text-4xl font-light leading-none tabular-nums tracking-[-0.04em] text-zinc-50">
                  {redDaysLast7}
                  <span className="ml-1 text-base text-zinc-500">/7</span>
                </p>
                <div className="mt-3 flex gap-1" aria-hidden>
                  {last7.map((p) => (
                    <span
                      key={p.date}
                      className="h-2 flex-1 rounded-full"
                      style={{
                        backgroundColor: p.hasCheckin ? zoneMeta(p.zone).color : 'rgba(255,255,255,0.08)',
                        opacity: p.hasCheckin ? 0.9 : 1,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">{t.progress.perWeek}</p>
              </motion.div>
            </div>

            <motion.section {...rise(4)} className={card}>
              <h2 className="mb-5 text-base font-semibold tracking-[-0.01em] text-zinc-50">{t.progress.last30}</h2>
              <ReadinessBars history={history} />
            </motion.section>

            <motion.section {...rise(5)} className={card}>
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold tracking-[-0.01em] text-zinc-50">{t.progress.acwrTitle}</h2>
                <span className="text-xs text-zinc-500">{t.progress.acwrSweetSpot}</span>
              </div>
              <AcwrChart history={history} />
              <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
                <span>{formatDay(history[0].date, lang)}</span>
                <span>{formatDay(history[history.length - 1].date, lang)}</span>
              </div>
            </motion.section>

            {redDaysLast7 >= 2 && (
              <motion.div {...rise(6)} className="flex gap-3 rounded-3xl bg-[#FF4D5E]/[0.08] p-5 ring-1 ring-inset ring-[#FF4D5E]/30">
                <WarningOctagon size={20} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
                <div>
                  <h2 className="text-base font-semibold text-zinc-50">{t.progress.slowDownTitle}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">{t.progress.slowDownBody(redDaysLast7)}</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {history && history.length === 0 && (
          <div className={`${card} text-center`}>
            <p className="text-sm text-zinc-300">{t.hub.noCheckinTitle}</p>
            <Link
              href="/checkin"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#CCFF00] px-4 py-2 text-sm font-medium text-zinc-950"
            >
              {t.hub.doCheckin}
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
