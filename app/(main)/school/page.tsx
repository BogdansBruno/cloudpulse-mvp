'use client';

// /school — the school nurse / administrator's screen (supabase/sql/16_school_role.sql).
// Reads ONLY through database functions: school_overview() (a traffic light per pupil, only for pupils
// who turned the safety switch on) and school_exam_load() (pupils per test day, only when 3 or more).
// There is no way to get scores, answers, pain location or trainings from here — the database has no
// policy for this role on those tables. Refreshes itself every 15 s and when the tab comes back.

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bandaids, Check, CheckCircle, Clock, Copy, LockSimple, ShieldCheck, ShieldWarning, Warning, WarningOctagon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { SCHOOL } from '@/lib/school-copy';
import { formatInviteCode } from '@/lib/invite';
import {
  STATE_COLOR,
  countStates,
  needsAttention,
  parseExamDay,
  parseSchoolRow,
  sortRows,
  stateOf,
  type ExamDay,
  type SchoolRow,
  type SchoolState,
} from '@/lib/school-view';

const REFRESH_MS = 15_000;
const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };
const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const;

type MySchool = { name: string; code: string; members: number };

const STATE_ICON: Record<SchoolState, Icon> = {
  pain: Bandaids,
  red: WarningOctagon,
  restricted: ShieldWarning,
  yellow: Warning,
  no_checkin: Clock,
  green: CheckCircle,
  locked: LockSimple,
};

export default function SchoolPage() {
  const { lang } = useLanguage();
  const c = SCHOOL[lang];
  const reduce = useReducedMotion();
  const [school, setSchool] = useState<MySchool | null | undefined>(undefined); // undefined = loading, null = none yet
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [exams, setExams] = useState<ExamDay[]>([]);
  const [error, setError] = useState<'load' | 'notrun' | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const mine = await supabase.rpc('my_school');
    if (mine.error) {
      // 42883 / PGRST202: the function does not exist — SQL 16 has not been run yet
      const notRun = mine.error.code === '42883' || mine.error.code === 'PGRST202' || /does not exist|schema cache/i.test(mine.error.message ?? '');
      setError(notRun ? 'notrun' : 'load');
      return;
    }
    setError(null);
    const first = ((mine.data as Record<string, unknown>[] | null) ?? [])[0];
    if (!first) {
      setSchool(null);
      return;
    }
    setSchool({ name: String(first.school_name ?? ''), code: String(first.invite_code ?? ''), members: Number(first.members ?? 0) });
    const [ov, ex] = await Promise.all([supabase.rpc('school_overview'), supabase.rpc('school_exam_load')]);
    if (ov.error) {
      setError('load');
      return;
    }
    setRows(sortRows(((ov.data as unknown[] | null) ?? []).flatMap((r) => parseSchoolRow(r) ?? [])));
    setExams(ex.error ? [] : ((ex.data as unknown[] | null) ?? []).flatMap((r) => parseExamDay(r) ?? []));
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(onVisible, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [load]);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const { error: e } = await supabase.rpc('create_school', { p_name: name.trim() });
    setBusy(false);
    if (e) {
      setError('load');
      return;
    }
    setName('');
    load();
  }

  async function newCode() {
    if (busy) return;
    setBusy(true);
    await supabase.rpc('regenerate_school_invite');
    setBusy(false);
    load();
  }

  async function copyCode() {
    if (!school) return;
    try {
      await navigator.clipboard.writeText(formatInviteCode(school.code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the code is on screen
    }
  }

  const counts = countStates(rows);
  const attention = needsAttention(counts);
  const card = 'rounded-3xl border border-white/[0.07] bg-[#12151B] p-5';
  const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <div className="relative mx-auto w-full max-w-lg px-4 py-8 md:py-12">
      <header className="mb-6">
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white md:text-4xl">{c.title}</h1>
        <p className="mt-1 text-sm text-white/60">{c.subtitle}</p>
      </header>

      {error && (
        <div className="mb-5 flex gap-3 rounded-2xl bg-[#FF3D5A]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF3D5A]/30" role="alert">
          <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF3D5A]" />
          <span>{error === 'notrun' ? c.errNotRun : c.errLoad}</span>
        </div>
      )}

      {school === undefined && !error && (
        <div className="space-y-3" aria-busy>
          <p className="text-sm text-white/50">{c.loading}</p>
          <div className="h-36 animate-pulse rounded-3xl bg-white/[0.03]" />
        </div>
      )}

      {school === null && !error && (
        <section className={card}>
          <h2 className="text-lg font-semibold text-white">{c.createTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/60">{c.createBody}</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder={c.createName}
              aria-label={c.createName}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/40 focus:border-[#B8F23C]/60 focus:outline-none"
            />
            <button type="submit" disabled={busy || !name.trim()} className="np-btn-primary h-12 shrink-0 rounded-full px-5 text-sm font-bold disabled:opacity-50">
              {c.createButton}
            </button>
          </form>
        </section>
      )}

      {school && (
        <div className="space-y-4">
          {/* top-priority banner */}
          <AnimatePresence initial={false}>
            {rows.length > 0 && (
              <motion.div
                key={attention > 0 ? 'attention' : 'calm'}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
                role={attention > 0 ? 'alert' : 'status'}
                className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ring-inset ${
                  attention > 0 ? 'bg-[#FF3D5A]/[0.1] ring-[#FF3D5A]/40' : 'bg-[#B8F23C]/[0.06] ring-[#B8F23C]/25'
                }`}
              >
                {attention > 0 ? (
                  <WarningOctagon size={22} weight="fill" className="shrink-0 text-[#FF3D5A]" />
                ) : (
                  <ShieldCheck size={22} weight="fill" className="shrink-0 text-[#B8F23C]" />
                )}
                <p className="text-[15px] font-semibold text-white">{attention > 0 ? c.attention(attention) : c.allCalm}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* the code */}
          <section className={card}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{school.name}</p>
                <h2 className="mt-1 text-base font-semibold text-white">{c.codeTitle}</h2>
              </div>
              <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70">{c.members(school.members)}</span>
            </div>
            <p className="np-num mt-3 select-all text-[32px] font-semibold leading-none tracking-[0.08em] text-[#B8F23C]">{formatInviteCode(school.code)}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{c.codeHint}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={copyCode} className="np-btn-glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold">
                {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
                {copied ? c.copied : c.copy}
              </button>
              <button type="button" onClick={newCode} disabled={busy} className="np-btn-glass inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold disabled:opacity-50">
                {c.newCode}
              </button>
            </div>
          </section>

          {/* the board */}
          <section className={card}>
            <h2 className="mb-4 text-lg font-semibold text-white">{c.boardTitle}</h2>
            {rows.length === 0 && <p className="text-sm leading-relaxed text-white/60">{c.emptyBoard}</p>}
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {rows.map((r, i) => {
                  const st = stateOf(r);
                  // labels are chosen by pupils and may repeat: number the repeats so keys stay unique and stable
                  const key = `${r.label}#${rows.slice(0, i).filter((x) => x.label === r.label).length}`;
                  const color = STATE_COLOR[st];
                  const IconCmp = STATE_ICON[st];
                  return (
                    <motion.li
                      key={key}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={SPRING}
                      className="flex items-start gap-3 rounded-2xl p-3 ring-1 ring-inset"
                      style={{ backgroundColor: st === 'locked' ? 'rgba(255,255,255,0.03)' : `${color}14`, boxShadow: `inset 0 0 0 1px ${st === 'locked' ? 'rgba(255,255,255,0.08)' : `${color}40`}` }}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: st === 'locked' ? 'rgba(255,255,255,0.06)' : color, color: st === 'locked' ? '#9AA7B8' : '#0B0D11' }}>
                        <IconCmp size={20} weight="fill" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-white">{r.label}</p>
                        <p className="text-sm font-medium" style={{ color }}>
                          {c.state[st]}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-white/55">{st === 'locked' ? c.lockedBody : c.stateHint[st]}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>

          {/* tests */}
          <section className={card}>
            <h2 className="text-lg font-semibold text-white">{c.examTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-white/60">{c.examBody}</p>
            {exams.length === 0 ? (
              <p className="mt-3 text-sm text-white/45">{c.examEmpty}</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {exams.map((e) => (
                  <li key={e.day} className="flex items-center justify-between py-2.5 text-[15px] text-white">
                    <span>{day(e.day)}</span>
                    <span className="np-num rounded-full bg-[#FFC53D]/15 px-3 py-1 text-sm font-semibold text-[#FFC53D]">{c.examDay(e.athletes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* privacy */}
          <section className={card}>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <LockSimple size={18} weight="fill" className="text-white/60" />
              {c.privacyTitle}
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-white/65">
              {c.privacy.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/40" />
                  {p}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-white/45">{c.disclaimer}</p>
    </div>
  );
}
