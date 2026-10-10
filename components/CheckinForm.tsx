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
import { Moon, Brain, Lightning, Barbell, WarningOctagon, Info, Bandaids, PersonSimpleRun, CloudCheck, Person } from '@phosphor-icons/react';
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
import ScoreDial from '@/components/np/ScoreDial';
import { LoadIndexArc } from '@/components/np/LoadIndexGauge';
import { ACWR_PILL, BLUE, CYAN, Disclaimer, Greeting, HeroArcs, TelemetryTable, acwrBand, wellnessPct, type TelemetryRow } from '@/components/np/Telemetry';
import { ZONE } from '@/components/np/ui';
import { NP, LOCALE } from '@/components/np/copy';
import { APP } from '@/components/np/appCopy';
import SorenessSilhouette from '@/adp/src/components/SorenessSilhouette';
import { COACH_LABELS } from '@/adp/src/components/labels';
import { CHECKIN_EVENT } from '@/lib/use-today-plan';
import type { SorenessMap } from '@/adp/src/components/sorenessMap';
import { todayUtc } from '@/lib/checkin-streak';
import { SegmentedScale } from '@/components/np/SegmentedScale';
import PainMap from '@/components/np/PainMap';
import CalcOverlay from '@/components/np/CalcOverlay';
import { POLISH } from '@/components/np/polishCopy';
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
  // returned by POST /api/checkin (CheckinResponseBody); optional so older servers still work
  monotony?: number | null;
  hooperScore?: number;
  hooperBaseline?: number | null;
  trainingStreak?: number;
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

// "Lotus is calculating…" holds at least this long so the beat reads as intentional (the real request often
// takes less); the score is only shown once the server has answered.
const CALC_MIN_MS = 1800;

const DURATION_PRESETS = [30, 45, 60, 90, 120];
const STEPS = ['sleep', 'fatigue', 'stress', 'body', 'load'] as const;
type Step = (typeof STEPS)[number];
const LAST = STEPS.length - 1;

const WARN = '#FFC53D';
/** pain / safety: muted crimson */
const CRIT = '#FF3D5A';
const STRAIN = BLUE;

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Glow slider for the 1–7 / 1–10 scales: a lit track that fills up to the value,
// one dot per step, a white thumb with a coloured halo. Follows the pointer 1:1
// while pressed (tap anywhere to jump), arrow keys / Home / End on the keyboard,
// and a 6 ms tick of vibration per step where the phone supports it (Android).
// ---------------------------------------------------------------------------
function GlowScale({
  value,
  max,
  onChange,
  label,
  colorFor,
  valueText,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  colorFor: (v: number, max: number) => string;
  valueText?: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const color = colorFor(value, max);
  const pct = max <= 1 ? 0 : ((value - 1) / (max - 1)) * 100;

  const set = (v: number) => {
    const next = Math.min(max, Math.max(1, v));
    if (next === value) return;
    try {
      navigator.vibrate?.(6);
    } catch {
      // vibration blocked: fine
    }
    onChange(next);
  };
  const valueFromX = (clientX: number) => {
    const el = ref.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    return Math.round(ratio * (max - 1)) + 1;
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText ? valueText(value) : `${value}/${max}`}
      className="relative h-12 cursor-pointer touch-pan-y select-none rounded-np-ctrl"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(value + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(value - 1);
        else if (e.key === 'Home') set(1);
        else if (e.key === 'End') set(max);
        else return;
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        set(valueFromX(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging) set(valueFromX(e.clientX));
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      {/* track */}
      <span aria-hidden className="absolute inset-x-3.5 top-1/2 h-2 -translate-y-1/2 rounded-full bg-np-veil/[0.07]">
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-150 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}55, ${color})`, boxShadow: `0 0 14px -2px ${color}` }}
        />
        {/* step dots */}
        {Array.from({ length: max }, (_, i) => {
          const at = max <= 1 ? 0 : (i / (max - 1)) * 100;
          const lit = i + 1 <= value;
          return (
            <span
              key={i}
              className="absolute top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${at}%`, backgroundColor: lit ? 'rgb(9 9 11 / 0.5)' : 'rgb(255 255 255 / 0.22)' }}
            />
          );
        })}
        {/* thumb */}
        <span
          className="absolute top-1/2 h-7 w-7 rounded-full bg-white transition-[left,transform] duration-150 ease-out"
          style={{
            left: `${pct}%`,
            transform: `translate(-50%, -50%) scale(${dragging ? 1.12 : 1})`,
            boxShadow: `0 0 0 4px ${color}40, 0 0 20px ${color}, 0 2px 6px rgb(0 0 0 / 0.45)`,
          }}
        />
      </span>
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-np-veil/5 text-np-text-3 transition-colors"
        style={{ color: checked ? activeColor : undefined }}
      >
        <IconCmp size={18} weight={checked ? 'fill' : 'regular'} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-np-text">{label}</span>
      <span
        className={`flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[3px] transition-colors ${checked ? 'justify-end' : 'justify-start bg-np-veil/15'}`}
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

// Warnings never get a filled red box: a 2px accent line on the left + a coloured icon.
function Notice({ tone, icon: IconCmp, children }: { tone: 'danger' | 'info'; icon: Icon; children: React.ReactNode }) {
  return (
    <div
      className={`np-flag flex gap-3 p-4 text-sm leading-relaxed ${tone === 'danger' ? 'text-np-text' : 'text-np-text-2'}`}
      style={{ ['--np-accent-line' as string]: tone === 'danger' ? CRIT : 'rgb(255 255 255 / 0.22)' }}
    >
      <IconCmp size={18} weight={tone === 'danger' ? 'fill' : 'regular'} className={`mt-0.5 shrink-0 ${tone === 'danger' ? 'text-np-danger' : 'text-np-text-3'}`} aria-hidden />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

const SHELL = 'mx-auto w-full max-w-lg px-3 py-6 md:py-10';

/** Lotus card skin of each check-in step. */
const STEP_SKIN: Record<Step, string> = { sleep: 'lt-card-sleep', fatigue: 'lt-card-activity', stress: 'lt-card-stress', body: 'lt-card-stress', load: 'lt-card-activity' };

export default function CheckinForm({ onSubmitted }: { onSubmitted?: () => void } = {}) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const np = NP[lang];
  const app = APP[lang].checkin;
  const pk = POLISH[lang].checkin;
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
  // where it hurts, tapped on the body map ("knee:left"); the place names are written into painZone
  const [painKeys, setPainKeys] = useState<string[]>([]);
  const [calculating, setCalculating] = useState(false);
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
    const started = Date.now();
    setCalculating(true);
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
      const rest = CALC_MIN_MS - (Date.now() - started);
      if (rest > 0) await new Promise((r) => setTimeout(r, reduce ? Math.min(rest, 600) : rest));
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
      setCalculating(false);
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
            <h1 className="mt-5 text-2xl np-editorial font-semibold text-np-text">
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
  // Order: greeting → three arcs (readiness · load · wellness) → safety flags → today's
  // load target on the arc → penalty chips → telemetry table → coach cards → actions.
  if (result) {
    const r = result.readiness;
    const tl = APP[lang].v3.telemetry;
    const target = r.isPainBlocked ? null : targetLoadRange(r.score);
    const delta = baselineDelta(r.score, earlierScores);
    const usual = usualDailyLoad(r.chronicLoad ?? null);
    const dayIndex = loadIndex(trainedToday ? sessionLoad(rpe, durationMinutes) : 0, usual);
    const wellness = wellnessPct(r.hooperScore ?? null);
    const fmt2 = (v: number) => v.toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rows: TelemetryRow[] = [];
    if (r.acwr !== null) {
      const band = acwrBand(r.acwr);
      rows.push({ key: 'acwr', label: tl.acwr, hint: tl.acwrHint, value: fmt2(r.acwr), pill: { text: tl.acwrBand[band], cls: ACWR_PILL[band] }, color: BLUE });
    }
    if (r.monotony !== undefined && r.monotony !== null) {
      const high = r.monotony > 2;
      rows.push({ key: 'mono', label: tl.monotony, hint: tl.monotonyHint, value: fmt2(r.monotony), pill: { text: high ? tl.monotonyHigh : tl.monotonyOk, cls: high ? 'np-pill-warn' : '' } });
    }
    if (r.hooperScore !== undefined && r.hooperScore >= 4) {
      const base = r.hooperBaseline ?? null;
      const d = base !== null ? Math.round((r.hooperScore - base) * 10) / 10 : null;
      rows.push({
        key: 'hooper',
        label: tl.hooper,
        hint: tl.hooperHint,
        value: String(r.hooperScore),
        unit: '/28',
        // for Hooper, lower is better: show the arrow of the raw change, the words carry the meaning
        delta: d !== null ? { value: d, text: tl.vsBase(`${d > 0 ? '+' : d < 0 ? '−' : '±'}${nf.format(Math.abs(d))}`) } : undefined,
        color: CYAN,
      });
    }
    rows.push({ key: 'sleep', label: tl.sleep, hint: tl.sleepHint, value: String(values.sleepQuality), unit: '/7', color: CYAN });
    if (r.trainingStreak !== undefined) {
      rows.push({ key: 'streak', label: tl.streak, hint: tl.streakHint, value: tl.streakDays(r.trainingStreak), pill: r.trainingStreak > 6 ? { text: '>6', cls: 'np-pill-warn' } : undefined });
    }

    return (
      <div className={`${SHELL} md:max-w-2xl`}>
        <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-3">
          <Greeting lang={lang} tint={ZONE[r.zone].ambient} />

          <section className="lt-card-readiness relative overflow-hidden px-6 py-8 sm:px-10">
            <HeroArcs lang={lang} score={r.score} zone={r.zone} loadIndex={dayIndex} wellness={wellness} delta={delta} />
          </section>

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
          <section className="lt-card-activity relative overflow-hidden p-5" aria-labelledby="ck-target">
            <span aria-hidden className="np-ambient -right-10 -top-16 h-40 w-40" style={{ ['--np-ambient' as string]: 'rgb(255 197 61 / 0.22)' }} />
            <p id="ck-target" className="np-label relative">
              {app.doneTarget}
            </p>
            {target ? (
              <div className="relative">
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <span className="np-metric text-5xl" style={{ color: STRAIN }}>
                    {app.doneTargetBody(target.from, target.to)}
                  </span>
                  <span className="text-sm text-np-text-3">{app.doneTargetOf}</span>
                </p>
                <div className="mt-4">
                  <LoadIndexArc lang={lang} index={dayIndex} target={target} title={np.load.title} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-np-text-3">{app.doneTargetScale}</p>
              </div>
            ) : (
              <p className="relative mt-2 text-sm leading-relaxed text-np-text-2">{app.doneTargetPain}</p>
            )}
          </section>

          {r.penalties.length > 0 && (
            <section className="lt-card-readiness p-4">
              <p className="np-label mb-3">{t.checkin.whyScore}</p>
              <ul className="flex flex-wrap gap-2">
                {r.penalties.map((p, i) => (
                  <li
                    key={i}
                    className="inline-flex max-w-full items-start gap-2 rounded-np-ctrl border border-np-line bg-np-veil/[0.03] px-3 py-1.5 text-[13px] leading-snug text-np-text-2"
                  >
                    <span className="np-mono shrink-0 font-semibold text-np-warn">−{p.points}</span>
                    <span className="min-w-0">{translatePenalty(t, p)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <TelemetryTable title={tl.title} rows={rows} />

          {result.sorenessSaved === false && (
            <Notice tone="info" icon={Info}>
              {t.checkin.sorenessMapNotSaved}
            </Notice>
          )}

          {/* coach messages, return-to-play, streak: one dark island on the gradient */}
          <div className="space-y-3 empty:hidden">
            <CoachReplyCard />
            <RtpAthleteCard />
            <CheckinStreakCard showCta={false} />
          </div>

          <div className="grid gap-3 pt-4 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="np-btn-primary inline-flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold"
            >
              {t.checkin.toPlan}
            </button>
            <button
              type="button"
              onClick={() => router.push('/training')}
              className="np-btn-glass inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
            >
              {COACH_LABELS[lang].title}
            </button>
          </div>
          <Disclaimer lang={lang} className="!mt-6" />
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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-np-veil/5 text-np-text-2">
            <IconCmp size={20} aria-hidden />
          </span>
          <span className="flex-1" />
          <BigValue value={values[field]} max={7} />
        </div>
        <SegmentedScale value={values[field]} max={7} onChange={(v) => setScale(field, v)} label={key === 'body' ? t.checkin.soreness : stepTitles[key]} />
        <div className="mt-2.5 flex justify-between gap-3 text-xs font-medium text-white/75">
          <span>1 · {low}</span>
          <span className="text-right">{high} · 7</span>
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
              className={`h-2 flex-1 rounded-full transition-colors ${i === step ? 'bg-np-text' : i < step || i <= reached ? 'bg-[#B8F23C]/70' : 'bg-[#9AA7B8]/10'}`}
            />
          ))}
        </div>
      </div>

      {/* live preview of the readiness score */}
      <section
        aria-live="polite"
        className="lt-card-readiness [background-image:linear-gradient(135deg,#0D1B2A_0%,#0A0D14_100%)] backdrop-blur-xl sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 flex min-h-[82px] items-center gap-3 p-3 md:top-3"
      >
        <ScoreDial score={preview ? preview.score : null} zone={preview ? preview.zone : null} size={56} label={previewLabel} />
        <div className="min-w-0 flex-1">
          <p className="np-label">{app.liveTitle}</p>
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
          className={`p-5 ${STEP_SKIN[stepKey]}`}
        >
          <h1 className="text-2xl np-editorial font-semibold leading-tight text-np-text">
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
                    <Toggle checked={painFlag} onChange={setPainFlag} label={t.checkin.painFlag} icon={Bandaids} activeColor={CRIT} />
                    <AnimatePresence initial={false}>
                      {painFlag && (
                        <motion.div {...reveal} className="overflow-hidden">
                          <PainMap
                            lang={lang}
                            selected={painKeys}
                            onChange={(keys, names) => {
                              setPainKeys(keys);
                              setPainZone(names.join(', '));
                            }}
                          />
                          <label className="mb-1.5 mt-3 block text-xs font-medium text-white/75" htmlFor="ck-pain-zone">
                            {pk.typeToo}
                          </label>
                          <input
                            id="ck-pain-zone"
                            type="text"
                            placeholder={t.checkin.painZonePlaceholder}
                            value={painZone}
                            onChange={(e) => setPainZone(e.target.value)}
                            className="mb-3 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/50 focus:border-[#B8F23C]/60 focus:outline-none"
                          />
                          <p className="mb-3 text-xs leading-relaxed text-white/80">{app.painNote}</p>
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
                            <SorenessSilhouette value={sorenessMap} onChange={setSorenessMap} lang={lang} framed={false} tabs />
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
                          <GlowScale value={rpe} max={10} onChange={setRpe} label={t.checkin.rpe} colorFor={() => STRAIN} />
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
                                    : 'border-np-line bg-np-veil/5 text-np-text-2 hover:border-np-line-strong'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                            <label className="inline-flex items-center gap-1.5 rounded-full border border-np-line bg-np-veil/5 px-3 py-1.5">
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

      {/* sticky: Back / Next always stay above the floating dock, even on a short or half-scrolled card */}
      <div className="sticky bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.5rem)] z-30 flex gap-3 pt-1">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            className="np-btn-glass inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            {app.back}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="np-btn-primary inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-full text-base font-bold disabled:opacity-60"
        >
          {step === LAST ? (submitting ? t.common.loading : t.checkin.submit) : app.next}
        </button>
      </div>
      <Disclaimer lang={lang} className="!mt-8" />
      <AnimatePresence>{calculating && <CalcOverlay key="calc" title={pk.calc.title} sub={pk.calc.sub} />}</AnimatePresence>
    </form>
  );
}
