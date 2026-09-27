'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarBlank,
  CheckCircle,
  GraduationCap,
  Plus,
  Trophy,
  WarningOctagon,
  X,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import DatePicker, { formatDisplayDate } from '@/components/DatePicker';
import { HUB } from '@/components/PerformancePanel';

// ---------------------------------------------------------------------------
// School calendar — the athlete keeps test/exam and match dates up to date.
// The page only stores dates. The effect on readiness is decided by the
// engine (and the DB trigger, which uses the same rules):
//   exam  — from 3 days before up to the exam day: -15 readiness points
//   match — day before, match day, day after: Safety Guard block
// The subject is a label for the athlete and coach, it doesn't change the score.
// ---------------------------------------------------------------------------

type Kind = 'exam' | 'match';

type CalendarState = {
  examDates: string[];
  matchDates: string[];
  examSubjects: Record<string, string>;
};

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

const EXAM_WINDOW_DAYS = 3; // same as EXAM_WINDOW_DAYS in lib/readiness-engine.ts

// Same UTC date convention as /api/checkin and the engine.
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysFrom(today: string, date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CalendarPage() {
  const { t, lang } = useLanguage();
  const c = t.calendar;
  const reduce = useReducedMotion();

  const [cal, setCal] = useState<CalendarState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [kind, setKind] = useState<Kind>('exam');
  const [date, setDate] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile', { headers: await authHeaders() });
        if (!res.ok) throw new Error('load failed');
        const { profile } = (await res.json()) as { profile: Partial<CalendarState> };
        if (cancelled) return;
        setCal({
          examDates: profile.examDates ?? [],
          matchDates: profile.matchDates ?? [],
          examSubjects: profile.examSubjects ?? {},
        });
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: CalendarState) {
    if (!cal) return;
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
      setDate('');
      setSubject('');
    }
  }

  function handleRemove(k: Kind, d: string) {
    if (!cal) return;
    if (k === 'exam') {
      const subjects = { ...cal.examSubjects };
      delete subjects[d];
      save({ ...cal, examDates: cal.examDates.filter((x) => x !== d), examSubjects: subjects });
    } else {
      save({ ...cal, matchDates: cal.matchDates.filter((x) => x !== d) });
    }
  }

  const today = todayIso();
  const busy = status.kind === 'saving';

  // Keep an event in the list while it still affects today: an exam until its
  // day, a match until the day after (post-match block).
  const events = cal
    ? [
        ...cal.examDates.map((d) => ({ kind: 'exam' as const, date: d, diff: daysFrom(today, d) })),
        ...cal.matchDates.map((d) => ({ kind: 'match' as const, date: d, diff: daysFrom(today, d) })),
      ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind))
    : [];
  const upcoming = events.filter((e) => (e.kind === 'exam' ? e.diff >= 0 : e.diff >= -1));
  const pastCount = events.length - upcoming.length;

  const relative = (diff: number) =>
    diff === 0 ? c.today : diff === 1 ? c.tomorrow : diff === -1 ? c.yesterday : c.inDays(diff);

  const effect = (k: Kind, diff: number) => {
    if (k === 'exam') {
      return diff <= EXAM_WINDOW_DAYS
        ? { text: c.effectExamNow, color: HUB.amber, active: true }
        : { text: c.effectExamLater, color: '#71717A', active: false };
    }
    return diff <= 1
      ? { text: c.effectMatchNow, color: HUB.red, active: true }
      : { text: c.effectMatchLater, color: '#71717A', active: false };
  };

  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';
  const kinds: { key: Kind; label: string; icon: Icon }[] = [
    { key: 'exam', label: c.typeExam, icon: GraduationCap },
    { key: 'match', label: c.typeMatch, icon: Trophy },
  ];

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-4xl">
            {c.title}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{c.subtitle}</p>
        </header>

        {loadError && (
          <div className="mb-6 flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
            <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
            <span>{c.errLoad}</span>
          </div>
        )}

        {!cal && !loadError && (
          <div className="space-y-3" aria-busy>
            <p className="text-sm text-zinc-500">{c.loading}</p>
            <div className="h-40 animate-pulse rounded-3xl bg-white/[0.03]" />
          </div>
        )}

        {cal && (
          <div className="space-y-4">
            {/* Add form */}
            <section className={card}>
              <h2 className="mb-4 text-sm font-semibold text-zinc-200">{c.addTitle}</h2>

              <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label={c.addTitle}>
                {kinds.map(({ key, label, icon: IconCmp }) => {
                  const selected = kind === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setKind(key)}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium ring-1 ring-inset transition-colors ${
                        selected
                          ? 'bg-[#CCFF00]/[0.08] text-zinc-50 ring-[#CCFF00]/60'
                          : 'bg-white/[0.03] text-zinc-400 ring-white/[0.08] hover:text-zinc-200'
                      }`}
                    >
                      <IconCmp size={16} weight={selected ? 'fill' : 'regular'} className={selected ? 'text-[#CCFF00]' : ''} />
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <DatePicker value={date} onChange={setDate} placeholder={c.datePlaceholder} lang={lang} />

                {kind === 'exam' && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-zinc-400">{c.subjectLabel}</span>
                    <input
                      type="text"
                      value={subject}
                      maxLength={40}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={c.subjectPlaceholder}
                      className="h-12 w-full rounded-xl bg-white/[0.04] px-4 text-[15px] text-zinc-100 ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-[#CCFF00]/60"
                    />
                  </label>
                )}

                <motion.button
                  type="button"
                  onClick={handleAdd}
                  disabled={busy}
                  whileTap={reduce || busy ? undefined : { scale: 0.97 }}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#CCFF00] text-[15px] font-semibold text-zinc-950 transition-opacity disabled:opacity-60"
                >
                  <Plus size={16} weight="bold" />
                  {c.add}
                </motion.button>
              </div>

              <div className="mt-3 min-h-5 text-sm" aria-live="polite">
                {status.kind === 'saving' && <span className="text-zinc-400">{c.saving}</span>}
                {status.kind === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 text-zinc-300">
                    <CheckCircle size={16} weight="fill" style={{ color: HUB.lime }} />
                    {c.saved}
                  </span>
                )}
                {status.kind === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-zinc-200">
                    <WarningOctagon size={16} weight="fill" className="text-[#FF4D5E]" />
                    {status.message}
                  </span>
                )}
              </div>
            </section>

            {/* Upcoming events */}
            <section className={card}>
              <h2 className="mb-3 text-sm font-semibold text-zinc-200">{c.upcomingTitle}</h2>

              {upcoming.length === 0 ? (
                <p className="flex gap-2.5 text-sm leading-relaxed text-zinc-400">
                  <CalendarBlank size={18} className="mt-0.5 shrink-0 text-zinc-500" />
                  {c.empty}
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {upcoming.map((e) => {
                    const fx = effect(e.kind, e.diff);
                    const IconCmp = e.kind === 'exam' ? GraduationCap : Trophy;
                    const title =
                      e.kind === 'exam' ? cal.examSubjects[e.date] || c.examFallback : c.matchTitle;
                    return (
                      <li key={`${e.kind}-${e.date}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-200">
                          <IconCmp size={19} weight="fill" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-zinc-50">{title}</p>
                          <p className="text-xs text-zinc-400">
                            {formatDisplayDate(e.date, lang)} · {relative(e.diff)}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs" style={{ color: fx.active ? fx.color : '#A1A1AA' }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fx.color }} />
                            {fx.text}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(e.kind, e.date)}
                          disabled={busy}
                          aria-label={`${c.remove}: ${title}, ${formatDisplayDate(e.date, lang)}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 disabled:opacity-40"
                        >
                          <X size={15} weight="bold" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {pastCount > 0 && <p className="mt-4 text-xs text-zinc-500">{c.pastNote(pastCount)}</p>}
            </section>

            {/* How it works — same rules as the engine */}
            <section className={card}>
              <h2 className="mb-3 text-sm font-semibold text-zinc-200">{c.howTitle}</h2>
              <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-400">
                <li className="flex gap-2.5">
                  <GraduationCap size={16} className="mt-0.5 shrink-0" style={{ color: HUB.amber }} />
                  {c.howExam}
                </li>
                <li className="flex gap-2.5">
                  <Trophy size={16} className="mt-0.5 shrink-0" style={{ color: HUB.red }} />
                  {c.howMatch}
                </li>
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
