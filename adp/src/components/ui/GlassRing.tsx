'use client';

// adp/src/components/ui/GlassRing.tsx
//
// A thin progress ring with a soft glow, for timers and scores on glass.
// The number inside is the child, so it keeps full text contrast.

import { useId, type ReactElement, type ReactNode } from 'react';

export default function GlassRing({
  value,
  max = 100,
  size,
  stroke = 5,
  color,
  track = 'rgba(255,255,255,0.12)',
  children,
}: {
  value: number;
  max?: number;
  size: number;
  stroke?: number;
  color: string;
  track?: string;
  children?: ReactNode;
}): ReactElement {
  const id = `gr${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div aria-hidden className="absolute inset-[10%] rounded-full" style={{ boxShadow: `0 0 ${Math.round(size / 3)}px -${Math.round(size / 10)}px ${color}` }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" aria-hidden style={{ filter: `drop-shadow(0 0 4px ${color}99)` }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          style={{ transition: 'stroke-dasharray 900ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
