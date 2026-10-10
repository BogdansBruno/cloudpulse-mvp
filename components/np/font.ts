// components/np/font.ts — the two typefaces of the app.
//   npFont   Onest (neo-grotesk, variable, Cyrillic + Latvian letters): all UI text, numbers and widget headers.
//            (the CSS variable keeps its old name --font-np-manrope so nothing else had to change)
//            CSS variable --font-np-manrope, picked up by `.np-app` in np-theme.css.
//   npSerif  Noto Serif Display (Light 300 / Regular 400, Cyrillic + Latvian): long-form reading only: the monthly insight and weekly summary (`.np-journal`). It stands in for "PP Editorial New", which is a paid
//            font with no Cyrillic letters, so it cannot render RU text.
import { Onest, Noto_Serif_Display } from 'next/font/google';

export const npFont = Onest({ subsets: ['latin', 'latin-ext', 'cyrillic'], display: 'swap', variable: '--font-np-manrope' });
export const npSerif = Noto_Serif_Display({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['300', '400'],
  display: 'swap',
  variable: '--font-np-serif-face',
});
/** Older name, still imported by /pro and /demo/mobile. */
export const npInter = npFont;
