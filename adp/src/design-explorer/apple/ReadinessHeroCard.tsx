'use client';

// Clean Health — readiness hero: calm white squircle, one soft ring, plain
// sentences a parent or teacher understands, factors as quiet rows.

import type { ReactElement, ReactNode } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import { acwrState, type DemoReadiness } from '../demoData';
import { Ring } from '../shared';
import { THEMES, cardStyle, zoneColor } from '../themeStyles';

const t = THEMES.apple;

function Pill({ color, children }: { color: string; children: ReactNode }): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-medium" style={{ background: `${color}1A`, color, borderRadius: t.radius.pill }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export default function ReadinessHeroCard({ lang, data }: { lang: AdpLang; data: DemoReadiness }): ReactElement {
  const c = DX[lang].readiness;
  const zc = zoneColor(t, data.zone);
  const acwr = acwrState(data.acwr);
  const scaleColor = (v: number) => (v <= 2 ? t.colors.bad : v <= 4 ? t.colors.warn : t.colors.good);

  const rows = [
    { label: c.acwr, value: data.acwr.toFixed(2), note: c.acwrState[acwr], color: acwr === 'ok' ? t.colors.good : acwr === 'spike' ? t.colors.bad : t.colors.warn },
    { label: c.hooper, value: `${data.hooper} / 28`, note: c.hooperHint, color: data.hooper > 16 ? t.colors.bad : data.hooper > 12 ? t.colors.warn : t.colors.good },
    { label: c.sleep, value: c.scale7(data.sleep), note: '', color: scaleColor(data.sleep) },
    { label: c.stress, value: c.scale7(data.stress), note: '', color: scaleColor(data.stress) },
  ];

  return (
    <section className="p-6" style={cardStyle(t)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{c.title}</h3>
        <span className="text-[13px]" style={{ color: t.colors.textMuted }}>
          {c.today}
        </span>
      </div>

      <div className="mt-6 flex items-center gap-6">
        <Ring value={data.score} size={t.ring.size - 40} stroke={t.ring.stroke} color={zc} track={t.colors.track}>
          <span className="text-[44px] font-semibold leading-none tracking-[-0.03em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {data.score}
          </span>
          <span className="mt-1 text-xs" style={{ color: t.colors.textMuted }}>
            {c.title}
          </span>
        </Ring>
        <div className="min-w-0">
          <Pill color={zc}>{c.zone[data.zone]}</Pill>
          <p className="mt-3 text-[17px] font-medium leading-snug">{c.zoneHint[data.zone]}</p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: t.colors.textMuted }}>
            {c.byCode}
          </p>
        </div>
      </div>

      <div className="mt-7">
        <p className="text-[13px] font-medium" style={{ color: t.colors.textMuted }}>
          {c.factorsTitle}
        </p>
        <ul className="mt-2 overflow-hidden" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner }}>
          {rows.map((r, i) => (
            <li key={r.label} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderTop: i ? `1px solid ${t.colors.border}` : undefined }}>
              <span className="min-w-0">
                <span className="block text-[15px]">{r.label}</span>
                {r.note && (
                  <span className="block text-xs" style={{ color: t.colors.textFaint }}>
                    {r.note}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[17px] font-semibold" style={{ color: r.color, fontVariantNumeric: 'tabular-nums' }}>
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <p className="text-[13px] font-medium" style={{ color: t.colors.textMuted }}>
          {c.penaltiesTitle}
        </p>
        <ul className="mt-2 space-y-2">
          {data.penalties.map((p) => (
            <li key={p.code} className="flex items-center justify-between text-[15px]">
              <span>{c.penalties[p.code]}</span>
              <span className="font-medium" style={{ color: t.colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                −{p.points}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-end gap-2" aria-hidden>
        {data.week.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="w-full" style={{ height: d.score * 0.5, background: `${zoneColor(t, d.zone)}${i === data.week.length - 1 ? '' : '55'}`, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </section>
  );
}
