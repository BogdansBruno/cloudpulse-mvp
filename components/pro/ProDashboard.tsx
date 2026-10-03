'use client';

// components/pro/ProDashboard.tsx
//
// Desktop "Pro" analytics for one athlete. Three columns: a 64px icon rail,
// the charts (readiness over 30 days; the 7-day load against a usual week),
// and a precise "day stats" panel for the selected day. Strict sans type,
// right-aligned tabular numbers, no serif — this screen is for reading
// numbers exactly.
//
// Data: the same /api/checkin history the Progress page uses, computed by
// the deterministic engine on the server. Nothing here is invented: a day
// without a check-in stays a gap, a missing value shows "—".

import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarBlank, CaretLeft, CaretRight, ChartLineUp, ChatCircleDots, Sparkle, SquaresFour } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import ProChart from './ProChart';
import { PRO } from './copy';

const C = {
  bg: '#0D0E12',
  card: '#14151B',
  border: 'rgba(255,255,255,0.08)',
  text: '#F2F4F8',
  muted: '#9AA3B2',
  faint: '#7B8494',
  blue: '#8AB4F8',
  violet: '#A78BFA',
  green: '#2DD4BF',
  yellow: '#FACC15',
  red: '#FB7185',
} as const;

const DAYS = 30;
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

function zoneColor(z: ReadinessHistoryPoint['zone']): string {
  return z === 'green' ? C.green : z === 'yellow' ? C.yellow : C.red;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }): ReactElement {
  return (
    <section className={`rounded-xl border p-5 ${className}`} style={{ background: C.card, borderColor: C.border }}>
      {children}
    </section>
  );
}

function RailLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }): ReactElement {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
      style={{ background: active ? 'rgba(255,255,255,0.08)' : undefined, color: active ? C.text : C.muted }}
    >
      {children}
    </Link>
  );
}

export default function ProDashboard(): ReactElement {
  const { lang } = useLanguage();
  const t = PRO[lang];
  const path = usePathname();
  const [history, setHistory] = useState<ReadinessHistoryPoint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState(DAYS - 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/checkin?days=${DAYS}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) throw new Error('history');
        const body = (await res.json()) as { history?: ReadinessHistoryPoint[] };
        if (!cancelled) {
          const h = body.history ?? [];
          setHistory(h);
          setSel(Math.max(0, h.length - 1));
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const series = useMemo(() => {
    const h = history ?? [];
    return {
      readiness: h.map((p) => ({ date: p.date, value: p.hasCheckin ? p.score : null })),
      acute: h.map((p) => ({ date: p.date, value: p.acuteLoad })),
      chronic: h.map((p) => ({ date: p.date, value: p.chronicLoad > 0 ? Math.round(p.chronicLoad) : null })),
      loadMax: Math.max(100, ...h.map((p) => Math.max(p.acuteLoad, p.chronicLoad))),
      anyCheckin: h.some((p) => p.hasCheckin),
    };
  }, [history]);

  const day = history?.[sel] ?? null;
  const dateLabel = day
    ? new Date(`${day.date}T12:00:00`).toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const isToday = history ? sel === history.length - 1 : true;

  // Load axis: round the top to a clean step.
  const step = series.loadMax > 2000 ? 500 : series.loadMax > 800 ? 250 : 100;
  const loadTop = Math.ceil((series.loadMax * 1.1) / step) * step;
  const loadTicks = Array.from({ length: Math.floor(loadTop / step) + 1 }, (_, i) => i * step);

  const dash = (v: number | null | undefined, f: (n: number) => string = String) => (v === null || v === undefined ? '—' : f(v));
  const rows: { k: string; v: string; color?: string }[] = day
    ? [
        { k: t.stats.score, v: day.hasCheckin ? String(day.score) : '—', color: day.hasCheckin ? zoneColor(day.zone) : undefined },
        { k: t.stats.zone, v: day.hasCheckin ? t.zoneName[day.zone] : '—' },
        { k: t.stats.acwr, v: dash(day.acwr, (n) => n.toFixed(2)) },
        { k: t.stats.acute, v: String(Math.round(day.acuteLoad)) },
        { k: t.stats.chronic, v: day.chronicLoad > 0 ? String(Math.round(day.chronicLoad)) : '—' },
        { k: t.stats.monotony, v: dash(day.monotony, (n) => n.toFixed(2)) },
        { k: t.stats.hooper, v: day.hasCheckin ? `${day.hooperScore} / 28` : '—' },
        { k: t.stats.sleep, v: dash(day.sleepQuality, (n) => `${n} / 7`) },
        { k: t.stats.calm, v: dash(day.stress, (n) => `${n} / 7`) },
        { k: t.stats.energy, v: dash(day.fatigue, (n) => `${n} / 7`) },
        { k: t.stats.muscles, v: dash(day.soreness, (n) => `${n} / 7`) },
        { k: t.stats.noRest, v: String(day.trainingStreak) },
        { k: t.stats.checkin, v: day.hasCheckin ? t.yes : t.no },
      ]
    : [];

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] px-3 pb-6 pt-3 md:px-6" style={{ background: C.bg, color: C.text, fontFamily: 'var(--font-geist-sans), Inter, system-ui, sans-serif' }}>
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[64px_minmax(0,1fr)]">
        {/* Icon rail */}
        <nav className="hidden flex-col items-center gap-2 rounded-xl border py-4 lg:flex" style={{ background: C.card, borderColor: C.border }} aria-label={t.title}>
          <RailLink href="/pro" label={t.nav.dashboard} active={path === '/pro'}>
            <SquaresFour size={20} />
          </RailLink>
          <RailLink href="/progress" label={t.nav.progress} active={path === '/progress'}>
            <ChartLineUp size={20} />
          </RailLink>
          <RailLink href="/calendar" label={t.nav.calendar} active={path === '/calendar'}>
            <CalendarBlank size={20} />
          </RailLink>
          <span className="my-2 h-px w-8" style={{ background: C.border }} />
          <RailLink href="/chat" label={t.nav.chat} active={path === '/chat'}>
            <ChatCircleDots size={20} />
          </RailLink>
        </nav>

        <div className="min-w-0">
          {/* Top bar */}
          <header className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3" style={{ background: C.card, borderColor: C.border }}>
            <h1 className="mr-2 text-xl font-semibold tracking-[-0.01em]" style={{ fontFamily: 'inherit' }}>
              {t.title}
            </h1>
            <span className="hidden h-6 w-px sm:block" style={{ background: C.border }} />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSel((s) => Math.max(0, s - 1))}
                disabled={!history || sel === 0}
                aria-label={t.prevDay}
                className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                style={{ borderColor: C.border }}
              >
                <CaretLeft size={16} />
              </button>
              <span className="flex h-9 min-w-[15rem] items-center gap-2 rounded-lg border px-3 text-sm" style={{ borderColor: C.border }}>
                <CalendarBlank size={16} style={{ color: C.muted }} />
                <span className="first-letter:uppercase">{dateLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => setSel((s) => Math.min((history?.length ?? 1) - 1, s + 1))}
                disabled={!history || isToday}
                aria-label={t.nextDay}
                className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                style={{ borderColor: C.border }}
              >
                <CaretRight size={16} />
              </button>
              {!isToday && history && (
                <button type="button" onClick={() => setSel(history.length - 1)} className="ml-1 h-9 rounded-lg border px-3 text-sm transition-colors hover:bg-white/[0.06]" style={{ borderColor: C.border }}>
                  {t.today}
                </button>
              )}
            </div>
            <Link
              href="/chat"
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors hover:bg-white/[0.06]"
              style={{ borderColor: C.border }}
            >
              <Sparkle size={16} />
              {t.askAi}
            </Link>
          </header>

          {failed && (
            <Card className="mt-4">
              <p className="text-sm" style={{ color: C.muted }}>
                {t.error}
              </p>
            </Card>
          )}

          {!failed && history && !series.anyCheckin && (
            <Card className="mt-4">
              <p className="text-base font-semibold">{t.noData}</p>
              <p className="mt-1 text-sm" style={{ color: C.muted }}>
                {t.noDataBody}
              </p>
              <Link href="/checkin" className="mt-4 inline-flex h-9 items-center rounded-lg border px-3.5 text-sm font-medium hover:bg-white/[0.06]" style={{ borderColor: C.border }}>
                {t.toCheckin}
              </Link>
            </Card>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
            {/* Charts */}
            <div className="min-w-0 space-y-4">
              <Card>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[15px] font-medium">{t.readinessChart}</h2>
                  <span className="rounded-md border px-2 py-0.5 text-xs tabular-nums" style={{ borderColor: C.border, color: C.muted }}>
                    {t.days(DAYS)}
                  </span>
                </div>
                {history ? (
                  <ProChart
                    points={series.readiness}
                    min={0}
                    max={100}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    refLines={[50, 75]}
                    color={C.blue}
                    selected={sel}
                    onSelect={setSel}
                    format={(v) => String(Math.round(v))}
                    lang={lang}
                    label={t.readinessChart}
                  />
                ) : (
                  <div className="h-[300px] animate-pulse rounded-lg bg-white/[0.03]" />
                )}
                <p className="mt-2 text-xs" style={{ color: C.faint }}>
                  {t.zones}
                </p>
              </Card>

              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[15px] font-medium">{t.loadChart}</h2>
                  <span className="flex items-center gap-4 text-xs" style={{ color: C.muted }}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded" style={{ background: C.violet }} />
                      {t.acute}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,0.55)' }} />
                      {t.usual}
                    </span>
                  </span>
                </div>
                {history ? (
                  <ProChart
                    points={series.acute}
                    compare={series.chronic}
                    min={0}
                    max={loadTop}
                    ticks={loadTicks}
                    color={C.violet}
                    selected={sel}
                    onSelect={setSel}
                    format={(v) => String(Math.round(v))}
                    lang={lang}
                    label={t.loadChart}
                  />
                ) : (
                  <div className="h-[300px] animate-pulse rounded-lg bg-white/[0.03]" />
                )}
                <p className="mt-2 text-xs" style={{ color: C.faint }}>
                  {t.loadNote}
                </p>
              </Card>
            </div>

            {/* Day stats */}
            <Card className="h-fit xl:sticky xl:top-20">
              <h2 className="text-[15px] font-medium">{t.statsTitle}</h2>
              <p className="mt-3 border-b pb-3 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: C.muted, borderColor: C.border }}>
                {dateLabel}
              </p>
              {day ? (
                <dl className="mt-1">
                  {rows.map((r) => (
                    <div key={r.k} className="flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <dt className="text-sm" style={{ color: '#C8CEDA' }}>
                        {r.k}
                      </dt>
                      <dd className="text-[15px] font-semibold tabular-nums" style={{ color: r.color ?? C.text }}>
                        {r.v}
                      </dd>
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
              <p className="mt-4 text-xs leading-relaxed" style={{ color: C.faint }}>
                {t.byCode}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
