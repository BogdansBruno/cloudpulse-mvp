'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChatCircleText, BellRinging } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { HUB } from '@/components/PerformancePanel';
import { todayUtc } from '@/lib/checkin-streak';
import { SYNCED_EVENT } from '@/lib/offline-queue';
import { cardClass, CARD_THEME } from '@/components/np/cardTheme';
import { ALERT_COLUMNS, athleteAlertStatus, parseAlert, parseAlerts, upsertAlerts, type CoachAlert } from '@/lib/coach-alerts';

// ---------------------------------------------------------------------------
// Athlete side of the coach alert (supabase/sql/10_coach_alerts.sql).
// After a check-in with pain or a red zone the athlete sees, honestly, that
// the coach has been notified — and then the coach's one-tap answer, live.
// Nothing is shown when there is no alert today (most days), or when the
// athlete has no coach (the database raises no alert then).
// Reads only the athlete's own rows (RLS: coach_alerts_athlete_view_own).
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };
const POLL_MS = 15_000;

export default function CoachReplyCard({ className = '' }: { className?: string }) {
  const { t, lang } = useLanguage();
  const a = t.alerts;
  const reduce = useReducedMotion();
  const [uid, setUid] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<CoachAlert[]>([]);
  const liveRef = useRef(false);
  const today = todayUtc();

  const load = useCallback(async (userId: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const { data, error } = await supabase
      .from('coach_alerts')
      .select(ALERT_COLUMNS)
      .eq('athlete_id', userId)
      .eq('checkin_date', todayUtc());
    if (!error) setAlerts(parseAlerts(data));
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id ?? null;
      if (!cancelled) setUid(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    load(uid);

    const channel = supabase
      .channel(`coach-reply-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coach_alerts', filter: `athlete_id=eq.${uid}` },
        (payload) => {
          if (cancelled) return;
          const row = parseAlert(payload.new);
          if (row) setAlerts((prev) => upsertAlerts(prev, [row]));
        }
      )
      .subscribe((status) => {
        liveRef.current = status === 'SUBSCRIBED';
      });

    // Fallback when Realtime is not connected; also after an offline check-in
    // was sent (it may have raised an alert).
    const poll = window.setInterval(() => {
      if (!liveRef.current && document.visibilityState === 'visible') load(uid);
    }, POLL_MS);
    const onSynced = () => load(uid);
    window.addEventListener(SYNCED_EVENT, onSynced);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener(SYNCED_EVENT, onSynced);
      supabase.removeChannel(channel);
    };
  }, [uid, load]);

  if (!uid) return null;
  const status = athleteAlertStatus(alerts, uid, today);
  if (status.state === 'none') return null;

  const card = `p-5 ${className}`;

  if (status.state === 'waiting') {
    return (
      <div className={`${card} ${cardClass('activity')}`} role="status">
        <p className="flex items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06]">
            <BellRinging size={18} weight="fill" style={{ color: CARD_THEME.activity.accent }} />
          </span>
          <span className="np-editorial text-[22px] leading-tight">{a.replyWaitingTitle}</span>
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${reduce ? '' : 'animate-pulse'}`}
            style={{ backgroundColor: HUB.amber }}
          />
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/75">{a.replyWaiting(status.kind)}</p>
      </div>
    );
  }

  const at = new Date(status.reactedAt).toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' });
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
      className={`${card} ${cardClass('readiness')}`}
      role="status"
    >
      <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-widest text-white/75">
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06]">
          <ChatCircleText size={18} weight="fill" style={{ color: CARD_THEME.readiness.accent }} />
        </span>
        {a.replyTitle(at)}
      </p>
      <p className="np-editorial mt-3 text-[22px] leading-snug">{a.reply[status.reaction]}</p>
    </motion.div>
  );
}
