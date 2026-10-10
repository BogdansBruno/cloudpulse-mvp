'use client';

// components/np/SegmentedScale.tsx — the 1–7 answer of the check-in (Lotus): seven big pills in a row,
// each a full-height touch target (h-12, 7 equal columns), red → amber → green from 1 to 7 (7 = best on
// every scale, so the colour always reads the same way). Pills up to the answer stay lit like a meter,
// the chosen one is solid with a glow. A 6 ms tick of vibration per change where the phone has it,
// arrow keys / Home / End on a keyboard (radio-group semantics), the number is always printed — colour
// is never the only carrier of meaning.

import { type KeyboardEvent, type ReactElement } from 'react';
import { useReducedMotion } from './ui';

const RED: [number, number, number] = [255, 59, 48]; // #FF3D5A
const AMBER: [number, number, number] = [255, 204, 0]; // #FFC53D
const GREEN: [number, number, number] = [48, 209, 88]; // #3FE0A8

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

/** red (1) → amber (middle) → green (max) */
export function scaleRgb(n: number, max: number): [number, number, number] {
  const t = max <= 1 ? 1 : (n - 1) / (max - 1);
  return t < 0.5 ? mix(RED, AMBER, t * 2) : mix(AMBER, GREEN, (t - 0.5) * 2);
}

export function SegmentedScale({
  value,
  max = 7,
  onChange,
  label,
  valueText,
}: {
  value: number;
  max?: number;
  onChange: (v: number) => void;
  label: string;
  valueText?: (v: number) => string;
}): ReactElement {
  const reduce = useReducedMotion();
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
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(value + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(value - 1);
    else if (e.key === 'Home') set(1);
    else if (e.key === 'End') set(max);
    else return;
    e.preventDefault();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const [r, g, b] = scaleRgb(n, max);
        const rgb = `${r} ${g} ${b}`;
        const on = n === value;
        const lit = n < value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={valueText ? `${n}: ${valueText(n)}` : `${n} / ${max}`}
            tabIndex={on ? 0 : -1}
            onClick={() => set(n)}
            className={`h-14 w-full select-none rounded-xl border text-[17px] font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
              reduce ? '' : 'transition-[background-color,border-color,box-shadow,transform,color] duration-150 ease-out active:scale-90'
            } ${on ? (reduce ? '' : 'scale-[1.06]') : ''}`}
            style={{
              backgroundColor: on ? `rgb(${rgb})` : lit ? `rgb(${rgb} / 0.22)` : `rgb(${rgb} / 0.08)`,
              borderColor: on ? `rgb(${rgb})` : lit ? `rgb(${rgb} / 0.45)` : 'rgb(255 255 255 / 0.1)',
              color: on ? '#0B0D11' : 'rgb(243 244 246 / 0.85)',
              boxShadow: on ? `0 0 20px rgb(${rgb} / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.35)` : 'inset 0 1px 0 rgb(255 255 255 / 0.06)',
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
