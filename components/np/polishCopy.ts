// components/np/polishCopy.ts — texts of the Lotus polish pass (Today hero, check-in, calendar) in RU / LV / EN.
// Every number in these lines is passed in from the engine / the athlete's own history, never written here.

import type { Lang } from '@/lib/i18n/translations';

export type PolishCopy = {
  today: {
    /** "+12% vs avg" next to the 7-day sparkline of Sleep / Load */
    vsAvg: (pct: number) => string;
    onAvg: string;
    last7: string;
    sparkLabel: (name: string, n: number) => string;
    prime: { tag: string; title: string; body: (score: number, delta: number | null, from: number, to: number) => string; cta: string };
  };
  checkin: {
    scale: { low: string; high: string };
    pick: (n: number, of: number) => string;
    map: { title: string; hint: string; front: string; back: string; selected: (n: number) => string; clear: string; tap: string; none: string; max: (n: number) => string; remove: string };
    joints: { knee: string; ankle: string; elbow: string };
    typeToo: string;
    calc: { title: string; sub: string };
  };
  calendar: {
    add: string;
    legendOpen: string;
    legendTitle: string;
    sheetTitle: string;
    close: string;
    pickedDay: (label: string) => string;
    allUpcoming: string;
    showAll: string;
    nothingOn: string;
  };
};

export const POLISH: Record<Lang, PolishCopy> = {
  en: {
    today: {
      vsAvg: (p) => `${p > 0 ? '+' : '−'}${Math.abs(p)}% vs avg`,
      onAvg: 'As usual',
      last7: '7d',
      sparkLabel: (n, k) => `${n}: trend over the last ${k} days`,
      prime: {
        tag: 'Prime Condition',
        title: 'Ready for Maximum Intensity',
        body: (s, d, a, b) => `Readiness ${s}${d !== null && Math.abs(d) >= 3 ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)} vs your average)` : ''}, no restrictions today. Load target ${a}–${b} — the top of your optimal zone.`,
        cta: 'Open today’s workout',
      },
    },
    checkin: {
      scale: { low: 'Low', high: 'High' },
      pick: (n, of) => `${n} of ${of}`,
      map: {
        title: 'Where does it hurt or feel tight?',
        hint: 'Tap the areas. Front and back.',
        front: 'Front',
        back: 'Back',
        selected: (n) => (n === 1 ? '1 area selected' : `${n} areas selected`),
        clear: 'Clear',
        tap: 'Tap to select',
        none: 'Nothing selected yet.',
        max: (n) => `Up to ${n} areas — tell your coach about the rest.`,
        remove: 'Remove',
      },
      joints: { knee: 'Knee', ankle: 'Ankle', elbow: 'Elbow' },
      typeToo: 'Or describe it in words (optional)',
      calc: { title: 'Lotus is calculating your daily readiness…', sub: 'Load, sleep, wellness and your calendar' },
    },
    calendar: {
      add: 'Add an event',
      legendOpen: 'What the colours mean',
      legendTitle: 'Colour key',
      sheetTitle: 'New event',
      close: 'Close',
      pickedDay: (l) => `On ${l}`,
      allUpcoming: 'Coming up',
      showAll: 'Show all',
      nothingOn: 'Nothing planned for this day.',
    },
  },
  ru: {
    today: {
      vsAvg: (p) => `${p > 0 ? '+' : '−'}${Math.abs(p)}% к ср.`,
      onAvg: 'Как обычно',
      last7: '7 дн.',
      sparkLabel: (n, k) => `${n}: динамика за ${k} дн.`,
      prime: {
        tag: 'Лучшая форма',
        title: 'Готов к максимальной интенсивности',
        body: (s, d, a, b) => `Готовность ${s}${d !== null && Math.abs(d) >= 3 ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)} к твоему среднему)` : ''}, ограничений на сегодня нет. Цель по нагрузке ${a}–${b} — верх твоей оптимальной зоны.`,
        cta: 'Открыть тренировку на сегодня',
      },
    },
    checkin: {
      scale: { low: 'Низко', high: 'Высоко' },
      pick: (n, of) => `${n} из ${of}`,
      map: {
        title: 'Где болит или есть напряжение?',
        hint: 'Нажимай на зоны. Спереди и сзади.',
        front: 'Спереди',
        back: 'Сзади',
        selected: (n) => `Выбрано зон: ${n}`,
        clear: 'Сбросить',
        tap: 'Нажми, чтобы выбрать',
        none: 'Пока ничего не выбрано.',
        max: (n) => `До ${n} зон — об остальном скажи тренеру.`,
        remove: 'Убрать',
      },
      joints: { knee: 'Колено', ankle: 'Голеностоп', elbow: 'Локоть' },
      typeToo: 'Или опиши словами (по желанию)',
      calc: { title: 'Lotus считает твою готовность на сегодня…', sub: 'Нагрузка, сон, самочувствие и календарь' },
    },
    calendar: {
      add: 'Добавить событие',
      legendOpen: 'Что означают цвета',
      legendTitle: 'Цвета календаря',
      sheetTitle: 'Новое событие',
      close: 'Закрыть',
      pickedDay: (l) => `${l}`,
      allUpcoming: 'Скоро',
      showAll: 'Показать все',
      nothingOn: 'На этот день ничего не запланировано.',
    },
  },
  lv: {
    today: {
      vsAvg: (p) => `${p > 0 ? '+' : '−'}${Math.abs(p)}% pret vid.`,
      onAvg: 'Kā parasti',
      last7: '7 d.',
      sparkLabel: (n, k) => `${n}: tendence pēdējās ${k} dienās`,
      prime: {
        tag: 'Labākā forma',
        title: 'Gatavs maksimālai intensitātei',
        body: (s, d, a, b) => `Gatavība ${s}${d !== null && Math.abs(d) >= 3 ? ` (${d > 0 ? '+' : '−'}${Math.abs(d)} pret tavu vidējo)` : ''}, ierobežojumu šodien nav. Slodzes mērķis ${a}–${b} — tava optimālās zonas augšdaļa.`,
        cta: 'Atvērt šodienas treniņu',
      },
    },
    checkin: {
      scale: { low: 'Zems', high: 'Augsts' },
      pick: (n, of) => `${n} no ${of}`,
      map: {
        title: 'Kur sāp vai ir saspringums?',
        hint: 'Pieskaries zonām. No priekšas un no muguras.',
        front: 'Priekša',
        back: 'Mugura',
        selected: (n) => `Izvēlētas zonas: ${n}`,
        clear: 'Notīrīt',
        tap: 'Pieskaries, lai izvēlētos',
        none: 'Pagaidām nekas nav izvēlēts.',
        max: (n) => `Līdz ${n} zonām — par pārējo pastāsti treneram.`,
        remove: 'Noņemt',
      },
      joints: { knee: 'Celis', ankle: 'Potīte', elbow: 'Elkonis' },
      typeToo: 'Vai apraksti vārdos (pēc izvēles)',
      calc: { title: 'Lotus aprēķina tavu šodienas gatavību…', sub: 'Slodze, miegs, pašsajūta un kalendārs' },
    },
    calendar: {
      add: 'Pievienot notikumu',
      legendOpen: 'Ko nozīmē krāsas',
      legendTitle: 'Krāsu atšifrējums',
      sheetTitle: 'Jauns notikums',
      close: 'Aizvērt',
      pickedDay: (l) => `${l}`,
      allUpcoming: 'Drīzumā',
      showAll: 'Rādīt visu',
      nothingOn: 'Šajā dienā nekas nav ieplānots.',
    },
  },
};
