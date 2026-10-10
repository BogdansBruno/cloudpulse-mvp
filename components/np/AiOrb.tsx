// components/np/AiOrb.tsx — the AI coach orb: a rotating violet → blue → cyan conic core
// with a breathing halo (CSS only, see .np-orb-live in app/np-theme.css). Faster while the
// coach is thinking, cyan halo while the microphone listens. Decorative: aria-hidden.

import type { CSSProperties, ReactElement } from 'react';

export type OrbState = 'idle' | 'thinking' | 'listening';

export default function AiOrb({ state = 'idle', size = 36, className = '' }: { state?: OrbState; size?: number; className?: string }): ReactElement {
  const style = {
    width: size,
    height: size,
    transition: 'transform 300ms',
    transform: state === 'thinking' ? 'scale(1.08)' : undefined,
    '--np-orb-speed': state === 'thinking' ? '1.4s' : state === 'listening' ? '3s' : '7s',
    '--np-orb-breathe': state === 'idle' ? '3.4s' : '1.1s',
    '--np-glow': state === 'listening' ? 'rgb(255 45 85 / 0.55)' : 'rgb(255 122 89 / 0.55)',
  } as CSSProperties;
  return (
    <span aria-hidden className={`np-orb-live inline-block shrink-0 rounded-full ${className}`} style={style}>
      <span className="np-orb-core" />
    </span>
  );
}
