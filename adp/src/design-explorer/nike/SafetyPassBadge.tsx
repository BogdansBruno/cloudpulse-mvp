'use client';

// Gen-Z Energy — Safety Pass as a ticket: bold status header, torn-edge
// separator, QR on a white sticker, restriction stickers.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import { DEMO_PASS, todayIso } from '../demoData';
import { formatId, useQr } from '../shared';
import { THEMES } from '../themeStyles';

const t = THEMES.nike;
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

export default function SafetyPassBadge({ lang, origin }: { lang: AdpLang; origin: string }): ReactElement {
  const c = DX[lang].pass;
  const qr = useQr(`${origin}/pass?t=demo`, '#120A2A', '#FFFFFF');
  const display = { fontStyle: 'italic' as const, fontWeight: 900, textTransform: 'uppercase' as const };
  const head = DEMO_PASS.level === 'block' ? 'linear-gradient(135deg, #FF3B6B 0%, #FF2BD6 100%)' : t.gradients.hero;
  const day = new Date(`${todayIso()}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <section className="overflow-hidden" style={{ fontFamily: t.font.body, color: t.colors.text, border: '2px solid #000', borderRadius: t.radius.card, boxShadow: t.shadow.card, background: t.colors.surface }}>
      <div className="p-5" style={{ background: head, color: '#FFFFFF' }}>
        <p className="text-xs tracking-tight" style={display}>
          {c.title}
        </p>
        <p className="mt-1 text-[32px] leading-[0.9] tracking-[-0.03em]" style={display}>
          {c.status[DEMO_PASS.level]}
        </p>
      </div>

      {/* Ticket perforation */}
      <div className="relative h-5" style={{ background: t.colors.surface }}>
        <span className="absolute -left-3 top-0 h-5 w-5 rounded-full" style={{ background: t.colors.bg, border: '2px solid #000' }} />
        <span className="absolute -right-3 top-0 h-5 w-5 rounded-full" style={{ background: t.colors.bg, border: '2px solid #000' }} />
        <span className="absolute left-4 right-4 top-1/2 border-t-2 border-dashed" style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
      </div>

      <div className="px-5 pb-5">
        <div className="flex flex-col items-center">
          <div className="p-2.5" style={{ background: '#FFFFFF', border: '2px solid #000', borderRadius: 18, boxShadow: t.shadow.raised, transform: 'rotate(-2deg)' }}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR" width={168} height={168} className="block" />
            ) : (
              <div className="h-[168px] w-[168px]" />
            )}
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {DEMO_PASS.codes.map((code, i) => (
            <p
              key={code}
              className="px-3 py-2 text-[13px] font-bold leading-snug"
              style={{ background: i === 0 ? t.colors.warn : t.colors.info, color: '#120A2A', border: '2px solid #000', borderRadius: 14, boxShadow: t.shadow.raised }}
            >
              {c.codes[code]}
            </p>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold leading-relaxed" style={{ color: t.colors.textMuted }}>
          {c.show}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="px-3 py-1 text-sm tracking-tight" style={{ ...display, background: '#000', color: t.colors.good, borderRadius: t.radius.pill }}>
            {formatId(DEMO_PASS.id)}
          </span>
          <span className="text-xs font-bold">{c.validToday(day)}</span>
        </div>
        <p className="mt-3 text-[11px] font-semibold" style={{ color: t.colors.textFaint }}>
          {c.noHealth} · {c.demoQr}
        </p>
      </div>
    </section>
  );
}
