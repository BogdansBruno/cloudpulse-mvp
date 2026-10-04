'use client';

// components/CheckinForm.tsx — the morning check-in, v3 "Night Performance".
//
// Five cards, one question per card: Sleep → Fatigue → Stress → Body (soreness, pain, optional
// muscle map) → Load (today's session). A live readiness preview stays on top while the athlete
// answers: it runs the SAME pure engine (lib/readiness-engine.ts) in the browser on the athlete's
// own sessions and check-ins, so the number before "send" is the number after it. If those inputs
// cannot be loaded (offline, signed out) there is NO preview number — never an invented one.
//
// Unchanged on purpose: the payload, POST /api/checkin, the offline queue (lib/offline-queue.ts),
// the pain rule, the result checks (safety violations, penalties, inconsistency flags).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Moon, Brain, Lightning, Barbell, WarningOctagon, Info, ArrowRight, ArrowLeft, Bandaids, PersonSimpleRun, CloudCheck, Person } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { calculateReadiness, sessionLoad } from '@/lib/readiness-engine';
import type { DailyCheckin, Penalty, ReadinessResult as EngineResult, SafetyViolation, InconsistencyFlag } from '@/lib/readiness-engine';
import { baselineDelta, loadIndex, targetLoadRange, usualDailyLoad } from '@/lib/load-index';
import type { ReadinessHistoryResponse } from '@/lib/types/readiness';
import { translatePenalty, translateViolation, translateInconsistency } from '@/lib/engine-i18n';
import CheckinStreakCard from '@/components/CheckinStreakCard';
import CoachReplyCard from '@/components/CoachReplyCard';
import RtpAthleteCard from '@/components/RtpAthleteCard';
import ReadinessRing from '@/components/np/ReadinessRing';
import ScoreDial from '@/components/np/ScoreDial';
import { ZONE } from '@/components/np/ui';
import { NP, LOCALE } from '@/components/np/copy';
import { APP } from '@/components/np/appCopy';
import SorenessSilhouette from '@/adp/src/components/SorenessSilhouette';
import { COACH_LABELS } from '@/adp/src/components/labels';
import { CHECKIN_EVENT } from '@/lib/use-today-plan';
import type { SorenessMap } from '@/adp/src/components/sorenessMap';
import { todayUtc } from '@/lib/checkin-streak';
import {
  enqueueCheckin,
  removeFromQueue,
  makeQueuedCheckin,
  storedUserId,
  isNetworkError,
  withTimeout,
  QUEUE_EVENT,
  type CheckinPayload,
} from '@/lib/offline-queue';

type ScaleField = 'sleepQuality' | 'stress' | 'fatigue' | 'soreness';

type ReadinessResult = {
  score: number;
  zone: 'green' | 'yellow' | 'red';
  acwr: number | null;
  chronicLoad?: number;
  penalties: Penalty[];
  inconsistencyFlags: InconsistencyFlag[];
  isPainBlocked: boolean;
};

type CheckinApiResponse = {
  readiness: ReadinessResult;
  safetyViolations: SafetyViolation[];
  /** null = no map sent; false = check-in saved but the map was not. */
  sorenessSaved?: boolean | null;
};

const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const;

// With a weak signal (locker room) a request can hang instead of failing.
// After this long we stop waiting and save the check-in on the phone instead.
// If the request did get through, the later resend just upserts the same row.
const SUBMIT_TIMEOUT_MS = 12_000;

const DURATION_PRESETS = [30, 45, 60, 90, 120];
const STEPS = ['sleep', 'fatigue', 'stress', 'body', 'load'] as const;
type Step = (typeof STEPS)[number];
const LAST = STEPS.length - 1;

const GOOD = '#00E676';
const WARN = '#FFD600';
const DANGER = '#FF3D00';
const STRAIN = '#2979FF';

// All four Hooper scales run 1-7 with 7 = best, so the fill colour reads the
// same way on every card. Colour is always backed by the number and labels.
function bandColor(value: number, max: number) {
  const r = value / max;
  if (r <= 2 / 7) return DANGER;
  if (r <= 4 / 7) return WARN;
  return GOOD;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Tappable / draggable segmented scale. Tracks the pointer 1:1 while pressed,
// and every segment is also a keyboard-focusable radio.
// ---------------------------------------------------------------------------
function SegmentScale({
  value,
  max,
  onChange,
  label,
  colorFor,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  colorFor: (v: number, max: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const color = colorFor(value, max);

  const valueFromX = (clientX: number) => {
    const el = ref.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(max, Math.max(1, Math.ceil(ratio * max)));
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className="flex touch-pan-y select-none gap-1"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(valueFromX(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging.current) onChange(valueFromX(e.clientX));
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n}/${max}`}
            onClick={() => onChange(n)}
            className="h-12 min-w-0 flex-1 rounded-np-ctrl transition-[background-color,box-shadow,opacity] duration-150"
            style={{
              backgroundColor: filled ? color : 'rgb(255 255 255 / 0.06)',
              opacity: filled && n !== value ? 0.55 : 1,
              boxShadow: n === value ? `0 0 18px -4px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function BigValue({ value, max }: { value: number; max: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="relative inline-block h-[1em] min-w-[1ch] overflow-hidden text-4xl np-num text-np-text">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="block"
            initial={reduce ? { opacity: 0 } : { y: '60%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: '-60%', opacity: 0 }}
            transition={reduce ? { duration: 0.1 } : SPRING}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-sm text-np-text-3">/{max}</span>
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  icon: IconCmp,
  activeColor,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon: Icon;
  activeColor: string;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-np-ctrl py-3 text-left"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-np-text-3 transition-colors"
        style={{ color: checked ? activeColor : undefined }}
      >
        <IconCmp size={18} weight={checked ? 'fill' : 'regular'} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-np-text">{label}</span>
      <span
        className={`flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[3px] transition-colors ${checked ? 'justify-end' : 'justify-start bg-white/15'}`}
        style={{ backgroundColor: checked ? activeColor : undefined }}
      >
        <motion.span
          layout
          transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.3 }}
          className="h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.35)]"
        />
      </span>
    </button>
  );
}

function Notice({ tone, icon: IconCmp, children }: { tone: 'danger' | 'info'; icon: Icon; children: React.ReactNode }) {
  return (
    <div
      className={`flex gap-3 rounded-np-card border p-4 text-sm leading-relaxed ${
        tone === 'danger' ? 'border-np-danger/35 bg-np-danger/10 text-np-text' : 'border-np-line bg-np-surface text-np-text-2'
      }`}
    >
      <IconCmp size={18} weight={tone === 'danger' ? 'fill' : 'regular'} className={`mt-0.5 shrink-0 ${tone === 'danger' ? 'text-np-danger' : 'text-np-text-3'}`} aria-hidden />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

const SHELL = 'mx-auto w-full max-w-lg px-4 py-6 md:py-10';

export default function CheckinForm({ onSubmitted }: { onSubmitted?: () => void } = {}) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const np = NP[lang];
  const app = APP[lang].checkin;
  const nf = new Intl.NumberFormat(LOCALE[lang]);

  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [values, setValues] = useState<Record<ScaleField, number>>({
    sleepQuality: 4,
    stress: 4,
    fatigue: 4,
    soreness: 4,
  });
  const [painFlag, setPainFlag] = useState(false);
  const [painZone, setPainZone] = useState('');
  const [trainedToday, setTrainedToday] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(60);
  // Optional step: where exactly it is tight (ADP soreness silhouette).
  const [markMuscles, setMarkMuscles] = useState(false);
  const [sorenessMap, setSorenessMap] = useState<SorenessMap>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinApiResponse | null>(null);
  // Baseline of the athlete's own earlier check-in scores (for "−6 vs average" on the result).
  const [earlierScores, setEarlierScores] = useState<number[]>([]);
  // Engine inputs for the live preview; null while loading or when they cannot be loaded.
  const [engineInputs, setEngineInputs] = useState<ReadinessHistoryResponse['raw'] | null>(null);
  // Set when there was no network and the check-in went to the offline queue.
  const [offlineSaved, setOfflineSaved] = useState<{ date: string; pain: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/checkin?days=29&raw=1', { headers: await authHeader() });
        if (!res.ok) return;
        const data: ReadinessHistoryResponse = await res.json();
        if (cancelled) return;
        if (data.raw) setEngineInputs(data.raw);
        const today = todayUtc();
        setEarlierScores((data.history ?? []).filter((p) => p.hasCheckin && p.date < today).map((p) => p.score));
      } catch {
        // offline or signed out: no preview, the form still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live preview = the engine on the athlete's own data plus the answers given so far.
  const preview = useMemo<EngineResult | null>(() => {
    if (!engineInputs) return null;
    try {
      const date = todayUtc();
      const draft: DailyCheckin = { date, ...values, painFlag };
      const sessions = [...engineInputs.sessions, ...(trainedToday ? [{ date, rpe, durationMinutes }] : [])];
      const checkins = [...engineInputs.checkins.filter((c) => c.date !== date), draft];
      return calculateReadiness(sessions, checkins, date, engineInputs.context);
    } catch {
      return null;
    }
  }, [engineInputs, values, painFlag, trainedToday, rpe, durationMinutes]);

  function setScale(field: ScaleField, value: number) {
    setValues((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }));
  }

  function goTo(n: number) {
    const next = Math.max(0, Math.min(LAST, n));
    setStep(next);
    setReached((r) => Math.max(r, next));
  }

  // No network: keep the answers on the phone. OfflineSync (in the main
  // layout) sends them with this day's date once the connection is back.
  // Uses the user id supabase-js already stored, not getSession(), which would
  // try to refresh an expired token over a network that isn't there.
  function saveOffline(payload: CheckinPayload) {
    try {
      const store = window.localStorage;
      const uid = storedUserId(store, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
      if (!uid) {
        setError(t.offline.needLogin);
        return;
      }
      const date = todayUtc();
      enqueueCheckin(store, makeQueuedCheckin(uid, date, payload));
      window.dispatchEvent(new Event(QUEUE_EVENT));
      setOfflineSaved({ date, pain: payload.painFlag });
    } catch {
      setError(t.onboarding.errGeneric);
    }
  }

  // A fresh online check-in replaces today's queued offline one, so a late
  // sync can't overwrite the newer answers with the older ones.
  function dropQueuedToday() {
    try {
      const store = window.localStorage;
      const uid = storedUserId(store, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
      if (!uid) return;
      removeFromQueue(store, [`${uid}:${todayUtc()}`]);
      window.dispatchEvent(new Event(QUEUE_EVENT));
    } catch {
      // storage unavailable: nothing was queued either
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    const payload: CheckinPayload = {
      ...values,
      painFlag,
      painZone: painFlag && painZone.trim() ? painZone.trim() : undefined,
      session: trainedToday ? { rpe, durationMinutes } : undefined,
      sorenessZones: markMuscles ? sorenessMap.map((z) => ({ ...z })) : undefined,
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      saveOffline(payload);
      setSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    try {
      // Attach the Supabase session when one exists, otherwise the server
      // falls back to its dev-mode bypass.
      const { data: sessionData } = await withTimeout(supabase.auth.getSession(), SUBMIT_TIMEOUT_MS);
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.content || 'Could not submit check-in');
      }

      const data: CheckinApiResponse = await res.json();
      dropQueuedToday();
      setResult(data);
      window.dispatchEvent(new Event(CHECKIN_EVENT));
      onSubmitted?.();
    } catch (err) {
      if (isNetworkError(err)) saveOffline(payload);
      else setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
    }
  }

  const reveal = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, height: 0 },
    animate: reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' },
    exit: reduce ? { opacity: 0 } : { opacity: 0, height: 0 },
    transition: SPRING,
  };

  // ------------------------------------------------------- saved offline
  if (offlineSaved) {
    const day = new Date(`${offlineSaved.date}T12:00:00Z`).toLocaleDateString(LOCALE[lang], {
      day: 'numeric',
      month: 'long',
    });
    return (
      <div className={SHELL}>
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-3">
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-np-strain/15 text-np-strain-light">
              <CloudCheck size={40} weight="fill" aria-hidden />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-np-text" style={{ fontFamily: 'inherit' }}>
              {t.offline.savedTitle}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-np-text-2">{t.offline.savedBody(day)}</p>
          </div>
          {offlineSaved.pain && (
            <Notice tone="danger" icon={WarningOctagon}>
              {t.offline.painNote}
            </Notice>
          )}
          <Notice tone="info" icon={Info}>
            {t.offline.noScore}
          </Notice>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------- result
  if (result) {
    const r = result.readiness;
    const target = r.isPainBlocked ? null : targetLoadRange(r.score);
    const delta = baselineDelta(r.score, earlierScores);
    const sessionIndex = trainedToday ? loadIndex(sessionLoad(rpe, durationMinutes), usualDailyLoad(r.chronicLoad ?? null)) : null;
    return (
      <div className={SHELL}>
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-3">
          <div className="pb-2 pt-2">
            <ReadinessRing lang={lang} score={r.score} zone={r.zone} delta={delta} size={224} />
          </div>

          {result.safetyViolations.map((v, i) => (
            <Notice key={`v${i}`} tone="danger" icon={WarningOctagon}>
              {translateViolation(t, v)}
            </Notice>
          ))}

          {r.inconsistencyFlags.map((flag, i) => (
            <Notice key={`f${i}`} tone="info" icon={Info}>
              {translateInconsistency(t, flag)}
            </Notice>
          ))}

          {/* today's load target (ADP Load Index corridor from the engine's readiness) */}
          <section className="np-card p-4" aria-labelledby="ck-target">
            <p id="ck-target" className="np-overline">
              {app.doneTarget}
            </p>
            {target ? (
              <>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <span className="np-num text-5xl" style={{ color: STRAIN }}>
                    {app.doneTargetBody(target.from, target.to)}
                  </span>
                  <span className="text-sm text-np-text-3">{app.doneTargetOf}</span>
                </p>
                {sessionIndex !== null && (
                  <p className="mt-2 text-sm text-np-text-2">
                    <span className="np-pill np-pill-strain mr-2">{np.load.title}</span>
                    {nf.format(sessionIndex)} / 100 · {np.load.zones[sessionIndex <= 40 ? 'light' : sessionIndex <= 75 ? 'optimal' : 'overload']}
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-np-text-3">{app.doneTargetScale}</p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-np-text-2">{app.doneTargetPain}</p>
            )}
          </section>

          {r.penalties.length > 0 && (
            <section className="np-card p-4">
              <p className="np-overline mb-3">{t.checkin.whyScore}</p>
              <ul className="space-y-2">
                {r.penalties.map((p, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 text-sm">
                    <span className="min-w-0 text-np-text-2">{translatePenalty(t, p)}</span>
                    <span className="np-num shrink-0 text-sm text-np-text-3">−{p.points}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.sorenessSaved === false && (
            <Notice tone="info" icon={Info}>
              {t.checkin.sorenessMapNotSaved}
            </Notice>
          )}

          <CoachReplyCard className="mt-3" />
          <RtpAthleteCard className="mt-3" />
          <CheckinStreakCard showCta={false} className="mt-3" />

          <div className="space-y-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="np-btn-primary inline-flex h-14 w-full items-center justify-center gap-2 rounded-np-card text-base font-bold"
            >
              {t.checkin.toPlan}
              <ArrowRight size={18} weight="bold" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => router.push('/training')}
              className="np-btn-glass inline-flex h-12 w-full items-center justify-center gap-2 rounded-np-card text-sm font-semibold"
            >
              {COACH_LABELS[lang].title}
              <ArrowRight size={16} weight="bold" aria-hidden />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ------------------------------------------------------------------ form
  const stepKey: Step = STEPS[step];
  const stepTitles: Record<Step, string> = {
    sleep: t.checkin.sleep,
    fatigue: t.checkin.fatigue,
    stress: t.checkin.stress,
    body: t.checkin.soreness,
    load: t.checkin.trainedToday,
  };
  const scaleCopy: Record<Exclude<Step, 'load'>, { field: ScaleField; low: string; high: string; icon: Icon }> = {
    sleep: { field: 'sleepQuality', low: t.checkin.sleepLow, high: t.checkin.sleepHigh, icon: Moon },
    fatigue: { field: 'fatigue', low: t.checkin.fatigueLow, high: t.checkin.fatigueHigh, icon: Lightning },
    stress: { field: 'stress', low: t.checkin.stressLow, high: t.checkin.stressHigh, icon: Brain },
    body: { field: 'soreness', low: t.checkin.sorenessLow, high: t.checkin.sorenessHigh, icon: Barbell },
  };
  const au = trainedToday ? rpe * durationMinutes : 0;
  const previewLabel = preview ? `${np.readiness}: ${preview.score} / 100, ${np.zone[preview.zone]}` : np.noScore;

  const scaleCard = (key: Exclude<Step, 'load'>) => {
    const { field, low, high, icon: IconCmp } = scaleCopy[key];
    return (
      <div>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-np-text-2">
            <IconCmp size={20} aria-hidden />
          </span>
          <span className="flex-1" />
          <BigValue value={values[field]} max={7} />
        </div>
        <SegmentScale value={values[field]} max={7} onChange={(v) => setScale(field, v)} label={key === 'body' ? t.checkin.soreness : stepTitles[key]} colorFor={bandColor} />
        <div className="mt-2 flex justify-between text-xs text-np-text-3">
          <span>{low}</span>
          <span>{high}</span>
        </div>
      </div>
    );
  };

  return (
    <form
      className={`${SHELL} space-y-4`}
      onSubmit={(e) => {
        e.preventDefault();
        if (step < LAST) goTo(step + 1);
        else void submit();
      }}
    >
      {/* progress: five segments, completed ones can be tapped to go back */}
      <div>
        <div className="flex items-center justify-between">
          <p className="np-overline">{app.stepOf(step + 1, STEPS.length)}</p>
          <p className="text-xs text-np-text-3">{app.steps[stepKey]}</p>
        </div>
        <div className="mt-2 flex gap-1.5" role="group" aria-label={app.stepOf(step + 1, STEPS.length)}>
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => i <= reached && goTo(i)}
              disabled={i > reached}
              aria-label={app.steps[s]}
              aria-current={i === step ? 'step' : undefined}
              className={`h-2 flex-1 rounded-full transition-colors ${i === step ? 'bg-np-text' : i < step || i <= reached ? 'bg-np-strain' : 'bg-white/10'}`}
            />
          ))}
        </div>
      </div>

      {/* live preview of the readiness score */}
      <section
        aria-live="polite"
        className="np-card np-glass sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 flex items-center gap-3 p-3 md:top-3"
      >
        <ScoreDial score={preview ? preview.score : null} zone={preview ? preview.zone : null} size={56} label={previewLabel} />
        <div className="min-w-0 flex-1">
          <p className="np-overline">{app.liveTitle}</p>
          {preview ? (
            <>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-np-text-2">
                <span className={`np-pill ${ZONE[preview.zone].pill}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${ZONE[preview.zone].dot}`} aria-hidden />
                  {np.zone[preview.zone]}
                </span>
                {preview.isPainBlocked && <span className="text-xs text-np-text-3">{t.checkin.painFlag}</span>}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-np-text-3">{app.liveNote}</p>
            </>
          ) : (
            <p className="mt-1 text-xs leading-snug text-np-text-3">{app.liveNone}</p>
          )}
        </div>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={stepKey}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
          transition={reduce ? { duration: 0.1 } : { duration: 0.2 }}
          className="np-card p-5"
        >
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-np-text" style={{ fontFamily: 'inherit' }}>
            {stepTitles[stepKey]}
          </h1>
          {step === 0 && <p className="mt-1 text-sm leading-relaxed text-np-text-3">{t.checkin.subtitle}</p>}
          <div className="mt-5">
            {stepKey !== 'load' && stepKey !== 'body' && scaleCard(stepKey)}

            {stepKey === 'body' && (
              <div className="space-y-2">
                {scaleCard('body')}
                <div className="divide-y divide-np-line pt-3">
                  <div>
                    <Toggle checked={painFlag} onChange={setPainFlag} label={t.checkin.painFlag} icon={Bandaids} activeColor={DANGER} />
                    <AnimatePresence initial={false}>
                      {painFlag && (
                        <motion.div {...reveal} className="overflow-hidden">
                          <input
                            type="text"
                            placeholder={t.checkin.painZonePlaceholder}
                            value={painZone}
                            onChange={(e) => setPainZone(e.target.value)}
                            className="mb-3 w-full rounded-np-ctrl border border-np-line bg-white/5 px-3.5 py-2.5 text-sm text-np-text placeholder:text-np-text-3"
                          />
                          <p className="mb-3 text-xs leading-relaxed text-np-text-2">{app.painNote}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div>
                    <Toggle checked={markMuscles} onChange={setMarkMuscles} label={t.checkin.sorenessMapToggle} icon={Person} activeColor={WARN} />
                    <AnimatePresence initial={false}>
                      {markMuscles && (
                        <motion.div {...reveal} className="overflow-hidden">
                          <div className="pb-2">
                            <p className="mb-3 text-xs leading-relaxed text-np-text-2">{t.checkin.sorenessMapHint}</p>
                            <SorenessSilhouette value={sorenessMap} onChange={setSorenessMap} lang={lang} framed={false} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

            {stepKey === 'load' && (
              <div>
                <Toggle checked={trainedToday} onChange={setTrainedToday} label={t.checkin.trainedToday} icon={PersonSimpleRun} activeColor={STRAIN} />
                <AnimatePresence initial={false}>
                  {trainedToday ? (
                    <motion.div {...reveal} className="overflow-hidden">
                      <div className="space-y-5 pt-3">
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs text-np-text-2">{t.checkin.rpe}</span>
                            <BigValue value={rpe} max={10} />
                          </div>
                          <SegmentScale value={rpe} max={10} onChange={setRpe} label={t.checkin.rpe} colorFor={() => STRAIN} />
                          <p className="mt-2 text-xs text-np-text-3">{t.checkin.rpeHint}</p>
                        </div>
                        <div>
                          <span className="mb-2 block text-xs text-np-text-2">{t.checkin.duration}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {DURATION_PRESETS.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setDurationMinutes(m)}
                                aria-pressed={durationMinutes === m}
                                className={`np-num rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                                  durationMinutes === m
                                    ? 'border-np-strain/60 bg-np-strain/20 text-np-strain-light'
                                    : 'border-np-line bg-white/5 text-np-text-2 hover:border-np-line-strong'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                            <label className="inline-flex items-center gap-1.5 rounded-full border border-np-line bg-white/5 px-3 py-1.5">
                              <input
                                type="number"
                                min={5}
                                max={300}
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                aria-label={t.checkin.duration}
                                className="np-num w-12 bg-transparent text-sm text-np-text"
                              />
                              <span className="text-xs text-np-text-3">{t.hub.min}</span>
                            </label>
                          </div>
                        </div>
                        <p className="np-pill np-pill-strain" aria-live="polite">
                          {app.sessionAu(nf.format(au))}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p {...reveal} className="overflow-hidden pt-1 text-xs leading-relaxed text-np-text-3">
                      {app.sessionNone}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      {error && (
        <Notice tone="danger" icon={WarningOctagon}>
          {error}
        </Notice>
      )}

      <div className="flex gap-3 pt-1">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            className="np-btn-glass inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-np-card px-5 text-sm font-semibold"
          >
            <ArrowLeft size={16} weight="bold" aria-hidden />
            {app.back}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="np-btn-primary inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-np-card text-base font-bold disabled:opacity-60"
        >
          {step === LAST ? (submitting ? t.common.loading : t.checkin.submit) : app.next}
          {!submitting && <ArrowRight size={18} weight="bold" aria-hidden />}
        </button>
      </div>
    </form>
  );
}
