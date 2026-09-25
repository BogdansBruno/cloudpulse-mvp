'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CalendarPlus, Timer } from '@phosphor-icons/react';
import type { WorkoutEvent } from '@/lib/ics-generator';
import { generateICS, downloadICS } from '@/lib/ics-generator';

type Lang = 'ru' | 'lv' | 'en';

/**
 * Visual version of the AI's <schedule> block: one row per training day with
 * date, start time, a duration bar (relative to the longest day in the plan)
 * and the exercise list, plus calendar export. Only shows what the plan
 * actually contains; no invented intensity numbers.
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
  const maxDuration = Math.max(...events.map((e) => e.duration), 1);
  const totalMinutes = events.reduce((sum, e) => sum + e.duration, 0);

  const handleExport = () => {
    const ics = generateICS(events, lang);
    downloadICS(ics, `cloudpulse-workouts-${new Date().toISOString().split('T')[0]}.ics`);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-black/30 ring-1 ring-inset ring-white/[0.08]">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <span className="text-sm font-medium tracking-[-0.01em] text-zinc-50">{title}</span>
        <span className="font-mono text-xs tabular-nums text-zinc-400">
          {totalMinutes} {minLabel}
        </span>
      </div>

      <ul className="divide-y divide-white/[0.06]">
        {events.map((ev, i) => {
          const d = ev.date;
          const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
          const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          return (
            <motion.li
              key={`${date}-${i}`}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.45, delay: reduce ? 0 : i * 0.05 }}
              className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 px-4 py-3"
            >
              <div>
                <p className="text-[11px] capitalize text-zinc-500">{ev.title}</p>
                <p className="font-mono text-lg tabular-nums leading-tight text-zinc-50">{date}</p>
                <p className="font-mono text-[11px] tabular-nums text-zinc-400">{time}</p>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      className="h-full rounded-full bg-[#CCFF00]"
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${(ev.duration / maxDuration) * 100}%` }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.8, delay: reduce ? 0 : 0.1 + i * 0.05 }}
                    />
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-zinc-300">
                    <Timer size={12} />
                    {ev.duration} {minLabel}
                  </span>
                </div>
                {ev.exercises && ev.exercises.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {ev.exercises.map((ex, j) => (
                      <li key={j} className="text-[13px] leading-snug text-zinc-300">
                        {ex}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>

      <div className="border-t border-white/[0.06] p-3">
        <motion.button
          type="button"
          onClick={handleExport}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#CCFF00] px-4 py-2.5 text-sm font-medium text-zinc-950"
        >
          <CalendarPlus size={16} weight="bold" />
          {exportLabel}
        </motion.button>
      </div>
    </div>
  );
}
