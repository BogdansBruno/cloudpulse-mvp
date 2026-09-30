'use client';

// Night Feed — Safety Pass: a minimal dark glass card, the QR on a light
// tile (so every camera reads it), one neat status badge.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import { DEMO_PASS, todayIso } from '../demoData';
import { formatId, useQr } from '../shared';
import { THEMES } from '../themeStyles';
import { Caps, FeedCard } from './ui';

const t = THEMES.feed;
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

export default function SafetyPassBadge({ lang, origin }: { lang: AdpLang; origin: string }): ReactElement {
  const c = DX[lang].pass;
  const qr = useQr(`${origin}/pass?t=demo`, '#0A0B0E', '#F4F5F7');
  const color = DEMO_PASS.level === 'block' ? t.colors.bad : t.colors.warn;
  const day = new Date(`${todayIso()}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <FeedCard glow={color} className="p-5" style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <Caps>{c.title}</Caps>
          <p className="mt-1 text-[13px]" style={{ color: t.colors.textMuted }}>
            {c.validToday(day)}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold" style={{ background: `${color}1F`, border: `1px solid ${color}59`, color, borderRadius: t.radius.pill }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          {c.status[DEMO_PASS.level]}
        </span>
      </header>

      <div className="mt-5 flex items-center gap-4">
        <div className="shrink-0 p-2.5" style={{ background: '#F4F5F7', borderRadius: 20, boxShadow: `0 16px 36px -16px ${color}` }}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR" width={132} height={132} className="block" />
          ) : (
            <div className="h-[132px] w-[132px]" />
          )}
        </div>
        <ul className="min-w-0 space-y-2.5">
          {DEMO_PASS.codes.map((code, i) => (
            <li key={code} className="flex gap-2 text-[13px] leading-snug">
              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: i === 0 ? color : t.colors.warn }} />
              {c.codes[code]}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 text-[14px] leading-relaxed" style={{ color: t.colors.textMuted }}>
        {c.show}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3 pt-4" style={{ borderTop: `1px solid ${t.colors.border}` }}>
        <div>
          <Caps>{c.id}</Caps>
          <p className="mt-1 text-[17px] font-semibold tracking-[0.1em]" style={{ fontFamily: t.font.mono }}>
            {formatId(DEMO_PASS.id)}
          </p>
        </div>
        <p className="max-w-[55%] text-right text-[12px] leading-snug" style={{ color: t.colors.textFaint }}>
          {c.noHealth}. {c.demoQr}.
        </p>
      </div>
    </FeedCard>
  );
}
