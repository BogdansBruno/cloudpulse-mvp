'use client';

// Performance Dark — soreness map: two dark figures, glowing marked zones,
// a segmented 1–5 scale with tabular digits.

import type { ReactElement } from 'react';
import { SORENESS_LABELS, type AdpLang } from '../../components/labels';
import { isReferred, type SorenessMap } from '../../components/sorenessMap';
import { SORENESS_SEVERITIES } from '../../types/sportProfile';
import { DX } from '../copy';
import { SilhouetteSvg, useSorenessEditor } from '../shared';
import { THEMES, cardStyle, severityColor } from '../themeStyles';

const t = THEMES.whoop;

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
    outlineFill: 'rgba(255,255,255,0.025)',
    outlineStroke: '#262636',
    zoneIdle: 'rgba(255,255,255,0.05)',
    zoneStroke: '#2C2C3E',
    activeStroke: t.colors.accent,
    severity: (s: 1 | 2 | 3 | 4 | 5) => severityColor(t, s),
    fillAlpha: 'B3',
    glow: true,
  };

  return (
    <section className="p-5" style={cardStyle(t)}>
      <header className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.colors.textMuted }}>
          {c.title}
        </p>
        <p className="text-[11px] tabular-nums" style={{ color: t.colors.textFaint, fontFamily: t.font.mono }}>
          {c.marked(value.length)}/6
        </p>
      </header>
      <p className="mt-1 text-xs" style={{ color: t.colors.textMuted }}>
        {c.hint}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
              className="h-auto w-full max-w-[170px]"
            />
            <figcaption className="mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: t.colors.textFaint }}>
              {v === 'front' ? c.front : c.back}
            </figcaption>
          </figure>
        ))}
      </div>

      {ed.active && (
        <div className="mt-3 p-3" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner, border: `1px solid ${t.colors.border}` }}>
          <p className="text-sm font-semibold">{L.zones[ed.active.zone]}</p>
          <div className="mt-2 grid grid-cols-5 gap-px overflow-hidden" style={{ background: t.colors.border, borderRadius: 8 }}>
            {SORENESS_SEVERITIES.map((s) => {
              const on = ed.current === s;
              const col = severityColor(t, s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => ed.choose(s)}
                  aria-pressed={on}
                  aria-label={`${s}/5 ${L.severity[s]}`}
                  className="py-2 text-center"
                  style={{ background: on ? `${col}26` : t.colors.surface, color: on ? col : t.colors.textMuted, fontFamily: t.font.mono }}
                >
                  <span className="block text-lg leading-none">{s}</span>
                </button>
              );
            })}
          </div>
          {ed.current && (
            <p className="mt-2 text-xs" style={{ color: t.colors.textMuted }}>
              {L.severity[ed.current]}
            </p>
          )}
          {ed.current && isReferred(ed.active.zone, ed.current) && (
            <p className="mt-2 text-xs" style={{ color: t.colors.warn }}>
              {L.referHint}
            </p>
          )}
          {ed.tooMany && (
            <p className="mt-2 text-xs" style={{ color: t.colors.bad }}>
              {L.tooMany(6)}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2 text-xs">
            {ed.current && (
              <button type="button" onClick={() => ed.choose(null)} style={{ color: t.colors.textMuted }}>
                {L.remove}
              </button>
            )}
            <button type="button" onClick={ed.close} style={{ color: t.colors.accent }}>
              {L.done}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-3 space-y-1">
        {value.length === 0 && (
          <li className="text-xs" style={{ color: t.colors.textFaint }}>
            {c.none}
          </li>
        )}
        {value.map((z) => (
          <li key={`${z.zoneId}:${z.side}`} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: severityColor(t, z.severity), boxShadow: `0 0 8px ${severityColor(t, z.severity)}` }} />
              {L.zones[z.zoneId]}
              {z.side !== 'center' && <span style={{ color: t.colors.textFaint }}>· {L.sides[z.side]}</span>}
            </span>
            <span style={{ fontFamily: t.font.mono, color: severityColor(t, z.severity) }}>{z.severity}/5</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: t.colors.textFaint }}>
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
