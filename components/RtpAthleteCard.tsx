'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowCounterClockwise, CheckCircle, Circle, WarningOctagon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { HUB } from '@/components/PerformancePanel';
import { addDays, todayUtc } from '@/lib/checkin-streak';
import { SYNCED_EVENT } from '@/lib/offline-queue';
import { cardClass, CARD_THEME } from '@/components/np/cardTheme';
import {
  RTP_CLEAN_DAYS_REQUIRED,
  RTP_LOOKBACK_DAYS,
  RTP_TRENDS,
  parseClearances,
  parseFollowups,
  parseRtpCheckins,
  returnToPlayStatus,
  type RtpStatus,
  type RtpTrend,
} from '@/lib/return-to-play';

// ---------------------------------------------------------------------------
// Athlete side of Return-to-Play (lib/return-to-play.ts, SQL 11). Shown on
// the check-in result screen and on /progress while there is an open episode
// after pain: three steps (pain → 2 days without pain → coach confirms), and
// on day +1 / +3 two short follow-up questions. Hidden on ordinary days.
// Not a medical clearance — the card says so.
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function RtpAthleteCard({ className = '' }: { className?: string }) {
  const { t, lang } = useLanguage();
  const r = t.rtp;
  const reduce = useReducedMotion();

  const [uid, setUid] = useState<string | null>(null);
  const [status, setStatus] = useState<RtpStatus | null>(null);
  const [trend, setTrend] = useState<RtpTrend | null>(null);
  const [saw, setSaw] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [saidWorse, setSaidWorse] = useState(false);

  const load = useCallback(async (userId: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const today = todayUtc();
    const since = addDays(today, -RTP_LOOKBACK_DAYS);
    const [c, cl, f] = await Promise.all([
      supabase.from('checkins').select('user_id, date, pain_flag, pain_zone').eq('user_id', userId).gte('date', since).lte('date', today),
      supabase.from('rtp_clearances').select('athlete_id, pain_date, cleared_at').eq('athlete_id', userId).gte('pain_date', since),
      supabase
        .from('rtp_followups')
        .select('athlete_id, pain_date, day_offset, trend, saw_specialist, answered_at')
        .eq('athlete_id', userId)
        .gte('pain_date', since),
    ]);
    // RTP tables missing (SQL 11 not run yet) or offline: show nothing.
    if (c.error || cl.error || f.error) return;
    setStatus(returnToPlayStatus(parseRtpCheckins(c.data), parseClearances(cl.data), parseFollowups(f.data), today));
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUid(data.session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    load(uid);
    // The coach's confirmation arrives live.
    const channel = supabase
      .channel(`rtp-athlete-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rtp_clearances', filter: `athlete_id=eq.${uid}` },
        () => load(uid)
      )
      .subscribe();
    const onSynced = () => load(uid);
    window.addEventListener(SYNCED_EVENT, onSynced);
    return () => {
      window.removeEventListener(SYNCED_EVENT, onSynced);
      supabase.removeChannel(channel);
    };
  }, [uid, load]);

  if (!uid || !status || status.state === 'none') return null;

  const today = todayUtc();
  // A confirmation stays visible for the day it happened and the next one.
  if (status.state === 'cleared' && (!status.clearedAt || todayUtc(new Date(status.clearedAt)) < addDays(today, -1))) {
    return null;
  }

  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  async function send() {
    if (!status || status.state === 'none' || !status.dueFollowup || !trend || saw === null) return;
    setSending(true);
    setSendError(false);
    const { error } = await supabase.rpc('answer_rtp_followup', {
      p_pain_date: status.painDate,
      p_day_offset: status.dueFollowup,
      p_trend: trend,
      p_saw_specialist: saw,
    });
    setSending(false);
    if (error) {
      setSendError(true);
      return;
    }
    setSaidWorse(trend === 'worse');
    setTrend(null);
    setSaw(null);
    if (uid) load(uid);
  }

  const cleanDone = status.cleanDays >= RTP_CLEAN_DAYS_REQUIRED;
  const cleared = status.state === 'cleared';
  const accent = cleared ? HUB.lime : status.state === 'ready' ? HUB.amber : HUB.red;

  const steps: { label: string; done: boolean; detail?: string }[] = [
    { label: r.stepPain, done: true, detail: day(status.painDate) },
    { label: r.stepClean, done: cleanDone, detail: r.cleanProgress(status.cleanDays, RTP_CLEAN_DAYS_REQUIRED) },
    { label: r.stepCoach, done: cleared },
  ];

  const chip = (active: boolean) =>
    `rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
      active ? 'bg-white/[0.14] text-zinc-50 ring-white/40' : 'bg-white/[0.04] text-zinc-200 ring-white/[0.1] hover:bg-white/[0.08]'
    }`;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
      className={`${cardClass('stress')} p-5 ${className}`}
      aria-label={r.title}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06]">
          <ArrowCounterClockwise size={18} weight="bold" style={{ color: CARD_THEME.stress.accent }} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-widest text-white/75">{r.painOn(day(status.painDate), status.painZone)}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {cleared ? r.stepCoach : status.state === 'ready' ? r.stepClean : r.stepPain}
          </p>
        </div>
      </div>
      <p className="np-editorial mt-4 text-[28px] leading-tight">{r.title}</p>

      <ol className="mt-4 grid grid-cols-3 gap-2">
        {steps.map((s) => (
          <li key={s.label} className={`rounded-2xl border p-2.5 ${s.done ? 'border-white/[0.1] bg-white/[0.05]' : 'border-white/[0.06] bg-black/20'}`}>
            {s.done ? (
              <CheckCircle size={16} weight="fill" style={{ color: s.label === r.stepPain ? HUB.red : HUB.lime }} />
            ) : (
              <Circle size={16} className="text-white/30" />
            )}
            <p className="mt-1 text-[12px] font-medium leading-tight text-zinc-100">{s.label}</p>
            {s.detail && <p className="mt-0.5 text-[11px] leading-tight text-white/75">{s.detail}</p>}
          </li>
        ))}
      </ol>

      <p className="mt-3 text-sm leading-relaxed text-zinc-200">
        {cleared && status.clearedAt
          ? r.stateCleared(day(todayUtc(new Date(status.clearedAt))))
          : status.state === 'ready'
            ? r.stateReady
            : r.stateRestricted(RTP_CLEAN_DAYS_REQUIRED)}
      </p>

      {status.dueFollowup && (
        <div className="mt-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/[0.08]">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/75">{r.followupTitle(status.dueFollowup)}</p>
          <p className="mt-2 text-sm text-zinc-100">{r.qTrend(status.painZone)}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label={r.qTrend(status.painZone)}>
            {RTP_TRENDS.map((tr) => (
              <button key={tr} type="button" aria-pressed={trend === tr} onClick={() => setTrend(tr)} className={chip(trend === tr)}>
                {r.trend[tr]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-100">{r.qSpecialist}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label={r.qSpecialist}>
            <button type="button" aria-pressed={saw === true} onClick={() => setSaw(true)} className={chip(saw === true)}>
              {r.yes}
            </button>
            <button type="button" aria-pressed={saw === false} onClick={() => setSaw(false)} className={chip(saw === false)}>
              {r.notYet}
            </button>
          </div>
          <button
            type="button"
            onClick={send}
            disabled={!trend || saw === null || sending}
            className="np-btn-glass mt-3 h-11 w-full rounded-full text-sm font-semibold disabled:opacity-40"
          >
            {r.send}
          </button>
          {sendError && <p className="mt-2 text-xs text-[#FF3B30]">{r.sendError}</p>}
        </div>
      )}

      {saidWorse && (
        <p className="mt-3 flex gap-2 rounded-2xl bg-[#FF3B30]/[0.08] p-3 text-sm leading-relaxed text-zinc-200 ring-1 ring-inset ring-[#FF3B30]/30">
          <WarningOctagon size={16} weight="fill" className="mt-0.5 shrink-0 text-[#FF3B30]" />
          {r.worseNote}
        </p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-white/75">
        {status.state === 'restricted' && `${r.noCheckinNote} `}
        {r.disclaimer}
      </p>
    </motion.section>
  );
}
