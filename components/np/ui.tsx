'use client';

// components/np/ui.tsx — small shared pieces of the v3 screens.

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import type { ReadinessZone } from '@/lib/readiness-engine';

/** Readiness zone → colours. The zone itself always comes from the engine (green ≥ 75, yellow 50–74, red < 50). */
export const ZONE: Record<ReadinessZone, { from: string; to: string; glow: string; pill: string; dot: string; text: string; hex: string }> = {
  green: { from: '#00E676', to: '#69F0AE', glow: 'rgb(0 230 118 / 0.28)', pill: 'np-pill-good', dot: 'bg-np-good', text: 'text-np-good', hex: '#00E676' },
  yellow: { from: '#FFD600', to: '#FFAB00', glow: 'rgb(255 214 0 / 0.26)', pill: 'np-pill-warn', dot: 'bg-np-warn', text: 'text-np-warn', hex: '#FFD600' },
  red: { from: '#FF3D00', to: '#FF6E40', glow: 'rgb(255 61 0 / 0.26)', pill: 'np-pill-danger', dot: 'bg-np-danger', text: 'text-np-danger', hex: '#FF3D00' },
};

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
