// components/np/cardCopy.ts — texts of the tinted widget cards (Vitals, Today chips) in RU / LV / EN.
// The serif lines are picked from the numbers on the card, never written freely.

import type { Lang } from '@/lib/i18n/translations';

export type CardCopy = {
  /** serif descriptor by readiness zone / sleep rating / load zone / stress rating */
  sleepLine: { good: string; fair: string; attention: string };
  loadLine: { light: string; optimal: string; attention: string };
  stress: { title: string; calm: string; mid: string; high: string; scale: string; wellness: string };
  chips: { wellness: string; label: string };
  sleepTitle: string;
  loadTitle: string;
  usual: (lo: number, hi: number) => string;
  target: string;
  noUsual: string;
  /** "Why this score" card on Today */
  why: { title: string; equation: (minus: number, score: number) => string; deductions: (n: number) => string; clean: string; none: string; base: string };
};

export const CARDS: Record<Lang, CardCopy> = {
  en: {
    sleepLine: { good: 'You slept well', fair: 'A fair night', attention: 'A short night' },
    loadLine: { light: 'A light day', optimal: 'Right in your zone', attention: 'A heavy day' },
    stress: { title: 'Stress & Wellness', calm: 'Calm', mid: 'Manageable', high: 'Elevated', scale: '1 = very stressed · 7 = calm', wellness: 'Wellness' },
    chips: { wellness: 'Wellness', label: 'Today at a glance' },
    sleepTitle: 'Sleep',
    loadTitle: 'Training load',
    usual: (lo, hi) => `Your usual range ${lo}–${hi}`,
    target: 'Optimal 41–75',
    noUsual: 'Your usual range appears after 5 check-ins',
    why: {
      title: 'What shaped today’s score',
      equation: (m, s) => `100 − ${m} = ${s}`,
      deductions: (n) => `−${n} points`,
      clean: 'No deductions',
      none: 'Nothing pulled your score down today — load, wellness and your calendar are all in range.',
      base: 'Every day starts at 100. The engine subtracts points for each risk it sees — the same rules for every athlete.',
    },
  },
  ru: {
    sleepLine: { good: 'Ты хорошо выспался', fair: 'Обычная ночь', attention: 'Короткая ночь' },
    loadLine: { light: 'Лёгкий день', optimal: 'В твоей зоне', attention: 'Тяжёлый день' },
    stress: { title: 'Стресс и самочувствие', calm: 'Спокойно', mid: 'В норме', high: 'Повышен', scale: '1 = сильный стресс · 7 = спокойно', wellness: 'Самочувствие' },
    chips: { wellness: 'Самочувствие', label: 'Сегодня кратко' },
    sleepTitle: 'Сон',
    loadTitle: 'Нагрузка',
    usual: (lo, hi) => `Твой обычный диапазон ${lo}–${hi}`,
    target: 'Оптимум 41–75',
    noUsual: 'Обычный диапазон появится после 5 чек-инов',
    why: {
      title: 'Из чего сложился балл',
      equation: (m, s) => `100 − ${m} = ${s}`,
      deductions: (n) => `−${n} баллов`,
      clean: 'Без вычетов',
      none: 'Сегодня ничто не снизило балл — нагрузка, самочувствие и календарь в норме.',
      base: 'Каждый день начинается со 100. Движок вычитает баллы за каждый риск — правила одинаковые для всех.',
    },
  },
  lv: {
    sleepLine: { good: 'Tu labi izgulēji', fair: 'Parasta nakts', attention: 'Īsa nakts' },
    loadLine: { light: 'Viegla diena', optimal: 'Tavā zonā', attention: 'Smaga diena' },
    stress: { title: 'Stress un pašsajūta', calm: 'Mierīgi', mid: 'Normāli', high: 'Paaugstināts', scale: '1 = liels stress · 7 = mierīgi', wellness: 'Pašsajūta' },
    chips: { wellness: 'Pašsajūta', label: 'Šodien īsumā' },
    sleepTitle: 'Miegs',
    loadTitle: 'Slodze',
    usual: (lo, hi) => `Tavs ierastais diapazons ${lo}–${hi}`,
    target: 'Optimums 41–75',
    noUsual: 'Ierastais diapazons parādīsies pēc 5 pārbaudēm',
    why: {
      title: 'Kas veidoja šodienas punktus',
      equation: (m, s) => `100 − ${m} = ${s}`,
      deductions: (n) => `−${n} punkti`,
      clean: 'Bez atskaitījumiem',
      none: 'Šodien nekas nesamazināja punktus — slodze, pašsajūta un kalendārs ir normā.',
      base: 'Katra diena sākas ar 100. Dzinējs atņem punktus par katru risku — noteikumi visiem vienādi.',
    },
  },
};
