'use client';

// components/np/ui.tsx — small shared pieces of the v3 screens.

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import type { ReadinessZone } from '@/lib/readiness-engine';

/** Readiness zone → colours. The zone itself always comes from the engine (green ≥ 75, yellow 50–74, red < 50). */
/** Colours of the engine zones (Lotus palette: sky blue · sage · terracotta) on the dark glass cards: `hex` for dots and rings, `stops` for the
 *  thin gradient arcs (emerald: mint → emerald → deep green, amber: sand → amber → sunset orange,
 *  coral: blush → coral → crimson), `ambient` for the soft light behind a hero ring. The zone ITSELF always comes
 *  from the engine (green ≥ 75, yellow 50–74, red < 50); text uses the scoped `text-np-*` tokens. */
export const ZONE: Record<
  ReadinessZone,
  { from: string; to: string; stops: [string, string, string]; glow: string; ambient: string; pill: string; dot: string; text: string; hex: string }
> = {
  green: {
    from: '#3FE0A8',
    to: '#B8F23C',
    stops: ['#3FE0A8', '#8CEB5A', '#B8F23C'],
    glow: 'rgb(184 242 60 / 0.40)',
    ambient: 'rgb(184 242 60 / 0.14)',
    pill: 'np-pill-good',
    dot: 'bg-np-good',
    text: 'text-np-good',
    hex: '#B8F23C',
  },
  yellow: {
    from: '#FFD66B',
    to: '#FFB020',
    stops: ['#FFD66B', '#FFC53D', '#FFB020'],
    glow: 'rgb(255 197 61 / 0.40)',
    ambient: 'rgb(255 197 61 / 0.14)',
    pill: 'np-pill-warn',
    dot: 'bg-np-warn',
    text: 'text-np-warn',
    hex: '#FFC53D',
  },
  red: {
    from: '#FF8A6B',
    to: '#FF3D5A',
    stops: ['#FF8A6B', '#FF5C6C', '#FF3D5A'],
    glow: 'rgb(255 92 108 / 0.42)',
    ambient: 'rgb(255 92 108 / 0.14)',
    pill: 'np-pill-danger',
    dot: 'bg-np-danger',
    text: 'text-np-danger',
    hex: '#FF5C6C',
  },
};

/** Glass Δ pill with a micro arrow: "▲ +6 к базе". */
export function DeltaPill({ delta, text, className = '' }: { delta: number; text: string; className?: string }): ReactElement {
  const d = delta > 0 ? 'M6 9.5V2.5M3 5.5l3-3 3 3' : delta < 0 ? 'M6 2.5v7M3 6.5l3 3 3-3' : 'M2.5 6h7M7 3.5 9.5 6 7 8.5';
  return (
    <span className={`np-delta ${className}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
      {text}
    </span>
  );
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function Card({ children, className = '', index = 0, as = 'section', labelledBy }: { children: ReactNode; className?: string; index?: number; as?: 'section' | 'div'; labelledBy?: string }): ReactElement {
  const Tag = as;
  return (
    <Tag className={`np-card np-enter ${className}`} style={{ ['--np-i' as string]: index }} aria-labelledby={labelledBy}>
      {children}
    </Tag>
  );
}

export function DemoTag({ children }: { children: ReactNode }): ReactElement {
  return <span className="np-pill shrink-0">{children}</span>;
}

/** h2 with the inherited font — the Dark Editorial skin turns bare headings into serif. */
export function Overline({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }): ReactElement {
  return (
    <h2 id={id} className={`np-overline ${className}`} style={{ fontFamily: 'inherit' }}>
      {children}
    </h2>
  );
}

export function fmt(lang: string, v: number, dp = 0): string {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v);
}
