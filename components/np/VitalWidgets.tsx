'use client';

// components/np/VitalWidgets.tsx — the four wearable vitals on Vitals, each in its OWN form so the screen can be scanned
// at a glance instead of four identical sliders:
//   RhrWidget   a bold number over a glowing sparkline trend, with the labelled usual range
//   HrvWidget   the range slider with the usual corridor highlighted (wide translucent band + bright line)
//   TempWidget  a big variance badge (soft teal when normal, bronze when elevated)
//   RespWidget  a minimalist arc gauge
// All values arrive already computed and formatted by the page (demo accounts only; the page tags them "Demo · needs a wearable").

import type { ReactElement, ReactNode } from 'react';
import { cardClass, type CardTheme } from './cardTheme';
import { chipStyle } from './status';
import RangeSlider from './RangeSlider';
import Sparkline from './Sparkline';
import ArcGauge from './ArcGauge';

type Badge = { text: string; color: string };

function Shell({ theme, name, info, children, className = '' }: { theme: CardTheme; name: string; info?: ReactNode; children: ReactNode; className?: string }): ReactElement {
  return (
    <div className={`relative flex min-w-0 flex-col overflow-hidden p-4 ${cardClass(theme)} ${className}`}>
      <div className="relative z-10 flex items-start justify-between gap-1">
        <p className="min-w-0 truncate text-[11px] font-medium uppercase leading-5 tracking-widest text-white/75">{name}</p>
        {info}
      </div>
      {children}
    </div>
  );
}

function Pill({ badge }: { badge: Badge }): ReactElement {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium leading-4" style={chipStyle(badge.color)}>
      {badge.text}
    </span>
  );
}

const Num = ({ value, unit }: { value: string; unit?: string }): ReactElement => (
  <p className="relative z-10 mt-2 flex items-baseline gap-1">
    <span className="text-[34px] font-light leading-none tracking-tight text-white">{value}</span>
    {unit && <span className="text-xs text-white/60">{unit}</span>}
  </p>
);

/** Resting heart rate: bold number, glowing trend line behind it, usual range written out. */
export function RhrWidget({
  name,
  value,
  unit,
  badge,
  trend,
  usual,
  info,
}: {
  name: string;
  value: string;
  unit: string;
  badge: Badge;
  trend: number[];
  usual: { min: string; max: string; minWord: string; maxWord: string };
  info?: ReactNode;
}): ReactElement {
  return (
    <Shell theme="sleep" name={name} info={info} className="min-h-[196px]">
      {/* the glowing trend sits behind the numbers, like a skyline of the last days */}
      <div aria-hidden className="pointer-events-none absolute inset-x-4 bottom-12 opacity-80">
        <Sparkline values={trend} color="#3FE0A8" glow className="!h-10" />
      </div>
      <Num value={value} unit={unit} />
      <div className="relative z-10 mt-2">
        <Pill badge={badge} />
      </div>
      <div className="relative z-10 mt-auto flex justify-between pt-3 font-mono text-[11px] leading-tight text-white/60">
        <span className="flex flex-col">
          <span>{usual.min}</span>
          <span className="font-sans text-[10px] text-white/50">{usual.minWord}</span>
        </span>
        <span className="flex flex-col items-end">
          <span>{usual.max}</span>
          <span className="font-sans text-[10px] text-white/50">{usual.maxWord}</span>
        </span>
      </div>
    </Shell>
  );
}

/** HRV: the range slider, with the usual corridor as a wide high-contrast band. */
export function HrvWidget({
  name,
  value,
  unit,
  num,
  badge,
  lo,
  hi,
  loText,
  hiText,
  words,
  pin,
  info,
}: {
  name: string;
  value: string;
  unit: string;
  num: number;
  badge: Badge;
  lo: number;
  hi: number;
  loText: string;
  hiText: string;
  words: [string, string];
  pin: string;
  info?: ReactNode;
}): ReactElement {
  return (
    <Shell theme="readiness" name={name} info={info} className="min-h-[196px]">
      <Num value={value} unit={unit} />
      <div className="mt-2">
        <Pill badge={badge} />
      </div>
      <div className="mt-auto pt-4">
        <RangeSlider value={num} min={lo - 10} max={hi + 10} range={{ lo, hi }} color="#2FD8F0" label={`${name} ${value} ${unit}`} pin={pin} endLabels={[loText, hiText]} endCaptions={words} />
      </div>
    </Shell>
  );
}

/** Skin temperature: one big variance badge, colour = state. */
export function TempWidget({
  name,
  value,
  state,
  color,
  usual,
  info,
}: {
  name: string;
  value: string;
  state: string;
  color: string;
  usual: string;
  info?: ReactNode;
}): ReactElement {
  return (
    <Shell theme="sleep" name={name} info={info} className="min-h-[196px]">
      <div className="mt-4 flex flex-1 flex-col items-start justify-center gap-2">
        <span className="inline-flex items-center rounded-2xl border px-4 py-2 text-[28px] font-light leading-none tracking-tight" style={chipStyle(color)}>
          {value}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: chipStyle(color).color }}>
          {state}
        </span>
      </div>
      <p className="font-mono text-[11px] text-white/60">{usual}</p>
    </Shell>
  );
}

/** Respiratory rate: a compact arc gauge. */
export function RespWidget({
  name,
  value,
  num,
  unit,
  lo,
  hi,
  loText,
  hiText,
  words,
  info,
}: {
  name: string;
  value: string;
  num: number;
  unit: string;
  lo: number;
  hi: number;
  loText: string;
  hiText: string;
  words: [string, string];
  info?: ReactNode;
}): ReactElement {
  return (
    <Shell theme="sleep" name={name} info={info} className="min-h-[196px]">
      <div className="mt-auto pt-3">
        <ArcGauge value={num} min={lo - 2} max={hi + 2} lo={lo} hi={hi} color="#3FE0A8" display={value} unit={unit} label={`${name} ${value} ${unit}`} endLabels={[loText, hiText]} endCaptions={words} />
      </div>
    </Shell>
  );
}
