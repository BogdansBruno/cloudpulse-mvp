'use client';

// Liquid Glass — the small pieces every glass widget shares: the ambient
// light mesh behind the cards, glass pills, the glowing hairline ring and the
// section label. Animations are CSS (keyframes live in GLASS_CSS) and stop
// for people who ask for reduced motion.

import { useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Ring } from '../shared';
import { THEMES } from '../themeStyles';

const t = THEMES.glass;

/** Keyframes for the glass direction; injected once by the studio. */
export const GLASS_CSS = `
@keyframes dx-drift-a { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(8%,6%,0) scale(1.12); } }
@keyframes dx-drift-b { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 50% { transform: translate3d(-10%,4%,0) scale(0.92); } }
@keyframes dx-drift-c { 0%,100% { transform: translate3d(0,0,0) scale(0.95); } 50% { transform: translate3d(6%,-8%,0) scale(1.1); } }
@keyframes dx-breathe { 0%,100% { opacity: 0.45; transform: scale(0.98); } 50% { opacity: 0.9; transform: scale(1.03); } }
.dx-blob { position: absolute; border-radius: 9999px; filter: blur(70px); will-change: transform; }
.dx-drift-a { animation: dx-drift-a 22s ease-in-out infinite; }
.dx-drift-b { animation: dx-drift-b 28s ease-in-out infinite; }
.dx-drift-c { animation: dx-drift-c 34s ease-in-out infinite; }
.dx-breathe { animation: dx-breathe 4.2s ease-in-out infinite; transform-origin: 50% 50%; }
@media (prefers-reduced-motion: reduce) {
  .dx-drift-a, .dx-drift-b, .dx-drift-c, .dx-breathe { animation: none !important; }
}
`;

/**
 * Soft moving colour behind the glass. Emerald = safe, amber = a "storm"
 * (exam window / yellow or red zone), indigo + cyan = the base light.
 */
export function AmbientMesh({ storm, fixed = false }: { storm: boolean; fixed?: boolean }): ReactElement {
  const layer = useRef<HTMLDivElement>(null);
  // Parallax: when fixed behind the page, the light drifts a little slower
  // than the scroll, so the colour behind each glass card keeps changing.
  useEffect(() => {
    if (!fixed || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (layer.current) layer.current.style.transform = `translate3d(0, ${(-window.scrollY * 0.18).toFixed(1)}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [fixed]);
  const box: CSSProperties = { position: fixed ? 'fixed' : 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 };
  return (
    <div aria-hidden style={box}>
      <div ref={layer} style={{ position: 'absolute', inset: fixed ? '0 0 -60% 0' : 0, willChange: 'transform' }}>
        <div className="dx-blob dx-drift-a" style={{ width: '46vmax', height: '46vmax', left: '-12vmax', top: '-10vmax', background: 'radial-gradient(circle, rgba(99,102,241,0.72), rgba(99,102,241,0) 70%)' }} />
        <div className="dx-blob dx-drift-b" style={{ width: '40vmax', height: '40vmax', right: '-10vmax', top: '6%', background: 'radial-gradient(circle, rgba(34,211,238,0.55), rgba(34,211,238,0) 70%)' }} />
        <div className="dx-blob dx-drift-c" style={{ width: '38vmax', height: '38vmax', left: '6%', top: '38%', background: 'radial-gradient(circle, rgba(236,72,153,0.38), rgba(236,72,153,0) 70%)' }} />
        <div className="dx-blob dx-drift-b" style={{ width: '40vmax', height: '40vmax', left: '-6vmax', bottom: '-8vmax', background: 'radial-gradient(circle, rgba(52,211,153,0.50), rgba(52,211,153,0) 70%)' }} />
        <div
          className="dx-blob dx-drift-a"
          style={{
            width: '34vmax',
            height: '34vmax',
            right: '2%',
            bottom: '12%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.50), rgba(251,191,36,0) 70%)',
            opacity: storm ? 1 : 0.25,
            transition: 'opacity 1.2s ease',
          }}
        />
      </div>
    </div>
  );
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
