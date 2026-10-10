'use client';

// /calendar — v3.
//
// 1. Month grid: one glowing dot per day with a check-in, coloured by the ENGINE zone
//    (green ≥ 75, yellow 50–74, red < 50); a faint ring = no check-in that day (the engine
//    still has a load-only score). Exam / match days carry a small glyph.
// 2. Day inspector: a glass slide-over (bottom sheet on phones) with the check-in answers,
//    the Load Index and sessions of that day, ACWR, and WHY the score is what it is — the
//    penalties are recomputed with the same pure engine on the athlete's own raw data
//    (GET /api/checkin?days=90&raw=1), so they carry their real parameters.
// 3. School calendar (unchanged logic): add / remove tests and matches → PATCH /api/profile.
//    Adding lives in an iOS-style bottom sheet opened by the round "+" in the header (no static form);
//    the colour key is an (i) popover in the header; tapping a day selects it and filters "Coming up".
//    exam  — from 3 days before up to the exam day: −15 readiness points
//    match — day before, match day, day after: Safety Guard block

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { calculateReadiness, sessionLoad } from '@/lib/readiness-engine';
import type { ReadinessHistoryPoint, ReadinessHistoryResponse } from '@/lib/types/readiness';
import { loadIndex, usualDailyLoad } from '@/lib/load-index';
import { translatePenalty } from '@/lib/engine-i18n';
import DatePicker, { formatDisplayDate } from '@/components/DatePicker';
import ScoreDial from '@/components/np/ScoreDial';
import { APP } from '@/components/np/appCopy';
import { LOCALE, NP } from '@/components/np/copy';
import { Icon } from '@/components/np/icons';
import { ZONE } from '@/components/np/ui';
import { ACWR_PILL, BLUE, CYAN, Disclaimer, acwrBand } from '@/components/np/Telemetry';
import { POLISH } from '@/components/np/polishCopy';

type Kind = 'exam' | 'match';
type CalendarState = { examDates: string[]; matchDates: string[]; examSubjects: Record<string, string> };
type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

const EXAM_WINDOW_DAYS = 3; // same as EXAM_WINDOW_DAYS in lib/readiness-engine.ts

// Same UTC date convention as /api/checkin and the engine.
const todayIso = () => new Date().toISOString().slice(0, 10);
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const daysFrom = (today: string, date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Monday-first weekday initials in the UI language. */
function weekdays(lang: Lang): string[] {
  const base = Date.UTC(2024, 0, 1); // a Monday
  return Array.from({ length: 7 }, (_, i) => new Date(base + i * 86_400_000).toLocaleDateString(LOCALE[lang], { weekday: 'short', timeZone: 'UTC' }));
}

function MiniBar({ label, value }: { label: string; value: number | null }) {
  const pct = value === null ? 0 : (value / 7) * 100;
  const color = value === null ? 'transparent' : value <= 2 ? '#FF7A59' : value <= 4 ? '#FFC53D' : '#3FE0A8';
  return (
    <div className="np-row min-h-0 py-2">
      <span className="w-24 shrink-0 truncate text-sm text-np-text-2">{label}</span>
      <span className="relative h-1.5 min-w-0 flex-1 rounded-full bg-np-veil/[0.07]" aria-hidden>
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      </span>
      <span className="np-mono w-10 shrink-0 text-right text-sm font-semibold text-np-text">{value === null ? '—' : `${value}/7`}</span>
    </div>
  );
}

export default function CalendarPage() {
  const { t, lang } = useLanguage();
  const c = t.calendar;
  const cc = APP[lang].calendar;
  const np = NP[lang];
  const tl = APP[lang].v3.telemetry;
  const short = APP[lang].v3.short;
  const pc = POLISH[lang].calendar;

  // ---- school calendar (exam / match dates) ----
  const [cal, setCal] = useState<CalendarState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [kind, setKind] = useState<Kind>('exam');
  const [date, setDate] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [addOpen, setAddOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  // the day picked in the grid: filters "Coming up" to that day
  const [picked, setPicked] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragFrom = useRef<number | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // ---- readiness history for the grid ----
  const [hist, setHist] = useState<ReadinessHistoryPoint[] | null>(null);
  const [raw, setRaw] = useState<ReadinessHistoryResponse['raw'] | null>(null);

  const today = todayIso();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });
  const [open, setOpen] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile', { headers: await authHeaders() });
        if (!res.ok) throw new Error('load failed');
        const { profile } = (await res.json()) as { profile: Partial<CalendarState> };
        if (cancelled) return;
        setCal({ examDates: profile.examDates ?? [], matchDates: profile.matchDates ?? [], examSubjects: profile.examSubjects ?? {} });
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    (async () => {
      try {
        const res = await fetch('/api/checkin?days=90&raw=1', { headers: await authHeaders() });
        if (!res.ok) throw new Error('history');
        const body = (await res.json()) as ReadinessHistoryResponse;
        if (cancelled) return;
        setHist(body.history ?? []);
        setRaw(body.raw ?? null);
      } catch {
        if (!cancelled) setHist([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // drawer: Esc closes, focus goes to the close button and back to the day afterwards
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  // sheet / popover: Esc closes them
  useEffect(() => {
    if (!addOpen && !legendOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAddOpen(false);
      setLegendOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addOpen, legendOpen]);
  // short "saved" confirmation once the sheet has closed
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(false), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);
  const openAdd = (prefill?: string) => {
    setStatus({ kind: 'idle' });
    setDate(prefill ?? '');
    setSubject('');
    setDragY(0);
    setLegendOpen(false);
    setAddOpen(true);
  };
  const closeAdd = () => {
    setAddOpen(false);
    setDragY(0);
  };
  const closeDrawer = () => {
    setOpen(null);
    lastFocus.current?.focus();
  };

  const byDate = useMemo(() => new Map((hist ?? []).map((p) => [p.date, p])), [hist]);

  async function save(next: CalendarState) {
    if (!cal) return false;
    const previous = cal;
    setCal(next); // optimistic, rolled back on error
    setStatus({ kind: 'saving' });
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error('save failed');
      const saved = (await res.json()) as CalendarState;
      setCal(saved);
      setStatus({ kind: 'saved' });
      return true;
    } catch {
      setCal(previous);
      setStatus({ kind: 'error', message: c.errSave });
      return false;
    }
  }

  async function handleAdd() {
    if (!cal) return;
    if (!date) {
      setStatus({ kind: 'error', message: c.errDate });
      return;
    }
    const list = kind === 'exam' ? cal.examDates : cal.matchDates;
    if (list.includes(date)) {
      setStatus({ kind: 'error', message: c.errDuplicate });
      return;
    }
    const next: CalendarState =
      kind === 'exam'
        ? {
            ...cal,
            examDates: [...cal.examDates, date].sort(),
            examSubjects: subject.trim() ? { ...cal.examSubjects, [date]: subject.trim() } : cal.examSubjects,
          }
        : { ...cal, matchDates: [...cal.matchDates, date].sort() };
    if (await save(next)) {
      setPicked(date);
      setMonth({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) - 1 });
      setDate('');
      setSubject('');
      setAddOpen(false);
      setToast(true);
    }
  }

  function handleRemove(k: Kind, d: string) {
    if (!cal) return;
    if (k === 'exam') {
      const subjects = { ...cal.examSubjects };
      delete subjects[d];
      void save({ ...cal, examDates: cal.examDates.filter((x) => x !== d), examSubjects: subjects });
    } else {
      void save({ ...cal, matchDates: cal.matchDates.filter((x) => x !== d) });
    }
  }

  const busy = status.kind === 'saving';
  const events = cal
    ? [
        ...cal.examDates.map((d) => ({ kind: 'exam' as const, date: d, diff: daysFrom(today, d) })),
        ...cal.matchDates.map((d) => ({ kind: 'match' as const, date: d, diff: daysFrom(today, d) })),
      ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind))
    : [];
  const upcomingAll = events.filter((e) => (e.kind === 'exam' ? e.diff >= 0 : e.diff >= -1));
  const pastCount = events.length - upcomingAll.length;
  // a picked day shows that day's events (past ones too); otherwise everything coming up
  const upcoming = picked ? events.filter((e) => e.date === picked) : upcomingAll;
  const relative = (diff: number) => (diff === 0 ? c.today : diff === 1 ? c.tomorrow : diff === -1 ? c.yesterday : c.inDays(diff));
  const effect = (k: Kind, diff: number) =>
    k === 'exam'
      ? diff <= EXAM_WINDOW_DAYS
        ? { text: c.effectExamNow, cls: 'text-np-warn', dot: 'bg-np-warn' }
        : { text: c.effectExamLater, cls: 'text-np-text-3', dot: 'bg-np-text-3' }
      : diff <= 1
        ? { text: c.effectMatchNow, cls: 'text-np-danger', dot: 'bg-np-danger' }
        : { text: c.effectMatchLater, cls: 'text-np-text-3', dot: 'bg-np-text-3' };

  // ---- month grid ----
  const first = new Date(Date.UTC(month.y, month.m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => iso(month.y, month.m, i + 1))];
  while (cells.length % 7) cells.push(null);
  const monthName = first.toLocaleDateString(LOCALE[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const wd = weekdays(lang);
  const shift = (d: number) => setMonth(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const examSet = new Set(cal?.examDates ?? []);
  const matchSet = new Set(cal?.matchDates ?? []);

  // ---- day inspector ----
  const day = open ? byDate.get(open) ?? null : null;
  const engineDay = useMemo(() => {
    if (!open || !raw || !byDate.has(open)) return null;
    try {
      return calculateReadiness(raw.sessions, raw.checkins, open, raw.context);
    } catch {
      return null;
    }
  }, [open, raw, byDate]);
  const daySessions = open && raw ? raw.sessions.filter((s) => s.date === open) : [];
  const dayIndex = day ? loadIndex(day.dailyLoad ?? null, usualDailyLoad(day.chronicLoad)) : null;
  const nf = new Intl.NumberFormat(LOCALE[lang]);
  const fmt2 = (v: number) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-x-clip px-3 py-6 md:px-8 md:py-10">
      <span aria-hidden className="np-ambient -right-24 -top-32 h-80 w-96" style={{ ['--np-ambient' as string]: 'rgb(255 122 89 / 0.1)' }} />

      <header className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="np-label">{cc.datesTitle}</p>
          <h1 className="np-on-bg mt-1.5 text-[32px] np-editorial font-semibold leading-tight text-np-text md:text-[40px]">
            {c.title}
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/75">{c.subtitle}</p>
        </div>
        <div className="relative flex shrink-0 items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            aria-label={pc.legendOpen}
            aria-expanded={legendOpen}
            aria-haspopup="dialog"
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-white/80 transition-colors ${
              legendOpen ? 'border-white/25 bg-white/15' : 'border-white/10 bg-white/[0.05] hover:bg-white/10'
            }`}
          >
            <Icon name="info" size={19} stroke={1.6} />
          </button>
          <button
            type="button"
            onClick={() => openAdd(picked ?? undefined)}
            disabled={!cal}
            aria-label={pc.add}
            aria-haspopup="dialog"
            className="np-btn-primary flex h-11 w-11 items-center justify-center rounded-full shadow-[0_0_24px_rgba(184,242,60,0.3)] disabled:opacity-50"
          >
            <Icon name="plus" size={20} stroke={1.75} />
          </button>
          {legendOpen && (
            <>
              <button type="button" aria-label={pc.close} tabIndex={-1} onClick={() => setLegendOpen(false)} className="fixed inset-0 z-30 cursor-default" />
              <div
                role="dialog"
                aria-label={pc.legendTitle}
                className="np-pop-in absolute right-0 top-14 z-40 w-[min(300px,calc(100vw-32px))] rounded-3xl border border-white/10 bg-[#141821]/95 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_24px_60px_rgb(0_0_0/0.6)] backdrop-blur-2xl"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/75">{pc.legendTitle}</p>
                <ul className="mt-3 space-y-2.5 text-[13px] text-white/90">
                  {(['green', 'yellow', 'red'] as const).map((z) => (
                    <li key={z} className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ZONE[z].hex, boxShadow: `0 0 8px ${ZONE[z].hex}` }} aria-hidden />
                      {np.zone[z]}
                    </li>
                  ))}
                  <li className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/40" aria-hidden />
                    {cc.legendNoCheckin}
                  </li>
                  <li className="flex items-center gap-3">
                    <Icon name="exam" size={14} className="shrink-0" />
                    {c.typeExam}
                  </li>
                  <li className="flex items-center gap-3">
                    <Icon name="trophy" size={14} className="shrink-0" />
                    {c.typeMatch}
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* month grid */}
        <section className="lt-card-readiness p-4 md:p-5" aria-labelledby="cal-month">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => shift(-1)} aria-label={cc.prev} className="np-chip flex h-9 w-9 items-center justify-center text-np-text-2">
              <Icon name="chevL" size={18} />
            </button>
            <h2 id="cal-month" className="text-base font-semibold tracking-tight text-np-text first-letter:uppercase" style={{ fontFamily: 'inherit' }} aria-live="polite">
              {monthName}
            </h2>
            <button type="button" onClick={() => shift(1)} aria-label={cc.next} className="np-chip flex h-9 w-9 items-center justify-center text-np-text-2">
              <Icon name="chevR" size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {wd.map((w) => (
              <span key={w} aria-hidden className="np-label pb-1 text-[9px]">
                {w.replace('.', '')}
              </span>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} aria-hidden />;
              const p = byDate.get(d);
              const Z = p && p.hasCheckin ? ZONE[p.zone] : null;
              const isToday = d === today;
              const exam = examSet.has(d);
              const match = matchSet.has(d);
              const label = `${formatDisplayDate(d, lang)}${p ? (p.hasCheckin ? `, ${p.score}, ${np.zone[p.zone]}` : `, ${cc.legendNoCheckin}`) : ''}${exam ? `, ${c.typeExam}` : ''}${match ? `, ${c.typeMatch}` : ''}`;
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={label}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={picked === d}
                  onClick={() => setPicked((cur) => (cur === d ? null : d))}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-np-ctrl text-sm transition-colors ${
                    picked === d ? 'bg-[#B8F23C]/20 ring-1 ring-[#B8F23C]/70' : 'hover:bg-np-veil/[0.05]'
                  } ${isToday && picked !== d ? 'ring-1 ring-np-veil/35' : ''} ${d > today ? 'text-np-text-3' : 'text-np-text'}`}
                >
                  <span className="np-mono text-[13px] leading-none">{Number(d.slice(8))}</span>
                  <span className="mt-1.5 flex h-2.5 items-center gap-0.5">
                    {Z ? (
                      <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: Z.hex, boxShadow: `0 0 8px ${Z.hex}` }} />
                    ) : p ? (
                      <span className="block h-2 w-2 rounded-full border border-np-veil/25" />
                    ) : null}
                    {exam && <Icon name="exam" size={10} stroke={1.75} className="text-np-text-2" />}
                    {match && <Icon name="trophy" size={10} stroke={1.75} className="text-np-text-2" />}
                  </span>
                </button>
              );
            })}
          </div>

        </section>

        {/* school calendar: add + upcoming */}
        <div className="space-y-4">
          {loadError && (
            <div className="np-flag flex gap-3 p-4 text-sm text-np-text" style={{ ['--np-accent-line' as string]: '#FF7A59' }}>
              <Icon name="close" size={18} className="mt-0.5 shrink-0 text-np-danger" />
              {c.errLoad}
            </div>
          )}
          {!cal && !loadError && <div className="h-64 animate-pulse rounded-np-card bg-np-veil/[0.03]" aria-busy />}

          {cal && (
            <>
              <section className="lt-card-stress p-4 md:p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="np-label" style={{ fontFamily: 'inherit' }}>
                    {picked ? pc.pickedDay(formatDisplayDate(picked, lang)) : pc.allUpcoming}
                  </h2>
                  {picked && (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          lastFocus.current = e.currentTarget;
                          setOpen(picked);
                        }}
                        aria-haspopup="dialog"
                        className="h-8 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-white/10"
                      >
                        {cc.inspect}
                      </button>
                      <button type="button" onClick={() => setPicked(null)} className="h-8 rounded-full px-3 text-xs font-medium text-[#B8F23C] hover:bg-white/[0.06]">
                        {pc.showAll}
                      </button>
                    </span>
                  )}
                </div>
                {upcoming.length === 0 ? (
                  <div key={picked ?? 'all'} className="np-enter">
                    <p className="flex gap-2.5 text-sm leading-relaxed text-white/75">
                      <Icon name="calendar" size={18} className="mt-0.5 shrink-0 text-white/75" />
                      {picked ? pc.nothingOn : c.empty}
                    </p>
                    {picked && (
                      <button
                        type="button"
                        onClick={() => openAdd(picked)}
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white hover:bg-white/10"
                      >
                        <Icon name="plus" size={15} stroke={1.75} />
                        {pc.add}
                      </button>
                    )}
                  </div>
                ) : (
                  <ul key={picked ?? 'all'} className="np-list-in">
                    {upcoming.map((e, idx) => {
                      const fx = effect(e.kind, e.diff);
                      const title = e.kind === 'exam' ? cal.examSubjects[e.date] || c.examFallback : c.matchTitle;
                      return (
                        <li key={`${e.kind}-${e.date}`} className="np-row" style={{ ['--np-i' as string]: idx }}>
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-np-ctrl bg-np-veil/[0.05] text-np-text-2">
                              <Icon name={e.kind === 'exam' ? 'exam' : 'trophy'} size={18} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-np-text">{title}</span>
                              <span className="block text-xs text-np-text-3">
                                {formatDisplayDate(e.date, lang)} · {relative(e.diff)}
                              </span>
                              <span className={`mt-0.5 inline-flex items-center gap-1.5 text-xs ${fx.cls}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${fx.dot}`} aria-hidden />
                                {fx.text}
                              </span>
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(e.kind, e.date)}
                            disabled={busy}
                            aria-label={`${c.remove}: ${title}, ${formatDisplayDate(e.date, lang)}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-np-text-3 transition-colors hover:bg-np-veil/[0.06] hover:text-np-text disabled:opacity-40"
                          >
                            <Icon name="close" size={15} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {!picked && pastCount > 0 && <p className="mt-3 text-xs text-white/75">{c.pastNote(pastCount)}</p>}
              </section>

              <section className="lt-card-readiness p-4 md:p-5">
                <h2 className="np-label mb-3" style={{ fontFamily: 'inherit' }}>
                  {c.howTitle}
                </h2>
                <ul className="space-y-2.5 text-sm leading-relaxed text-np-text-2">
                  <li className="flex gap-2.5">
                    <Icon name="exam" size={16} className="mt-0.5 shrink-0 text-np-warn" />
                    {c.howExam}
                  </li>
                  <li className="flex gap-2.5">
                    <Icon name="trophy" size={16} className="mt-0.5 shrink-0 text-np-danger" />
                    {c.howMatch}
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>
      </div>

      <Disclaimer lang={lang} className="mt-8" />

      {/* new event: iOS-style bottom sheet (drag the handle down to dismiss) */}
      {addOpen && cal && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <button type="button" aria-label={pc.close} tabIndex={-1} onClick={closeAdd} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={pc.sheetTitle}
            className="np-sheet-up absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[28px] border border-b-0 border-white/10 bg-[#141821]/95 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_-24px_60px_rgb(0_0_0/0.5)] backdrop-blur-2xl md:inset-x-auto md:left-1/2 md:w-[440px] md:-translate-x-1/2"
            style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragFrom.current === null ? 'transform 200ms ease-out' : undefined }}
          >
            <div
              className="-mx-5 flex cursor-grab touch-none justify-center pb-3 pt-2 active:cursor-grabbing"
              onPointerDown={(e) => {
                dragFrom.current = e.clientY;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragFrom.current !== null) setDragY(Math.max(0, e.clientY - dragFrom.current));
              }}
              onPointerUp={() => {
                const far = dragY > 100;
                dragFrom.current = null;
                if (far) closeAdd();
                else setDragY(0);
              }}
              onPointerCancel={() => {
                dragFrom.current = null;
                setDragY(0);
              }}
            >
              <span aria-hidden className="h-1.5 w-11 rounded-full bg-white/25" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="np-editorial text-[26px] font-semibold leading-tight text-white">{pc.sheetTitle}</h2>
              <button
                type="button"
                onClick={closeAdd}
                aria-label={pc.close}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.05] p-1" role="radiogroup" aria-label={c.addTitle}>
              {(['exam', 'match'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${
                    kind === k ? 'bg-[#B8F23C] text-[#0B0D11] shadow-[0_0_24px_rgba(184,242,60,0.3)]' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <Icon name={k === 'exam' ? 'exam' : 'trophy'} size={16} />
                  {k === 'exam' ? c.typeExam : c.typeMatch}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <DatePicker value={date} onChange={setDate} placeholder={c.datePlaceholder} lang={lang} />
              {kind === 'exam' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-white/75">{c.subjectLabel}</span>
                  <input
                    ref={subjectRef}
                    type="text"
                    value={subject}
                    maxLength={40}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={c.subjectPlaceholder}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-[15px] text-white placeholder:text-white/50 focus:border-[#B8F23C]/60 focus:outline-none"
                  />
                </label>
              )}
              <p className="text-xs leading-relaxed text-white/75">{kind === 'exam' ? c.howExam : c.howMatch}</p>
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy}
                className="np-btn-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-[0_0_24px_rgba(184,242,60,0.3)] disabled:opacity-60"
              >
                <Icon name="plus" size={16} stroke={1.75} />
                {c.add}
              </button>
              <div className="min-h-5 text-sm" aria-live="polite">
                {status.kind === 'saving' && <span className="text-white/75">{c.saving}</span>}
                {status.kind === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-white">
                    <Icon name="close" size={16} className="text-np-danger" />
                    {status.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <p
          role="status"
          className="fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+88px)] z-[55] mx-auto flex w-max items-center gap-1.5 rounded-full border border-white/10 bg-[#141821]/95 px-4 py-2 text-sm font-medium text-white shadow-[0_12px_30px_rgb(0_0_0/0.5)] backdrop-blur-2xl"
        >
          <Icon name="check" size={16} className="text-np-good" />
          {c.saved}
        </p>
      )}

      {/* day inspector: slide-over on desktop, bottom sheet on phones */}
      {open && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <button type="button" aria-label={cc.close} tabIndex={-1} onClick={closeDrawer} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cal-day-title"
            className="np-glass-premium np-enter absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto !rounded-b-none p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[400px] md:!rounded-np-card md:pb-5"
          >
            <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-np-veil/20 md:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="np-label">{open === today ? cc.today : cc.inspect}</p>
                <h2 id="cal-day-title" className="mt-1 text-xl np-editorial font-semibold text-np-text first-letter:uppercase">
                  {new Date(`${open}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                </h2>
              </div>
              <button ref={closeRef} type="button" onClick={closeDrawer} aria-label={cc.close} className="np-chip flex h-9 w-9 shrink-0 items-center justify-center text-np-text-2">
                <Icon name="close" size={16} />
              </button>
            </div>

            {(examSet.has(open) || matchSet.has(open)) && (
              <div className="mt-4 space-y-2">
                <p className="np-label">{cc.events}</p>
                {examSet.has(open) && (
                  <p className="flex items-center gap-2 text-sm text-np-text">
                    <Icon name="exam" size={16} className="text-np-warn" />
                    {cal?.examSubjects[open] || c.examFallback}
                  </p>
                )}
                {matchSet.has(open) && (
                  <p className="flex items-center gap-2 text-sm text-np-text">
                    <Icon name="trophy" size={16} className="text-np-danger" />
                    {c.matchTitle}
                  </p>
                )}
              </div>
            )}

            {!day ? (
              <p className="mt-5 text-sm leading-relaxed text-np-text-2">{cc.outside}</p>
            ) : (
              <>
                <div className="mt-5 flex items-center gap-4">
                  <ScoreDial
                    score={day.score}
                    zone={day.zone}
                    size={76}
                    label={`${np.readiness}: ${day.score} / 100, ${np.zone[day.zone]}`}
                  />
                  <div className="min-w-0 space-y-1.5">
                    <span className={`np-pill ${ZONE[day.zone].pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${ZONE[day.zone].dot}`} aria-hidden />
                      {np.zone[day.zone]}
                    </span>
                    {!day.hasCheckin && <p className="text-xs leading-snug text-np-text-3">{cc.noCheckin}</p>}
                  </div>
                </div>

                {day.hasCheckin && (
                  <section className="mt-5">
                    <p className="np-label">{cc.answers}</p>
                    <div className="mt-1">
                      <MiniBar label={short.sleep} value={day.sleepQuality} />
                      <MiniBar label={short.fatigue} value={day.fatigue} />
                      <MiniBar label={short.stress} value={day.stress} />
                      <MiniBar label={short.soreness} value={day.soreness} />
                    </div>
                  </section>
                )}

                <section className="mt-5">
                  <p className="np-label">{cc.loadTitle}</p>
                  <div className="mt-1">
                    <div className="np-row">
                      <span className="text-sm text-np-text-2">{tl.load}</span>
                      <span className="np-mono text-[17px] font-semibold" style={{ color: '#FFC53D' }}>
                        {dayIndex ?? '—'}
                        <span className="ml-0.5 text-xs font-normal text-np-text-3">/100</span>
                      </span>
                    </div>
                    {daySessions.length === 0 ? (
                      <p className="np-row text-sm text-np-text-3">{cc.noSession}</p>
                    ) : (
                      daySessions.map((s, i) => (
                        <p key={i} className="np-row text-sm text-np-text">
                          <span className="flex items-center gap-2">
                            <Icon name="dumbbell" size={16} className="text-np-text-3" />
                            {cc.session(s.rpe, s.durationMinutes, nf.format(sessionLoad(s.rpe, s.durationMinutes)))}
                          </span>
                        </p>
                      ))
                    )}
                    {day.acwr !== null && (
                      <div className="np-row">
                        <span className="text-sm text-np-text-2">{tl.acwr}</span>
                        <span className="flex items-center gap-2">
                          <span className={`np-pill ${ACWR_PILL[acwrBand(day.acwr)]}`}>{tl.acwrBand[acwrBand(day.acwr)]}</span>
                          <span className="np-mono text-[17px] font-semibold" style={{ color: BLUE }}>
                            {fmt2(day.acwr)}
                          </span>
                        </span>
                      </div>
                    )}
                    {day.hasCheckin && day.hooperScore >= 4 && (
                      <div className="np-row">
                        <span className="text-sm text-np-text-2">{tl.hooper}</span>
                        <span className="np-mono text-[17px] font-semibold" style={{ color: CYAN }}>
                          {day.hooperScore}
                          <span className="ml-0.5 text-xs font-normal text-np-text-3">/28</span>
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                <section className="mt-5">
                  <p className="np-label">{cc.penalties}</p>
                  {engineDay && engineDay.penalties.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {engineDay.penalties.map((p, i) => (
                        <li
                          key={i}
                          className="inline-flex max-w-full items-start gap-2 rounded-np-ctrl border border-np-line bg-np-veil/[0.03] px-3 py-1.5 text-[13px] leading-snug text-np-text-2"
                        >
                          <span className="np-mono shrink-0 font-semibold text-np-warn">−{p.points}</span>
                          <span className="min-w-0">{translatePenalty(t, p)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-np-text-3">{(day.penaltyCodes?.length ?? 0) > 0 ? day.penaltyCodes?.join(' · ') : cc.noPenalties}</p>
                  )}
                </section>
              </>
            )}
            <p className="mt-6 border-t border-np-line pt-3 text-[11px] leading-relaxed text-np-text-3">{APP[lang].v3.disclaimerShort}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
