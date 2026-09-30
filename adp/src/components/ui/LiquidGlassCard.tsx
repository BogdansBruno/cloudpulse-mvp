'use client';

// adp/src/components/ui/LiquidGlassCard.tsx
//
// A card of liquid glass: 30px backdrop blur over whatever colour sits
// behind it, a double highlight border (bright inset top edge + faint inset
// bottom edge + thin outer rim), a 32px squircle. On a pointer device a soft
// "refraction" light follows the cursor across the glass and the rim light
// brightens — the same easing as the buttons.

import { useRef, useState, type CSSProperties, type ElementType, type PointerEvent, type ReactElement, type ReactNode } from 'react';
import { EASE_GLASS, glassSurface, type GlassTone } from './liquidGlass';

export default function LiquidGlassCard({
  as: Tag = 'section',
  tone = 'dark',
  interactive = true,
  radius = 32,
  className = '',
  style,
  children,
  ...aria
}: {
  as?: ElementType;
  tone?: GlassTone;
  /** Hover lift + light that follows the pointer. */
  interactive?: boolean;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}): ReactElement {
  const ref = useRef<HTMLElement>(null);
  const [hover, setHover] = useState(false);
  const [pt, setPt] = useState({ x: 30, y: 0 });

  const move = (e: PointerEvent<HTMLElement>) => {
    if (!interactive || e.pointerType !== 'mouse') return;
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <Tag
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...glassSurface(tone, interactive && hover),
        borderRadius: radius,
        color: tone === 'dark' ? '#F8FAFC' : '#0B1024',
        // No lift on cards: moving a large blurred layer can soften its text
        // for a frame. Cards react with light only; buttons do the physics.
        transition: `box-shadow 420ms ${EASE_GLASS}, background 420ms ${EASE_GLASS}`,
        ...style,
      }}
      onPointerEnter={(e: PointerEvent<HTMLElement>) => {
        if (interactive && e.pointerType === 'mouse') setHover(true);
      }}
      onPointerLeave={() => setHover(false)}
      onPointerMove={move}
      {...aria}
    >
      {/* rim light along the top edge */}
      <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)' }} />
      {/* refraction light that follows the pointer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(60% 45% at ${pt.x}% ${pt.y}%, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%)`,
          opacity: hover ? 1 : 0,
          transition: `opacity 500ms ${EASE_GLASS}`,
        }}
      />
      <div className="relative">{children}</div>
    </Tag>
  );
}
