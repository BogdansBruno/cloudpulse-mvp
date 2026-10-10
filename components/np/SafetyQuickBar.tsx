'use client';

// components/np/SafetyQuickBar.tsx — shown at the top of Today whenever the readiness is in the red zone or the Safety Guard
// has a restriction (pain, match day, load spike). Two big buttons, no hunting through the menu:
//   · Return-from-pain plan  → scrolls to the plan card if the athlete has one, otherwise opens the short "what to do" steps
//   · Safety Pass            → scrolls to the pass with the QR code (only when the Safety Guard actually issued one)
// The steps point to people (coach, school nurse, doctor, physio); Lotus never clears anybody to play.

import { useState, type ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import type { PassState } from '@/components/SafetyShield';
import { Icon } from './icons';

const COPY: Record<Lang, { title: string; red: string; guard: string; plan: string; pass: string; steps: string[]; close: string }> = {
  en: {
    title: 'Safety first',
    red: 'Readiness is in the red zone. Keep today easy.',
    guard: 'The Safety Guard has a restriction for today.',
    plan: 'Return-from-pain plan',
    pass: 'Safety Pass (QR)',
    steps: [
      'Stop the activity that hurts. Do not train through pain.',
      'Tell your coach or the school nurse today.',
      'See a doctor or physio before you return. They decide when you are cleared, not the app.',
    ],
    close: 'Hide',
  },
  ru: {
    title: 'Сначала безопасность',
    red: 'Готовность в красной зоне. Сегодня только лёгкая активность.',
    guard: 'У защитного модуля есть ограничение на сегодня.',
    plan: 'План возвращения после боли',
    pass: 'Safety Pass (QR)',
    steps: [
      'Останови движение, которое болит. Не тренируйся через боль.',
      'Сегодня скажи тренеру или школьной медсестре.',
      'Перед возвращением покажись врачу или физиотерапевту. Допуск даёт человек, а не приложение.',
    ],
    close: 'Скрыть',
  },
  lv: {
    title: 'Vispirms drošība',
    red: 'Gatavība ir sarkanajā zonā. Šodien tikai viegli.',
    guard: 'Drošības modulim šodien ir ierobežojums.',
    plan: 'Atgriešanās plāns pēc sāpēm',
    pass: 'Safety Pass (QR)',
    steps: [
      'Aptur kustību, kas sāp. Netrenējies cauri sāpēm.',
      'Šodien pasaki treneram vai skolas medmāsai.',
      'Pirms atgriešanās apmeklē ārstu vai fizioterapeitu. Atļauju dod cilvēks, nevis lietotne.',
    ],
    close: 'Paslēpt',
  },
};

function scrollToEl(id: string): boolean {
  const el = document.getElementById(id);
  if (!el || el.getBoundingClientRect().height < 4) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

export default function SafetyQuickBar({ lang, redZone, pass }: { lang: Lang; redZone: boolean; pass: PassState | null }): ReactElement | null {
  const c = COPY[lang];
  const [steps, setSteps] = useState(false);
  const guard = pass === 'block' || pass === 'caution';
  if (!redZone && !guard) return null;

  return (
    <section aria-label={c.title} className="lt-card-alert mb-4 p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px_11px_11px_3px] bg-[#FF3D5A]/20 text-[#FF8C9C]">
          <Icon name="shield" size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF8C9C]">{c.title}</p>
          <p className="mt-1 text-[14px] leading-snug text-white/90">{guard ? c.guard : c.red}</p>
        </div>
      </div>
      <div className={`mt-3 grid gap-2 ${guard ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button
          type="button"
          aria-expanded={steps}
          onClick={() => {
            if (!scrollToEl('rtp-plan')) setSteps((s) => !s);
          }}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px_14px_14px_5px] border border-[#FF3D5A]/40 bg-[#FF3D5A]/15 px-3 text-center text-[13px] font-semibold leading-tight text-white transition-colors hover:bg-[#FF3D5A]/25"
        >
          <Icon name="pulse" size={16} />
          {c.plan}
        </button>
        {guard && (
          <button
            type="button"
            onClick={() => scrollToEl('safety-pass')}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px_14px_14px_5px] bg-[#FF3D5A] px-3 text-center text-[13px] font-bold leading-tight text-white transition-colors hover:bg-[#ff566f]"
          >
            <Icon name="qr" size={16} />
            {c.pass}
          </button>
        )}
      </div>
      {steps && (
        <ol className="mt-3 space-y-2 border-t border-white/10 pt-3">
          {c.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-white/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11px]">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
