'use client';

// Liquid Glass — soreness map: a clean hairline figure on dark glass, sore
// muscles as soft glowing translucent overlays, a glass sheet with capsule
// buttons to pick the level.

import type { ReactElement } from 'react';
import { SORENESS_LABELS, type AdpLang } from '../../components/labels';
import { isReferred, type SorenessMap } from '../../components/sorenessMap';
import { SORENESS_SEVERITIES } from '../../types/sportProfile';
import LiquidGlassButton from '../../components/ui/LiquidGlassButton';
import LiquidGlassCard from '../../components/ui/LiquidGlassCard';
import { DX } from '../copy';
import { SilhouetteSvg, useSorenessEditor } from '../shared';
import { THEMES, severityColor } from '../themeStyles';
import { GlassPill, WELL } from './ui';

const t = THEMES.glass;

export default function SorenessSilhouetteWidget({
  lang,
  value,
  onChange,
}: {
  lang: AdpLang;
  value: SorenessMap;
  onChange: (m: SorenessMap) => void;
}): ReactElement {
  const c = DX[lang].soreness;
  const L = SORENESS_LABELS[lang];
  const ed = useSorenessEditor(value, onChange);
  const colors = {
    outlineFill: 'rgba(255,255,255,0.04)',
    outlineStroke: 'rgba(255,255,255,0.28)',
    zoneIdle: 'rgba(255,255,255,0.045)',
    zoneStroke: 'rgba(255,255,255,0.16)',
    activeStroke: '#FFFFFF',
    severity: (s: 1 | 2 | 3 | 4 | 5) => severityColor(t, s),
    fillAlpha: '99',
    glow: true,
  };

  return (
    <LiquidGlassCard className="p-6">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{c.title}</h3>
        <GlassPill>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.marked(value.length)}</span>
        </GlassPill>
      </header>
      <p className="mt-1 text-[13px] font-light" style={{ color: t.colors.textMuted }}>
        {c.hint}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {(['front', 'back'] as const).map((v) => (
          <figure key={v} className="relative flex flex-col items-center overflow-hidden px-2 pb-3 pt-4" style={WELL}>
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-2/3 w-2/3 -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.18), transparent 70%)' }} />
            <SilhouetteSvg
              view={v}
              value={value}
              active={ed.active}
              onTap={ed.toggle}
              colors={colors}
              label={v === 'front' ? c.front : c.back}
              zoneName={(z) => L.zones[z]}
              className="relative h-auto w-full max-w-[160px]"
            />
            <figcaption className="relative mt-2 text-[12px] font-light tracking-[0.06em]" style={{ color: t.colors.textMuted }}>
              {v === 'front' ? c.front : c.back}
            </figcaption>
          </figure>
        ))}
      </div>

      {ed.active && (
        <div
          className="mt-4 p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: t.radius.inner,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 20px 40px -20px rgba(2,6,23,0.8)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[16px] font-semibold">{L.zones[ed.active.zone]}</p>
            <LiquidGlassButton size="sm" onClick={ed.close}>
              {L.done}
            </LiquidGlassButton>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {SORENESS_SEVERITIES.map((s) => {
              const on = ed.current === s;
              const col = severityColor(t, s);
              return (
                <LiquidGlassButton
                  key={s}
                  variant={on ? 'tint' : 'glass'}
                  tint={col}
                  onClick={() => ed.choose(s)}
                  aria-pressed={on}
                  aria-label={`${s}/5 ${L.severity[s]}`}
                  className="w-full py-2 text-[16px]"
                  style={{ fontVariantNumeric: 'tabular-nums', ...(on ? { boxShadow: `0 0 20px -4px ${col}, inset 0 1px 1.5px rgba(255,255,255,0.65)` } : {}) }}
                >
                  {s}
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: col, boxShadow: `0 0 6px ${col}` }} />
                </LiquidGlassButton>
              );
            })}
          </div>
          {ed.current && <p className="mt-3 text-[14px]">{L.severity[ed.current]}</p>}
          {ed.current && isReferred(ed.active.zone, ed.current) && (
            <p className="mt-3 p-3 text-[13px] leading-relaxed" style={{ background: `${t.colors.warn}1F`, border: `1px solid ${t.colors.warn}55`, borderRadius: 14, color: '#FDE68A' }}>
              {L.referHint}
            </p>
          )}
          {ed.tooMany && (
            <p className="mt-3 text-[13px]" style={{ color: t.colors.bad }}>
              {L.tooMany(6)}
            </p>
          )}
          {ed.current && (
            <LiquidGlassButton variant="tint" tint={t.colors.bad} size="sm" onClick={() => ed.choose(null)} className="mt-3">
              {L.remove}
            </LiquidGlassButton>
          )}
        </div>
      )}

      <ul className="mt-5 flex flex-wrap gap-2">
        {value.length === 0 && (
          <li className="text-[13px] font-light" style={{ color: t.colors.textFaint }}>
            {c.none}
          </li>
        )}
        {value.map((z) => (
          <li key={`${z.zoneId}:${z.side}`}>
            <GlassPill color={severityColor(t, z.severity)}>
              {L.zones[z.zoneId]}
              {z.side !== 'center' && <span style={{ color: t.colors.textMuted }}>· {L.sides[z.side]}</span>}
              <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {z.severity}/5
              </span>
            </GlassPill>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between text-[12px] font-light" style={{ color: t.colors.textFaint }}>
        <span>{c.feedsPlan}</span>
        {value.length > 0 && (
          <LiquidGlassButton size="sm" onClick={ed.clear}>
            {c.clear}
          </LiquidGlassButton>
        )}
      </div>
    </LiquidGlassCard>
  );
}
