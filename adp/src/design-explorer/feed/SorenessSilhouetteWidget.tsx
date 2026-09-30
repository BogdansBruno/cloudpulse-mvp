'use client';

// Night Feed — soreness card: a dark vector figure, sore muscles as small
// neon points of light, a compact level picker in the card.

import type { ReactElement } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../../components/labels';
import { FEED } from './copy';
import { isReferred, type SorenessMap } from '../../components/sorenessMap';
import { SORENESS_SEVERITIES } from '../../types/sportProfile';
import { DX } from '../copy';
import { SilhouetteSvg, useSorenessEditor } from '../shared';
import { THEMES, severityColor } from '../themeStyles';
import { Caps, FeedCard, PILL_BTN } from './ui';

const t = THEMES.feed;

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
  const worst = value.reduce<number>((m, z) => Math.max(m, z.severity), 0) as 0 | 1 | 2 | 3 | 4 | 5;
  const colors = {
    outlineFill: '#12131A',
    outlineStroke: '#2E3142',
    zoneIdle: '#161823',
    zoneStroke: '#262836',
    activeStroke: '#FFFFFF',
    severity: (s: 1 | 2 | 3 | 4 | 5) => severityColor(t, s),
    fillAlpha: 'D9',
    glow: true,
  };

  return (
    <FeedCard glow={worst ? severityColor(t, worst) : undefined} className="p-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Caps color={worst ? severityColor(t, worst) : undefined}>{c.title}</Caps>
          <p className="mt-1 text-[20px] font-semibold tracking-[-0.01em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {c.marked(value.length)}
          </p>
        </div>
        {value.length > 0 && (
          <button type="button" onClick={ed.clear} className="px-3 py-1.5 text-[13px] font-medium" style={PILL_BTN}>
            {c.clear}
          </button>
        )}
      </header>
      <p className="mt-1 text-[13px]" style={{ color: t.colors.textMuted }}>
        {c.hint}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['front', 'back'] as const).map((v) => (
          <figure key={v} className="flex flex-col items-center py-3" style={{ background: '#12131A', borderRadius: t.radius.inner, border: `1px solid ${t.colors.border}` }}>
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
            <figcaption className="mt-2 text-[11px] font-medium uppercase tracking-widest" style={{ color: t.colors.textFaint }}>
              {v === 'front' ? c.front : c.back}
            </figcaption>
          </figure>
        ))}
      </div>

      {ed.active && (
        <div className="mt-3 p-4" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner, border: `1px solid ${t.colors.border}` }}>
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold">{L.zones[ed.active.zone]}</p>
            <button type="button" onClick={ed.close} className="px-3 py-1 text-[13px] font-medium" style={PILL_BTN}>
              {L.done}
            </button>
          </div>
          <div className="mt-3 flex gap-1.5">
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
                  className="flex h-10 flex-1 items-center justify-center rounded-full text-[15px] font-semibold"
                  style={{
                    background: on ? col : 'rgba(255,255,255,0.05)',
                    color: on ? '#0A0B0E' : t.colors.text,
                    border: `1px solid ${on ? col : t.colors.border}`,
                    boxShadow: on ? `0 0 18px -4px ${col}` : 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {ed.current && (
            <p className="mt-2.5 text-[13px]" style={{ color: t.colors.textMuted }}>
              {L.severity[ed.current]}
            </p>
          )}
          {ed.current && (
            // What this muscle means for today's session — the same rules the plan uses.
            <div
              className="mt-3 p-3"
              style={{
                background: 'linear-gradient(180deg, rgba(249,115,22,0.16), rgba(249,115,22,0.06))',
                border: '1px solid rgba(249,115,22,0.40)',
                borderRadius: 16,
                boxShadow: '0 0 18px -6px rgba(249,115,22,0.5)',
              }}
            >
              <Caps color="#FB923C">{FEED[lang].restriction}</Caps>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#FED7AA' }}>
                {isReferred(ed.active.zone, ed.current) ? L.referHint : COACH_LABELS[lang].reasons.SORE_ZONE_RELIEF_ONLY}
              </p>
            </div>
          )}
          {ed.tooMany && (
            <p className="mt-2.5 text-[13px]" style={{ color: t.colors.bad }}>
              {L.tooMany(6)}
            </p>
          )}
          {ed.current && (
            <button type="button" onClick={() => ed.choose(null)} className="mt-2.5 text-[13px] font-medium" style={{ color: t.colors.bad }}>
              {L.remove}
            </button>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-2.5">
        {value.length === 0 && (
          <li className="text-[13px]" style={{ color: t.colors.textFaint }}>
            {c.none}
          </li>
        )}
        {value.map((z) => {
          const col = severityColor(t, z.severity);
          return (
            <li key={`${z.zoneId}:${z.side}`}>
              <div className="flex items-baseline justify-between text-[14px]">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: col, boxShadow: `0 0 8px ${col}` }} />
                  {L.zones[z.zoneId]}
                  {z.side !== 'center' && <span style={{ color: t.colors.textFaint }}>· {L.sides[z.side]}</span>}
                </span>
                <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {z.severity}
                  <span style={{ color: t.colors.textFaint }}> / 5</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: t.colors.track }}>
                <div className="h-full rounded-full" style={{ width: `${z.severity * 20}%`, background: col }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px]" style={{ color: t.colors.textFaint }}>
        {c.feedsPlan}
      </p>
    </FeedCard>
  );
}
