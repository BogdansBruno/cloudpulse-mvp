'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Moon, Brain, Lightning, Barbell, WarningOctagon, Info, ArrowRight, Bandaids, PersonSimpleRun } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ReadinessRing, zoneMeta, HUB } from '@/components/PerformancePanel';

type ScaleField = 'sleepQuality' | 'stress' | 'fatigue' | 'soreness';

type ReadinessResult = {
  score: number;
  zone: 'green' | 'yellow' | 'red';
  acwr: number | null;
  penalties: { reason: string; points: number }[];
  inconsistencyFlags: string[];
  isPainBlocked: boolean;
};

type SafetyViolation = { code: string; message: string; severity: 'block' | 'warning' };

type CheckinApiResponse = {
  readiness: ReadinessResult;
  safetyViolations: SafetyViolation[];
};

const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const;
const DURATION_PRESETS = [30, 45, 60, 90, 120];

// All four Hooper scales run 1-7 with 7 = best, so the fill colour reads the
// same way on every card. Colour is always backed by the number and labels.
function bandColor(value: number, max: number) {
  const r = value / max;
  if (r <= 2 / 7) return HUB.red;
  if (r <= 4 / 7) return HUB.amber;
  return HUB.lime;
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
            className="h-10 flex-1 rounded-lg transition-[background-color,box-shadow,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            style={{
              backgroundColor: filled ? color : 'rgba(255,255,255,0.06)',
              opacity: filled && n !== value ? 0.55 : 1,
              boxShadow: n === value ? `0 0 18px -4px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function AnimatedValue({ value, max }: { value: number; max: number }) {
  const reduce = useReducedMotion();
  const digits = String(value).length;
  return (
    <span className="inline-flex items-baseline font-mono tabular-nums">
      <span
        className="relative inline-block h-[1.2em] overflow-hidden text-2xl leading-none text-zinc-50"
        style={{ width: `${digits}ch` }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { y: '60%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: '-60%', opacity: 0 }}
            transition={reduce ? { duration: 0.1 } : SPRING}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-sm text-zinc-600">/{max}</span>
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
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 transition-colors"
        style={{ color: checked ? activeColor : undefined }}
      >
        <IconCmp size={18} weight={checked ? 'fill' : 'regular'} />
      </span>
      <span className="flex-1 text-sm font-medium text-zinc-100">{label}</span>
      <span
        className={`flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[3px] transition-colors ${
          checked ? 'justify-end' : 'justify-start bg-white/[0.12]'
        }`}
        style={{ backgroundColor: checked ? activeColor : undefined }}
      >
        <motion.span
          layout
          transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.3 }}
          className="h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
        />
      </span>
    </button>
  );
}

export default function CheckinForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const SCALES: { field: ScaleField; title: string; low: string; high: string; icon: Icon }[] = [
    { field: 'sleepQuality', title: t.checkin.sleep, low: t.checkin.sleepLow, high: t.checkin.sleepHigh, icon: Moon },
    { field: 'stress', title: t.checkin.stress, low: t.checkin.stressLow, high: t.checkin.stressHigh, icon: Brain },
    { field: 'fatigue', title: t.checkin.fatigue, low: t.checkin.fatigueLow, high: t.checkin.fatigueHigh, icon: Lightning },
    { field: 'soreness', title: t.checkin.soreness, low: t.checkin.sorenessLow, high: t.checkin.sorenessHigh, icon: Barbell },
  ];

  const ZONE_LABEL: Record<ReadinessResult['zone'], string> = {
    green: t.progress.zoneGreen,
    yellow: t.progress.zoneYellow,
    red: t.progress.zoneRed,
  };

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinApiResponse | null>(null);

  function setScale(field: ScaleField, value: number) {
    setValues((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Attach the Supabase session when one exists, otherwise the server
      // falls back to its dev-mode bypass.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...values,
          painFlag,
          painZone: painFlag && painZone.trim() ? painZone.trim() : undefined,
          session: trainedToday ? { rpe, durationMinutes } : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.content || 'Could not submit check-in');
      }

      const data: CheckinApiResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const reveal = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, height: 0 },
    animate: reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' },
    exit: reduce ? { opacity: 0 } : { opacity: 0, height: 0 },
    transition: SPRING,
  };

  // ---------------------------------------------------------------- result
  if (result) {
    const { color, Icon: ZoneIcon } = zoneMeta(result.readiness.zone);
    return (
      <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
        <div
          className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{ backgroundColor: `${color}14` }}
        />
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="relative mx-auto max-w-md"
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <ReadinessRing score={result.readiness.score} zone={result.readiness.zone} size={220} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-6xl font-light leading-none tabular-nums tracking-[-0.04em] text-zinc-50">
                  {result.readiness.score}
                </span>
                <span className="mt-2 text-xs text-zinc-400">{t.hub.readiness}</span>
              </div>
            </div>
            <span
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-sm ring-1 ring-inset ring-white/[0.08]"
              style={{ color }}
            >
              <ZoneIcon size={16} weight="fill" />
              {ZONE_LABEL[result.readiness.zone]}
            </span>
          </div>

          {result.safetyViolations.length > 0 && (
            <div className="mt-8 space-y-2">
              {result.safetyViolations.map((v, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm leading-relaxed text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30"
                >
                  <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
                  <span>{v.message}</span>
                </div>
              ))}
            </div>
          )}

          {result.readiness.inconsistencyFlags.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.readiness.inconsistencyFlags.map((flag, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-2xl bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-300 ring-1 ring-inset ring-white/[0.08]"
                >
                  <Info size={18} className="mt-0.5 shrink-0 text-zinc-400" />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}

          {result.readiness.penalties.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.08]">
              <p className="mb-3 text-xs text-zinc-400">{t.checkin.whyScore}</p>
              <ul className="space-y-2">
                {result.readiness.penalties.map((p, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-zinc-300">{p.reason}</span>
                    <span className="shrink-0 font-mono tabular-nums text-zinc-500">-{p.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <motion.button
            type="button"
            onClick={() => router.push('/chat')}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#CCFF00] text-base font-semibold text-zinc-950 shadow-[0_0_30px_-6px_rgba(204,255,0,0.45)]"
          >
            {t.checkin.toPlan}
            <ArrowRight size={18} weight="bold" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ------------------------------------------------------------------ form
  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-lg space-y-3">
        <header className="mb-6">
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-4xl">
            {t.checkin.title}
          </h1>
          <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-zinc-400">{t.checkin.subtitle}</p>
        </header>

        {SCALES.map(({ field, title, low, high, icon: IconCmp }, i) => (
          <motion.section
            key={field}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: reduce ? 0 : i * 0.05 }}
            className="rounded-3xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-200">
                <IconCmp size={18} />
              </span>
              <span className="flex-1 text-sm font-medium text-zinc-100">{title}</span>
              <AnimatedValue value={values[field]} max={7} />
            </div>
            <SegmentScale
              value={values[field]}
              max={7}
              onChange={(v) => setScale(field, v)}
              label={title}
              colorFor={bandColor}
            />
            <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
              <span>{low}</span>
              <span>{high}</span>
            </div>
          </motion.section>
        ))}

        <section className="divide-y divide-white/[0.06] rounded-3xl bg-white/[0.03] px-4 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
          <div>
            <Toggle checked={painFlag} onChange={setPainFlag} label={t.checkin.painFlag} icon={Bandaids} activeColor={HUB.red} />
            <AnimatePresence initial={false}>
              {painFlag && (
                <motion.div {...reveal} className="overflow-hidden">
                  <input
                    type="text"
                    placeholder={t.checkin.painZonePlaceholder}
                    value={painZone}
                    onChange={(e) => setPainZone(e.target.value)}
                    className="mb-3 w-full rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-[#FF4D5E]/50"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <Toggle
              checked={trainedToday}
              onChange={setTrainedToday}
              label={t.checkin.trainedToday}
              icon={PersonSimpleRun}
              activeColor={HUB.lime}
            />
            <AnimatePresence initial={false}>
              {trainedToday && (
                <motion.div {...reveal} className="overflow-hidden">
                  <div className="space-y-4 pb-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">{t.checkin.rpe}</span>
                        <AnimatedValue value={rpe} max={10} />
                      </div>
                      <SegmentScale value={rpe} max={10} onChange={setRpe} label={t.checkin.rpe} colorFor={() => HUB.lime} />
                      <p className="mt-2 text-[11px] text-zinc-500">{t.checkin.rpeHint}</p>
                    </div>
                    <div>
                      <span className="mb-2 block text-xs text-zinc-400">{t.checkin.duration}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {DURATION_PRESETS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDurationMinutes(m)}
                            className={`rounded-full px-3.5 py-1.5 font-mono text-sm tabular-nums ring-1 ring-inset transition-colors ${
                              durationMinutes === m
                                ? 'bg-[#CCFF00] text-zinc-950 ring-[#CCFF00]'
                                : 'bg-white/[0.04] text-zinc-300 ring-white/10 hover:ring-white/25'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                        <label className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 ring-1 ring-inset ring-white/10 focus-within:ring-[#CCFF00]/50">
                          <input
                            type="number"
                            min={5}
                            max={300}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                            aria-label={t.checkin.duration}
                            className="w-12 bg-transparent font-mono text-sm tabular-nums text-zinc-50 focus:outline-none"
                          />
                          <span className="text-xs text-zinc-500">{t.hub.min}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {error && (
          <div className="flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
            <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3">
          <motion.button
            type="submit"
            disabled={submitting}
            whileTap={reduce || submitting ? undefined : { scale: 0.98 }}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#CCFF00] text-base font-semibold text-zinc-950 shadow-[0_0_30px_-6px_rgba(204,255,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] transition-opacity disabled:opacity-60"
          >
            {submitting ? t.common.loading : t.checkin.submit}
            {!submitting && <ArrowRight size={18} weight="bold" />}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
