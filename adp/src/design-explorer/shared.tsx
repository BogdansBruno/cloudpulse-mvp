'use client';

// adp/src/design-explorer/shared.tsx
//
// Behaviour shared by the three directions, so each theme differs only in how
// it LOOKS: the soreness editor (same rules as the product: sorenessMap.ts),
// the drill timer, the QR code, a themable ring and a themable silhouette.

import { useCallback, useEffect, useId, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { toDataURL } from 'qrcode';
import type { BodyZone, SilhouetteView, SorenessSeverity } from '../types/sportProfile';
import {
  athleteHalf,
  halvesOf,
  setSeverity,
  severityAt,
  type Half,
  type SorenessMap,
} from '../components/sorenessMap';
import { BodyOutline, MIRROR, SILHOUETTE_H, SILHOUETTE_SHAPES, SILHOUETTE_W, ShapeEl } from '../components/SorenessSilhouette';

// ---------------------------------------------------------------------------
// Soreness editor
// ---------------------------------------------------------------------------

export type ActiveZone = { zone: BodyZone; half: Half };

export function useSorenessEditor(value: SorenessMap, onChange: (m: SorenessMap) => void) {
  const [active, setActive] = useState<ActiveZone | null>(null);
  const [tooMany, setTooMany] = useState(false);

  const toggle = useCallback((zone: BodyZone, half: Half) => {
    setTooMany(false);
    setActive((a) => (a && a.zone === zone && a.half === half ? null : { zone, half }));
  }, []);

  const choose = useCallback(
    (severity: SorenessSeverity | null) => {
      if (!active) return;
      // Paired zones: mark both sides at once — the common case, one tap fewer.
      const halves: Half[] = active.half === 'center' ? ['center'] : ['left', 'right'];
      const r = setSeverity(value, active.zone, halves, severity);
      if (!r.ok) {
        setTooMany(true);
        return;
      }
      onChange(r.map);
      if (severity === null) setActive(null);
    },
    [active, value, onChange]
  );

  const current = active ? severityAt(value, active.zone, active.half) : null;
  return { active, toggle, choose, current, tooMany, clear: () => onChange([]), close: () => setActive(null) };
}

export type SilhouetteColors = {
  outlineFill: string;
  outlineStroke: string;
  zoneIdle: string;
  zoneStroke: string;
  activeStroke: string;
  severity: (s: SorenessSeverity) => string;
  /** Opacity suffix for a filled zone, e.g. 'CC'. */
  fillAlpha?: string;
  glow?: boolean;
};

/** A themable body: every muscle zone is a keyboard-focusable button. */
export function SilhouetteSvg({
  view,
  value,
  active,
  onTap,
  colors,
  label,
  zoneName,
  className = '',
}: {
  view: SilhouetteView;
  value: SorenessMap;
  active: ActiveZone | null;
  onTap: (zone: BodyZone, half: Half) => void;
  colors: SilhouetteColors;
  label: string;
  zoneName: (z: BodyZone) => string;
  className?: string;
}): ReactElement {
  const alpha = colors.fillAlpha ?? 'CC';
  const render = (zone: BodyZone, shape: (typeof SILHOUETTE_SHAPES)['front'][number]['shape'], mirrored: boolean) => {
    const half = athleteHalf(zone, view, mirrored);
    const sev = severityAt(value, zone, half);
    const isActive = active?.zone === zone && (active.half === half || active.half !== 'center');
    const color = sev ? colors.severity(sev) : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onTap(zone, half);
      }
    };
    const el = (
      <ShapeEl
        shape={shape}
        role="button"
        tabIndex={0}
        aria-pressed={sev !== null}
        aria-label={`${zoneName(zone)}${sev ? ` ${sev}/5` : ''}`}
        onClick={() => onTap(zone, half)}
        onKeyDown={onKey}
        style={{
          cursor: 'pointer',
          fill: color ? `${color}${alpha}` : colors.zoneIdle,
          stroke: isActive ? colors.activeStroke : color ?? colors.zoneStroke,
          strokeWidth: isActive ? 2 : 1,
          filter: color && colors.glow ? `drop-shadow(0 0 8px ${color}80)` : undefined,
          transition: 'fill 150ms, stroke 150ms',
          outline: 'none',
        }}
      />
    );
    return mirrored ? (
      <g key={`${zone}-m`} transform={MIRROR}>
        {el}
      </g>
    ) : (
      <g key={zone}>{el}</g>
    );
  };

  return (
    <svg viewBox={`0 0 ${SILHOUETTE_W} ${SILHOUETTE_H}`} className={className} role="group" aria-label={label}>
      <BodyOutline fill={colors.outlineFill} stroke={colors.outlineStroke} />
      {SILHOUETTE_SHAPES[view].map((z) =>
        halvesOf(z.zone)[0] === 'center' ? render(z.zone, z.shape, false) : [render(z.zone, z.shape, false), render(z.zone, z.shape, true)]
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Ring
// ---------------------------------------------------------------------------

export function Ring({
  value,
  max = 100,
  size,
  stroke,
  color,
  track,
  gradient,
  cap = 'round',
  children,
}: {
  value: number;
  max?: number;
  size: number;
  stroke: number;
  color: string;
  track: string;
  /** Two colours for a gradient stroke (optional). */
  gradient?: [string, string];
  cap?: 'round' | 'butt';
  children?: ReactNode;
}): ReactElement {
  const id = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        {gradient && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={gradient[0]} />
              <stop offset="100%" stopColor={gradient[1]} />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={gradient ? `url(#${id})` : color}
          strokeWidth={stroke}
          strokeLinecap={cap}
          strokeDasharray={`${c * p} ${c}`}
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// Drill timer — lives in ../services/drillTimer (the /training screen uses it too).
export { mmss, useDrillTimer } from '../services/drillTimer';

// ---------------------------------------------------------------------------
// QR
// ---------------------------------------------------------------------------

export function useQr(text: string, dark: string, light: string): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    toDataURL(text, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark, light } })
      .then((u) => !cancelled && setSrc(u))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [text, dark, light]);
  return src;
}

/** "A7F319C2" → "A7F3-19C2". */
export function formatId(id: string): string {
  return `${id.slice(0, 4)}-${id.slice(4)}`;
}
