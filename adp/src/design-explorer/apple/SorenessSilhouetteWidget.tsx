'use client';

// Clean Health — soreness map: pale figures on white, soft pastel zones,
// a segmented control with words, a bottom-sheet style picker on glass.

import type { ReactElement } from 'react';
import { SORENESS_LABELS, type AdpLang } from '../../components/labels';
import { isReferred, type SorenessMap } from '../../components/sorenessMap';
import { SORENESS_SEVERITIES } from '../../types/sportProfile';
import { DX } from '../copy';
import { SilhouetteSvg, useSorenessEditor } from '../shared';
import { THEMES, cardStyle, severityColor } from '../themeStyles';

const t = THEMES.apple;

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
    outlineFill: '#F4F6F9',
    outlineStroke: '#E3E7ED',
    zoneIdle: '#EBEEF3',
    zoneStroke: '#DDE2E9',
    activeStroke: t.colors.info,
    severity: (s: 1 | 2 | 3 | 4 | 5) => severityColor(t, s),
    fillAlpha: 'E6',
  };

  return (
    <section className="p-6" style={cardStyle(t)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{c.title}</h3>
        <span className="text-[13px]" style={{ color: t.colors.textMuted }}>
          {c.marked(value.length)}
        </span>
      </div>
      <p className="mt-1 text-[15px]" style={{ color: t.colors.textMuted }}>
        {c.hint}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        {(['front', 'back'] as const).map((v) => (
          <figure key={v} className="flex flex-col items-center p-3" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner }}>
            <SilhouetteSvg
              view={v}
              value={value}
              active={ed.active}
              onTap={ed.toggle}
              colors={colors}
              label={v === 'front' ? c.front : c.back}
              zoneName={(z) => L.zones[z]}
              className="h-auto w-full max-w-[150px]"
            />
            <figcaption className="mt-2 text-[13px]" style={{ color: t.colors.textMuted }}>
              {v === 'front' ? c.front : c.back}
            </figcaption>
          </figure>
        ))}
      </div>

      {ed.active && (
        <div className="mt-5 p-4" style={{ background: 'rgba(242,244,247,0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: t.radius.inner, border: `1px solid ${t.colors.border}` }}>
          <div className="flex items-center justify-between">
            <p className="text-[17px] font-semibold">{L.zones[ed.active.zone]}</p>
            <button type="button" onClick={ed.close} className="text-[15px] font-medium" style={{ color: t.colors.info }}>
              {L.done}
            </button>
          </div>
          <div className="mt-3 flex p-1" style={{ background: '#E4E7EC', borderRadius: 12 }} role="radiogroup" aria-label={c.pick}>
            {SORENESS_SEVERITIES.map((s) => {
              const on = ed.current === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${s}/5 ${L.severity[s]}`}
                  onClick={() => ed.choose(s)}
                  className="flex-1 py-1.5 text-[15px] font-medium transition-all"
                  style={{
                    background: on ? '#FFFFFF' : 'transparent',
                    borderRadius: 9,
                    boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
                    color: on ? t.colors.text : t.colors.textMuted,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {ed.current && (
            <p className="mt-3 flex items-center gap-2 text-[15px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: severityColor(t, ed.current) }} />
              {L.severity[ed.current]}
            </p>
          )}
          {ed.current && isReferred(ed.active.zone, ed.current) && (
            <p className="mt-3 p-3 text-[13px] leading-relaxed" style={{ background: `${t.colors.warn}14`, color: '#8A5A12', borderRadius: 12 }}>
              {L.referHint}
            </p>
          )}
          {ed.tooMany && (
            <p className="mt-3 text-[13px]" style={{ color: t.colors.bad }}>
              {L.tooMany(6)}
            </p>
          )}
          {ed.current && (
            <button type="button" onClick={() => ed.choose(null)} className="mt-3 text-[15px]" style={{ color: t.colors.bad }}>
              {L.remove}
            </button>
          )}
        </div>
      )}

      <ul className="mt-5 overflow-hidden" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner }}>
        {value.length === 0 && (
          <li className="px-4 py-3 text-[15px]" style={{ color: t.colors.textFaint }}>
            {c.none}
          </li>
        )}
        {value.map((z, i) => (
          <li key={`${z.zoneId}:${z.side}`} className="flex items-center justify-between px-4 py-3 text-[15px]" style={{ borderTop: i ? `1px solid ${t.colors.border}` : undefined }}>
            <span className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: severityColor(t, z.severity) }} />
              {L.zones[z.zoneId]}
              {z.side !== 'center' && <span style={{ color: t.colors.textFaint }}>{L.sides[z.side]}</span>}
            </span>
            <span style={{ color: t.colors.textMuted }}>{z.severity}/5</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-[13px]" style={{ color: t.colors.textFaint }}>
        <span>{c.feedsPlan}</span>
        {value.length > 0 && (
          <button type="button" onClick={ed.clear} style={{ color: t.colors.info }}>
            {c.clear}
          </button>
        )}
      </div>
    </section>
  );
}
