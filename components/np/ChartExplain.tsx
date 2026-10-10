'use client';

// components/np/ChartExplain.tsx — the "data to action" card that sits under a chart, and the breakdown sheet behind it.
//
//   panel   three short rows for the selected point: what happened · why it matters · what to do (components/np/insight.ts).
//           It follows the finger while scrubbing; the compact pin above the point keeps the exact value.
//   sheet   "Open the breakdown": the days outside the athlete's usual range first, then the recent days. Tap a row and that
//           day is selected on the chart. Rendered in `.np-app` (portal) like the (i) sheets, so no card clips it.

import { useEffect, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Icon } from './icons';
import { impactMedium } from './useScrub';
import { insightCopy, POS_HEX, type ExplainItem, type ExplainSpec, type Insight } from './chartInsight';

const Row = ({ label, children, strong = false }: { label: string; children: string; strong?: boolean }): ReactElement => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
    <p className={`mt-1 text-[14px] leading-snug ${strong ? 'text-white' : 'text-white/75'}`}>{children}</p>
  </div>
);

export default function ChartExplain({
  insight,
  spec,
  onPick,
  title,
}: {
  insight: Insight | null;
  spec?: ExplainSpec;
  /** select a point on the chart from the breakdown sheet */
  onPick?: (i: number) => void;
  title: string;
}): ReactElement | null {
  const { lang } = useLanguage();
  const c = insightCopy(lang);
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    setHost(document.querySelector('.np-app') ?? document.body);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!insight) return null;
  const accent = insight.pos ? POS_HEX[insight.pos] : '#B8F23C';
  const list = spec?.list ?? [];
  const heads = spec?.heads ?? { flagged: c.flagged, recent: c.recent };
  const flagged = list.filter((x) => x.flag).reverse();
  const recent = list.slice(-10).reverse();

  const row = (x: ExplainItem): ReactElement => (
    <li key={x.index}>
      <button
        type="button"
        onClick={() => {
          impactMedium();
          onPick?.(x.index);
          setOpen(false);
        }}
        className="block w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.06]"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] text-white/75">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: x.insight.pos ? POS_HEX[x.insight.pos] : '#3FE0A8' }} />
            {x.label}
          </span>
          <span className="font-mono text-[15px] text-white">{x.valueText}</span>
        </span>
        <span className="mt-2 block text-[13px] leading-snug text-white/60">{x.insight.why}</span>
        <span className="mt-1.5 block text-[13px] leading-snug text-white/90">{x.insight.action}</span>
      </button>
    </li>
  );

  return (
    <>
      <div aria-live="polite" className="mt-4 rounded-2xl border border-white/[0.07] bg-[#1A202A]/95 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <div className="space-y-3">
          <div className="flex gap-3">
            <span aria-hidden className="mt-1 w-[3px] shrink-0 self-stretch rounded-full" style={{ backgroundColor: accent }} />
            <div className="min-w-0 space-y-3">
              <Row label={c.what} strong>
                {insight.what}
              </Row>
              <Row label={c.why}>{insight.why}</Row>
              <Row label={c.act} strong>
                {insight.action}
              </Row>
            </div>
          </div>
        </div>
        {list.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="mt-3 flex h-11 w-full items-center justify-between rounded-xl bg-white/[0.05] px-4 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/[0.08]"
          >
            {c.all}
            <Icon name="chevR" size={16} />
          </button>
        )}
      </div>

      {open &&
        host &&
        createPortal(
          <div className="fixed inset-0 z-[80]" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={c.close} tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="np-sheet-up absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-b-0 border-white/[0.08] bg-[#12151B] px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] outline-none"
            >
              <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-white/20" />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="np-editorial text-[26px] leading-tight text-white">{title}</h2>
                  <p className="mt-1 text-[13px] text-white/60">{c.sheetSub}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label={c.close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/75 hover:text-white">
                  <Icon name="close" size={18} />
                </button>
              </div>

              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{heads.flagged}</p>
              {flagged.length ? <ul className="mt-2 space-y-2">{flagged.map(row)}</ul> : <p className="mt-2 text-[14px] text-white/70">{c.none}</p>}

              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{heads.recent}</p>
              <ul className="mt-2 space-y-2">{recent.map(row)}</ul>
            </div>
          </div>,
          host,
        )}
    </>
  );
}
