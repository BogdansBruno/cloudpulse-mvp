'use client';

// components/m/MetricSlider.tsx — one secondary metric as a thin horizontal
// scale: the light band is the athlete's norm, the dot is today. The dot
// always sits at the REAL value, also outside the norm — the status word
// says "below / above normal" in amber, so colour never carries it alone.

import type { ReactElement } from 'react';

export type MetricSliderProps = {
  label: string;
  /** Formatted value ("1.32", "2 310"); null → "—". */
  valueText: string | null;
  unit?: string;
  min: number;
  max: number;
  value: number | null;
  /** Norm band; null when there is no baseline yet. */
  norm: { from: number; to: number } | null;
  normText: string;
  words: { inNorm: string; belowNorm: string; aboveNorm: string };
};

export default function MetricSlider({ label, valueText, unit, min, max, value, norm, normText, words }: MetricSliderProps): ReactElement {
  const pct = (v: number) => `${(Math.max(0, Math.min(1, (v - min) / (max - min))) * 100).toFixed(2)}%`;
  const state = value === null || norm === null ? null : value < norm.from ? 'below' : value > norm.to ? 'above' : 'in';
  const stateWord = state === 'in' ? words.inNorm : state === 'below' ? words.belowNorm : state === 'above' ? words.aboveNorm : null;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ds-text-2">{label}</span>
        <span className="text-base font-medium text-ds-text">
          {valueText ?? '—'}
          {unit && valueText && <span className="ml-1 text-[13px] font-normal text-ds-text-3">{unit}</span>}
        </span>
      </div>

      <div
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value ?? undefined}
        aria-valuetext={[valueText ?? '—', stateWord, normText].filter(Boolean).join(', ')}
        className="relative mt-3 h-3"
      >
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-[1px] bg-ds-line" />
        {norm && (
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-[1px] bg-ds-text-2"
            style={{ left: pct(norm.from), width: `calc(${pct(norm.to)} - ${pct(norm.from)})` }}
          />
        )}
        {value !== null && (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ds-text ring-[3px] ring-ds-surface"
            style={{ left: pct(value) }}
          />
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-4 text-xs">
        <span className={state === 'in' ? 'text-ds-text-2' : 'text-ds-warn'}>{stateWord ?? ''}</span>
        <span className="text-ds-text-3">{normText}</span>
      </div>
    </div>
  );
}
