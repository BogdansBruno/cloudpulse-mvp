// adp/src/components/ui/typography.ts
//
// ADP type pair: an editorial serif ONLY for the engine's short verdicts
// ("Сегодня — день полегче"), a clean sans for every number, label and
// button. The serif is loaded in app/layout.tsx (Cormorant Garamond,
// latin + latin-ext + cyrillic); Georgia is the fallback.

import type { CSSProperties } from 'react';

export const SERIF = "var(--font-adp-serif, 'Cormorant Garamond'), Georgia, 'Times New Roman', serif";

/** H1 / engine verdict: serif 26px, normal weight, white, leading 1.18, tracking-tight. */
export const VERDICT_STYLE: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 400,
  fontSize: 26,
  color: '#FFFFFF',
  lineHeight: 1.18,
  letterSpacing: '-0.025em',
};

/** Micro labels & tags: 10px, semibold, 0.18em, uppercase, slate-400. */
export const MICRO_LABEL = 'text-[10px] font-semibold uppercase tracking-[0.18em]';
export const SLATE_400 = '#94A3B8';
export const SLATE_300 = '#CBD5E1';
