'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  LockSimple,
  ShieldCheck,
  ShieldWarning,
  WarningOctagon,
  ChatCircleText,
  BellRinging,
  BookOpen,
  SoccerBall,
  Lightbulb,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { zoneMeta, HUB } from '@/components/PerformancePanel';
import { addDays, todayUtc } from '@/lib/checkin-streak';
import {
  childCalendar,
  fromLegacyDashboard,
  homeTips,
  parseOverview,
  tightRanges,
  weekSummary,
  type ParentOverview,
  type Zone,
} from '@/lib/parent-view';
import { parseMatchBriefs, type MatchBrief } from '@/lib/match-brief';
import ParentMatchBriefCard from '@/components/ParentMatchBriefCard';
import ParentScoutApprovals from '@/components/ParentScoutApprovals';

// ---------------------------------------------------------------------------
// Parent view. Reads ONLY through database functions — parents have no access
// to the checkins or profiles tables:
//   parent_overview() (supabase/sql/13) — today, the last 7 days' colours and
//     the coach's reply (colour consent), exam and match dates (calendar
//     consent, a separate switch the athlete controls);
//   parent_dashboard() (06) — fallback while SQL 13 has not been run.
// No scores, answers or pain details, ever. The page refreshes itself every
// 30 seconds and whenever it comes back to the screen, so a new exam in the
// child's calendar or the coach's reply shows up without reloading.
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };
const REFRESH_MS = 30_000;

export default function ParentPage() {
  const { t, lang } = useLanguage();
  const p = t.parent;
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<ParentOverview[] | null>(null);
  const [error, setError] = useState(false);
  // Pre-match brief (SQL 15); empty until a match is within 7 days and both consents are on.
  const [briefs, setBriefs] = useState<MatchBrief[]>([]);

  const load = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const [overview, brief] = await Promise.all([supabase.rpc('parent_overview'), supabase.rpc('parent_match_brief')]);
    setBriefs(brief.error ? [] : parseMatchBriefs(brief.data as unknown[]));
    if (!overview.error) {
      setError(false);
      setRows(((overview.data as unknown[] | null) ?? []).flatMap((r) => parseOverview(r) ?? []));
      return;
    }
    // SQL 13 not run yet — today's colour only, as before.
    const legacy = await supabase.rpc('parent_dashboard');
    if (legacy.error) {
      setError(true);
      return;
    }
    setError(false);
    setRows(((legacy.data as unknown[] | null) ?? []).flatMap((r) => fromLegacyDashboard(r) ?? []));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';
  const statusText = (z: Zone) => (z === 'green' ? p.statusGreen : z === 'yellow' ? p.statusYellow : p.statusRed);
  const today = todayUtc();
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { ...opts, timeZone: 'UTC' });
  const day = (iso: string) => fmt(iso, { day: 'numeric', month: 'long' });
  const time = (iso: string) => new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-lg">
        <header className="mb-6">
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-4xl">
            {p.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{p.subtitle}</p>
        </header>

        {error && (
          <div className="mb-6 flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
            <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
            <span>{p.errLoad}</span>
          </div>
        )}

        {!rows && !error && (
          <div className="space-y-3" aria-busy>
            <p className="text-sm text-zinc-500">{p.loading}</p>
            <div className="h-40 animate-pulse rounded-3xl bg-white/[0.03]" />
          </div>
        )}

        {rows && rows.length === 0 && <p className={`${card} text-sm leading-relaxed text-zinc-300`}>{p.empty}</p>}

        {rows && rows.length > 0 && (
          <div className="space-y-3">
            <ParentScoutApprovals fallbackName={p.athleteFallback} />
            {rows.map((row, i) => {
              const name = row.athleteLabel || p.athleteFallback;
              const todayRow = row.today;
              const meta = todayRow?.checkedIn && todayRow.zone ? zoneMeta(todayRow.zone) : null;
              const calendarDays = row.calendar ? childCalendar(row.calendar, today) : null;
              const upcoming = row.calendar
                ? [
                    ...row.calendar.exams.map((d) => ({ date: d, kind: 'exam' as const })),
                    ...row.calendar.matches.map((d) => ({ date: d, kind: 'match' as const })),
                  ]
                    .filter((e) => e.date >= today && e.date < addDays(today, 14))
                    .sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind))
                : [];
              const tips = homeTips(row.consent ? todayRow : null, row.calendarConsent ? row.calendar : null, today);

              return (
                <motion.div
                  key={row.linkId}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.5, delay: reduce ? 0 : i * 0.06 }}
                  className="space-y-3"
                >
                  {/* Today */}
                  <section
                    className={card}
                    style={meta ? { backgroundColor: `${meta.color}12`, boxShadow: `inset 0 0 0 1px ${meta.color}40` } : undefined}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold tracking-[-0.01em] text-zinc-50">{name}</h2>
                      <span className="text-xs text-zinc-500">{p.todayLabel}</span>
                    </div>

                    {!row.consent && (
                      <div className="flex gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
                          <LockSimple size={19} weight="fill" />
                        </span>
                        <div>
                          <p className="text-[15px] font-medium text-zinc-100">{p.noConsentTitle}</p>
                          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{p.noConsentBody(name)}</p>
                        </div>
                      </div>
                    )}

                    {row.consent && !todayRow?.checkedIn && <p className="text-[15px] text-zinc-300">{p.noCheckin}</p>}

                    {row.consent && meta && todayRow?.zone && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3.5">
                          <span
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: meta.color, color: '#07080A' }}
                          >
                            <meta.Icon size={28} weight="fill" />
                          </span>
                          <p className="text-xl font-semibold leading-tight tracking-[-0.01em]" style={{ color: meta.color }}>
                            {statusText(todayRow.zone)}
                          </p>
                        </div>
                        {todayRow.restricted && (
                          <p className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                            <ShieldWarning size={18} weight="fill" className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                            {p.restricted}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Coach aware */}
                    {row.consent && row.coach && (
                      <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/[0.08]">
                        {row.coach.state === 'waiting' || !row.coach.reaction ? (
                          <p className="flex gap-2 text-sm text-zinc-200">
                            <BellRinging size={16} weight="fill" className="mt-0.5 shrink-0" style={{ color: HUB.amber }} />
                            {p.coachWaiting}
                          </p>
                        ) : (
                          <>
                            <p className="flex items-center gap-2 text-xs text-zinc-400">
                              <ChatCircleText size={14} weight="fill" className="text-[#CCFF00]" />
                              {p.coachAnswered(time(row.coach.at))}
                            </p>
                            <p className="mt-1 text-sm font-medium text-zinc-100">{p.coachReply[row.coach.reaction]}</p>
                          </>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Before the match: the coach's verdict for this child */}
                  {briefs
                    .filter((b) => b.linkId === row.linkId)
                    .map((b) => (
                      <ParentMatchBriefCard key={b.linkId} brief={b} today={today} />
                    ))}

                  {/* Last 7 days */}
                  {row.consent && row.week && row.week.length > 0 && (
                    <section className={card}>
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-sm font-semibold text-zinc-200">{p.weekTitle}</h3>
                        <span className="text-xs text-zinc-500">
                          {p.weekCount(weekSummary(row.week).checkedIn, weekSummary(row.week).total)}
                        </span>
                      </div>
                      <ol className="mt-3 grid grid-cols-7 gap-1.5">
                        {row.week.map((d) => {
                          const color = d.checkedIn && d.zone ? zoneMeta(d.zone).color : null;
                          return (
                            <li
                              key={d.date}
                              className="flex flex-col items-center gap-1"
                              aria-label={`${day(d.date)}: ${d.checkedIn && d.zone ? statusText(d.zone) : p.weekNoCheckin}`}
                            >
                              <span
                                className="h-7 w-7 rounded-full"
                                style={
                                  color
                                    ? { backgroundColor: color }
                                    : { boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.18)' }
                                }
                              />
                              <span className="text-[10px] uppercase text-zinc-500">{fmt(d.date, { weekday: 'short' })}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  )}

                  {/* Calendar: exams and matches */}
                  <section className={card}>
                    <h3 className="text-sm font-semibold text-zinc-200">{p.calendarTitle}</h3>
                    {!row.calendarConsent || !calendarDays ? (
                      <p className="mt-2 flex gap-2 text-sm leading-relaxed text-zinc-400">
                        <LockSimple size={16} weight="fill" className="mt-0.5 shrink-0" />
                        {p.calendarLocked(name)}
                      </p>
                    ) : upcoming.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-400">{p.calendarEmpty}</p>
                    ) : (
                      <>
                        <ol className="mt-3 grid grid-cols-7 gap-1">
                          {calendarDays.map((d) => (
                            <li
                              key={d.date}
                              aria-label={p.dayAria(day(d.date), d.exam, d.match, d.examWindow)}
                              className={`flex flex-col items-center rounded-xl py-1.5 ${d.date === today ? 'ring-1 ring-inset ring-white/20' : ''}`}
                              style={
                                d.tight
                                  ? { backgroundColor: `${HUB.amber}26` }
                                  : d.examWindow
                                    ? { backgroundColor: 'rgba(255,255,255,0.05)' }
                                    : undefined
                              }
                            >
                              <span className="text-[10px] uppercase text-zinc-500">{fmt(d.date, { weekday: 'narrow' })}</span>
                              <span className="text-[11px] tabular-nums text-zinc-300">{fmt(d.date, { day: 'numeric' })}</span>
                              <span className="mt-1 flex h-3.5 items-center gap-0.5">
                                {d.exam && <BookOpen size={13} weight="fill" style={{ color: HUB.amber }} aria-hidden />}
                                {d.match && <SoccerBall size={13} weight="fill" className="text-zinc-200" aria-hidden />}
                              </span>
                            </li>
                          ))}
                        </ol>
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <BookOpen size={11} weight="fill" style={{ color: HUB.amber }} /> {p.legendExam}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <SoccerBall size={11} weight="fill" className="text-zinc-300" /> {p.legendMatch}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-white/[0.12]" /> {p.legendWindow}
                          </span>
                        </p>
                        <ul className="mt-3 space-y-1 text-sm text-zinc-200">
                          {upcoming.map((e) => (
                            <li key={`${e.kind}-${e.date}`}>{e.kind === 'exam' ? p.examOn(day(e.date)) : p.matchOn(day(e.date))}</li>
                          ))}
                        </ul>
                        {tightRanges(calendarDays).map((r) => (
                          <p key={r.from} className="mt-2 text-sm font-medium" style={{ color: HUB.amber }}>
                            {p.tightLine(r.from === r.to ? day(r.from) : `${day(r.from)} – ${day(r.to)}`)}
                          </p>
                        ))}
                      </>
                    )}
                  </section>

                  {/* Home tips */}
                  {tips.length > 0 && (
                    <section className={card}>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                        <Lightbulb size={16} weight="fill" className="text-[#CCFF00]" />
                        {p.tipsTitle}
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {tips.map((code) => (
                          <li key={code} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CCFF00]" />
                            {p.tips[code]}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </motion.div>
              );
            })}

            <section className={`${card} flex gap-3`}>
              <ShieldCheck size={20} weight="fill" className="mt-0.5 shrink-0 text-[#CCFF00]" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">{p.privacyTitle}</h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{p.privacyBody}</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

