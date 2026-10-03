'use client';

// components/m/SafetyPassSheet.tsx — Safety Pass as a strict mobile document.
// Phone: a bottom sheet up to the full height (safe areas respected).
// ≥640px: a centred 420px modal. No red fills: the status is coloured text
// with a 2px rule on the left.
//
// Anti-screenshot: the student's initials + class are shown next to a LIVE
// clock with a pulsing dot; a screenshot freezes the seconds, and the teacher
// compares the time with their own watch.
//
// Privacy (GDPR, data about minors' health): initials and class are drawn
// ONLY on the student's own screen, from their profile. They are never put
// into the QR token — the public /pass page keeps showing date, level, codes
// and the pass id only, exactly as before.

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { toDataURL } from 'qrcode';
import { ShieldWarning, Warning, X } from '@phosphor-icons/react';
import type { Lang } from '@/lib/i18n/translations';
import { LOCALE, M } from './copy';

export type SafetyPassSheetProps = {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  status: 'block' | 'caution';
  /** ISO date the pass is valid on. */
  date: string;
  passId: string | null;
  /** Restrictions, already translated (one line each). */
  restrictions: string[];
  /** Initials + class from the student's profile, e.g. { name: 'Александр М.', className: '10-Б' }. */
  holder: { name: string; className: string } | null;
  /** /pass?t=… verification link; null → no QR (offline, no token). */
  verifyUrl: string | null;
};

function useLiveClock(lang: Lang, running: boolean) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    if (!running) return;
    const fmt = new Intl.DateTimeFormat(LOCALE[lang], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lang, running]);
  return now;
}

export default function SafetyPassSheet({ open, onClose, lang, status, date, passId, restrictions, holder, verifyUrl }: SafetyPassSheetProps): ReactElement | null {
  const c = M[lang].pass;
  const [qr, setQr] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const time = useLiveClock(lang, open);
  const isBlock = status === 'block';

  // QR: dark code on a white tile, generated at 2× for a sharp 168px image.
  useEffect(() => {
    let cancelled = false;
    if (!open || !verifyUrl) {
      setQr(null);
      return;
    }
    toDataURL(verifyUrl, { margin: 0, width: 336, errorCorrectionLevel: 'M', color: { dark: '#090A0F', light: '#FFFFFF' } })
      .then((d) => !cancelled && setQr(d))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [open, verifyUrl]);

  // Esc closes, focus moves into the dialog, the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the dialog itself (not the close button) so no focus ring flashes on open.
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const validOn = new Date(`${date}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' });
  const id = passId ? `${passId.slice(0, 4)} ${passId.slice(4)}` : null;
  const tone = isBlock ? 'text-ds-danger' : 'text-ds-warn';
  const rule = isBlock ? 'border-ds-danger' : 'border-ds-warn';
  const StatusIcon = isBlock ? ShieldWarning : Warning;

  return (
    <div className="ds-app fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onClick={onClose}>
      <article
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-24px)] w-full overflow-y-auto outline-none rounded-t-card border border-b-0 border-ds-line bg-ds-surface pb-[env(safe-area-inset-bottom)] text-ds-text shadow-modal sm:max-w-[420px] sm:rounded-card sm:border-b"
      >
        {/* grab handle (phone only) */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-9 rounded-[2px] bg-ds-line-strong" />
        </div>

        {/* document header */}
        <header className="flex items-center justify-between gap-4 border-b border-ds-line px-6 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ds-text-3">{c.overline}</p>
          <div className="flex items-center gap-2">
            {id && <span className="text-[13px] text-ds-text-2">№ {id}</span>}
            <button
              type="button"
              onClick={onClose}
              aria-label={c.close}
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-ctrl text-ds-text-2 hover:bg-ds-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-accent"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <div>
            <h2 id="pass-title" className="text-xl font-semibold leading-7" style={{ fontFamily: 'inherit' }}>
              {c.title}
            </h2>
            <p className={`mt-3 flex items-center gap-2 border-l-2 pl-3 text-[15px] font-medium ${rule} ${tone}`}>
              <StatusIcon size={20} aria-hidden className="shrink-0" />
              {c.status[status]}
            </p>
          </div>

          {/* identification + QR + live clock */}
          <div className="flex flex-col items-center gap-4 rounded-ctrl border border-ds-line px-4 py-6">
            <div className="text-center">
              <p className="text-xs text-ds-text-3">{c.holder}</p>
              {holder ? (
                <p className="mt-1 text-lg font-semibold text-ds-text">
                  {holder.name}, {holder.className}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ds-text-2">{c.holderMissing}</p>
              )}
            </div>

            <div className="rounded-ctrl bg-white p-3">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
                <img src={qr} alt="Safety Pass QR" width={168} height={168} className="block h-[168px] w-[168px]" />
              ) : (
                <div className="flex h-[168px] w-[168px] items-center justify-center text-center text-xs text-[#5B6270]">{c.qrLoading}</div>
              )}
            </div>

            <div className="text-center" aria-live="off">
              <p className="flex items-center justify-center gap-2 text-xl font-medium text-ds-text">
                <span className="ds-pulse h-2 w-2 rounded-full bg-ds-text" aria-hidden />
                <time>{time ?? '--:--:--'}</time>
              </p>
              <p className="mt-1 text-xs text-ds-text-3">{c.liveTime}</p>
            </div>
          </div>

          {/* fields */}
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-ds-text-3">{c.date}</dt>
              <dd className="mt-1 text-sm text-ds-text">{validOn}</dd>
            </div>
            <div>
              <dt className="text-xs text-ds-text-3">{c.restrictions}</dt>
              <dd className="mt-1">
                <ul className="space-y-2">
                  {restrictions.map((r) => (
                    <li key={r} className="flex gap-2 text-sm leading-5 text-ds-text">
                      <span aria-hidden className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${isBlock ? 'bg-ds-danger' : 'bg-ds-warn'}`} />
                      {r}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ds-text-3">{c.decidedBy}</dt>
              <dd className="mt-1 text-sm text-ds-text">{c.decidedByValue}</dd>
            </div>
          </dl>

          <p className="text-xs leading-[18px] text-ds-text-3">{c.scan}</p>
        </div>

        <footer className="space-y-4 border-t border-ds-line p-6">
          <p className="text-xs leading-[18px] text-ds-text-3">{c.notMedical}</p>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-ctrl border border-ds-line-strong text-sm font-medium text-ds-text hover:bg-ds-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-accent"
          >
            {c.close}
          </button>
        </footer>
      </article>
    </div>
  );
}
