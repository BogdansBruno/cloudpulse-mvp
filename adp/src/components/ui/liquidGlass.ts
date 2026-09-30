// adp/src/components/ui/liquidGlass.ts
//
// Shared optics and physics for the Liquid Glass surfaces.
//
// Physics: a real damped spring (stiffness 400, damping 25, mass 1) is
// sampled once and written as a CSS `linear()` easing, so the release
// overshoots and settles exactly like a spring without a JS animation loop.
// Browsers without `linear()` fall back to a cubic-bezier with overshoot.

import { useEffect, useState } from 'react';

/** Press-in curve from the spec. */
export const EASE_GLASS = 'cubic-bezier(0.32, 0.72, 0, 1)';

export type Spring = { stiffness: number; damping: number; mass?: number };

/**
 * Samples a spring going 0 → 1 and returns `{ easing, ms }`.
 * Underdamped springs overshoot above 1 — that is the "liquid" wobble.
 */
export function springEasing({ stiffness, damping, mass = 1 }: Spring, samples = 48): { easing: string; ms: number } {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  // Time until the motion is within 0.1 % of rest.
  const settle = zeta < 1 ? Math.log(1000) / (zeta * w0) : (6 / w0) * zeta;
  const at = (tt: number): number => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * tt) * (Math.cos(wd * tt) + ((zeta * w0) / wd) * Math.sin(wd * tt));
    }
    return 1 - Math.exp(-w0 * tt) * (1 + w0 * tt);
  };
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) pts.push((i === samples ? 1 : at((settle * i) / samples)).toFixed(4));
  return { easing: `linear(${pts.join(', ')})`, ms: Math.round(settle * 1000) };
}

/** The release spring from the spec. */
export const RELEASE = springEasing({ stiffness: 400, damping: 25 });

const FALLBACK_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** `linear()` support, checked once on the client. */
export function releaseEasing(): string {
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('transition-timing-function', 'linear(0, 1)')) {
    return RELEASE.easing;
  }
  return FALLBACK_SPRING;
}

/** True when the person asked the system for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export type GlassTone = 'dark' | 'light';

/** Glass surface optics from the spec (double highlight border). */
export function glassSurface(tone: GlassTone, lifted = false) {
  const dark = tone === 'dark';
  return {
    background: dark ? (lifted ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)') : lifted ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.15)',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.30)'}`,
    backdropFilter: 'blur(30px) saturate(170%)',
    WebkitBackdropFilter: 'blur(30px) saturate(170%)',
    boxShadow: lifted
      ? 'inset 0 1.5px 2px 0 rgba(255,255,255,0.80), inset 0 -1px 2px 0 rgba(255,255,255,0.18), 0 18px 40px -6px rgba(0,0,0,0.26)'
      : 'inset 0 1px 1.5px 0 rgba(255,255,255,0.65), inset 0 -1px 2px 0 rgba(255,255,255,0.15), 0 12px 32px -4px rgba(0,0,0,0.18)',
  } as const;
}
