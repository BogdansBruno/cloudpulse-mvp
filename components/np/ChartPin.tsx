// components/np/ChartPin.tsx — the floating callout shared by every chart: a small #1E242D pill with a soft shadow.
// Position it with `left` in % of the chart width; the pill slides along (its own left edge at 0 %, its right edge at 100 %) so it never leaves the card.

import type { ReactElement, ReactNode } from 'react';

export function ChartPin({ left, children, className = '' }: { left: number; children: ReactNode; className?: string }): ReactElement {
  return (
    <span
      className={`pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-full bg-[#1E242D] px-3 py-1.5 font-mono text-[11px] leading-none text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${className}`}
      style={{ left: `${Math.min(100, Math.max(0, left))}%`, transform: `translateX(-${Math.min(100, Math.max(0, left))}%)` }}
    >
      {children}
    </span>
  );
}
