// components/np/modeCopy.ts — words for the two experience modes (EN / RU / LV).
// `plainLoad` turns the engine's ACWR band into one sentence an athlete can act on; `plainMono` does the same for monotony.
// The thresholds stay in components/np/Telemetry.tsx (acwrBand); nothing here changes a number.

import type { Lang } from '@/lib/i18n/translations';
import type { AcwrBand } from './appCopy';
import type { ReadinessZone } from '@/lib/readiness-engine';

export type Go = 'push' | 'steady' | 'recover';

/** Engine zone → the three colour bands of the simple view (green = Push · yellow = Steady · red = Recover). */
export const goOf = (zone: ReadinessZone | null): Go | null => (zone === 'green' ? 'push' : zone === 'yellow' ? 'steady' : zone === 'red' ? 'recover' : null);

/** Neon / slate contrast accents of the three bands (sports-school look; the red band doubles as the safety colour). */
export const GO_HEX: Record<Go, string> = { push: '#B8F23C', steady: '#FFC53D', recover: '#FF5C6C' };

type Copy = {
  mode: {
    title: string;
    hint: string;
    athlete: string;
    athleteSub: string;
    pro: string;
    proSub: string;
    now: (m: 'athlete' | 'pro') => string;
  };
  go: Record<Go, { name: string; line: string }>;
  load: Record<AcwrBand, string>;
  mono: { high: string; ok: string };
  proStrip: { title: string; acwr: string; mono: string; hooper: string; acute: string; chronic: string; none: string };
  simple: { title: string; sub: string; proHint: string };
};

export const MODE: Record<Lang, Copy> = {
  en: {
    mode: {
      title: 'Experience',
      hint: 'Athlete is the simple view. Pro shows the full numbers for coaches and curious athletes. Stored on this device only.',
      athlete: 'Athlete',
      athleteSub: 'Readiness, sleep, check-in. Plain words.',
      pro: 'Pro / Coach',
      proSub: 'ACWR, monotony, load tables, team sync.',
      now: (m) => (m === 'pro' ? 'Pro mode is on' : 'Athlete mode is on'),
    },
    go: {
      push: { name: 'Push', line: 'You are ready: train as planned.' },
      steady: { name: 'Steady', line: 'Train, but keep it controlled.' },
      recover: { name: 'Recover', line: 'Keep it easy today and let the body catch up.' },
    },
    load: {
      low: 'Your recent training is lighter than usual — there is room to build.',
      sweet: 'Your training load is in a good range for you.',
      caution: 'Load is rising faster than usual — keep today light.',
      spike: 'Load jumped fast this week — take an easy day and tell your coach.',
    },
    mono: { high: 'Your days look very alike — add one easy or different day.', ok: 'Your week has a good mix of hard and easy days.' },
    proStrip: { title: 'Telemetry', acwr: 'ACWR', mono: 'Monot.', hooper: 'Hooper', acute: 'Acute', chronic: 'Chronic', none: 'building' },
    simple: { title: 'Your training this month', sub: 'The short version. Switch to Pro for the full curves.', proHint: 'Pro mode shows ACWR, monotony and the load distribution.' },
  },
  ru: {
    mode: {
      title: 'Режим',
      hint: 'Атлет — простой вид. Pro показывает все цифры для тренера и любопытных атлетов. Хранится только на этом устройстве.',
      athlete: 'Атлет',
      athleteSub: 'Готовность, сон, чек-ин. Простыми словами.',
      pro: 'Pro / Тренер',
      proSub: 'ACWR, монотонность, таблицы нагрузки, команда.',
      now: (m) => (m === 'pro' ? 'Режим Pro включён' : 'Режим Атлет включён'),
    },
    go: {
      push: { name: 'Вперёд', line: 'Ты готов: тренируйся по плану.' },
      steady: { name: 'Ровно', line: 'Тренируйся, но держи темп под контролем.' },
      recover: { name: 'Восстановление', line: 'Сегодня полегче — дай телу догнать нагрузку.' },
    },
    load: {
      low: 'Последние тренировки легче обычного — есть запас, чтобы добавить.',
      sweet: 'Твоя нагрузка сейчас в хорошем для тебя диапазоне.',
      caution: 'Нагрузка растёт быстрее обычного — сегодня лучше полегче.',
      spike: 'Нагрузка резко выросла — сделай лёгкий день и скажи тренеру.',
    },
    mono: { high: 'Дни очень похожи друг на друга — добавь один лёгкий или другой по типу день.', ok: 'В неделе хорошее сочетание тяжёлых и лёгких дней.' },
    proStrip: { title: 'Телеметрия', acwr: 'ACWR', mono: 'Монот.', hooper: 'Hooper', acute: 'Острая', chronic: 'Хрон.', none: 'копится' },
    simple: { title: 'Твои тренировки за месяц', sub: 'Коротко. Включи Pro, чтобы увидеть все кривые.', proHint: 'В режиме Pro доступны ACWR, монотонность и распределение нагрузки.' },
  },
  lv: {
    mode: {
      title: 'Režīms',
      hint: 'Sportists ir vienkāršais skats. Pro rāda visus skaitļus trenerim un ziņkārīgiem sportistiem. Saglabājas tikai šajā ierīcē.',
      athlete: 'Sportists',
      athleteSub: 'Gatavība, miegs, atskaite. Vienkāršiem vārdiem.',
      pro: 'Pro / Treneris',
      proSub: 'ACWR, monotonija, slodzes tabulas, komanda.',
      now: (m) => (m === 'pro' ? 'Pro režīms ir ieslēgts' : 'Sportista režīms ir ieslēgts'),
    },
    go: {
      push: { name: 'Uz priekšu', line: 'Tu esi gatavs: trenējies pēc plāna.' },
      steady: { name: 'Mierīgi', line: 'Trenējies, bet saglabā tempu zem kontroles.' },
      recover: { name: 'Atjaunošanās', line: 'Šodien vieglāk — ļauj ķermenim panākt slodzi.' },
    },
    load: {
      low: 'Pēdējie treniņi ir vieglāki nekā parasti — ir vieta pievienot.',
      sweet: 'Tava slodze šobrīd ir tev labā diapazonā.',
      caution: 'Slodze aug ātrāk nekā parasti — šodien labāk vieglāk.',
      spike: 'Slodze strauji pieauga — izdari vieglu dienu un pasaki treneram.',
    },
    mono: { high: 'Dienas ir ļoti līdzīgas — pievieno vienu vieglu vai citādu dienu.', ok: 'Nedēļā ir laba smago un vieglo dienu maiņa.' },
    proStrip: { title: 'Telemetrija', acwr: 'ACWR', mono: 'Monot.', hooper: 'Hooper', acute: 'Akūtā', chronic: 'Hron.', none: 'krājas' },
    simple: { title: 'Tavi treniņi šomēnes', sub: 'Īsi. Ieslēdz Pro, lai redzētu visas līknes.', proHint: 'Pro režīmā ir ACWR, monotonija un slodzes sadalījums.' },
  },
};

/** Athlete-mode wording of the engine's deductions (no ACWR / monotony / Hooper terms; the points stay as they are). */
export const PLAIN_PENALTY: Record<Lang, Record<'ACWR_SPIKE' | 'ACWR_RISING' | 'ACWR_LOW' | 'WELLNESS_WORSE' | 'NO_REST_STREAK' | 'MONOTONY_HIGH', (n?: number) => string>> = {
  en: {
    ACWR_SPIKE: () => 'Load jumped fast this week',
    ACWR_RISING: () => 'Load is rising faster than usual',
    ACWR_LOW: () => 'Training has been much lighter than usual',
    WELLNESS_WORSE: () => 'You feel worse than your usual',
    NO_REST_STREAK: (n) => `${n ?? 'Several'} training days in a row without rest`,
    MONOTONY_HIGH: () => 'Your days look very alike',
  },
  ru: {
    ACWR_SPIKE: () => 'Нагрузка резко выросла за неделю',
    ACWR_RISING: () => 'Нагрузка растёт быстрее обычного',
    ACWR_LOW: () => 'Тренировки были заметно легче обычного',
    WELLNESS_WORSE: () => 'Самочувствие хуже твоего обычного',
    NO_REST_STREAK: (n) => `${n ?? 'Несколько'} тренировочных дней подряд без отдыха`,
    MONOTONY_HIGH: () => 'Дни очень похожи друг на друга',
  },
  lv: {
    ACWR_SPIKE: () => 'Slodze nedēļā strauji pieauga',
    ACWR_RISING: () => 'Slodze aug ātrāk nekā parasti',
    ACWR_LOW: () => 'Treniņi bijuši manāmi vieglāki nekā parasti',
    WELLNESS_WORSE: () => 'Pašsajūta ir sliktāka nekā tev parasti',
    NO_REST_STREAK: (n) => `${n ?? 'Vairākas'} treniņu dienas pēc kārtas bez atpūtas`,
    MONOTONY_HIGH: () => 'Dienas ir ļoti līdzīgas',
  },
};
