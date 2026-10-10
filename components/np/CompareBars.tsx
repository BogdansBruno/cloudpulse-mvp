'use client';

// components/np/CompareBars.tsx — "now against your own history": three thin horizontal bars for one metric —
// the 30-day average, the 60-day average and the goal (a hatched bar). Tap a bar to see its value in a floating pin.
// Tag chips under the title say which part of the body the metric speaks about.
// A missing average (fewer than 5 real values) is drawn as an empty track with "—"; nothing is estimated.

import { useState, type ReactElement } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { INFO } from './infoCopy';

type Lang = 'en' | 'ru' | 'lv';

const CMP: Record<Lang, { goal: string; tags: Record<'heart' | 'recovery' | 'muscles' | 'nerves', string> }> = {
  en: { goal: 'Goal', tags: { heart: 'Heart', recovery: 'Recovery', muscles: 'Muscles', nerves: 'Nervous system' } },
  ru: { goal: 'Цель', tags: { heart: 'Сердце', recovery: 'Восстановление', muscles: 'Мышцы', nerves: 'Нервная система' } },
  lv: { goal: 'Mērķis', tags: { heart: 'Sirds', recovery: 'Atjaunošanās', muscles: 'Muskuļi', nerves: 'Nervu sistēma' } },
};

export type CompareTag = 'heart' | 'recovery' | 'muscles' | 'nerves';

export default function CompareBars({
  avg30,
  avg60,
  goal,
  goalRange,
  max,
  min = 0,
  unit,
  decimals = 0,
  color,
  tags,
  label,
}: {
  avg30: number | null;
  avg60: number | null;
  /** a single goal value, drawn as a hatched bar from `min` */
  goal?: number | null;
  /** or a goal band (e.g. the load target 41 – 75), drawn as a hatched stretch */
  goalRange?: { lo: number; hi: number } | null;
  max: number;
  min?: number;
  unit?: string;
  decimals?: number;
  color: string;
  tags?: CompareTag[];
  label: string;
}): ReactElement {
  const { lang } = useLanguage();
  const c = INFO[lang].baseline;
  const t = CMP[lang];
  const [sel, setSel] = useState<number | null>(null);
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const fmt = (v: number) => v.toFixed(decimals);

  type Row = { key: string; name: string; from: number; to: number | null; text: string; hatched?: boolean };
  const rows: Row[] = [
    { key: 'a30', name: c.avg30, from: min, to: avg30, text: avg30 !== null ? `${fmt(avg30)}${unit ? ` ${unit}` : ''}` : '—' },
    { key: 'a60', name: c.avg60, from: min, to: avg60, text: avg60 !== null ? `${fmt(avg60)}${unit ? ` ${unit}` : ''}` : '—' },
  ];
  if (goalRange) rows.push({ key: 'goal', name: t.goal, from: goalRange.lo, to: goalRange.hi, text: `${fmt(goalRange.lo)} – ${fmt(goalRange.hi)}`, hatched: true });
  else if (goal != null) rows.push({ key: 'goal', name: t.goal, from: min, to: goal, text: `${fmt(goal)}${unit ? ` ${unit}` : ''}`, hatched: true });

  return (
    <div aria-label={label} role="group">
      {tags && tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((k) => (
            <span key={k} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/75">
              {t.tags[k]}
            </span>
          ))}
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((r, i) => {
          const shown = sel === i;
          return (
            <li key={r.key}>
              <button
                type="button"
                aria-pressed={shown}
                aria-label={`${r.name}: ${r.text}`}
                onClick={() => setSel(shown ? null : i)}
                className="block w-full text-left"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] text-white/60">{r.name}</span>
                  <span className="font-mono text-[13px]" style={{ color: shown ? color : 'rgba(255,255,255,0.9)' }}>
                    {r.text}
                  </span>
                </span>
                <span className="relative mt-1.5 block h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  {r.to !== null && (
                    <span
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: `${pct(r.from)}%`,
                        width: `${Math.max(1.5, pct(r.to) - pct(r.from))}%`,
                        background: r.hatched
                          ? `repeating-linear-gradient(135deg, ${color}99 0 3px, transparent 3px 7px)`
                          : `linear-gradient(90deg, ${color}66, ${color})`,
                        boxShadow: shown && !r.hatched ? `0 0 10px ${color}88` : undefined,
                        border: r.hatched ? `1px solid ${color}88` : undefined,
                      }}
                    />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
