// components/np/Lotus.tsx — the brand mark: a seven-petal geometric flower.
// Seven teardrop petals, one every 360/7°, each a soft terracotta → amber gradient with low opacity so the
// overlaps glow; a small centre dot. Decorative (aria-hidden); `currentColor` is not used so it
// looks the same inside a white disc on any scope. The disc itself is `LotusDisc`.

import { useId, type ReactElement } from 'react';

const PETALS = 7;

export function LotusMark({ size = 24, className = '' }: { size?: number; className?: string }): ReactElement {
  const gid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id={`lotus-${gid}`} x1="24" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F25CA8" />
          <stop offset="1" stopColor="#FF6482" />
        </linearGradient>
      </defs>
      <g transform="translate(24 24)">
        {Array.from({ length: PETALS }, (_, i) => (
          <path
            key={i}
            transform={`rotate(${(360 / PETALS) * i})`}
            d="M0 -1.5 C 5.6 -7.5 5.6 -15.5 0 -20 C -5.6 -15.5 -5.6 -7.5 0 -1.5 Z"
            fill={`url(#lotus-${gid})`}
            fillOpacity="0.55"
            stroke="#D9657C"
            strokeOpacity="0.35"
            strokeWidth="0.6"
          />
        ))}
        <circle r="2.4" fill="#FFFFFF" stroke="#D9657C" strokeOpacity="0.5" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

/** The flower inside a white, translucent circular container. */
export function LotusDisc({ size = 40, className = '' }: { size?: number; className?: string }): ReactElement {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-[0_6px_18px_rgb(216_92_56/0.2)] backdrop-blur-xl ${className}`}
      style={{ width: size, height: size }}
    >
      <LotusMark size={Math.round(size * 0.62)} />
    </span>
  );
}
