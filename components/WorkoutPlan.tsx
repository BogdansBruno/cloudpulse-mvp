'use client';

import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CalendarPlus,
  CaretDown,
  Flame,
  Gauge,
  Heartbeat,
  Leaf,
  Target,
  Timer,
  Warning,
  Wind,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { intensityLevel, type Intensity, type WorkoutEvent } from '@/lib/ics-generator';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { HUB } from '@/components/PerformancePanel';
import CalendarExportModal from '@/components/CalendarExportModal';

type Lang = 'ru' | 'lv' | 'en';

const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const;

// `color` tints the badge surface; `text` is a CSS variable that swaps to a
// deeper, readable shade in the light theme (see globals.css).
const INTENSITY: Record<Intensity, { color: string; text: string; Icon: Icon }> = {
  light: { color: HUB.lime, text: 'var(--accent-text)', Icon: Leaf },
  moderate: { color: HUB.amber, text: 'var(--amber-text)', Icon: Gauge },
  hard: { color: HUB.red, text: 'var(--red-text)', Icon: Flame },
};
const CYAN = '#00F0FF';

// Warm-up reads as a softer lime, the main block as full lime, the
// cool-down as cyan, so the bar shows the shape of the session at a glance.
function phaseColor(i: number, n: number) {
  if (n === 1) return HUB.lime;
  if (i === 0) return 'rgba(204,255,0,0.45)';
  if (i === n - 1) return 'rgba(0,240,255,0.75)';
  return HUB.lime;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function Badge({
  color,
  text,
  Icon: IconCmp,
  children,
}: {
  color: string;
  text: string;
  Icon: Icon;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5"
      style={{ backgroundColor: `${color}1A`, color: text, boxShadow: `inset 0 0 0 1px ${color}40` }}
    >
      <IconCmp size={11} weight="fill" />
      {children}
    </span>
  );
}

function PlanDay({
  ev,
  index,
  maxDuration,
  minLabel,
}: {
  ev: WorkoutEvent;
  index: number;
  maxDuration: number;
  minLabel: string;
}) {
  const { t } = useLanguage();
  const p = t.plan;
  const reduce = useReducedMotion();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [activePhase, setActivePhase] = useState<number | null>(null);

  const d = ev.date;
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const level = intensityLevel(ev.rpe);
  const phases = ev.phases ?? [];
  const phaseTotal = phases.reduce((s, ph) => s + ph.minutes, 0);
  const heading = ev.sessionTitle || ev.exercises?.[0] || ev.title;
  const steps = ev.sessionTitle ? ev.exercises ?? [] : (ev.exercises ?? []).slice(ev.exercises?.[0] ? 1 : 0);
  const protocol = [
    ev.tempo ? { Icon: Gauge, label: p.tempo, value: ev.tempo } : null,
    ev.breathing ? { Icon: Wind, label: p.breathing, value: ev.breathing } : null,
    ev.heartRate ? { Icon: Heartbeat, label: p.heartRate, value: ev.heartRate } : null,
  ].filter((x): x is { Icon: Icon; label: string; value: string } => x !== null);
  const hasDetails = steps.length > 0 || protocol.length > 0 || !!ev.safety;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: reduce ? 0 : index * 0.05 }}
      className={`overflow-hidden rounded-2xl ring-1 ring-inset transition-colors ${
        open ? 'bg-white/[0.05] ring-white/[0.14]' : 'bg-white/[0.025] ring-white/[0.07]'
      }`}
    >
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        aria-expanded={hasDetails ? open : undefined}
        aria-controls={hasDetails ? panelId : undefined}
        className={`grid w-full grid-cols-[52px_minmax(0,1fr)_auto] gap-3 px-3.5 pt-3.5 text-left ${
          hasDetails ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <div>
          <p className="truncate text-[11px] capitalize text-zinc-500">{ev.title}</p>
          <p className="font-mono text-lg leading-tight tabular-nums text-zinc-50">{date}</p>
          <p className="font-mono text-[11px] tabular-nums text-zinc-400">{time}</p>
        </div>

        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-snug tracking-[-0.01em] text-zinc-50">{heading}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ev.goal && (
              <Badge color={HUB.lime} text="var(--accent-text)" Icon={Target}>
                {ev.goal}
              </Badge>
            )}
            {level && (
              <Badge color={INTENSITY[level].color} text={INTENSITY[level].text} Icon={INTENSITY[level].Icon}>
                RPE {ev.rpe} · {p[level]}
              </Badge>
            )}
            {ev.zone && (
              <Badge color={CYAN} text="var(--cyan-text)" Icon={Heartbeat}>
                {p.zone} {ev.zone}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-zinc-300">
            <Timer size={12} />
            {ev.duration} {minLabel}
          </span>
          {hasDetails && (
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={SPRING}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400"
              aria-hidden
            >
              <CaretDown size={12} weight="bold" />
            </motion.span>
          )}
        </div>
      </button>

      {/* Phase bar: segmented when the plan gives phases, a single relative
          bar (old behaviour) when it doesn't. */}
      <div className="px-3.5 pb-3.5 pt-3">
        {phases.length > 0 ? (
          <>
            <div className="flex h-2 gap-[3px]" onMouseLeave={() => setActivePhase(null)}>
              {phases.map((ph, i) => (
                <motion.button
                  key={i}
                  type="button"
                  aria-label={`${ph.name} ${ph.minutes} ${minLabel}`}
                  onMouseEnter={() => setActivePhase(i)}
                  onFocus={() => setActivePhase(i)}
                  onBlur={() => setActivePhase(null)}
                  onClick={() => setActivePhase((a) => (a === i ? null : i))}
                  className="h-full rounded-full first:rounded-l-full last:rounded-r-full"
                  style={{ backgroundColor: phaseColor(i, phases.length), flexGrow: ph.minutes, flexBasis: 0, originX: 0 }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{
                    scaleX: 1,
                    opacity: activePhase === null || activePhase === i ? 1 : 0.35,
                  }}
                  transition={{ ...SPRING, delay: reduce ? 0 : 0.1 + index * 0.05 + i * 0.06 }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {phases.map((ph, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 text-[11px] transition-opacity ${
                    activePhase === null || activePhase === i ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: phaseColor(i, phases.length) }} />
                  <span className="text-zinc-300">{ph.name}</span>
                  <span className="font-mono tabular-nums text-zinc-500">
                    {ph.minutes} {minLabel}
                  </span>
                </span>
              ))}
              {phaseTotal !== ev.duration && (
                <span className="font-mono text-[11px] tabular-nums text-zinc-600">
                  Σ {phaseTotal} {minLabel}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-[#CCFF00]"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(ev.duration / maxDuration) * 100}%` }}
              transition={{ ...SPRING, duration: 0.8, delay: reduce ? 0 : 0.1 + index * 0.05 }}
            />
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && hasDetails && (
          <motion.div
            id={panelId}
            key="details"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-white/[0.07] px-3.5 pb-4 pt-3.5">
              {steps.length > 0 && (
                <section>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">{p.steps}</p>
                  <ol className="space-y-2">
                    {steps.map((s, j) => (
                      <li key={j} className="flex gap-2.5">
                        <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#CCFF00]/[0.12] font-mono text-[10px] font-semibold tabular-nums text-[#CCFF00]">
                          {j + 1}
                        </span>
                        <span className="text-[13px] leading-relaxed text-zinc-300">{s}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {protocol.length > 0 && (
                <section>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">{p.protocol}</p>
                  <div className="divide-y divide-white/[0.06] rounded-xl bg-black/20 ring-1 ring-inset ring-white/[0.06]">
                    {protocol.map(({ Icon: IconCmp, label, value }) => (
                      <div key={label} className="flex gap-3 px-3 py-2.5">
                        <IconCmp size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-zinc-500">{label}</p>
                          <p className="text-[13px] leading-snug text-zinc-200">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {ev.safety && (
                <div
                  className="flex gap-2.5 rounded-xl p-3"
                  style={{ backgroundColor: `${HUB.amber}14`, boxShadow: `inset 0 0 0 1px ${HUB.amber}40` }}
                >
                  <Warning size={16} weight="fill" className="mt-0.5 shrink-0" style={{ color: 'var(--amber-text)' }} />
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--amber-text)' }}>
                      {p.safety}
                    </p>
                    <p className="text-[13px] leading-snug text-zinc-200">{ev.safety}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/**
 * Visual version of the AI's <schedule> block: one expandable card per
 * training day with phase breakdown, intensity and goal badges, and a
 * step-by-step protocol. Only shows what the plan actually contains;
 * nothing here is invented client-side.
 */
export default function WorkoutPlan({
  events,
  lang,
  title,
  minLabel,
  exportLabel,
}: {
  events: WorkoutEvent[];
  lang: Lang;
  title: string;
  minLabel: string;
  exportLabel: string;
}) {
  const reduce = useReducedMotion();
  const [exportOpen, setExportOpen] = useState(false);
  const maxDuration = Math.max(...events.map((e) => e.duration), 1);
  const totalMinutes = events.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-black/30 ring-1 ring-inset ring-white/[0.08]">
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <span className="text-sm font-medium tracking-[-0.01em] text-zinc-50">{title}</span>
        <span className="font-mono text-xs tabular-nums text-zinc-400">
          {events.length} × · {totalMinutes} {minLabel}
        </span>
      </div>

      <ul className="space-y-2 p-3">
        {events.map((ev, i) => (
          <PlanDay key={`${ev.date.getTime()}-${i}`} ev={ev} index={i} maxDuration={maxDuration} minLabel={minLabel} />
        ))}
      </ul>

      <div className="border-t border-white/[0.06] p-3">
        <motion.button
          type="button"
          onClick={() => setExportOpen(true)}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#CCFF00] px-4 py-2.5 text-sm font-medium text-zinc-950"
        >
          <CalendarPlus size={16} weight="bold" />
          {exportLabel}
        </motion.button>
      </div>

      <CalendarExportModal open={exportOpen} onClose={() => setExportOpen(false)} events={events} lang={lang} />
    </div>
  );
}
