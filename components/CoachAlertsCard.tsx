'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { WarningOctagon, Warning, SpeakerHigh, SpeakerSlash, CheckCircle, Check } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { HUB } from '@/components/PerformancePanel';
import { addDays, todayUtc } from '@/lib/checkin-streak';
import {
  ALERT_COLUMNS,
  COACH_REACTIONS,
  coachAlertGroups,
  parseAlert,
  parseAlerts,
  shouldRing,
  upsertAlerts,
  type AlertGroup,
  type CoachAlert,
  type CoachReaction,
} from '@/lib/coach-alerts';
import {
  enableSound,
  playAlertTone,
  readSoundPref,
  soundReady,
  soundSupported,
  vibrateAlert,
  writeSoundPref,
} from '@/lib/alert-sound';

// ---------------------------------------------------------------------------
// Alerts on /coach (roadmap items 7 + 8). The database raises a row in
// coach_alerts when the engine finds pain or a red zone on a check-in
// (supabase/sql/10_coach_alerts.sql). This card:
//   - listens with Supabase Realtime (RLS applies: only the coach's team);
//   - falls back to checking every 10 s whenever Realtime is not connected,
//     so a live demo still works on bad Wi-Fi;
//   - rings (sound + vibration) only for an alert that arrives while the page
//     is open — alerts found on load are shown silently;
//   - lets the coach answer with one tap. The athlete sees the answer.
// A signal is not a diagnosis: the card never says what is wrong.
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };
const POLL_MS = 10_000;

export default function CoachAlertsCard({
  athleteIds,
  labelFor,
  onSelect,
  onNewAlert,
}: {
  athleteIds: readonly string[];
  labelFor: (athleteId: string) => string;
  onSelect: (athleteId: string) => void;
  /** Called after a new alert rang — the page refreshes its numbers. */
  onNewAlert?: (athleteId: string) => void;
}) {
  const { t, lang } = useLanguage();
  const a = t.alerts;
  const reduce = useReducedMotion();

  const [alerts, setAlerts] = useState<CoachAlert[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [live, setLive] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [canSound, setCanSound] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reactError, setReactError] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  // Refs so the Realtime handler (subscribed once) always sees current values.
  const knownIds = useRef(new Set<string>());
  const initialized = useRef(false);
  const liveRef = useRef(false);
  const soundOnRef = useRef(false);
  const rosterRef = useRef(new Set(athleteIds));
  const onNewAlertRef = useRef(onNewAlert);
  useEffect(() => {
    rosterRef.current = new Set(athleteIds);
    onNewAlertRef.current = onNewAlert;
    soundOnRef.current = soundOn;
  }, [athleteIds, onNewAlert, soundOn]);

  const today = todayUtc();
  const since = addDays(today, -1);

  const receive = useCallback((rows: CoachAlert[]) => {
    const ringing = initialized.current
      ? rows.filter((r) => rosterRef.current.has(r.athlete_id) && shouldRing(r, knownIds.current))
      : [];
    for (const r of rows) knownIds.current.add(r.id);
    setAlerts((prev) => upsertAlerts(prev ?? [], rows));

    const first = ringing[0];
    if (first) {
      if (soundOnRef.current && soundReady()) playAlertTone();
      vibrateAlert();
      setFreshKey(`${first.athlete_id}|${first.checkin_date}`);
      onNewAlertRef.current?.(first.athlete_id);
    }
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('coach_alerts')
      .select(ALERT_COLUMNS)
      .gte('checkin_date', addDays(todayUtc(), -1))
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      if (!initialized.current) setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    receive(parseAlerts(data));
    initialized.current = true;
  }, [receive]);

  // First load, Realtime, polling fallback, catch-up when the tab comes back.
  useEffect(() => {
    let cancelled = false;
    load();

    const channel = supabase
      .channel(`coach-alerts-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_alerts' }, (payload) => {
        if (cancelled) return;
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as { id?: unknown } | null)?.id;
          if (typeof oldId === 'string') setAlerts((prev) => (prev ? prev.filter((x) => x.id !== oldId) : prev));
          return;
        }
        const row = parseAlert(payload.new);
        if (row) receive([row]);
      })
      .subscribe((status) => {
        if (cancelled) return;
        const isLive = status === 'SUBSCRIBED';
        liveRef.current = isLive;
        setLive(isLive);
        // Anything that happened while we were connecting.
        if (isLive && initialized.current) load();
      });

    const poll = window.setInterval(() => {
      if (!liveRef.current && document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [load, receive]);

  // Sound: remembered choice comes back with the first tap on the page
  // (browsers do not allow sound before that).
  useEffect(() => {
    setCanSound(soundSupported());
    if (!readSoundPref()) return;
    const wake = (e: PointerEvent) => {
      // A tap on the sound button itself is handled by the button.
      if (e.target instanceof Element && e.target.closest('[data-sound-toggle]')) return;
      document.removeEventListener('pointerdown', wake);
      enableSound().then((ok) => setSoundOn(ok));
    };
    document.addEventListener('pointerdown', wake);
    return () => document.removeEventListener('pointerdown', wake);
  }, []);

  async function toggleSound() {
    if (soundOn) {
      setSoundOn(false);
      writeSoundPref(false);
      return;
    }
    const ok = await enableSound();
    setSoundOn(ok);
    writeSoundPref(ok);
    if (ok) playAlertTone(); // so the coach hears what it will sound like
  }

  async function react(group: AlertGroup, reaction: CoachReaction) {
    setBusyKey(group.key);
    setReactError(false);
    const { data, error } = await supabase.rpc('react_to_coach_alert', {
      p_alert_id: group.latestId,
      p_reaction: reaction,
    });
    if (error) {
      setReactError(true);
    } else {
      const rows = parseAlerts(Array.isArray(data) ? data : []);
      if (rows.length > 0) receive(rows);
      else load(); // someone (another coach) answered first — show that answer
    }
    setBusyKey(null);
  }

  const { open, answered } = alerts
    ? coachAlertGroups(alerts, new Set(athleteIds), since)
    : { open: [], answered: [] };

  // "(2) …" in the browser tab while alerts wait for an answer.
  useEffect(() => {
    if (open.length === 0) return;
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = `(${open.length}) ${base}`;
    return () => {
      document.title = base;
    };
  }, [open.length]);

  // Today: "18:42"; earlier: "вчера, 18:42" (the list only goes back one day).
  const time = (iso: string) => {
    const hhmm = new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' });
    return todayUtc(new Date(iso)) === today ? hhmm : a.yesterdayAt(hhmm);
  };
  const what = (g: AlertGroup) => (g.kind === 'pain' ? a.kindPain(g.painZone) : a.kindRed(g.score));

  if (loadFailed) return null; // table not there yet (SQL not run) — the rest of /coach still works

  return (
    <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.01em] text-zinc-50">{a.title}</h2>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${live && !reduce ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: live ? HUB.lime : HUB.amber }}
            />
            {live ? a.live : a.polling}
          </p>
        </div>
        {canSound && (
          <button
            type="button"
            onClick={toggleSound}
            data-sound-toggle
            aria-pressed={soundOn}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
              soundOn
                ? 'bg-[#CCFF00]/10 text-[#CCFF00] ring-[#CCFF00]/30'
                : 'bg-[#CCFF00] text-zinc-950 ring-transparent'
            }`}
          >
            {soundOn ? <SpeakerHigh size={14} weight="fill" /> : <SpeakerSlash size={14} weight="fill" />}
            {soundOn ? a.soundOn : a.soundOff}
          </button>
        )}
      </div>
      {canSound && !soundOn && <p className="mt-2 text-[11px] text-zinc-500">{a.soundHint}</p>}

      {!alerts && <div className="mt-4 h-14 animate-pulse rounded-2xl bg-white/[0.03]" aria-busy />}

      {alerts && open.length === 0 && (
        <p className="mt-4 inline-flex items-start gap-2 text-sm text-zinc-300">
          <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-[#CCFF00]" />
          {a.none}
        </p>
      )}

      {open.length > 0 && (
        <ul className="mt-4 space-y-2">
          {open.map((g) => {
            const color = g.kind === 'pain' ? HUB.red : HUB.amber;
            const KindIcon = g.kind === 'pain' ? WarningOctagon : Warning;
            const busy = busyKey === g.key;
            return (
              <motion.li
                key={g.key}
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className={`rounded-2xl p-3 ${freshKey === g.key && !reduce ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: `${color}14`, boxShadow: `inset 0 0 0 1px ${color}4D` }}
                onAnimationIteration={() => setFreshKey(null)}
              >
                <div className="flex items-start gap-2.5">
                  <KindIcon size={18} weight="fill" className="mt-0.5 shrink-0" style={{ color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <button
                        type="button"
                        onClick={() => onSelect(g.athleteId)}
                        className="font-semibold text-zinc-50 underline-offset-2 hover:underline"
                      >
                        {labelFor(g.athleteId)}
                      </button>
                      <span className="text-zinc-500"> · {time(g.latestAt)}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-300">{what(g)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {COACH_REACTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={busy}
                      onClick={() => react(g, r)}
                      className="rounded-xl bg-white/[0.06] px-3 py-2 text-left text-xs font-medium text-zinc-100 ring-1 ring-inset ring-white/[0.1] hover:bg-white/[0.1] disabled:opacity-50 sm:text-center"
                    >
                      {a.react[r]}
                    </button>
                  ))}
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      {reactError && <p className="mt-2 text-xs text-[#FF4D5E]">{a.reactError}</p>}

      {answered.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-zinc-500">{a.answeredTitle}</p>
          <ul className="space-y-1">
            {answered.map((g) => (
              <li key={g.key} className="flex items-start gap-2 text-xs text-zinc-400">
                <Check size={13} weight="bold" className="mt-0.5 shrink-0 text-[#CCFF00]" />
                <span>
                  <button type="button" onClick={() => onSelect(g.athleteId)} className="text-zinc-200 hover:underline">
                    {labelFor(g.athleteId)}
                  </button>
                  {' — '}
                  {g.reaction ? a.react[g.reaction] : ''}
                  {g.reactedAt ? ` · ${time(g.reactedAt)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{a.basis}</p>
    </section>
  );
}
