'use client';

// Performance Dark — readiness hero: one massive ring, dense factor grid,
// tabular numbers, the week as a strip.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import { acwrState, type DemoReadiness } from '../demoData';
import { Ring } from '../shared';
import { THEMES, cardStyle, zoneColor } from '../themeStyles';

const t = THEMES.whoop;

function Bar({ value, max, color }: { value: number; max: number; color: string }): ReactElement {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: t.colors.track }}>
      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color, transition: 'width 600ms' }} />
    </div>
  );
}

export default function ReadinessHeroCard({ lang, data }: { lang: AdpLang; data: DemoReadiness }): ReactElement {
  const c = DX[lang].readiness;
  const zc = zoneColor(t, data.zone);
  const acwr = acwrState(data.acwr);
  const acwrColor = acwr === 'ok' ? t.colors.good : acwr === 'spike' ? t.colors.bad : t.colors.warn;
  // 7 = best on the check-in scales; colour by band like the product.
  const scaleColor = (v: number) => (v <= 2 ? t.colors.bad : v <= 4 ? t.colors.warn : t.colors.good);
  const mono = { fontFamily: t.font.mono, fontVariantNumeric: 'tabular-nums' as const };

  return (
    <section className="p-5" style={{ ...cardStyle(t), background: t.gradients.hero }}>
      <header className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.colors.textMuted }}>
          {c.title}
        </p>
        <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: t.colors.textFaint }}>
          {c.today}
        </p>
      </header>

      <div className="mt-4 flex flex-col items-center">
        <div style={{ filter: `drop-shadow(0 0 18px ${zc}40)` }}>
          <Ring value={data.score} size={t.ring.size} stroke={t.ring.stroke} color={zc} track={t.colors.track} cap="butt">
            <span className="text-[64px] font-light leading-none tracking-[-0.04em]" style={{ ...mono, color: t.colors.text }}>
              {data.score}
            </span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: t.colors.textMuted }}>
              / 100
            </span>
          </Ring>
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: zc }}>
          {c.zone[data.zone]}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: t.colors.textMuted }}>
          {c.zoneHint[data.zone]}
        </p>
      </div>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.colors.textMuted }}>
        {c.factorsTitle}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden" style={{ background: t.colors.border, borderRadius: t.radius.inner }}>
        {[
          { label: c.acwr, value: data.acwr.toFixed(2), sub: c.acwrState[acwr], color: acwrColor, bar: [Math.min(data.acwr, 2), 2] as const },
          { label: c.hooper, value: `${data.hooper}`, sub: '/28', color: data.hooper > 16 ? t.colors.bad : data.hooper > 12 ? t.colors.warn : t.colors.good, bar: [data.hooper, 28] as const },
          { label: c.sleep, value: c.scale7(data.sleep), sub: '', color: scaleColor(data.sleep), bar: [data.sleep, 7] as const },
          { label: c.stress, value: c.scale7(data.stress), sub: '', color: scaleColor(data.stress), bar: [data.stress, 7] as const },
        ].map((f) => (
          <div key={f.label} className="p-3" style={{ background: t.colors.surface }}>
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: t.colors.textFaint }}>
              {f.label}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl leading-none" style={{ ...mono, color: f.color }}>
                {f.value}
              </span>
              {f.sub && (
                <span className="text-[11px]" style={{ color: t.colors.textMuted }}>
                  {f.sub}
                </span>
              )}
            </p>
            <div className="mt-2">
              <Bar value={f.bar[0]} max={f.bar[1]} color={f.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.colors.textMuted }}>
          {c.penaltiesTitle}
        </p>
        {data.penalties.map((p) => (
          <div key={p.code} className="flex items-center justify-between text-[13px]">
            <span style={{ color: t.colors.text }}>{c.penalties[p.code]}</span>
            <span style={{ ...mono, color: t.colors.bad }}>−{p.points}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex h-10 items-end gap-1" aria-hidden>
        {data.week.map((d, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: `${d.score}%`,
              background: zoneColor(t, d.zone),
              opacity: i === data.week.length - 1 ? 1 : 0.35,
              borderRadius: 2,
            }}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: t.colors.textFaint }}>
        {c.byCode}
      </p>
    </section>
  );
}
