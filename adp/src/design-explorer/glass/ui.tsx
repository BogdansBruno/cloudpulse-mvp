'use client';

// Liquid Glass — the small pieces every glass widget shares: the ambient
// light mesh behind the cards, glass pills, the glowing hairline ring and the
// section label. Animations are CSS (keyframes live in GLASS_CSS) and stop
// for people who ask for reduced motion.

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import Mesh from '../../components/ui/AmbientMesh';
import { Ring } from '../shared';
import { THEMES } from '../themeStyles';

const t = THEMES.glass;

/** Keyframes for the glass direction; injected once by the studio. */
export const GLASS_CSS = `
@keyframes dx-breathe { 0%,100% { opacity: 0.45; transform: scale(0.98); } 50% { opacity: 0.9; transform: scale(1.03); } }
.dx-breathe { animation: dx-breathe 4.2s ease-in-out infinite; transform-origin: 50% 50%; }
@media (prefers-reduced-motion: reduce) { .dx-breathe { animation: none !important; } }
`;

/** The light behind the glass — shared with the /training screen. */
export function AmbientMesh({ storm, fixed = false }: { storm: boolean; fixed?: boolean }): ReactElement {
  return <Mesh palette="liquid" storm={storm} fixed={fixed} />;
}

/** A small capsule of glass: tags, status chips, minute counters. */
export function GlassPill({
  children,
  color,
  strong = false,
  className = '',
}: {
  children: ReactNode;
  /** Optional status colour for the dot and the tint. */
  color?: string;
  strong?: boolean;
  className?: string;
}): ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-[12px] font-medium ${className}`}
      style={{
        background: color
          ? `linear-gradient(180deg, ${color}${strong ? '38' : '24'}, ${color}${strong ? '1C' : '10'})`
          : 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))',
        border: `1px solid ${color ? `${color}55` : 'rgba(255,255,255,0.16)'}`,
        borderRadius: t.radius.pill,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
        color: color && strong ? color : t.colors.text,
      }}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />}
      {children}
    </span>
  );
}

/** Thin glowing ring with a slow "breathing" halo behind it. */
export function GlowRing({
  value,
  max = 100,
  size,
  stroke,
  color,
  children,
}: {
  value: number;
  max?: number;
  size: number;
  stroke: number;
  color: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        aria-hidden
        className="dx-breathe absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 42px -6px ${color}, inset 0 0 36px -14px ${color}` }}
      />
      <div className="absolute inset-0" style={{ filter: `drop-shadow(0 0 6px ${color}AA)` }}>
        <Ring value={value} max={max} size={size} stroke={stroke} color={color} track={t.colors.track} gradient={[`${color}`, '#FFFFFF']} />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Quiet uppercase label above a group. */
export function Label({ children, className = '' }: { children: ReactNode; className?: string }): ReactElement {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-[0.16em] ${className}`} style={{ color: t.colors.textFaint }}>
      {children}
    </p>
  );
}

/** Inner glass well (a pane inside a card). */
export const WELL: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: t.radius.inner,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
};
