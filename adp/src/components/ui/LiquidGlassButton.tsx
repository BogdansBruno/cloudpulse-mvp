'use client';

// adp/src/components/ui/LiquidGlassButton.tsx
//
// A capsule of liquid glass with press physics:
//   hover   — lifts 1px, the top highlight brightens, the glass gets lighter;
//   press   — squeezes instantly to ~0.94 with an uneven X/Y squash (the
//             capsule "gives" like viscous glass) and a radial glow lights up
//             exactly under the finger / cursor;
//   release — returns on a real spring (stiffness 400, damping 25) with a
//             small overshoot, written as a CSS linear() easing.
// Keyboard (Enter / Space) gets the same press. Reduced motion: no squash,
// no lift — only the light changes.

import { useCallback, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';
import { EASE_GLASS, RELEASE, glassSurface, releaseEasing, useReducedMotion, type GlassTone } from './liquidGlass';

export type LiquidGlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 'glass' = clear glass, 'primary' = bright frosted white, 'tint' = glass tinted with `tint`. */
  variant?: 'glass' | 'primary' | 'tint';
  tint?: string;
  tone?: GlassTone;
  size?: 'sm' | 'md' | 'lg';
  /** Selected state for tabs / segmented controls. */
  selected?: boolean;
};

const PAD = { sm: 'px-3 py-1 text-[13px]', md: 'px-4 py-1.5 text-[14px]', lg: 'px-5 py-2.5 text-[15px]' } as const;

export default function LiquidGlassButton({
  variant = 'glass',
  tint,
  tone = 'dark',
  size = 'md',
  selected = false,
  className = '',
  style,
  children,
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerEnter,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  ...rest
}: LiquidGlassButtonProps): ReactElement {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [pt, setPt] = useState({ x: 50, y: 50 });

  const at = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }, []);

  const lit = selected || variant === 'primary';
  const surface = glassSurface(tone, hover || pressed);
  const base: CSSProperties =
    variant === 'primary' || selected
      ? {
          background: hover ? 'linear-gradient(180deg, #FFFFFF, #EEF2F7)' : 'linear-gradient(180deg, #FFFFFF, #E2E8F0)',
          color: '#0B1024',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: `inset 0 1px 1.5px rgba(255,255,255,1), inset 0 -1px 2px rgba(15,23,42,0.14), 0 8px 24px -8px rgba(255,255,255,${hover ? 0.6 : 0.4})`,
        }
      : variant === 'tint' && tint
        ? {
            ...surface,
            background: `linear-gradient(180deg, ${tint}${hover || pressed ? '66' : '4D'}, ${tint}26)`,
            border: `1px solid ${tint}99`,
            color: '#FFFFFF',
          }
        : { ...surface, color: tone === 'dark' ? '#F8FAFC' : '#0B1024' };

  // Squash: instant in, spring out. The uneven X/Y is the "liquid" give.
  const transform = reduced ? 'none' : pressed ? 'scale(0.955, 0.925)' : hover ? 'translateY(-1px) scale(1.015)' : 'none';
  const transition = pressed
    ? `transform 110ms ${EASE_GLASS}, box-shadow 110ms ${EASE_GLASS}, background 110ms ${EASE_GLASS}`
    : `transform ${RELEASE.ms}ms ${releaseEasing()}, box-shadow 320ms ${EASE_GLASS}, background 320ms ${EASE_GLASS}`;

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-pressed={rest.role ? undefined : selected || undefined}
      className={`relative inline-flex select-none items-center justify-center gap-2 overflow-hidden font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40 ${PAD[size]} ${className}`}
      style={{
        ...base,
        borderRadius: 9999,
        transform,
        transition,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        ...style,
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setHover(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setHover(false);
        setPressed(false);
        onPointerLeave?.(e);
      }}
      onPointerDown={(e) => {
        if (!disabled) {
          at(e);
          setPressed(true);
        }
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setPressed(false);
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        setPressed(false);
        onPointerCancel?.(e);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
          setPt({ x: 50, y: 50 });
          setPressed(true);
        }
        onKeyDown?.(e);
      }}
      onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
        setPressed(false);
        onKeyUp?.(e);
      }}
      {...rest}
    >
      {/* specular sheen on the top half */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{ background: `linear-gradient(180deg, rgba(255,255,255,${lit ? 0.5 : hover ? 0.22 : 0.14}), rgba(255,255,255,0))`, borderRadius: 'inherit', transition: `opacity 300ms ${EASE_GLASS}` }}
      />
      {/* contact glow under the finger */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${pt.x}% ${pt.y}%, rgba(255,255,255,${lit ? 0.7 : 0.55}) 0%, rgba(255,255,255,0.12) 28%, rgba(255,255,255,0) 60%)`,
          opacity: pressed ? 1 : 0,
          transition: pressed ? 'opacity 60ms linear' : `opacity 420ms ${EASE_GLASS}`,
          mixBlendMode: lit ? 'normal' : 'screen',
        }}
      />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
