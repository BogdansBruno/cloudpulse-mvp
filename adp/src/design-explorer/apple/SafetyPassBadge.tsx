'use client';

// Clean Health — Safety Pass like a wallet pass: white card, pastel status
// band, large QR, plain-language rows for a teacher.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import { DEMO_PASS, todayIso } from '../demoData';
import { formatId, useQr } from '../shared';
import { THEMES, cardStyle } from '../themeStyles';

const t = THEMES.apple;
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

export default function SafetyPassBadge({ lang, origin }: { lang: AdpLang; origin: string }): ReactElement {
  const c = DX[lang].pass;
  const qr = useQr(`${origin}/pass?t=demo`, '#0B0D12', '#FFFFFF');
  const color = DEMO_PASS.level === 'block' ? t.colors.bad : t.colors.warn;
  const day = new Date(`${todayIso()}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <section className="overflow-hidden" style={cardStyle(t)}>
      <div className="px-6 pb-4 pt-5" style={{ background: `${color}12` }}>
        <p className="text-[13px] font-medium" style={{ color: t.colors.textMuted }}>
          {c.title}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]" style={{ color }}>
          <svg width="22" height="22" viewBox="0 0 24 24" className="shrink-0" aria-hidden>
            <path d="M12 2.5 4 5.5v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10v-6l-8-3Z" fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.6} />
            <path d="M12 8v5M12 16.2v.3" stroke={color} strokeWidth={2} strokeLinecap="round" />
          </svg>
          {c.status[DEMO_PASS.level]}
        </p>
      </div>

      <div className="p-6">
        <div className="flex justify-center">
          <div className="p-3" style={{ background: '#FFFFFF', borderRadius: 20, boxShadow: t.shadow.raised }}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR" width={184} height={184} className="block" />
            ) : (
              <div className="h-[184px] w-[184px]" />
            )}
          </div>
        </div>

        <ul className="mt-6 overflow-hidden" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner }}>
          {DEMO_PASS.codes.map((code, i) => (
            <li key={code} className="flex gap-3 px-4 py-3 text-[15px] leading-snug" style={{ borderTop: i ? `1px solid ${t.colors.border}` : undefined }}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: i === 0 ? color : t.colors.warn }} />
              {c.codes[code]}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[15px] leading-relaxed" style={{ color: t.colors.textMuted }}>
          {c.show}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-[15px]">
          <div>
            <dt className="text-[13px]" style={{ color: t.colors.textFaint }}>
              {c.id}
            </dt>
            <dd className="mt-0.5 font-medium" style={{ fontFamily: t.font.mono }}>
              {formatId(DEMO_PASS.id)}
            </dd>
          </div>
          <div>
            <dt className="text-[13px]" style={{ color: t.colors.textFaint }}>
              {c.valid}
            </dt>
            <dd className="mt-0.5 font-medium">{day}</dd>
          </div>
        </dl>
        <p className="mt-5 text-[13px]" style={{ color: t.colors.textFaint }}>
          {c.noHealth}. {c.demoQr}.
        </p>
      </div>
    </section>
  );
}
