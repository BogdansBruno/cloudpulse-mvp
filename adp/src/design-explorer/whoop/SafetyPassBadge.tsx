'use client';

// Performance Dark — Safety Pass: ruby status strip, QR in a white well,
// restriction chips, mono pass ID.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import { DEMO_PASS, todayIso } from '../demoData';
import { formatId, useQr } from '../shared';
import { THEMES, cardStyle } from '../themeStyles';

const t = THEMES.whoop;
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

export default function SafetyPassBadge({ lang, origin }: { lang: AdpLang; origin: string }): ReactElement {
  const c = DX[lang].pass;
  const qr = useQr(`${origin}/pass?t=demo`, '#08080C', '#FFFFFF');
  const color = DEMO_PASS.level === 'block' ? t.colors.bad : t.colors.warn;
  const day = new Date(`${todayIso()}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <section className="overflow-hidden" style={cardStyle(t)}>
      <div className="flex items-center gap-3 px-5 py-3" style={{ background: `linear-gradient(90deg, ${color}33, transparent)`, borderBottom: `1px solid ${t.colors.border}` }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: t.colors.textMuted }}>
            {c.title}
          </p>
          <p className="text-base font-semibold" style={{ color }}>
            {c.status[DEMO_PASS.level]}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-4">
          <div className="shrink-0 p-2" style={{ background: '#FFFFFF', borderRadius: t.radius.inner, boxShadow: `0 0 0 1px ${t.colors.border}, 0 0 30px -8px ${t.colors.accent}` }}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR" width={128} height={128} className="block" />
            ) : (
              <div className="h-32 w-32" />
            )}
          </div>
          <ul className="min-w-0 space-y-2">
            {DEMO_PASS.codes.map((code) => (
              <li
                key={code}
                className="px-2.5 py-1.5 text-[12px] leading-snug"
                style={{ background: `${color}14`, border: `1px solid ${color}40`, borderRadius: 8, color: t.colors.text }}
              >
                {c.codes[code]}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed" style={{ color: t.colors.textMuted }}>
          {c.show}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 pt-3 text-xs" style={{ borderTop: `1px solid ${t.colors.border}` }}>
          <div>
            <dt className="uppercase tracking-[0.14em]" style={{ color: t.colors.textFaint }}>
              {c.id}
            </dt>
            <dd className="mt-0.5 text-sm" style={{ fontFamily: t.font.mono, color: t.colors.accent }}>
              {formatId(DEMO_PASS.id)}
            </dd>
          </div>
          <div>
            <dt className="uppercase tracking-[0.14em]" style={{ color: t.colors.textFaint }}>
              ✓
            </dt>
            <dd className="mt-0.5 text-sm" style={{ color: t.colors.text }}>
              {c.validToday(day)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px]" style={{ color: t.colors.textFaint }}>
          {c.signature} · {c.demoQr}
        </p>
      </div>
    </section>
  );
}
