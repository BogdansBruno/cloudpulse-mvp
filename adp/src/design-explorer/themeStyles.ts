// adp/src/design-explorer/themeStyles.ts
//
// Design tokens for the three design directions explored for ADP. Each theme
// is a complete set: colours, gradients, radii, shadows, type. Components read
// tokens from here and never hard-code a colour of their own, so a winning
// direction can later be lifted into the product as-is.
//
// The directions are inspired by the visual language of well-known sports and
// health apps (named only as references). No logos, marks or copied screens:
// everything here is drawn from scratch for CloudPulse.

import type { CSSProperties } from 'react';

export type ThemeId = 'whoop' | 'nike' | 'apple';

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

export const THEMES: Readonly<Record<ThemeId, ThemeTokens>> = {
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

export const THEME_ORDER: readonly ThemeId[] = ['whoop', 'nike', 'apple'];

/** Colour for a readiness / load zone in this theme. */
export function zoneColor(t: ThemeTokens, zone: 'green' | 'yellow' | 'red' | 'blocked'): string {
  return zone === 'green' ? t.colors.good : zone === 'yellow' ? t.colors.warn : t.colors.bad;
}

/** Soreness severity 1..5 → colour, per theme (low = calm, 5 = the theme's red). */
export function severityColor(t: ThemeTokens, s: 1 | 2 | 3 | 4 | 5): string {
  if (t.id === 'whoop') return ['#00F2FE', '#7CF8A0', '#FFC21A', '#FF7A2E', '#FF0844'][s - 1];
  if (t.id === 'nike') return ['#35E0FF', '#B8FF1F', '#FFD600', '#FF6A13', '#FF3B6B'][s - 1];
  return ['#8EC5FF', '#9BDDB4', '#F6C66E', '#F29B62', '#EF6B6F'][s - 1];
}

/** The card style every component starts from. */
export function cardStyle(t: ThemeTokens): CSSProperties {
  return {
    background: t.glass ? 'rgba(255,255,255,0.78)' : t.colors.surface,
    border: `${t.borderWidth}px solid ${t.colors.border}`,
    borderRadius: t.radius.card,
    boxShadow: t.shadow.card,
    color: t.colors.text,
    fontFamily: t.font.body,
    backdropFilter: t.glass ? 'saturate(180%) blur(20px)' : undefined,
    WebkitBackdropFilter: t.glass ? 'saturate(180%) blur(20px)' : undefined,
  };
}
