'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Lang } from '@/lib/i18n/translations';

type Props = {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (iso: string) => void;
  placeholder: string;
  lang: Lang;
};

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function parseISO(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function formatDisplayDate(iso: string, lang: Lang) {
  return parseISO(iso).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Self-contained popover calendar (no external date/UI library — kept
// dependency-free like the rest of this project's custom controls) that
// replaces the browser's native <input type="date">, which can't be
// themed and looks jarring against the dark glass UI.
export default function DatePicker({ value, onChange, placeholder, lang }: Props) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? parseISO(value) : new Date()));
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const selected = value ? parseISO(value) : null;

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first grid
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return { date: d, inMonth: d.getMonth() === month, iso: toISO(d.getFullYear(), d.getMonth(), d.getDate()) };
  });

  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    // 2024-01-01 is a Monday — a stable reference week to read locale labels from.
    const d = new Date(2024, 0, 1 + i);
    return d.toLocaleDateString(LOCALE[lang], { weekday: 'narrow' });
  });

  const monthLabel = viewDate.toLocaleDateString(LOCALE[lang], { month: 'long', year: 'numeric' });

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-left text-sm ring-1 ring-inset transition-all duration-200 ${
          open ? 'ring-[#CCFF00]/50 ring-2' : 'ring-white/10 hover:bg-white/[0.08]'
        }`}
      >
        <CalendarBlank size={16} className="shrink-0 text-zinc-400" />
        <span className={value ? 'text-zinc-50' : 'text-zinc-500'}>
          {value ? formatDisplayDate(value, lang) : placeholder}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
            role="dialog"
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-2xl border border-white/10 bg-zinc-900/90 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <span className="text-sm font-medium capitalize text-zinc-100">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                aria-label="Next month"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-y-1">
              {weekdayLabels.map((w, i) => (
                <span key={i} className="flex h-7 items-center justify-center text-[11px] font-medium text-zinc-500">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {cells.map(({ date, inMonth, iso }) => {
                const isSelected = !!selected && sameDay(date, selected);
                const isToday = sameDay(date, today);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => pick(iso)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                      isSelected
                        ? 'bg-[#CCFF00] font-bold text-black'
                        : inMonth
                          ? `text-zinc-100 hover:bg-white/10 ${isToday ? 'ring-1 ring-white/25' : ''}`
                          : 'text-zinc-600 hover:bg-white/5'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
