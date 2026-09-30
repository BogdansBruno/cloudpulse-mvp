'use client';

// Gen-Z Energy — soreness map: figures on a violet slab, thick outlines,
// chunky 1–5 buttons with hard shadows, marked zones as stickers.

import type { ReactElement } from 'react';
import { SORENESS_LABELS, type AdpLang } from '../../components/labels';
import { isReferred, type SorenessMap } from '../../components/sorenessMap';
import { SORENESS_SEVERITIES } from '../../types/sportProfile';
import { DX } from '../copy';
import { SilhouetteSvg, useSorenessEditor } from '../shared';
import { THEMES, cardStyle, severityColor } from '../themeStyles';

const t = THEMES.nike;

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
  const display = { fontStyle: 'italic' as const, fontWeight: 900, textTransform: 'uppercase' as const };
  const colors = {
    outlineFill: 'rgba(255,255,255,0.06)',
    outlineStroke: '#000000',
    zoneIdle: 'rgba(255,255,255,0.10)',
    zoneStroke: 'rgba(0,0,0,0.6)',
    activeStroke: '#FFFFFF',
    severity: (s: 1 | 2 | 3 | 4 | 5) => severityColor(t, s),
    fillAlpha: 'FF',
  };

  return (
    <section className="p-5" style={cardStyle(t)}>
      <div className="flex items-baseline justify-between">
        <p className="text-xl tracking-tight" style={display}>
          {c.title}
        </p>
        <span className="px-2 py-0.5 text-xs font-bold" style={{ background: t.colors.accent, color: '#120A2A', border: '2px solid #000', borderRadius: t.radius.pill }}>
          {value.length}/6
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold" style={{ color: t.colors.textMuted }}>
        {c.hint}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 p-3" style={{ background: t.gradients.accent, border: '2px solid #000', borderRadius: t.radius.inner }}>
        {(['front', 'back'] as const).map((v) => (
          <figure key={v} className="flex flex-col items-center">
            <SilhouetteSvg
              view={v}
              value={value}
              active={ed.active}
              onTap={ed.toggle}
              colors={colors}
              label={v === 'front' ? c.front : c.back}
              zoneName={(z) => L.zones[z]}
              className="h-auto w-full max-w-[160px]"
            />
            <figcaption className="mt-1 text-xs tracking-tight" style={display}>
              {v === 'front' ? c.front : c.back}
            </figcaption>
          </figure>
        ))}
      </div>

      {ed.active && (
        <div className="mt-4">
          <p className="text-lg tracking-tight" style={display}>
            {L.zones[ed.active.zone]}
          </p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {SORENESS_SEVERITIES.map((s) => {
              const on = ed.current === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => ed.choose(s)}
                  aria-pressed={on}
                  aria-label={`${s}/5 ${L.severity[s]}`}
                  className="flex h-14 flex-col items-center justify-center transition-transform active:translate-x-[2px] active:translate-y-[2px]"
                  style={{
                    background: severityColor(t, s),
                    color: '#120A2A',
                    border: '2px solid #000',
                    borderRadius: 14,
                    boxShadow: on ? 'none' : t.shadow.raised,
                    transform: on ? 'translate(3px,3px)' : undefined,
                  }}
                >
                  <span className="text-2xl leading-none" style={display}>
                    {s}
                  </span>
                </button>
              );
            })}
          </div>
          {ed.current && <p className="mt-2 text-sm font-bold">{L.severity[ed.current]}</p>}
          {ed.current && isReferred(ed.active.zone, ed.current) && (
            <p className="mt-2 px-3 py-2 text-xs font-semibold" style={{ background: t.colors.warn, color: '#120A2A', border: '2px solid #000', borderRadius: 12 }}>
              {L.referHint}
            </p>
          )}
          {ed.tooMany && (
            <p className="mt-2 text-xs font-bold" style={{ color: t.colors.bad }}>
              {L.tooMany(6)}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={ed.close} className="px-4 py-2 text-sm" style={{ ...display, background: '#FFFFFF', color: '#120A2A', border: '2px solid #000', borderRadius: t.radius.pill, boxShadow: t.shadow.raised }}>
              {L.done}
            </button>
            {ed.current && (
              <button type="button" onClick={() => ed.choose(null)} className="px-4 py-2 text-sm font-bold" style={{ color: t.colors.textMuted }}>
                {L.remove}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {value.length === 0 && <span className="text-sm font-semibold" style={{ color: t.colors.textFaint }}>{c.none}</span>}
        {value.map((z, i) => (
          <span
            key={`${z.zoneId}:${z.side}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
            style={{ background: severityColor(t, z.severity), color: '#120A2A', border: '2px solid #000', borderRadius: t.radius.pill, boxShadow: t.shadow.raised, transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}
          >
            {L.zones[z.zoneId]} · {z.severity}/5
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-semibold" style={{ color: t.colors.textFaint }}>
        <span>{c.feedsPlan}</span>
        {value.length > 0 && (
          <button type="button" onClick={ed.clear} style={{ color: t.colors.textMuted }}>
            {c.clear}
          </button>
        )}
      </div>
    </section>
  );
}
