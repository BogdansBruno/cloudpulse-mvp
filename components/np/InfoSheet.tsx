'use client';

// components/np/InfoSheet.tsx — "making numbers meaningful": a small (i) button that opens a bottom sheet with
//   1. what the metric means (components/np/infoCopy.ts)
//   2. YOUR baseline — usual range / now / 30- and 60-day averages, all passed in by the screen from the athlete's
//      own data (a missing value is simply not shown; with none at all the sheet says the baseline is still being built)
//   3. what to do with it — the screen's own insight when it has one, otherwise the general tip.
// The sheet is rendered inside `.np-app` (portal) so it keeps the app fonts and tokens and is never clipped by a card.

import { useEffect, useRef, useState, type MouseEvent, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Icon } from './icons';
import { INFO, type InfoKey } from './infoCopy';
import { UX } from './uxCopy';

export type InfoBaseline = {
  /** "58 – 76" */
  usual?: string | null;
  /** today's / the shown value, "70" */
  now?: string | null;
  avg30?: string | null;
  avg60?: string | null;
};

export function InfoButton({
  k,
  baseline,
  insight,
  impact,
  accent = '#2FD8F0',
  className = '',
}: {
  k: InfoKey;
  baseline?: InfoBaseline;
  /** a sentence built from the athlete's own data ("stayed inside the range 6 of 7 days"); replaces the general tip */
  insight?: string | null;
  /** sentences about the athlete's active factor tags (components/np/tags.ts) — the block is shown only when there are some */
  impact?: string[] | null;
  accent?: string;
  className?: string;
}): ReactElement {
  const { lang } = useLanguage();
  const c = INFO[lang];
  const item = c.items[k];
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHost(document.querySelector('.np-app') ?? document.body);
  }, []);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toggle = (e: MouseEvent) => {
    // the button may sit inside a card that is a link: never navigate from here
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const rows: { label: string; value: string }[] = [];
  if (baseline?.usual) rows.push({ label: c.baseline.usual, value: baseline.usual });
  if (baseline?.now) rows.push({ label: c.baseline.now, value: baseline.now });
  if (baseline?.avg30) rows.push({ label: c.baseline.avg30, value: baseline.avg30 });
  if (baseline?.avg60) rows.push({ label: c.baseline.avg60, value: baseline.avg60 });

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={`${c.open} — ${item.title}`}
        aria-haspopup="dialog"
        className={`-m-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white ${className}`}
      >
        <Icon name="info" size={18} stroke={1.5} />
      </button>
      {open &&
        host &&
        createPortal(
          <div className="fixed inset-0 z-[80]" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={c.close} tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <div
              ref={panel}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={item.title}
              className="np-sheet-up absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-b-0 border-white/[0.08] bg-[#12151B] px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] outline-none"
            >
              <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-white/20" />
              <div className="mt-4 flex items-start justify-between gap-3">
                <h2 className="np-editorial text-[26px] leading-tight text-white">{item.title}</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label={c.close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/75 hover:text-white">
                  <Icon name="close" size={18} />
                </button>
              </div>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{c.sections.what}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/85">{item.what}</p>

              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{c.sections.baseline}</p>
              {rows.length ? (
                <dl className="mt-2 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4">
                  {rows.map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between gap-3 py-3">
                      <dt className="text-[13px] text-white/70">{r.label}</dt>
                      <dd className="font-mono text-[15px] text-white" style={r.label === c.baseline.now ? { color: accent } : undefined}>
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-[14px] leading-relaxed text-white/70">{c.baseline.none}</p>
              )}

              {impact && impact.length > 0 && (
                <>
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{UX[lang].impact.title}</p>
                  <ul className="mt-2 space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                    {impact.map((t) => (
                      <li key={t} className="text-[14px] leading-relaxed text-white/85">
                        {t}
                      </li>
                    ))}
                    <li className="text-[12px] text-white/50">{UX[lang].impact.note}</li>
                  </ul>
                </>
              )}

              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{c.sections.todo}</p>
              {insight && <p className="np-editorial mt-2 text-[20px] leading-snug text-white">{insight}</p>}
              <p className={`text-[14px] leading-relaxed text-white/70 ${insight ? 'mt-2' : 'mt-2'}`}>{item.tip}</p>
            </div>
          </div>,
          host,
        )}
    </>
  );
}
