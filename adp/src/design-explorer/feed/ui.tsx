'use client';

// Night Feed — shared pieces: the floating card, the caps label, a thin
// gradient ring with a soft outer glow, a progress row, the metric colours,
// the serif verdict and the "you are here" range scale.

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Ring } from '../shared';
import { THEMES } from '../themeStyles';
import { MICRO_LABEL, VERDICT_STYLE } from '../../components/ui/typography';

const t = THEMES.feed;

/** Each metric owns one glow. Readiness uses its zone colour instead (safety first). */
export const METRIC = {
  sleep: ['#6366F1', '#4F46E5'] as [string, string],
  load: ['#F59E0B', '#D97706'] as [string, string],
  good: ['#2DD4BF', '#14B8A6'] as [string, string],
};

/**
 * Text-safe version of a metric colour: the deep indigo glow is fine for
 * rings and bars but too dark for small text, so text uses indigo-300.
 */
export function textSafe(color: string): string {
  return color === METRIC.sleep[0] || color === METRIC.sleep[1] ? '#A5B4FC' : color;
}

export function readinessGradient(zone: 'green' | 'yellow' | 'red'): [string, string] {
  if (zone === 'green') return METRIC.good;
  if (zone === 'yellow') return ['#FACC15', '#EAB308'];
  return ['#FB923C', '#F97316'];
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
        backdropFilter: 'blur(40px) saturate(150%)',
        WebkitBackdropFilter: 'blur(40px) saturate(150%)',
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
    <p className={`${MICRO_LABEL} ${className}`} style={{ color: color ? textSafe(color) : t.colors.textFaint }}>
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
    <h3 className={className} style={VERDICT_STYLE}>
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
        <span className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: inNorm ? t.colors.text : textSafe(color) }}>
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
          style={{ left: pos(value), background: '#FFFFFF', boxShadow: '0 0 0 3px rgba(12,13,18,0.9), 0 0 10px rgba(255,255,255,0.9)' }}
        />
        {hereLabel && (
          <span
            className={`absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 ${MICRO_LABEL}`}
            style={{ left: `clamp(48px, ${pos(value)}, calc(100% - 48px))`, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#FFFFFF' }}
          >
            {hereLabel}
          </span>
        )}
      </div>
      {note && (
        <p className="mt-1.5 text-[12px]" style={{ color: t.colors.textFaint }}>
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * Capsule buttons for Night Feed. `inline` — compact paired actions inside a
 * card; `cta` — the wide main action at the bottom of a card.
 */
export function PillButton({
  children,
  onClick,
  variant = 'inline',
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'inline' | 'cta';
  ariaLabel?: string;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={
        variant === 'cta'
          ? 'w-full rounded-full border border-white/20 bg-white/10 py-3.5 text-center text-sm font-medium text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20 active:scale-[0.98]'
          : 'inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-4 text-xs font-medium text-white transition-all duration-200 hover:bg-white/[0.15] active:scale-[0.96]'
      }
      style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12)' }}
    >
      {children}
    </button>
  );
}

/** Oval status tag on the right of a card header, with a chevron when tappable. */
export function StatusTag({ text, color, onClick }: { text: string; color: string; onClick?: () => void }): ReactElement {
  const c = textSafe(color);
  const body = (
    <>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
      {text}
      {onClick && (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
          <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  const cls = `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 ${MICRO_LABEL}`;
  const style = { background: `${c}1F`, border: `1px solid ${c}55`, color: c };
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {body}
    </button>
  ) : (
    <span className={cls} style={style}>
      {body}
    </span>
  );
}
