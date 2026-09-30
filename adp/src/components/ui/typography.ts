// adp/src/components/ui/typography.ts
//
// ADP type pair: an editorial serif ONLY for the engine's short verdicts
// ("Сегодня — день полегче"), a clean sans for every number, label and
// button. The serif is loaded in app/layout.tsx (Cormorant Garamond,
// latin + latin-ext + cyrillic); Georgia is the fallback.

import type { CSSProperties } from 'react';

export const SERIF = "var(--font-adp-serif), 'Cormorant Garamond', Georgia, 'Times New Roman', serif";

/** `font-serif text-2xl font-normal text-white leading-snug`, tuned for Cormorant. */
export const VERDICT_STYLE: CSSProperties = {
  fontFamily: SERIF,
  fontWeight: 500,
  color: '#FFFFFF',
  lineHeight: 1.3,
  letterSpacing: '-0.005em',
};
