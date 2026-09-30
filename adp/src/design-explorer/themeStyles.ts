// adp/src/design-explorer/themeStyles.ts
//
// Design tokens for the five design directions explored for ADP. Each theme
// is a complete set: colours, gradients, radii, shadows, type. Components read
// tokens from here and never hard-code a colour of their own, so a winning
// direction can later be lifted into the product as-is.
//
// The directions are inspired by the visual language of well-known sports and
// health apps (named only as references). No logos, marks or copied screens:
// everything here is drawn from scratch for CloudPulse.

import type { CSSProperties } from 'react';

export type ThemeId = 'glass' | 'feed' | 'whoop' | 'nike' | 'apple';

export type ThemeTokens = {
  id: ThemeId;
  /** Shown in the studio switcher. */
  name: string;
  /** Short description of the direction, per language. */
  tagline: { ru: string; lv: string; en: string };
  /** The app whose visual language inspired the direction (a reference only). */
  reference: string;
  mode: 'dark' | 'light';
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textFaint: string;
    good: string;
    warn: string;
    bad: string;
    info: string;
    accent: string;
    onAccent: string;
    track: string;
  };
  gradients: {
    page: string;
    hero: string;
    accent: string;
    cool: string;
  };
  radius: { card: number; inner: number; pill: number };
  shadow: { card: string; raised: string; glow: (color: string) => string };
  font: { body: string; display: string; mono: string };
  /** Readiness ring geometry. */
  ring: { stroke: number; size: number };
  /** Card surface extras (backdrop blur for glass, borders). */
  glass: boolean;
  borderWidth: number;
};

const SYSTEM_SANS =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const GEIST = "var(--font-geist-sans), system-ui, sans-serif";
const MONO = "var(--font-geist-mono), ui-monospace, 'SF Mono', Menlo, monospace";
/** Editorial serif for engine verdicts (loaded in app/layout.tsx; Georgia if missing). */
export const SERIF = "var(--font-adp-serif), 'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SF_INTER =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, var(--font-geist-sans), 'Segoe UI', Roboto, sans-serif";

export const THEMES: Readonly<Record<ThemeId, ThemeTokens>> = {
  // Flagship: liquid glass (white at 7 %, 30px blur, double highlight rim)
  // over a slow "liquid" light mesh. The page under the mesh is deep indigo,
  // so white text keeps AA contrast whatever colour drifts behind a card.
  // Cards and buttons: adp/src/components/ui/LiquidGlassCard / LiquidGlassButton.
  glass: {
    id: 'glass',
    name: 'Liquid Glass',
    tagline: {
      ru: 'Флагман: матовое стекло, жидкий фоновый свет, тонкие светящиеся линии. Данные читаются так же чётко.',
      lv: 'Flagmanis: matēts stikls, šķidra fona gaisma, smalkas mirdzošas līnijas. Dati lasāmi tikpat skaidri.',
      en: 'Flagship: frosted glass, liquid ambient light, fine glowing lines. The data reads just as clearly.',
    },
    reference: 'Apple visionOS / Health',
    mode: 'dark',
    colors: {
      bg: '#0A0F24',
      surface: 'rgba(255,255,255,0.07)',
      surfaceAlt: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.20)',
      text: '#F8FAFC',
      textMuted: '#CBD5E1',
      textFaint: '#94A3B8',
      good: '#34D399',
      warn: '#FBBF24',
      bad: '#FB7185',
      info: '#67E8F9',
      accent: '#FFFFFF',
      onAccent: '#0A0F24',
      track: 'rgba(255,255,255,0.10)',
    },
    gradients: {
      page: 'radial-gradient(120% 80% at 50% 0%, #1B2350 0%, #0A0F24 55%, #060913 100%)',
      hero: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%)',
      accent: 'linear-gradient(135deg, #67E8F9 0%, #34D399 100%)',
      cool: 'linear-gradient(135deg, #818CF8 0%, #67E8F9 100%)',
    },
    radius: { card: 32, inner: 20, pill: 999 },
    shadow: {
      card: 'inset 0 1px 1.5px 0 rgba(255,255,255,0.65), inset 0 -1px 2px 0 rgba(255,255,255,0.15), 0 12px 32px -4px rgba(0,0,0,0.18)',
      raised: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 10px 30px -12px rgba(2,6,23,0.7)',
      glow: (c) => `0 0 28px -4px ${c}`,
    },
    font: { body: SF_INTER, display: SF_INTER, mono: `ui-monospace, 'SF Mono', var(--font-geist-mono), Menlo, monospace` },
    ring: { stroke: 7, size: 200 },
    glass: true,
    borderWidth: 1,
  },
  // Night Feed: ADP "premium biohacking" — glass cards over a warm dune mesh
  // (#2A1D1A → #52362B → #12131A), serif verdicts, a feed that changes with
  // the time of day, a hero with three mini-rings, a 3-tab phone shell. Each metric has
  // its own glow: readiness = its zone colour, sleep = indigo, load = amber.
  feed: {
    id: 'feed',
    name: 'Night Feed',
    tagline: {
      ru: 'Премиальный биохакинг ADP: тёплый песчаный свет под стеклом, вердикт движка серифом, график нагрузки и шкалы «ты сейчас здесь». Лента дня и три вкладки.',
      lv: 'ADP premium biohakings: silta smilšu gaisma zem stikla, dzinēja spriedums ar serifu, slodzes grafiks un skalas «tu esi šeit». Dienas lenta un trīs cilnes.',
      en: 'ADP premium biohacking: warm sand light under glass, the engine’s verdict in serif, a load chart and “you are here” scales. A day feed and three tabs.',
    },
    reference: 'dark health-feed apps',
    mode: 'dark',
    colors: {
      bg: '#0C0D12',
      surface: 'rgba(24,25,34,0.80)',
      surfaceAlt: '#1F2130',
      border: 'rgba(255,255,255,0.10)',
      text: '#F4F5F7',
      textMuted: '#A7ADBD',
      textFaint: '#8A90A2',
      good: '#10B981',
      warn: '#F59E0B',
      bad: '#F43F5E',
      info: '#818CF8',
      accent: '#10B981',
      onAccent: '#03140D',
      track: 'rgba(255,255,255,0.08)',
    },
    gradients: {
      page: 'linear-gradient(180deg, #2A1D1A 0%, #1A1416 38%, #12131A 70%, #0C0D12 100%)',
      hero: 'linear-gradient(180deg, rgba(82,54,43,0.55) 0%, rgba(24,25,34,0.80) 60%)',
      accent: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      cool: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    },
    radius: { card: 28, inner: 18, pill: 999 },
    shadow: {
      card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px -20px rgba(0,0,0,0.85)',
      raised: '0 10px 30px -14px rgba(0,0,0,0.9)',
      glow: (c) => `0 0 40px -10px ${c}`,
    },
    font: { body: SYSTEM_SANS, display: SYSTEM_SANS, mono: MONO },
    ring: { stroke: 6, size: 176 },
    glass: false,
    borderWidth: 1,
  },
  whoop: {
    id: 'whoop',
    name: 'Performance Dark',
    tagline: {
      ru: 'Биохакинг для профи: плотные данные, большие кольца, моноширинные цифры.',
      lv: 'Biohakings profiem: blīvi dati, lieli gredzeni, vienplatuma cipari.',
      en: 'Pro biohacking: dense data, big rings, tabular numbers.',
    },
    reference: 'Whoop',
    mode: 'dark',
    colors: {
      bg: '#08080C',
      surface: '#12121A',
      surfaceAlt: '#171722',
      border: '#1F1F2C',
      text: '#F4F5F8',
      textMuted: '#9A9AB0',
      textFaint: '#5C5C72',
      good: '#39FF14',
      warn: '#FFC21A',
      bad: '#FF0844',
      info: '#00F2FE',
      accent: '#00F2FE',
      onAccent: '#041014',
      track: '#1C1C28',
    },
    gradients: {
      page: 'radial-gradient(80% 60% at 20% 0%, rgba(0,242,254,0.08), transparent 60%), #08080C',
      hero: 'linear-gradient(160deg, #14141E 0%, #0E0E16 100%)',
      accent: 'linear-gradient(90deg, #00F2FE 0%, #39FF14 100%)',
      cool: 'linear-gradient(180deg, rgba(0,242,254,0.14), rgba(0,242,254,0))',
    },
    radius: { card: 14, inner: 10, pill: 999 },
    shadow: {
      card: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      raised: '0 8px 24px rgba(0,0,0,0.5)',
      glow: (c) => `0 0 24px -4px ${c}`,
    },
    font: { body: GEIST, display: GEIST, mono: MONO },
    ring: { stroke: 16, size: 208 },
    glass: false,
    borderWidth: 1,
  },
  nike: {
    id: 'nike',
    name: 'Gen-Z Energy',
    tagline: {
      ru: 'Геймификация: жирная курсивная типографика, градиенты, серии и бейджи.',
      lv: 'Spēlifikācija: trekna kursīva tipogrāfija, gradienti, sērijas un nozīmītes.',
      en: 'Gamified: bold italic type, gradients, streaks and badges.',
    },
    reference: 'Nike / Strava',
    mode: 'dark',
    colors: {
      bg: '#120A2A',
      surface: '#1D1340',
      surfaceAlt: '#27195A',
      border: '#000000',
      text: '#FFFFFF',
      textMuted: '#C9BEF5',
      textFaint: '#8C7FC4',
      good: '#B8FF1F',
      warn: '#FFD600',
      bad: '#FF3B6B',
      info: '#35E0FF',
      accent: '#FF6A13',
      onAccent: '#120A2A',
      track: 'rgba(255,255,255,0.14)',
    },
    gradients: {
      page: 'radial-gradient(70% 50% at 100% 0%, rgba(255,43,214,0.28), transparent 60%), radial-gradient(60% 50% at 0% 100%, rgba(255,106,19,0.22), transparent 60%), #120A2A',
      hero: 'linear-gradient(135deg, #FF5E1A 0%, #FFB300 55%, #FFE600 100%)',
      accent: 'linear-gradient(135deg, #5B21FF 0%, #B620E0 50%, #FF2BD6 100%)',
      cool: 'linear-gradient(135deg, #35E0FF 0%, #5B21FF 100%)',
    },
    radius: { card: 22, inner: 14, pill: 999 },
    shadow: {
      card: '6px 6px 0 #000000',
      raised: '4px 4px 0 #000000',
      glow: (c) => `0 0 28px -6px ${c}`,
    },
    font: { body: GEIST, display: GEIST, mono: MONO },
    ring: { stroke: 14, size: 180 },
    glass: false,
    borderWidth: 2,
  },
  apple: {
    id: 'apple',
    name: 'Clean Health',
    tagline: {
      ru: 'Премиальный минимализм: воздух, мягкие пастельные статусы, понятно родителям и учителям.',
      lv: 'Premium minimālisms: gaiss, maigi pasteļu statusi, saprotams vecākiem un skolotājiem.',
      en: 'Premium minimalism: whitespace, soft pastel statuses, clear for parents and teachers.',
    },
    reference: 'Apple Health',
    mode: 'light',
    colors: {
      bg: '#F2F4F7',
      surface: '#FFFFFF',
      surfaceAlt: '#F7F8FA',
      border: 'rgba(15,23,42,0.06)',
      text: '#0B0D12',
      textMuted: '#5B6472',
      textFaint: '#9AA3B0',
      good: '#2FB36B',
      warn: '#E8962E',
      bad: '#E5484D',
      info: '#3A7AFE',
      accent: '#0B0D12',
      onAccent: '#FFFFFF',
      track: '#EEF0F4',
    },
    gradients: {
      page: 'linear-gradient(180deg, #F7F8FB 0%, #EEF1F5 100%)',
      hero: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFD 100%)',
      accent: 'linear-gradient(135deg, #3A7AFE 0%, #7C5CFF 100%)',
      cool: 'linear-gradient(180deg, rgba(58,122,254,0.08), rgba(58,122,254,0))',
    },
    radius: { card: 28, inner: 18, pill: 999 },
    shadow: {
      card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
      raised: '0 1px 2px rgba(15,23,42,0.06), 0 12px 32px rgba(15,23,42,0.10)',
      glow: (c) => `0 8px 24px -8px ${c}66`,
    },
    font: { body: SYSTEM_SANS, display: SYSTEM_SANS, mono: `ui-monospace, 'SF Mono', Menlo, monospace` },
    ring: { stroke: 12, size: 176 },
    glass: true,
    borderWidth: 1,
  },
};

export const THEME_ORDER: readonly ThemeId[] = ['glass', 'feed', 'whoop', 'nike', 'apple'];

/** The flagship direction, shown first in the studio. */
export const DEFAULT_THEME: ThemeId = 'glass';

/** Colour for a readiness / load zone in this theme. */
export function zoneColor(t: ThemeTokens, zone: 'green' | 'yellow' | 'red' | 'blocked'): string {
  return zone === 'green' ? t.colors.good : zone === 'yellow' ? t.colors.warn : t.colors.bad;
}

/** Soreness severity 1..5 → colour, per theme (low = calm, 5 = the theme's red). */
export function severityColor(t: ThemeTokens, s: 1 | 2 | 3 | 4 | 5): string {
  if (t.id === 'glass') return ['#67E8F9', '#6EE7B7', '#FCD34D', '#FDBA74', '#FB7185'][s - 1];
  if (t.id === 'feed') return ['#818CF8', '#34D399', '#FBBF24', '#FB923C', '#F43F5E'][s - 1];
  if (t.id === 'whoop') return ['#00F2FE', '#7CF8A0', '#FFC21A', '#FF7A2E', '#FF0844'][s - 1];
  if (t.id === 'nike') return ['#35E0FF', '#B8FF1F', '#FFD600', '#FF6A13', '#FF3B6B'][s - 1];
  return ['#8EC5FF', '#9BDDB4', '#F6C66E', '#F29B62', '#EF6B6F'][s - 1];
}

/** The card style every component starts from. */
export function cardStyle(t: ThemeTokens): CSSProperties {
  return {
    background: t.glass ? (t.mode === 'dark' ? t.colors.surface : 'rgba(255,255,255,0.78)') : t.colors.surface,
    border: `${t.borderWidth}px solid ${t.colors.border}`,
    borderRadius: t.radius.card,
    boxShadow: t.shadow.card,
    color: t.colors.text,
    fontFamily: t.font.body,
    backdropFilter: t.glass ? (t.mode === 'dark' ? 'saturate(160%) blur(40px)' : 'saturate(180%) blur(20px)') : undefined,
    WebkitBackdropFilter: t.glass ? (t.mode === 'dark' ? 'saturate(160%) blur(40px)' : 'saturate(180%) blur(20px)') : undefined,
  };
}
