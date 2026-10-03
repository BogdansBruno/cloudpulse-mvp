'use client';

// components/pro/ProDashboard.tsx — desktop "Pro" analytics, v3 "Night Performance".
//
//   sidebar (64px lg · 232px xl)  pulsing brand dot, sections, quick week strip
//   top bar                        date switcher, "today", ask the AI coach
//   left 8/12 (9/12 from 1536px)   hero: readiness ring + ADP Load Index gauge,
//                                  readiness and Load Index charts (both 0–100), sleep + biometrics
//   right 4/12 (3/12)              ADP summary bubble, precise day stats
//
// Data: the same /api/checkin history the Progress page uses, computed by the
// deterministic engine on the server (58 days: 30 shown + 28 for the averages).
// Nothing here is invented: a day without a check-in stays a gap, a missing
// value shows "—", wearable blocks show an empty state.

import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { baselineDelta, loadIndex, targetLoadRange, usualDailyLoad } from '@/lib/load-index';
import BiometricsGrid from '@/components/np/BiometricsGrid';
import CoachInsight from '@/components/np/CoachInsight';
import LoadIndexGauge from '@/components/np/LoadIndexGauge';
import ReadinessRing from '@/components/np/ReadinessRing';
import SleepCard from '@/components/np/SleepCard';
import { LOCALE, NP } from '@/components/np/copy';
import { npInter } from '@/components/np/font';
import { Icon, type IconName } from '@/components/np/icons';
import { buildInsight } from '@/components/np/insight';
import { Card, ZONE } from '@/components/np/ui';
import ProChart from './ProChart';
import { PRO } from './copy';

const DAYS = 30;
const BASE_DAYS = 28;

function SideLink({ href, label, icon, active }: { href: string; label: string; icon: IconName; active: boolean }): ReactElement {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex h-10 items-center gap-3 rounded-np-ctrl px-2.5 text-sm font-medium transition-colors duration-150 ${
        active ? 'bg-np-surface-2 text-np-text' : 'text-np-text-2 hover:bg-np-surface-2 hover:text-np-text'
      }`}
    >
      <Icon name={icon} size={20} className="shrink-0" />
      <span className="hidden truncate xl:inline">{label}</span>
    </Link>
  );
}

function ChartCard({ title, note, badge, children, index }: { title: string; note: string; badge: ReactNode; children: ReactNode; index: number }): ReactElement {
  return (
    <Card className="p-5" index={index}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold" style={{ fontFamily: 'inherit' }}>
          {title}
        </h2>
        {badge}
      </div>
      {children}
      <p className="mt-2 text-xs text-np-text-3">{note}</p>
    </Card>
  );
}

export default function ProDashboard(): ReactElement {
  const { lang } = useLanguage();
  const t = PRO[lang];
  const n = NP[lang];
  const path = usePathname();
  const [all, setAll] = useState<ReadinessHistoryPoint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState(DAYS - 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/checkin?days=${DAYS + BASE_DAYS}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) throw new Error('history');
        const body = (await res.json()) as { history?: ReadinessHistoryPoint[] };
        if (!cancelled) {
          const h = body.history ?? [];
          setAll(h);
          setSel(Math.max(0, Math.min(DAYS, h.length) - 1));
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // `history` = the 30 visible days; `offset` maps them back into `all`.
  const offset = all ? Math.max(0, all.length - DAYS) : 0;
  const history = useMemo(() => (all ? all.slice(offset) : null), [all, offset]);
  const indexOf = (p: ReadinessHistoryPoint) => loadIndex(p.dailyLoad ?? null, usualDailyLoad(p.chronicLoad));

  const series = useMemo(() => {
    const h = history ?? [];
    return {
      readiness: h.map((p) => ({ date: p.date, value: p.hasCheckin ? p.score : null })),
      load: h.map((p) => ({ date: p.date, value: loadIndex(p.dailyLoad ?? null, usualDailyLoad(p.chronicLoad)) })),
      anyCheckin: h.some((p) => p.hasCheckin),
    };
  }, [history]);

  const day = history?.[sel] ?? null;
  const gi = offset + sel;
  const prev = all && gi > 0 ? all[gi - 1] : null;
  const usualDay = day ? usualDailyLoad(day.chronicLoad) : null;
  const dayIndex = day ? indexOf(day) : null;
  const score = day?.hasCheckin ? day.score : null;
  const zone = day?.hasCheckin ? day.zone : null;
  const earlier = all ? all.slice(Math.max(0, gi - BASE_DAYS), gi).filter((p) => p.hasCheckin).map((p) => p.score) : [];
  const delta = baselineDelta(score, earlier);
  const insight = buildInsight({
    score,
    zone,
    delta: delta?.delta ?? null,
    yesterdayIndex: prev ? indexOf(prev) : null,
    acwr: day?.acwr ?? null,
    penalties: day?.penaltyCodes ?? [],
    locale: LOCALE[lang],
  });

  const dateLabel = day
    ? new Date(`${day.date}T12:00:00`).toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const isToday = history ? sel === history.length - 1 : true;
  const nf = new Intl.NumberFormat(LOCALE[lang]);
  const dash = (v: number | null | undefined, f: (x: number) => string = String) => (v === null || v === undefined ? '—' : f(v));
  const rows: { k: string; v: string; cls?: string }[] = day
    ? [
        { k: t.stats.score, v: day.hasCheckin ? String(day.score) : '—', cls: day.hasCheckin ? ZONE[day.zone].text : undefined },
        { k: t.stats.zone, v: day.hasCheckin ? t.zoneName[day.zone] : '—' },
        { k: n.load.title, v: dash(dayIndex, (x) => `${x} / 100`) },
        { k: n.load.dayAuLabel, v: dash(day.dailyLoad, (x) => nf.format(Math.round(x))) },
        { k: t.stats.acwr, v: dash(day.acwr, (x) => x.toFixed(2)) },
        { k: t.stats.acute, v: nf.format(Math.round(day.acuteLoad)) },
        { k: t.stats.chronic, v: day.chronicLoad > 0 ? nf.format(Math.round(day.chronicLoad)) : '—' },
        { k: t.stats.monotony, v: dash(day.monotony, (x) => x.toFixed(2)) },
        { k: t.stats.hooper, v: day.hasCheckin ? `${day.hooperScore} / 28` : '—' },
        { k: t.stats.sleep, v: dash(day.sleepQuality, (x) => `${x} / 7`) },
        { k: t.stats.calm, v: dash(day.stress, (x) => `${x} / 7`) },
        { k: t.stats.energy, v: dash(day.fatigue, (x) => `${x} / 7`) },
        { k: t.stats.muscles, v: dash(day.soreness, (x) => `${x} / 7`) },
        { k: t.stats.noRest, v: String(day.trainingStreak) },
        { k: t.stats.checkin, v: day.hasCheckin ? t.yes : t.no },
      ]
    : [];
  const week = history ? history.map((p, i) => ({ p, i })).slice(-7) : [];

  return (
    <div className={`${npInter.className} np-app min-h-[calc(100dvh-4.5rem)]`}>
      <div className="mx-auto grid max-w-[1680px] gap-4 px-3 pb-8 pt-3 md:px-6 lg:grid-cols-[64px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,1fr)]">
        {/* ===== Sidebar ===== */}
        <aside className="np-card hidden h-fit flex-col gap-1 p-3 lg:sticky lg:top-20 lg:flex" aria-label={t.title}>
          <div className="mb-3 flex h-10 items-center gap-3 px-1.5">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-np-ctrl bg-np-surface-2" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 12c1.6-2.1 3.1-3.9 4.8-3.9s3.2 1.9 3.8 3.9 2.1 3.9 3.8 3.9 3.2-1.8 4.8-3.9" stroke="#00E5FF" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              <span className="np-logo-pulse absolute h-2 w-2 bg-np-accent ring-2 ring-np-surface-2" />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight xl:inline">CloudPulse</span>
          </div>
          <nav className="flex flex-col gap-1" aria-label={t.title}>
            <SideLink href="/pro" label={t.nav.dashboard} icon="grid" active={path === '/pro'} />
            <SideLink href="/progress" label={t.nav.progress} icon="trend" active={path === '/progress'} />
            <SideLink href="/calendar" label={t.nav.calendar} icon="calendar" active={path === '/calendar'} />
            <SideLink href="/chat" label={t.nav.chat} icon="chat" active={path === '/chat'} />
          </nav>
          {week.length > 0 && (
            <section className="mt-5 hidden xl:block" aria-labelledby="np-week">
              <h2 id="np-week" className="np-overline px-1.5" style={{ fontFamily: 'inherit' }}>
                {n.week}
              </h2>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {week.map(({ p, i }) => {
                  const on = i === sel;
                  const d = new Date(`${p.date}T12:00:00`);
                  return (
                    <button
                      key={p.date}
                      type="button"
                      onClick={() => setSel(i)}
                      aria-pressed={on}
                      aria-label={`${d.toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' })}${p.hasCheckin ? `: ${p.score}` : ''}`}
                      className={`flex h-14 min-w-0 flex-col items-center justify-between rounded-np-ctrl py-1.5 transition-colors duration-150 ${
                        on ? 'bg-np-surface-2 text-np-text ring-1 ring-np-line-strong' : 'text-np-text-3 hover:bg-np-surface-2/60 hover:text-np-text-2'
                      }`}
                    >
                      <span className="text-[10px] uppercase" aria-hidden>
                        {d.toLocaleDateString(LOCALE[lang], { weekday: 'narrow' })}
                      </span>
                      <span className={`text-xs font-semibold ${on ? 'text-np-text' : 'text-np-text-2'}`} aria-hidden>
                        {d.getDate()}
                      </span>
                      <span className={`h-1 w-1 rounded-full ${p.hasCheckin ? ZONE[p.zone].dot : 'bg-white/15'}`} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        <div className="min-w-0">
          {/* ===== Top bar ===== */}
          <header className="np-card flex flex-wrap items-center gap-3 px-4 py-3">
            <h1 className="mr-2 text-xl font-bold tracking-[-0.01em]" style={{ fontFamily: 'inherit' }}>
              {t.title}
            </h1>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSel((s) => Math.max(0, s - 1))}
                disabled={!history || sel === 0}
                aria-label={t.prevDay}
                className="np-btn-glass flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30"
              >
                <Icon name="chevL" size={16} />
              </button>
              <span className="flex h-10 min-w-[15rem] items-center gap-2 rounded-full border border-np-line px-4 text-sm">
                <Icon name="calendar" size={16} className="text-np-text-3" />
                <span className="first-letter:uppercase">{dateLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => setSel((s) => Math.min((history?.length ?? 1) - 1, s + 1))}
                disabled={!history || isToday}
                aria-label={t.nextDay}
                className="np-btn-glass flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30"
              >
                <Icon name="chevR" size={16} />
              </button>
              {!isToday && history && (
                <button type="button" onClick={() => setSel(history.length - 1)} className="np-btn-glass ml-1 h-10 rounded-full px-4 text-sm">
                  {t.today}
                </button>
              )}
            </div>
            <Link href="/chat" className="np-btn-glass ml-auto inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium">
              <span className="np-ai-orb flex h-6 w-6 items-center justify-center" aria-hidden>
                <Icon name="sparkle" size={14} />
              </span>
              {t.askAi}
            </Link>
          </header>

          {failed && (
            <Card className="mt-4 p-5">
              <p className="text-sm text-np-text-2">{t.error}</p>
            </Card>
          )}

          {!failed && history && !series.anyCheckin && (
            <Card className="mt-4 p-5">
              <p className="text-base font-semibold">{t.noData}</p>
              <p className="mt-1 text-sm text-np-text-2">{t.noDataBody}</p>
              {/* the ONE accent action of this state */}
              <Link href="/checkin" className="np-btn-primary mt-4 inline-flex h-10 items-center rounded-np-ctrl px-4 text-sm font-semibold">
                {t.toCheckin}
              </Link>
            </Card>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* ===== Analytics ===== */}
            <div className="min-w-0 space-y-4 lg:col-span-8 2xl:col-span-9">
              <Card className="relative overflow-hidden p-5 sm:p-6" index={0}>
                {history ? (
                  <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8">
                    <ReadinessRing lang={lang} score={score} zone={zone} delta={delta} size={224} />
                    <LoadIndexGauge lang={lang} index={dayIndex} target={day?.hasCheckin ? targetLoadRange(day.score) : null} dailyLoad={day?.dailyLoad ?? null} usualDay={usualDay} />
                  </div>
                ) : (
                  <div className="h-[224px] animate-pulse rounded-np-ctrl bg-white/[0.03]" />
                )}
              </Card>

              <div className="grid gap-4 2xl:grid-cols-2">
                <ChartCard title={t.readinessChart} note={t.zones} index={1} badge={<span className="np-pill">{t.days(DAYS)}</span>}>
                  {history ? (
                    <ProChart
                      points={series.readiness}
                      min={0}
                      max={100}
                      ticks={[0, 25, 50, 75, 100]}
                      refLines={[50, 75]}
                      color="#5C9BFF"
                      selected={sel}
                      onSelect={setSel}
                      format={(v) => String(Math.round(v))}
                      lang={lang}
                      label={t.readinessChart}
                      height={260}
                    />
                  ) : (
                    <div className="h-[260px] animate-pulse rounded-np-ctrl bg-white/[0.03]" />
                  )}
                </ChartCard>

                <ChartCard title={n.load.title} note={n.load.chartNote} index={2} badge={<span className="np-pill np-pill-strain">{n.load.scale}</span>}>
                  {history ? (
                    <ProChart
                      points={series.load}
                      min={0}
                      max={100}
                      ticks={[0, 25, 50, 75, 100]}
                      refLines={[40, 75]}
                      color="#2979FF"
                      selected={sel}
                      onSelect={setSel}
                      format={(v) => String(Math.round(v))}
                      lang={lang}
                      label={n.load.title}
                      height={260}
                    />
                  ) : (
                    <div className="h-[260px] animate-pulse rounded-np-ctrl bg-white/[0.03]" />
                  )}
                </ChartCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="p-5" index={3}>
                  <SleepCard lang={lang} quality={day?.sleepQuality ?? null} />
                </Card>
                <Card className="p-5" index={4}>
                  <BiometricsGrid lang={lang} items={null} />
                </Card>
              </div>
            </div>

            {/* ===== Right column ===== */}
            <div className="min-w-0 space-y-4 lg:col-span-4 2xl:col-span-3">
              <Card className="p-5" index={1}>
                <CoachInsight lang={lang} input={insight} />
              </Card>

              <Card className="h-fit p-5 lg:sticky lg:top-20" index={2}>
                <h2 className="text-[15px] font-semibold" style={{ fontFamily: 'inherit' }}>
                  {t.statsTitle}
                </h2>
                <p className="np-overline mt-3 border-b border-np-line pb-3">{dateLabel}</p>
                {day ? (
                  <dl className="mt-1">
                    {rows.map((r) => (
                      <div key={r.k} className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2.5 last:border-b-0">
                        <dt className="text-sm text-np-text-2">{r.k}</dt>
                        <dd className={`np-num text-[15px] ${r.cls ?? 'text-np-text'}`}>{r.v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="h-8 animate-pulse rounded bg-white/[0.03]" />
                    ))}
                  </div>
                )}
                <p className="mt-4 text-xs leading-relaxed text-np-text-3">{t.byCode}</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
