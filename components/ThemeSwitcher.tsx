'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { Check, ClockCountdown, Desktop, Minus, Moon, Plus, Sun } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useTheme, type ThemeMode } from '@/lib/theme/ThemeContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const SPRING = { type: 'spring', bounce: 0, duration: 0.3 } as const;
const MODE_ICON: Record<ThemeMode, Icon> = {
  light: Sun,
  dark: Moon,
  system: Desktop,
  scheduled: ClockCountdown,
};

function shiftTime(hhmm: string, deltaMin: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + deltaMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Compact 30-minute stepper: easier to hit on a phone than a native time input. */
function TimeStepper({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const btn =
    'flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-50';
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] p-1 ring-1 ring-inset ring-white/10" aria-label={label}>
      <button type="button" onClick={() => onChange(shiftTime(value, -30))} className={btn} aria-label={`${label} −30`}>
        <Minus size={12} weight="bold" />
      </button>
      <span className="w-12 text-center font-mono text-sm tabular-nums text-zinc-50">{value}</span>
      <button type="button" onClick={() => onChange(shiftTime(value, 30))} className={btn} aria-label={`${label} +30`}>
        <Plus size={12} weight="bold" />
      </button>
    </div>
  );
}

export default function ThemeSwitcher() {
  const { settings, resolved, setMode, setSchedule } = useTheme();
  const { t } = useLanguage();
  const th = t.theme;
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const modes: { key: ThemeMode; label: string; hint: string }[] = [
    { key: 'light', label: th.light, hint: th.lightHint },
    { key: 'dark', label: th.dark, hint: th.darkHint },
    { key: 'system', label: th.system, hint: th.systemHint },
    { key: 'scheduled', label: th.scheduled, hint: th.scheduledHint },
  ];

  const TriggerIcon = MODE_ICON[settings.mode];

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={reduce ? undefined : { scale: 0.9 }}
        aria-label={th.label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/5 transition-colors ${
          open ? 'bg-white/10 text-zinc-50' : 'bg-black/20 text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={settings.mode}
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.5 }}
            transition={SPRING}
            className="flex"
          >
            <TriggerIcon size={15} weight={settings.mode === 'dark' ? 'fill' : 'regular'} />
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={SPRING}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-2xl border border-white/10 bg-zinc-900/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">{th.label}</p>
            <LayoutGroup id="theme-modes">
              {modes.map(({ key, label, hint }) => {
                const ModeIcon = MODE_ICON[key];
                const active = settings.mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => setMode(key)}
                    className="relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left"
                  >
                    {active && (
                      <motion.span
                        layoutId="theme-active"
                        transition={SPRING}
                        className="absolute inset-0 rounded-xl bg-white/[0.07] ring-1 ring-inset ring-white/10"
                      />
                    )}
                    <span
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        active ? 'bg-[#CCFF00] text-zinc-950' : 'bg-white/[0.05] text-zinc-300'
                      }`}
                    >
                      <ModeIcon size={16} weight={active ? 'fill' : 'regular'} />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block text-sm font-medium text-zinc-50">{label}</span>
                      <span className="block truncate text-xs text-zinc-500">{hint}</span>
                    </span>
                    {active && <Check size={14} weight="bold" className="relative text-[#CCFF00]" />}
                  </button>
                );
              })}
            </LayoutGroup>

            <AnimatePresence initial={false}>
              {settings.mode === 'scheduled' && (
                <motion.div
                  key="schedule"
                  initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={SPRING}
                  className="overflow-hidden"
                >
                  <div className="mx-1 mb-1 mt-1.5 space-y-2.5 rounded-xl bg-black/20 p-3 ring-1 ring-inset ring-white/[0.06]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">{th.darkFrom}</span>
                      <TimeStepper
                        label={th.darkFrom}
                        value={settings.darkFrom}
                        onChange={(v) => setSchedule(v, settings.darkTo)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-400">{th.darkTo}</span>
                      <TimeStepper
                        label={th.darkTo}
                        value={settings.darkTo}
                        onChange={(v) => setSchedule(settings.darkFrom, v)}
                      />
                    </div>
                    <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-zinc-500">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${resolved === 'dark' ? 'bg-zinc-400' : 'bg-[#CCFF00]'}`}
                      />
                      {resolved === 'dark' ? th.nowDark : th.nowLight}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
