'use client';

// /progress — analytics, v3.
//
//   period pills 7 / 30 / 90 days (one fetch of 90 days, sliced in the browser)
//   correlation chart: readiness (cyan curve) vs ADP Load Index (blue bars), both 0–100
//   ACWR: current ratio on the engine bands + the curve with the 0.8–1.3 band
//   metric cards: average readiness (Δ vs the previous period), average sleep (check-in 1–7),
//                 volume Σ RPE × min, monotony
//   telemetry table, HRV (empty state: no sensor → no number), the rule-based insight
//   the team / parent / scout / install cards stay below ("Team and access")
//
// Every number is the engine's (GET /api/checkin, recomputed from raw data) or a plain sum /
// mean of it. Nothing is estimated.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { generateInsight, insightMessage } from '@/lib/generate-insight';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { loadIndex, usualDailyLoad } from '@/lib/load-index';
import ParentAccessCard from '@/components/ParentAccessCard';
import SchoolAccessCard from '@/components/SchoolAccessCard';
import TeamMembershipCard from '@/components/TeamMembershipCard';
import CheckinStreakCard from '@/components/CheckinStreakCard';
import CoachReplyCard from '@/components/CoachReplyCard';
import RtpAthleteCard from '@/components/RtpAthleteCard';
import InstallAppCard from '@/components/InstallAppCard';
import ScoutShareCard from '@/components/ScoutShareCard';
import { APP } from '@/components/np/appCopy';
import { LOCALE, NP } from '@/components/np/copy';
import { Icon } from '@/components/np/icons';
import { DeltaPill, ZONE } from '@/components/np/ui';
import { useMode } from '@/components/np/useMode';
import { useAccount } from '@/components/np/useAccount';
import { MODE } from '@/components/np/modeCopy';
import { ACWR_PILL, CYAN, Disclaimer, TelemetryTable, acwrBand, type TelemetryRow } from '@/components/np/Telemetry';
import { AcwrBar, AcwrChart, CorrelationChart, type CorrPoint } from '@/components/np/TrendChart';

type Period = 7 | 30 | 90;
const PERIODS: Period[] = [7, 30, 90];

/** Trailing 7-day mean of the values that exist (null when the window is empty). Only for the
 *  "7-day avg" view: it smooths spikes, it never invents a day — the daily view stays one click away. */
function rolling7(xs: (number | null)[]): (number | null)[] {
  return xs.map((_, i) => {
    const win = xs.slice(Math.max(0, i - 6), i + 1).filter((v): v is number => v !== null);
    return win.length ? Math.round(win.reduce((a, b) => a + b, 0) / win.length) : null;
  });
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function stats(pts: ReadinessHistoryPoint[]) {
  const ck = pts.filter((p) => p.hasCheckin);
  const sleeps = ck.map((p) => p.sleepQuality).filter((v): v is number => v !== null);
  const avg = mean(ck.map((p) => p.score));
  return {
    checkins: ck.length,
    avgReadiness: avg === null ? null : Math.round(avg),
    avgSleep: mean(sleeps),
    volume: pts.reduce((s, p) => s + (p.dailyLoad ?? 0), 0),
    green: ck.filter((p) => p.zone === 'green').length,
    yellow: ck.filter((p) => p.zone === 'yellow').length,
    red: ck.filter((p) => p.zone === 'red').length,
  };
}

function MetricCard({
  label,
  value,
  unit,
  hint,
  color,
  glow,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  color?: string;
  glow?: string;
  delta?: { value: number; text: string } | null;
}) {
  return (
    <div className="np-card relative overflow-hidden p-4">
      {glow && <span aria-hidden className="np-ambient -right-8 -top-10 h-28 w-28" style={{ ['--np-ambient' as string]: glow }} />}
      <p className="np-label relative min-h-[2.4em] leading-[1.2]">{label}</p>
      <p className="relative mt-2 flex items-baseline gap-1">
        <span className="np-metric text-[34px]" style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-xs text-np-text-3">{unit}</span>}
      </p>
      {delta ? (
        <p className="relative mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <DeltaPill delta={delta.value} text={delta.text} />
          {hint && <span className="text-[11px] text-np-text-3">{hint}</span>}
        </p>
      ) : hint ? (
        <p className="relative mt-2 truncate text-[11px] text-np-text-3">{hint}</p>
      ) : null}
    </div>
  );
}

export default function ProgressPage() {
  const { t, lang } = useLanguage();
  const { role } = useAccount();
  const { isPro } = useMode(role);
  const mm = MODE[lang];
  const pc = APP[lang].progress;
  const tl = APP[lang].v3.telemetry;
  const np = NP[lang];
  const nf = new Intl.NumberFormat(LOCALE[lang]);
  const fmt1 = (v: number) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = (v: number) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [all, setAll] = useState<ReadinessHistoryPoint[] | null>(null);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>(30);
  const [smooth, setSmooth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch('/api/checkin?days=90', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) throw new Error('history');
        const body = await res.json();
        if (!cancelled) setAll(body.history ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    if (!all || all.length === 0) return null;
    const cur = all.slice(-period);
    const prev = all.length >= period * 2 ? all.slice(-period * 2, -period) : null;
    const s = stats(cur);
    const p = prev ? stats(prev) : null;
    const chart: CorrPoint[] = cur.map((pt) => ({
      date: pt.date,
      readiness: pt.score,
      load: loadIndex(pt.dailyLoad ?? null, usualDailyLoad(pt.chronicLoad)),
      checkin: pt.hasCheckin,
    }));
    const today = cur[cur.length - 1];
    const lastMono = [...cur].reverse().find((pt) => pt.monotony !== null)?.monotony ?? null;
    const peakLoad = chart.reduce<number | null>((m, c) => (c.load === null ? m : m === null ? c.load : Math.max(m, c.load)), null);
    return { cur, s, p, chart, today, lastMono, peakLoad };
  }, [all, period]);

  const smoothChart = useMemo(() => {
    if (!view) return [];
    const r = rolling7(view.chart.map((c) => c.readiness));
    const l = rolling7(view.chart.map((c) => c.load));
    return view.chart.map((c, i) => ({ ...c, readiness: r[i], load: l[i] }));
  }, [view]);

  const insight = view ? generateInsight(view.cur) : null;
  const insightTone = insight?.severity === 'warning' ? '#FFC53D' : insight?.severity === 'positive' ? '#3FE0A8' : '#FFC53D';

  const rows: TelemetryRow[] = view
    ? [
        { key: 'ck', label: pc.checkinDays(view.s.checkins, view.cur.length), value: `${Math.round((view.s.checkins / view.cur.length) * 100)}%` },
        { key: 'g', label: np.zone.green, value: String(view.s.green), color: ZONE.green.hex },
        { key: 'y', label: np.zone.yellow, value: String(view.s.yellow), color: ZONE.yellow.hex },
        { key: 'r', label: np.zone.red, value: String(view.s.red), color: ZONE.red.hex },
        { key: 'pk', label: `${tl.load} · max`, value: view.peakLoad !== null ? String(view.peakLoad) : '—', unit: '/100', color: '#FFC53D' },
        { key: 'st', label: tl.streak, hint: tl.streakHint, value: tl.streakDays(view.today.trainingStreak), pill: view.today.trainingStreak > 6 ? { text: '>6', cls: 'np-pill-warn' } : undefined },
      ]
    : [];

  const vs = (a: number | null, b: number | null | undefined) => (a !== null && b !== null && b !== undefined ? a - b : null);
  const dReady = view ? vs(view.s.avgReadiness, view.p?.avgReadiness) : null;
  const redRun = view ? view.cur.slice(-7).filter((p) => p.hasCheckin && p.zone === 'red').length : 0;

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-x-clip px-3 py-6 md:px-8 md:py-10">
      <span aria-hidden className="np-ambient -left-24 -top-32 h-80 w-96" style={{ ['--np-ambient' as string]: 'rgb(255 197 61 / 0.1)' }} />

      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="np-label">{pc.chartTitle}</p>
          <h1 className="np-on-bg mt-1.5 text-[32px] np-editorial font-semibold leading-tight text-np-text md:text-[40px]">
            {t.nav.progress}
          </h1>
        </div>
        {/* period capsule: a small dark pill, the active period lit in soft white glass */}
        <div role="radiogroup" aria-label={pc.period} className="flex gap-0.5 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-[background-color,color] duration-300 ease-out ${
                period === p ? 'border border-white/10 bg-[#2D2D32] text-white shadow-sm' : 'border border-transparent text-[#C3C5C7] hover:text-white'
              }`}
            >
              {pc.periods[p]}
            </button>
          ))}
        </div>
      </header>

      <div className="np-island relative mt-5 space-y-3 p-2 empty:hidden">
        <CoachReplyCard />
        <RtpAthleteCard />
      </div>

      {error && (
        <div className="np-flag relative mt-4 flex gap-3 p-4 text-sm text-np-text" style={{ ['--np-accent-line' as string]: '#FF7A59' }}>
          <Icon name="close" size={18} className="mt-0.5 shrink-0 text-np-danger" />
          {pc.errLoad}
        </div>
      )}

      {!all && !error && (
        <div className="relative mt-5 space-y-3" aria-busy>
          <div className="h-72 animate-pulse rounded-np-card bg-np-veil/[0.03]" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-np-card bg-np-veil/[0.03]" />
            ))}
          </div>
        </div>
      )}

      {all && all.length === 0 && (
        <div className="np-card relative mt-5 p-6 text-center">
          <p className="text-sm text-np-text-2">{t.hub.noCheckinTitle}</p>
          <Link href="/checkin" className="np-btn-primary mt-4 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold">
            {t.hub.doCheckin}
            <Icon name="arrowR" size={16} stroke={1.75} />
          </Link>
        </div>
      )}

      {view && (
        <div className="relative mt-5 space-y-3">
          {insight && (
            <div className="np-flag flex gap-3 p-4" style={{ ['--np-accent-line' as string]: insightTone }}>
              <Icon name="sparkle" size={18} active className="mt-0.5 shrink-0" style={{ color: insightTone }} />
              <p className="text-[15px] leading-relaxed text-np-text">{insightMessage(insight, t.progress)}</p>
            </div>
          )}

          {/* metric cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label={pc.avgReadiness}
              value={view.s.avgReadiness !== null ? String(view.s.avgReadiness) : '—'}
              unit="/100"
              glow="rgb(255 197 61 / 0.16)"
              delta={dReady !== null ? { value: dReady, text: `${dReady > 0 ? '+' : dReady < 0 ? '−' : '±'}${Math.abs(dReady)}` } : null}
              hint={dReady !== null ? pc.vsPrev : pc.checkinDays(view.s.checkins, view.cur.length)}
            />
            <MetricCard
              label={pc.avgSleep}
              value={view.s.avgSleep !== null ? fmt1(view.s.avgSleep) : '—'}
              unit="/7"
              color={CYAN}
              glow="rgb(255 197 61 / 0.18)"
              hint={tl.sleepHint}
            />
            {isPro && (
            <MetricCard
              label={pc.totalVolume}
              value={nf.format(Math.round(view.s.volume))}
              unit={pc.volumeUnit}
              color="#FFC53D"
              glow="rgb(255 197 61 / 0.22)"
              hint={pc.volumeHint}
            />
            )}
            {isPro && (
            <MetricCard
              label={pc.monotony}
              value={view.lastMono !== null ? fmt2(view.lastMono) : '—'}
              hint={view.lastMono !== null ? (view.lastMono > 2 ? tl.monotonyHigh : tl.monotonyOk) : tl.monotonyHint}
              color={view.lastMono !== null && view.lastMono > 2 ? '#FFC53D' : undefined}
            />
            )}
          </div>

          {/* correlation chart */}
          <section className="lt-card-readiness p-4 md:p-5" aria-labelledby="pg-corr">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="pg-corr" className="text-base font-semibold tracking-tight text-np-text" style={{ fontFamily: 'inherit' }}>
                  {pc.chartTitle}
                </h2>
                <p className="mt-0.5 text-xs text-np-text-3">{pc.chartSub}</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-np-text-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: '#3FE0A8', boxShadow: '0 0 6px #3FE0A8' }} aria-hidden />
                  {pc.legendReadiness}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-2 rounded-t-sm" style={{ background: 'linear-gradient(180deg, #FF7A59, #FFC53D, #FFC53D)' }} aria-hidden />
                  {pc.legendLoad}
                </span>
              </div>
            </div>
            {/* daily values or the trailing 7-day average */}
            <div role="radiogroup" aria-label={pc.viewLabel} className="mt-3 inline-flex gap-0.5 rounded-full bg-np-veil/5 p-1">
              {([false, true] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={smooth === v}
                  onClick={() => setSmooth(v)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-[background-color,color] duration-300 ease-out ${
                    smooth === v ? 'border border-white/10 bg-[#2D2D32] text-white shadow-sm' : 'border border-transparent text-np-text-3 hover:text-np-text'
                  }`}
                >
                  {v ? pc.viewAvg : pc.viewDay}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <CorrelationChart points={smooth ? smoothChart : view.chart} lang={lang} />
            </div>
          </section>

          {/* Athlete mode: the load in two plain sentences instead of ACWR and monotony */}
          {!isPro && (
            <section className="lt-card-activity p-4 md:p-5" aria-labelledby="pg-plain">
              <h2 id="pg-plain" className="text-base font-semibold tracking-tight text-np-text">
                {mm.simple.title}
              </h2>
              <p className="mt-3 text-[16px] leading-snug text-np-text">{view.today.acwr !== null ? mm.load[acwrBand(view.today.acwr)] : tl.monotonyHint}</p>
              {view.lastMono !== null && <p className="mt-2 text-[14px] leading-snug text-np-text-2">{view.lastMono > 2 ? mm.mono.high : mm.mono.ok}</p>}
              <p className="np-caption mt-4">{mm.simple.proHint}</p>
            </section>
          )}

          {/* ACWR (Pro) */}
          {isPro && (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <section className="lt-card-activity p-4 md:p-5">
              <AcwrBar acwr={view.today.acwr} lang={lang} />
            </section>
            <section className="lt-card-activity p-4 md:p-5" aria-labelledby="pg-acwr">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="pg-acwr" className="text-base font-semibold tracking-tight text-np-text" style={{ fontFamily: 'inherit' }}>
                  {t.progress.acwrTitle}
                </h2>
                {view.today.acwr !== null && (
                  <span className={`np-pill ${ACWR_PILL[acwrBand(view.today.acwr)]}`}>{tl.acwrBand[acwrBand(view.today.acwr)]}</span>
                )}
              </div>
              <div className="mt-3">
                <AcwrChart points={view.cur.map((p) => ({ date: p.date, acwr: p.acwr }))} lang={lang} />
              </div>
            </section>
          </div>
          )}

          {isPro && (
          <div className="grid gap-3 lg:grid-cols-2">
            <TelemetryTable title={pc.tableTitle} rows={rows} />
            {/* HRV: no sensor in this app → an honest empty state, never a number */}
            <section className="np-card relative overflow-hidden p-4 md:p-5">
              <span aria-hidden className="np-ambient -bottom-16 -right-10 h-44 w-44" style={{ ['--np-ambient' as string]: 'rgb(255 197 61 / 0.12)' }} />
              <div className="relative flex items-center justify-between gap-3">
                <p className="np-label">{pc.hrvTitle}</p>
                <span className="np-pill">{APP[lang].workout.ble.noSensor}</span>
              </div>
              <svg viewBox="0 0 300 70" className="relative mt-4 h-[70px] w-full" aria-hidden>
                <path d="M0 40 H300" className="np-svg-grid" stroke="rgb(17 19 24 / 0.1)" strokeDasharray="3 6" />
                <path d="M0 40 C40 40 50 22 80 26 S130 52 160 40 S220 18 250 30 S290 40 300 38" fill="none" stroke="rgb(14 165 233 / 0.35)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
              </svg>
              <p className="relative mt-3 text-sm leading-relaxed text-np-text-2">{pc.hrvEmpty}</p>
            </section>
          </div>
          )}

          {redRun >= 2 && (
            <div className="np-flag flex gap-3 p-4" style={{ ['--np-accent-line' as string]: '#FF7A59' }}>
              <Icon name="pulse" size={18} className="mt-0.5 shrink-0 text-np-danger" />
              <div>
                <h2 className="text-sm font-semibold text-np-text" style={{ fontFamily: 'inherit' }}>
                  {t.progress.slowDownTitle}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-np-text-2">{t.progress.slowDownBody(redRun)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* team, parent access, scouting, install — the existing cards */}
      <section className="relative mt-8" aria-labelledby="pg-more">
        <h2 id="pg-more" className="np-label mb-3" style={{ fontFamily: 'inherit' }}>
          {pc.more}
        </h2>
        <div className="np-island space-y-3 p-2">
          <CheckinStreakCard />
          <InstallAppCard />
          <TeamMembershipCard />
          <ParentAccessCard />
          <SchoolAccessCard />
          <ScoutShareCard />
        </div>
      </section>

      <Disclaimer lang={lang} className="mt-8" />
    </div>
  );
}
