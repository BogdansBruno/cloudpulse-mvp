// components/pro/copy.ts — texts of the desktop Pro dashboard (RU / LV / EN).

import type { Lang } from '@/lib/i18n/translations';

export type ProCopy = {
  title: string;
  today: string;
  prevDay: string;
  nextDay: string;
  askAi: string;
  nav: { dashboard: string; progress: string; calendar: string; chat: string };
  readinessChart: string;
  loadChart: string;
  acute: string;
  usual: string;
  zones: string;
  days: (n: number) => string;
  statsTitle: string;
  stats: {
    score: string;
    zone: string;
    acwr: string;
    acute: string;
    chronic: string;
    monotony: string;
    hooper: string;
    sleep: string;
    calm: string;
    energy: string;
    muscles: string;
    noRest: string;
    checkin: string;
  };
  zoneName: { green: string; yellow: string; red: string };
  yes: string;
  no: string;
  noData: string;
  noDataBody: string;
  toCheckin: string;
  byCode: string;
  loadNote: string;
  error: string;
};

export const PRO: Record<Lang, ProCopy> = {
  ru: {
    title: 'Дашборд',
    today: 'Сегодня',
    prevDay: 'Предыдущий день',
    nextDay: 'Следующий день',
    askAi: 'Спросить ИИ',
    nav: { dashboard: 'Дашборд', progress: 'Прогресс', calendar: 'Календарь', chat: 'Чат с коучем' },
    readinessChart: 'Готовность',
    loadChart: 'Нагрузка за 7 дней и обычная неделя',
    acute: 'За 7 дней',
    usual: 'Обычная неделя',
    zones: 'Пунктир: границы зон 50 и 75',
    days: (n) => `${n} дней`,
    statsTitle: 'Показатели дня',
    stats: {
      score: 'Готовность',
      zone: 'Зона',
      acwr: 'ACWR',
      acute: 'Нагрузка за 7 дней',
      chronic: 'Обычная неделя',
      monotony: 'Монотонность',
      hooper: 'Индекс Hooper',
      sleep: 'Сон',
      calm: 'Спокойствие',
      energy: 'Энергия',
      muscles: 'Мышцы',
      noRest: 'Дней без отдыха',
      checkin: 'Чек-ин',
    },
    zoneName: { green: 'Зелёная', yellow: 'Жёлтая', red: 'Красная' },
    yes: 'Есть',
    no: 'Нет',
    noData: 'Пока нет данных',
    noDataBody: 'Графики появятся после первых чек-инов.',
    toCheckin: 'Пройти чек-ин',
    byCode: 'Все числа считает движок готовности по чек-инам, не ИИ.',
    loadNote: 'Нагрузка = усилие (RPE) × минуты. ACWR = 7 дней ÷ обычная неделя.',
    error: 'Не удалось загрузить данные. Обнови страницу.',
  },
  lv: {
    title: 'Panelis',
    today: 'Šodien',
    prevDay: 'Iepriekšējā diena',
    nextDay: 'Nākamā diena',
    askAi: 'Jautāt MI',
    nav: { dashboard: 'Panelis', progress: 'Progress', calendar: 'Kalendārs', chat: 'Čats ar treneri' },
    readinessChart: 'Gatavība',
    loadChart: 'Slodze 7 dienās un parastā nedēļa',
    acute: '7 dienās',
    usual: 'Parastā nedēļa',
    zones: 'Svītrlīnija: zonu robežas 50 un 75',
    days: (n) => `${n} dienas`,
    statsTitle: 'Dienas rādītāji',
    stats: {
      score: 'Gatavība',
      zone: 'Zona',
      acwr: 'ACWR',
      acute: 'Slodze 7 dienās',
      chronic: 'Parastā nedēļa',
      monotony: 'Monotonija',
      hooper: 'Hooper indekss',
      sleep: 'Miegs',
      calm: 'Mierīgums',
      energy: 'Enerģija',
      muscles: 'Muskuļi',
      noRest: 'Dienas bez atpūtas',
      checkin: 'Pieteikšanās',
    },
    zoneName: { green: 'Zaļā', yellow: 'Dzeltenā', red: 'Sarkanā' },
    yes: 'Ir',
    no: 'Nav',
    noData: 'Vēl nav datu',
    noDataBody: 'Grafiki parādīsies pēc pirmajām pieteikšanās reizēm.',
    toCheckin: 'Aizpildīt pieteikšanos',
    byCode: 'Visus skaitļus aprēķina gatavības dzinējs no pieteikšanās datiem, nevis MI.',
    loadNote: 'Slodze = piepūle (RPE) × minūtes. ACWR = 7 dienas ÷ parastā nedēļa.',
    error: 'Neizdevās ielādēt datus. Atjauno lapu.',
  },
  en: {
    title: 'Dashboard',
    today: 'Today',
    prevDay: 'Previous day',
    nextDay: 'Next day',
    askAi: 'Ask AI',
    nav: { dashboard: 'Dashboard', progress: 'Progress', calendar: 'Calendar', chat: 'Coach chat' },
    readinessChart: 'Readiness',
    loadChart: 'Load over 7 days vs a usual week',
    acute: 'Last 7 days',
    usual: 'Usual week',
    zones: 'Dashed: zone borders at 50 and 75',
    days: (n) => `${n} days`,
    statsTitle: 'Day stats',
    stats: {
      score: 'Readiness',
      zone: 'Zone',
      acwr: 'ACWR',
      acute: 'Load, last 7 days',
      chronic: 'Usual week',
      monotony: 'Monotony',
      hooper: 'Hooper index',
      sleep: 'Sleep',
      calm: 'Calm',
      energy: 'Energy',
      muscles: 'Muscles',
      noRest: 'Days without rest',
      checkin: 'Check-in',
    },
    zoneName: { green: 'Green', yellow: 'Yellow', red: 'Red' },
    yes: 'Yes',
    no: 'No',
    noData: 'No data yet',
    noDataBody: 'Charts appear after the first check-ins.',
    toCheckin: 'Do a check-in',
    byCode: 'Every number is computed by the readiness engine from check-ins, not by AI.',
    loadNote: 'Load = effort (RPE) × minutes. ACWR = last 7 days ÷ usual week.',
    error: 'Could not load the data. Refresh the page.',
  },
};
