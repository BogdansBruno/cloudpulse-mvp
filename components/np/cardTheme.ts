// components/np/cardTheme.ts — the tinted widget skins (Readiness · Sleep · Activity/Load · Stress · Alert).
//
// Each card is a dark glass tile with a 135° gradient of its own colour fading into near-black,
// plus an accent for its icon, status word, slider line and glow. The accent is the colour of the
// card's "normal" state; the status word still wears the colour of the ACTUAL status (a low readiness
// is never printed in the cheerful blue). Class strings are literals so the Tailwind scanner sees them.

export type CardTheme = 'readiness' | 'sleep' | 'activity' | 'stress' | 'alert';

export const CARD_THEME: Record<CardTheme, { bg: string; accent: string; border: string }> = {
  // Readiness: deep navy → near-black, cyan hairline
  readiness: {
    bg: 'lt-bg-readiness',
    accent: '#B8F23C',
    border: 'border-white/[0.06] hover:border-white/[0.12]',
  },
  // Sleep: deep forest → near-black, emerald hairline
  sleep: {
    bg: 'lt-bg-sleep',
    accent: '#8E8CFF',
    border: 'border-white/[0.06] hover:border-white/[0.12]',
  },
  // Load / activity: dark amber → near-black, golden hairline
  activity: {
    bg: 'lt-bg-activity',
    accent: '#FFB23D',
    border: 'border-white/[0.06] hover:border-white/[0.12]',
  },
  // Recovery / pain map / wellness: dark plum → near-black, magenta hairline
  stress: {
    bg: 'lt-bg-stress',
    accent: '#3FE0D0',
    border: 'border-white/[0.06] hover:border-white/[0.12]',
  },
  // Safety Guard blocks and pain alerts: dark crimson → near-black, red hairline
  alert: {
    bg: 'lt-bg-alert',
    accent: '#FF3D5A',
    border: 'border-[rgba(217,105,92,0.25)] hover:border-[rgba(217,105,92,0.4)]',
  },
};

/** Shell of a themed card: category gradient, coloured hairline (brighter on hover), glass top highlight, rounded-3xl. */
export function cardClass(theme: CardTheme): string {
  const t = CARD_THEME[theme];
  return `${t.bg} rounded-[26px_26px_26px_8px] border ${t.border} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-colors`;
}
