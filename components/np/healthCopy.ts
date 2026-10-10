// components/np/healthCopy.ts — texts of the "My Health" tab (/my-health) in RU / LV / EN.
// Wearable-only wording (cardio age, VO2 Max, HRV, resting HR) is shown on jury demo accounts only,
// next to the "Demo · needs a wearable" tag; real athletes get the engine-based wording.

import type { Lang } from '@/lib/i18n/translations';

export type HealthRange = 'd30' | 'd90' | 'y1';

export type HealthCopy = {
  title: string;
  period: string;
  range: Record<HealthRange, string>;
  /** "30-day trend" etc. */
  trend: Record<HealthRange, string>;
  limit: string;
  hero: {
    demoTitle: string;
    realTitle: string;
    ring: (v: number | null) => string;
    cardioAge: (age: number) => string;
    vsCalendar: (delta: string) => string;
    top: (pct: number) => string;
    logged: (a: number, b: number) => string;
    realSummary: (green: number, checked: number) => string;
    noData: string;
  };
  hrv: { title: string; band: (lo: number, hi: number) => string; balanced: string; outside: string };
  rhr: { title: string; vsAvg: (d: string) => string; down: string; up: string; steady: string };
  ready: { title: string; band: (lo: number, hi: number) => string; vsPrev: (d: string) => string; noData: string };
  load: { title: string; band: string; caption: string; noData: string };
  grid: {
    vo2: { name: string; unit: string; high: string; scale: [string, string, string, string, string]; empty: string };
    recovery: { name: string; caption: string };
    consistency: { name: string; unit: string; caption: string };
    stress: { name: string; demoValue: string; demoCaption: string; caption: (acwr: string) => string; bands: { low: string; sweet: string; caution: string; spike: string } };
  };
  wearEmpty: string;
  insight: {
    title: Record<HealthRange, string>;
    demo: (period: string) => string;
    real: (n: number, avg: number, delta: number | null, logged: number) => string;
    realNoPrev: (n: number, avg: number, green: number, checked: number) => string;
    noData: string;
  };
  loadError: string;
  note: string;
};

export const HEALTH: Record<Lang, HealthCopy> = {
  en: {
    title: 'My Health',
    period: 'Period',
    range: { d30: '30 Days', d90: '90 Days', y1: '1 Year' },
    trend: { d30: '30-day trend', d90: '90-day trend', y1: '1-year trend' },
    limit: 'Lotus shows up to the last 90 days of your own data for now.',
    hero: {
      demoTitle: 'Lotus Health Score',
      realTitle: 'Average Readiness',
      ring: (v) => (v === null ? 'No data yet' : `${v} out of 100`),
      cardioAge: (a) => `Cardio Age: ${a} y.o.`,
      vsCalendar: (d) => `${d} years vs calendar age`,
      top: (p) => `Cardio Fitness & Recovery are in the top ${p}% for your age group.`,
      logged: (a, b) => `Checked in ${a} of ${b} days`,
      realSummary: (g, c) => `Your readiness was in the green zone on ${g} of ${c} check-in days.`,
      noData: 'Check in on a few days and your average readiness appears here.',
    },
    hrv: { title: 'HRV Baseline', band: (lo, hi) => `Your range ${lo}–${hi} ms`, balanced: 'Balanced Baseline', outside: 'Outside your range' },
    rhr: { title: 'Resting Heart Rate Trend', vsAvg: (d) => `${d} bpm vs monthly avg`, down: 'Decreasing (Good)', up: 'Rising', steady: 'Steady' },
    ready: { title: 'Readiness Baseline', band: (lo, hi) => `Your usual ${lo}–${hi}`, vsPrev: (d) => `${d} vs previous period`, noData: 'No check-ins in this period yet.' },
    load: { title: 'Training Load Trend', band: 'Optimal 41–75', caption: 'ADP Load Index · period average', noData: 'No sessions logged in this period yet.' },
    grid: {
      vo2: { name: 'VO2 Max', unit: 'mL/kg/min', high: 'High', scale: ['Low', 'Fair', 'Good', 'High', 'Elite'], empty: 'Needs a wearable' },
      recovery: { name: 'Recovery Rate', caption: 'days in the green zone' },
      consistency: { name: 'Training Consistency', unit: 'days', caption: 'logged' },
      stress: {
        name: 'Stress Balance',
        demoValue: 'Low Risk',
        demoCaption: 'Restorative time exceeds daytime strain',
        caption: (a) => `Load vs your usual · ACWR ${a}`,
        bands: { low: 'Low load', sweet: 'Low Risk', caution: 'Watch', spike: 'High Risk' },
      },
    },
    wearEmpty: 'HRV, resting heart rate, VO2 Max and cardio age appear once a wearable is connected — Lotus never estimates them. Everything below comes from your check-ins and sessions.',
    insight: {
      title: { d30: 'Lotus Monthly Insight', d90: 'Lotus Quarterly Insight', y1: 'Lotus Yearly Insight' },
      demo: (p) => `Over the last ${p}, your recovery efficiency improved by 12%. Zone 2 training sessions provided optimal cardiac adaptation without overloading your nervous system.`,
      real: (n, avg, d, logged) =>
        `Over the last ${n} days your average readiness was ${avg}${d === null ? '' : Math.abs(d) < 1 ? ', about the same as the period before' : `, ${Math.abs(d)} points ${d > 0 ? 'higher' : 'lower'} than the period before`}. You checked in on ${logged} of ${n} days.`,
      realNoPrev: (n, avg, g, c) => `Over the last ${n} days your average readiness was ${avg}, in the green zone on ${g} of ${c} check-in days. Lotus compares with the previous period once there is enough history.`,
      noData: 'Check in on a few days and Lotus writes your first insight here.',
    },
    loadError: 'Couldn’t load your data. Your check-ins are safe — try again in a moment.',
    note: 'Lotus is a training-readiness guide, not a medical diagnosis. For questions about your health, talk to your doctor, school nurse or physio.',
  },
  ru: {
    title: 'Моё здоровье',
    period: 'Период',
    range: { d30: '30 дней', d90: '90 дней', y1: '1 год' },
    trend: { d30: 'тренд за 30 дней', d90: 'тренд за 90 дней', y1: 'тренд за год' },
    limit: 'Пока Lotus показывает до 90 последних дней твоих данных.',
    hero: {
      demoTitle: 'Индекс здоровья Lotus',
      realTitle: 'Средняя готовность',
      ring: (v) => (v === null ? 'Пока нет данных' : `${v} из 100`),
      cardioAge: (a) => `Кардио-возраст: ${a}`,
      vsCalendar: (d) => `${d} г. к паспортному возрасту`,
      top: (p) => `Кардио-форма и восстановление — в топ-${p}% твоей возрастной группы.`,
      logged: (a, b) => `Чек-ины: ${a} из ${b} дней`,
      realSummary: (g, c) => `Готовность была в зелёной зоне в ${g} из ${c} дней с чек-ином.`,
      noData: 'Заполни чек-ин несколько дней — средняя готовность появится здесь.',
    },
    hrv: { title: 'Базовая линия ВСР', band: (lo, hi) => `Твой диапазон ${lo}–${hi} мс`, balanced: 'Баланс в норме', outside: 'Вне твоего диапазона' },
    rhr: { title: 'Пульс покоя', vsAvg: (d) => `${d} уд/мин к среднему за месяц`, down: 'Снижается (хорошо)', up: 'Растёт', steady: 'Стабильно' },
    ready: { title: 'Базовая линия готовности', band: (lo, hi) => `Твой обычный ${lo}–${hi}`, vsPrev: (d) => `${d} к прошлому периоду`, noData: 'В этом периоде ещё нет чек-инов.' },
    load: { title: 'Тренд нагрузки', band: 'Оптимум 41–75', caption: 'ADP Load Index · среднее за период', noData: 'В этом периоде ещё нет тренировок.' },
    grid: {
      vo2: { name: 'VO2 Max', unit: 'мл/кг/мин', high: 'Высокий', scale: ['Низкий', 'Средний', 'Хороший', 'Высокий', 'Элита'], empty: 'Нужен браслет' },
      recovery: { name: 'Восстановление', caption: 'дней в зелёной зоне' },
      consistency: { name: 'Регулярность', unit: 'дн.', caption: 'с чек-ином' },
      stress: {
        name: 'Баланс стресса',
        demoValue: 'Низкий риск',
        demoCaption: 'Время восстановления больше дневной нагрузки',
        caption: (a) => `Нагрузка к обычной · ACWR ${a}`,
        bands: { low: 'Лёгкая нагрузка', sweet: 'Низкий риск', caution: 'Внимание', spike: 'Высокий риск' },
      },
    },
    wearEmpty: 'ВСР, пульс покоя, VO2 Max и кардио-возраст появятся после подключения носимого устройства — Lotus их никогда не оценивает «на глаз». Всё ниже — из твоих чек-инов и тренировок.',
    insight: {
      title: { d30: 'Месячный разбор Lotus', d90: 'Квартальный разбор Lotus', y1: 'Годовой разбор Lotus' },
      demo: (p) => `За ${p} эффективность твоего восстановления выросла на 12%. Тренировки в зоне 2 дали оптимальную адаптацию сердца без перегрузки нервной системы.`,
      real: (n, avg, d, logged) =>
        `За последние ${n} дн. твоя средняя готовность — ${avg}${d === null ? '' : Math.abs(d) < 1 ? ', почти как в прошлом периоде' : `, на ${Math.abs(d)} ${d > 0 ? 'выше' : 'ниже'}, чем в прошлом периоде`}. Чек-ин был в ${logged} из ${n} дней.`,
      realNoPrev: (n, avg, g, c) => `За последние ${n} дн. средняя готовность — ${avg}, зелёная зона в ${g} из ${c} дней с чек-ином. Сравнение с прошлым периодом появится, когда накопится история.`,
      noData: 'Заполни чек-ин несколько дней — Lotus напишет первый разбор здесь.',
    },
    loadError: 'Не удалось загрузить данные. Чек-ины сохранены — попробуй чуть позже.',
    note: 'Lotus — ориентир по готовности к тренировкам, а не медицинский диагноз. Вопросы о здоровье — к врачу, школьной медсестре или физиотерапевту.',
  },
  lv: {
    title: 'Mana veselība',
    period: 'Periods',
    range: { d30: '30 dienas', d90: '90 dienas', y1: '1 gads' },
    trend: { d30: '30 dienu tendence', d90: '90 dienu tendence', y1: 'gada tendence' },
    limit: 'Pagaidām Lotus rāda līdz 90 pēdējām dienām no taviem datiem.',
    hero: {
      demoTitle: 'Lotus veselības indekss',
      realTitle: 'Vidējā gatavība',
      ring: (v) => (v === null ? 'Vēl nav datu' : `${v} no 100`),
      cardioAge: (a) => `Kardio vecums: ${a}`,
      vsCalendar: (d) => `${d} g. pret kalendāro vecumu`,
      top: (p) => `Kardio forma un atjaunošanās ir labāko ${p}% vidū tavā vecuma grupā.`,
      logged: (a, b) => `Pārbaudes: ${a} no ${b} dienām`,
      realSummary: (g, c) => `Gatavība bija zaļajā zonā ${g} no ${c} dienām ar pārbaudi.`,
      noData: 'Aizpildi pārbaudi dažas dienas — vidējā gatavība parādīsies šeit.',
    },
    hrv: { title: 'SVV bāzes līnija', band: (lo, hi) => `Tavs diapazons ${lo}–${hi} ms`, balanced: 'Līdzsvarā', outside: 'Ārpus tava diapazona' },
    rhr: { title: 'Miera pulss', vsAvg: (d) => `${d} sit./min pret mēneša vidējo`, down: 'Samazinās (labi)', up: 'Pieaug', steady: 'Stabils' },
    ready: { title: 'Gatavības bāzes līnija', band: (lo, hi) => `Tavs ierastais ${lo}–${hi}`, vsPrev: (d) => `${d} pret iepriekšējo periodu`, noData: 'Šajā periodā vēl nav pārbaužu.' },
    load: { title: 'Slodzes tendence', band: 'Optimums 41–75', caption: 'ADP Load Index · perioda vidējais', noData: 'Šajā periodā vēl nav treniņu.' },
    grid: {
      vo2: { name: 'VO2 Max', unit: 'ml/kg/min', high: 'Augsts', scale: ['Zems', 'Vidējs', 'Labs', 'Augsts', 'Elite'], empty: 'Vajag viedierīci' },
      recovery: { name: 'Atjaunošanās', caption: 'dienas zaļajā zonā' },
      consistency: { name: 'Regularitāte', unit: 'd.', caption: 'ar pārbaudi' },
      stress: {
        name: 'Stresa līdzsvars',
        demoValue: 'Zems risks',
        demoCaption: 'Atpūtas laiks pārsniedz dienas slodzi',
        caption: (a) => `Slodze pret ierasto · ACWR ${a}`,
        bands: { low: 'Viegla slodze', sweet: 'Zems risks', caution: 'Uzmanību', spike: 'Augsts risks' },
      },
    },
    wearEmpty: 'SVV, miera pulss, VO2 Max un kardio vecums parādīsies, kad pieslēgsi viedierīci — Lotus tos nekad neaprēķina “uz aci”. Viss zemāk ir no taviem čekiem un treniņiem.',
    insight: {
      title: { d30: 'Lotus mēneša ieskats', d90: 'Lotus ceturkšņa ieskats', y1: 'Lotus gada ieskats' },
      demo: (p) => `Pēdējā ${p} tava atjaunošanās efektivitāte uzlabojās par 12%. Treniņi 2. zonā deva optimālu sirds adaptāciju, nepārslogojot nervu sistēmu.`,
      real: (n, avg, d, logged) =>
        `Pēdējās ${n} dienās tava vidējā gatavība bija ${avg}${d === null ? '' : Math.abs(d) < 1 ? ', gandrīz kā iepriekšējā periodā' : `, par ${Math.abs(d)} ${d > 0 ? 'augstāka' : 'zemāka'} nekā iepriekšējā periodā`}. Pārbaude bija ${logged} no ${n} dienām.`,
      realNoPrev: (n, avg, g, c) => `Pēdējās ${n} dienās vidējā gatavība bija ${avg}, zaļajā zonā ${g} no ${c} dienām ar pārbaudi. Salīdzinājums ar iepriekšējo periodu parādīsies, kad uzkrāsies vēsture.`,
      noData: 'Aizpildi pārbaudi dažas dienas — Lotus uzrakstīs pirmo ieskatu šeit.',
    },
    loadError: 'Neizdevās ielādēt datus. Tavas pārbaudes ir saglabātas — pamēģini vēlāk.',
    note: 'Lotus ir gatavības treniņam ceļvedis, nevis medicīniska diagnoze. Jautājumos par veselību vērsies pie ārsta, skolas medmāsas vai fizioterapeita.',
  },
};
