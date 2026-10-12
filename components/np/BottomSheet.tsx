'use client';

// components/np/BottomSheet.tsx — a small (i) button that opens a slide-up sheet with any content.
// Same look as InfoSheet (metric explanations), but for plain context: consent details, "why we ask" notes.
// The sheet is portalled into `.np-app` so it keeps the app fonts and is never clipped by a card.

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';

export function SheetButton({
  title,
  label,
  closeLabel,
  children,
  className = '',
}: {
  /** heading inside the sheet */
  title: string;
  /** accessible name of the (i) button, e.g. "More about this" */
  label: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}) {
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

  const show = (e: MouseEvent) => {
    // may sit inside a <label> or a link: never toggle the checkbox or navigate from here
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={label}
        aria-haspopup="dialog"
        className={`-m-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white ${className}`}
      >
        <Icon name="info" size={18} stroke={1.5} />
      </button>
      {open &&
        host &&
        createPortal(
          <div className="fixed inset-0 z-[80]" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={closeLabel} tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <div
              ref={panel}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="np-sheet-up absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-b-0 border-white/[0.08] bg-[#12151B] px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] outline-none"
            >
              <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-white/20" />
              <div className="mt-4 flex items-start justify-between gap-3">
                <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white">{title}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={closeLabel}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/75 hover:text-white"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
              <div className="mt-4">{children}</div>
            </div>
          </div>,
          host,
        )}
    </>
  );
}
