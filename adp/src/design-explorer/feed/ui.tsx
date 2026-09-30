'use client';

// Night Feed — shared pieces: the floating card, the caps label, a thin
// gradient ring with a soft outer glow, a progress row, the metric colours,
// the serif verdict and the "you are here" range scale.

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Ring } from '../shared';
import { SERIF, THEMES } from '../themeStyles';

const t = THEMES.feed;

/** Each metric owns one glow. Readiness uses its zone colour instead (safety first). */
export const METRIC = {
  sleep: ['#6366F1', '#4F46E5'] as [string, string],
  load: ['#F59E0B', '#D97706'] as [string, string],
  good: ['#10B981', '#059669'] as [string, string],
};

export function readinessGradient(zone: 'green' | 'yellow' | 'red'): [string, string] {
  if (zone === 'green') return METRIC.good;
  if (zone === 'yellow') return ['#FBBF24', '#D97706'];
  return ['#FB7185', '#E11D48'];
}

/** A floating dark-glass card (#181922 at 80 % + blur); `glow` tints its top corner. */
export function FeedCard({
  children,
  glow,
  className = '',
  style,
}: {
  children: ReactNode;
  glow?: string;
  className?: string;
  style?: CSSProperties;
}): ReactElement {
  return (
    <section
      className={`relative overflow-hidden ${className}`}
      style={{
        background: glow ? `radial-gradient(120% 70% at 0% 0%, ${glow}26 0%, transparent 55%), ${t.colors.surface}` : t.colors.surface,
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.card,
        boxShadow: t.shadow.card,
        color: t.colors.text,
        fontFamily: t.font.body,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/** Small caps label: `tracking-widest text-[11px]`. */
export function Caps({ children, color, className = '' }: { children: ReactNode; color?: string; className?: string }): ReactElement {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-widest ${className}`} style={{ color: color ?? t.colors.textFaint }}>
      {children}
    </p>
  );
}

/** Thin gradient ring with a soft outer glow. */
export function GlowRing({
  value,
  max = 100,
  size,
  stroke,
  gradient,
  children,
}: {
  value: number;
  max?: number;
  size: number;
  stroke: number;
  gradient: [string, string];
  children?: ReactNode;
}): ReactElement {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div aria-hidden className="absolute inset-[12%] rounded-full" style={{ boxShadow: `0 0 ${Math.round(size / 3)}px -${Math.round(size / 12)}px ${gradient[0]}` }} />
      <div className="absolute inset-0" style={{ filter: `drop-shadow(0 0 ${Math.max(3, Math.round(stroke))}px ${gradient[0]}88)` }}>
        <Ring value={value} max={max} size={size} stroke={stroke} color={gradient[0]} track={t.colors.track} gradient={gradient} />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** A metric row: label + value on one line, a thin gradient bar below. */
export function MetricRow({
  label,
  value,
  sub,
  p,
  gradient,
}: {
  label: string;
  value: string;
  sub?: string;
  /** 0..1 */
  p: number;
  gradient: [string, string];
}): ReactElement {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[14px]" style={{ color: t.colors.textMuted }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: gradient[0], boxShadow: `0 0 8px ${gradient[0]}` }} />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
          {sub && (
            <span className="ml-1 text-[12px] font-normal" style={{ color: t.colors.textFaint }}>
              {sub}
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: t.colors.track }}>
        <div className="h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`, background: `linear-gradient(90deg, ${gradient[1]}, ${gradient[0]})` }} />
      </div>
    </div>
  );
}

/** Chevron used on tappable card headers. */
export function Chevron(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="m9 6 6 6-6 6" fill="none" stroke={t.colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const PILL_BTN: CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: t.radius.pill,
  color: t.colors.text,
};

/** The engine's verdict in the editorial serif — white, calm, short. */
export function Verdict({ children, className = '' }: { children: ReactNode; className?: string }): ReactElement {
  return (
    <h3 className={`text-[28px] leading-[1.15] ${className}`} style={{ fontFamily: SERIF, fontWeight: 500, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
      {children}
    </h3>
  );
}

/**
 * A factor on a capsule scale: the light band is the normal range, the white
 * dot is where the athlete is today. `hereLabel` shows the "you are here" tag.
 */
export function RangeScale({
  label,
  valueText,
  min,
  max,
  value,
  normFrom,
  normTo,
  color,
  hereLabel,
  note,
}: {
  label: string;
  valueText: string;
  min: number;
  max: number;
  value: number;
  normFrom: number;
  normTo: number;
  color: string;
  hereLabel?: string;
  note?: string;
}): ReactElement {
  const pos = (v: number) => `${(Math.max(0, Math.min(1, (v - min) / (max - min))) * 100).toFixed(1)}%`;
  const inNorm = value >= normFrom && value <= normTo;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px]" style={{ color: t.colors.textMuted }}>
          {label}
        </span>
        <span className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: inNorm ? t.colors.text : color }}>
          {valueText}
        </span>
      </div>
      <div className={`relative ${hereLabel ? 'mt-7' : 'mt-2.5'}`}>
        <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
        <div
          aria-hidden
          className="absolute top-0 h-2.5 rounded-full"
          style={{ left: pos(normFrom), width: `calc(${pos(normTo)} - ${pos(normFrom)})`, background: `linear-gradient(90deg, ${color}40, ${color}73)`, boxShadow: `0 0 12px -2px ${color}66` }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: pos(value), background: '#FFFFFF', boxShadow: `0 0 0 3px rgba(12,13,18,0.9), 0 0 14px ${inNorm ? color : '#FFFFFF'}` }}
        />
        {hereLabel && (
          <span
            className="absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{ left: `clamp(48px, ${pos(value)}, calc(100% - 48px))`, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#FFFFFF' }}
          >
            {hereLabel}
          </span>
        )}
      </div>
      {note && (
        <p className="mt-1.5 text-[11px]" style={{ color: t.colors.textFaint }}>
          {note}
        </p>
      )}
    </div>
  );
}
