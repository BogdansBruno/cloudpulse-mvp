'use client';

// components/np/ScoreDial.tsx — a small readiness dial (ring + number) for places where the big
// hero ring does not fit: the live preview on the check-in screen, the chat sidebar.
// The arc colour is the ENGINE zone, never its own thresholds; no score → an empty track and a dash.

import type { ReactElement } from 'react';
import type { ReadinessZone } from '@/lib/readiness-engine';
import { ZONE } from './ui';

const R = 40;
const C = 2 * Math.PI * R;

export default function ScoreDial({
  score,
  zone,
  size = 64,
  label,
}: {
  score: number | null;
  zone: ReadinessZone | null;
  size?: number;
  /** Screen-reader text, e.g. "Готовность: 58 / 100, Жёлтая зона". */
  label: string;
}): ReactElement {
  const Z = score !== null && zone !== null ? ZONE[zone] : null;
  const fill = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" fill="none" aria-hidden>
        <circle cx="50" cy="50" r={R} stroke="rgb(255 255 255 / 0.08)" strokeWidth="9" />
        {Z && (
          <circle
            cx="50"
            cy="50"
            r={R}
            stroke={Z.hex}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C.toFixed(1)}
            strokeDashoffset={(C * (1 - fill)).toFixed(1)}
            style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.4, 0, 0.2, 1), stroke 200ms', filter: `drop-shadow(0 0 4px ${Z.glow})` }}
          />
        )}
      </svg>
      <span aria-hidden className="np-num absolute inset-0 flex items-center justify-center text-xl text-np-text" style={{ fontSize: size * 0.34 }}>
        {score === null ? '—' : score}
      </span>
    </div>
  );
}
