'use client';

// Liquid Glass — Safety Pass: a monochrome glass card, a high-tech QR on a
// bright frosted tile with corner brackets, one compact glossy status badge.
// The QR stays dark-on-light so every phone camera reads it.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import LiquidGlassCard from '../../components/ui/LiquidGlassCard';
import { DX } from '../copy';
import { DEMO_PASS, todayIso } from '../demoData';
import { formatId, useQr } from '../shared';
import { THEMES } from '../themeStyles';
import { Label, WELL } from './ui';

const t = THEMES.glass;
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

function Brackets(): ReactElement {
  const arm = 'absolute h-5 w-5';
  const line = 'rgba(255,255,255,0.7)';
  return (
    <>
      <span className={`${arm} -left-2 -top-2 rounded-tl-xl`} style={{ borderLeft: `1.5px solid ${line}`, borderTop: `1.5px solid ${line}` }} />
      <span className={`${arm} -right-2 -top-2 rounded-tr-xl`} style={{ borderRight: `1.5px solid ${line}`, borderTop: `1.5px solid ${line}` }} />
      <span className={`${arm} -bottom-2 -left-2 rounded-bl-xl`} style={{ borderLeft: `1.5px solid ${line}`, borderBottom: `1.5px solid ${line}` }} />
      <span className={`${arm} -bottom-2 -right-2 rounded-br-xl`} style={{ borderRight: `1.5px solid ${line}`, borderBottom: `1.5px solid ${line}` }} />
    </>
  );
}

export default function SafetyPassBadge({ lang, origin }: { lang: AdpLang; origin: string }): ReactElement {
  const c = DX[lang].pass;
  const qr = useQr(`${origin}/pass?t=demo`, '#0A0F24', '#F8FAFC');
  const color = DEMO_PASS.level === 'block' ? t.colors.bad : t.colors.warn;
  const day = new Date(`${todayIso()}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <LiquidGlassCard className="p-6">

      <header className="flex items-start justify-between gap-3">
        <div>
          <Label>{c.title}</Label>
          <p className="mt-1 text-[13px] font-light" style={{ color: t.colors.textMuted }}>
            {c.validToday(day)}
          </p>
        </div>
        {/* compact glossy status badge */}
        <span
          className="relative inline-flex shrink-0 items-center gap-2 overflow-hidden px-3 py-1.5 text-[13px] font-semibold"
          style={{
            color: '#FFE4E6',
            background: `linear-gradient(180deg, ${color}66, ${color}2E)`,
            border: `1px solid ${color}99`,
            borderRadius: t.radius.pill,
            boxShadow: `0 6px 22px -8px ${color}, inset 0 1px 0 rgba(255,255,255,0.35)`,
          }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0))' }} />
          <span className="relative h-2 w-2 rounded-full" style={{ background: '#FFFFFF', boxShadow: `0 0 10px ${color}` }} />
          <span className="relative">{c.status[DEMO_PASS.level]}</span>
        </span>
      </header>

      <div className="mt-7 flex justify-center">
        <div className="relative">
          <Brackets />
          <div className="p-3" style={{ background: 'rgba(248,250,252,0.94)', borderRadius: 20, boxShadow: '0 20px 50px -18px rgba(103,232,249,0.45), inset 0 1px 0 #FFFFFF' }}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR" width={168} height={168} className="block" />
            ) : (
              <div className="h-[168px] w-[168px]" />
            )}
          </div>
        </div>
      </div>

      <ul className="mt-7 space-y-2">
        {DEMO_PASS.codes.map((code, i) => (
          <li key={code} className="flex gap-3 px-3.5 py-3 text-[14px] leading-snug" style={WELL}>
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: i === 0 ? color : t.colors.warn, boxShadow: `0 0 8px ${i === 0 ? color : t.colors.warn}` }} />
            {c.codes[code]}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[14px] font-light leading-relaxed" style={{ color: t.colors.textMuted }}>
        {c.show}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <div>
          <Label>{c.id}</Label>
          <p className="mt-1 text-[17px] font-medium tracking-[0.12em]" style={{ fontFamily: t.font.mono }}>
            {formatId(DEMO_PASS.id)}
          </p>
        </div>
        <p className="max-w-[55%] text-right text-[11px] font-light leading-snug" style={{ color: t.colors.textFaint }}>
          {c.signature}
        </p>
      </div>
      <p className="mt-3 text-[11px] font-light" style={{ color: t.colors.textFaint }}>
        {c.demoQr}
      </p>
    </LiquidGlassCard>
  );
}
