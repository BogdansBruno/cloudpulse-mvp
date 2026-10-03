// components/np/copy.ts — texts of the v3 "Night Performance" components (RU / LV / EN).

import type { Lang } from '@/lib/i18n/translations';
import type { PenaltyCode, ReadinessZone } from '@/lib/readiness-engine';
import type { LoadZone } from '@/lib/load-index';

export const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export type BioKey = 'hrv' | 'rhr' | 'spo2' | 'temp' | 'resp';
export type BioStatus = 'good' | 'warn' | 'bad';
export type SleepStageKey = 'deep' | 'rem' | 'light' | 'awake';

export type InsightInput = {
  score: number;
  zone: ReadinessZone;
  delta: number | null;
  yesterdayIndex: number | null;
  yesterdayZone: LoadZone | null;
  acwr: string | null;
  penalties: PenaltyCode[];
  target: { from: number; to: number } | null;
};

export type NpCopy = {
  demo: string;
  demoWearable: string;
  readiness: string;
  zone: Record<ReadinessZone, string>;
  state: Record<ReadinessZone, string>;
  vsAvg: (delta: string, days: number) => string;
  noScore: string;
  load: {
    title: string;
    scale: string;
    zones: Record<LoadZone, string>;
    target: (from: number, to: number) => string;
    targetShort: string;
    usual: (au: string) => string;
    dayAu: (au: string) => string;
    noBase: string;
    vsTarget: { below: string; in: string; above: string };
    chartNote: string;
    dayAuLabel: string;
  };
  sleep: {
    title: string;
    quality: string;
    qualityHint: string;
    stages: Record<SleepStageKey, string>;
    inBed: string;
    asleep: string;
    consistency: string;
    sleepHrv: string;
    noStages: string;
    hm: (minutes: number) => string;
  };
  bio: {
    title: string;
    note: string;
    names: Record<BioKey, string>;
    units: Record<BioKey, string>;
    status: Record<BioStatus, string>;
    norm: string;
    today: string;
    days14: string;
    badge: (n: number, all: number) => string;
    empty: string;
  };
  insight: {
    title: string;
    sub: string;
    ask: string;
    text: (v: InsightInput) => string;
    disclaimer: string;
  };
  week: string;
};

const signedNum = (n: number, lang: Lang) => (n > 0 ? '+' : n < 0 ? '−' : '±') + new Intl.NumberFormat(LOCALE[lang]).format(Math.abs(n));

export const NP: Record<Lang, NpCopy> = {
  ru: {
    demo: 'Демо',
    demoWearable: 'Демо · нужен браслет',
    readiness: 'Готовность',
    zone: { green: 'Зелёная зона', yellow: 'Жёлтая зона', red: 'Красная зона' },
    state: { green: 'Оптимально', yellow: 'Умеренно', red: 'Нужен отдых' },
    vsAvg: (d, n) => `${d} к среднему за ${n} дн.`,
    noScore: 'Балл появится после чек-ина.',
    load: {
      title: 'Нагрузка дня',
      scale: 'ADP Load Index · 0–100',
      zones: { light: 'Лёгкая', optimal: 'Оптимальная', overload: 'Перегруз' },
      target: (a, b) => `Цель на сегодня ${a}–${b}`,
      targetShort: 'цель',
      usual: (au) => `50 = твой обычный день (≈ ${au} ед.)`,
      dayAu: (au) => `${au} ед. = RPE × минуты`,
      noBase: 'База копится: индекс появится после 7 дней с тренировками.',
      vsTarget: { below: 'ниже цели', in: 'в коридоре цели', above: 'выше цели' },
      chartNote: 'Пунктир: границы зон 40 и 75. 50 — твой обычный день.',
      dayAuLabel: 'Нагрузка за день, ед.',
    },
    sleep: {
      title: 'Сон',
      quality: 'Оценка сна',
      qualityHint: 'из утреннего чек-ина, 7 — отлично',
      stages: { deep: 'Глубокий', rem: 'Быстрый (REM)', light: 'Лёгкий', awake: 'Бодрствование' },
      inBed: 'В кровати',
      asleep: 'Сон',
      consistency: 'Регулярность',
      sleepHrv: 'ВСР во сне',
      noStages: 'Фазы сна появятся, когда подключишь браслет. Сейчас ADP знает только твою оценку из чек-ина.',
      hm: (m) => `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`,
    },
    bio: {
      title: 'Биометрия',
      note: 'Полоса — твоя норма за 14 дней, точка — сегодня',
      names: { hrv: 'ВСР', rhr: 'ЧСС покоя', spo2: 'SpO2', temp: 'Темп. кожи', resp: 'Частота дыхания' },
      units: { hrv: 'мс', rhr: 'уд/мин', spo2: '%', temp: '°C', resp: '/мин' },
      status: { good: 'в норме', warn: 'у границы', bad: 'вне нормы' },
      norm: 'норма',
      today: 'сегодня',
      days14: '14 дней',
      badge: (n, all) => `${n}/${all} в норме`,
      empty: 'Подключи браслет — здесь появятся ВСР, пульс покоя, SpO2, температура кожи и дыхание. ADP не придумывает эти числа.',
    },
    insight: {
      title: 'Сводка ADP',
      sub: 'По правилам движка готовности',
      ask: 'Спросить ИИ-коуча',
      text: (v) => {
        const out = [`Готовность ${v.score} — ${NP.ru.zone[v.zone].toLowerCase()}.`];
        if (v.delta !== null && v.delta !== 0) out.push(`Это на ${Math.abs(v.delta)} ${v.delta < 0 ? 'ниже' : 'выше'} твоего среднего.`);
        if (v.yesterdayIndex !== null && v.yesterdayZone) out.push(`Вчера нагрузка ${v.yesterdayIndex} из 100 — ${NP.ru.load.zones[v.yesterdayZone].toLowerCase()}.`);
        const why = v.penalties.map((p) => PENALTY.ru[p](v.acwr));
        if (why.length) out.push(`Балл снизили: ${why.join(', ')}.`);
        if (v.target) out.push(`Сегодня держи нагрузку ${v.target.from}–${v.target.to}${TAIL.ru[v.zone]}.`);
        out.push('Решение — за тобой и тренером.');
        return out.join(' ');
      },
      disclaimer: 'Не диагноз. При боли — к врачу или школьной медсестре.',
    },
    week: 'Неделя',
  },
  lv: {
    demo: 'Demo',
    demoWearable: 'Demo · vajag aproci',
    readiness: 'Gatavība',
    zone: { green: 'Zaļā zona', yellow: 'Dzeltenā zona', red: 'Sarkanā zona' },
    state: { green: 'Optimāli', yellow: 'Mēreni', red: 'Vajag atpūtu' },
    vsAvg: (d, n) => `${d} pret vidējo ${n} dienās`,
    noScore: 'Punkti parādīsies pēc dienas ieraksta.',
    load: {
      title: 'Dienas slodze',
      scale: 'ADP Load Index · 0–100',
      zones: { light: 'Viegla', optimal: 'Optimāla', overload: 'Pārslodze' },
      target: (a, b) => `Šodienas mērķis ${a}–${b}`,
      targetShort: 'mērķis',
      usual: (au) => `50 = tava parastā diena (≈ ${au} v.)`,
      dayAu: (au) => `${au} v. = RPE × minūtes`,
      noBase: 'Bāze veidojas: indekss parādīsies pēc 7 dienām ar treniņiem.',
      vsTarget: { below: 'zem mērķa', in: 'mērķa koridorā', above: 'virs mērķa' },
      chartNote: 'Raustītā līnija: zonu robežas 40 un 75. 50 — tava parastā diena.',
      dayAuLabel: 'Dienas slodze, v.',
    },
    sleep: {
      title: 'Miegs',
      quality: 'Miega vērtējums',
      qualityHint: 'no rīta ieraksta, 7 — izcili',
      stages: { deep: 'Dziļais', rem: 'Ātrais (REM)', light: 'Vieglais', awake: 'Nomods' },
      inBed: 'Gultā',
      asleep: 'Miegs',
      consistency: 'Regularitāte',
      sleepHrv: 'SRV miegā',
      noStages: 'Miega fāzes parādīsies, kad pieslēgsi aproci. Pagaidām ADP zina tikai tavu vērtējumu no ieraksta.',
      hm: (m) => `${Math.floor(m / 60)} st ${String(m % 60).padStart(2, '0')} min`,
    },
    bio: {
      title: 'Biometrija',
      note: 'Josla — tava norma 14 dienās, punkts — šodien',
      names: { hrv: 'SRV', rhr: 'Miera pulss', spo2: 'SpO2', temp: 'Ādas temp.', resp: 'Elpošanas biežums' },
      units: { hrv: 'ms', rhr: 'sit./min', spo2: '%', temp: '°C', resp: '/min' },
      status: { good: 'normā', warn: 'pie robežas', bad: 'ārpus normas' },
      norm: 'norma',
      today: 'šodien',
      days14: '14 dienas',
      badge: (n, all) => `${n}/${all} normā`,
      empty: 'Pieslēdz aproci — šeit parādīsies SRV, miera pulss, SpO2, ādas temperatūra un elpošana. ADP šos skaitļus neizdomā.',
    },
    insight: {
      title: 'ADP kopsavilkums',
      sub: 'Pēc gatavības dzinēja noteikumiem',
      ask: 'Jautāt MI trenerim',
      text: (v) => {
        const out = [`Gatavība ${v.score} — ${NP.lv.zone[v.zone].toLowerCase()}.`];
        if (v.delta !== null && v.delta !== 0) out.push(`Tas ir par ${Math.abs(v.delta)} ${v.delta < 0 ? 'zemāk' : 'augstāk'} nekā tavs vidējais.`);
        if (v.yesterdayIndex !== null && v.yesterdayZone) out.push(`Vakar slodze ${v.yesterdayIndex} no 100 — ${NP.lv.load.zones[v.yesterdayZone].toLowerCase()}.`);
        const why = v.penalties.map((p) => PENALTY.lv[p](v.acwr));
        if (why.length) out.push(`Punktus samazināja: ${why.join(', ')}.`);
        if (v.target) out.push(`Šodien turi slodzi ${v.target.from}–${v.target.to}${TAIL.lv[v.zone]}.`);
        out.push('Lēmumu pieņem tu un treneris.');
        return out.join(' ');
      },
      disclaimer: 'Tā nav diagnoze. Ja sāp — pie ārsta vai skolas medmāsas.',
    },
    week: 'Nedēļa',
  },
  en: {
    demo: 'Demo',
    demoWearable: 'Demo · needs a wearable',
    readiness: 'Readiness',
    zone: { green: 'Green zone', yellow: 'Yellow zone', red: 'Red zone' },
    state: { green: 'Optimal', yellow: 'Moderate', red: 'Rest needed' },
    vsAvg: (d, n) => `${d} vs your ${n}-day average`,
    noScore: 'Your score appears after the check-in.',
    load: {
      title: 'Day load',
      scale: 'ADP Load Index · 0–100',
      zones: { light: 'Light', optimal: 'Optimal', overload: 'Overload' },
      target: (a, b) => `Today's target ${a}–${b}`,
      targetShort: 'target',
      usual: (au) => `50 = your usual day (≈ ${au} AU)`,
      dayAu: (au) => `${au} AU = RPE × minutes`,
      noBase: 'Building your base: the index appears after 7 days with training.',
      vsTarget: { below: 'below target', in: 'within target', above: 'above target' },
      chartNote: 'Dashed: zone borders 40 and 75. 50 is your usual day.',
      dayAuLabel: 'Day load, AU',
    },
    sleep: {
      title: 'Sleep',
      quality: 'Sleep rating',
      qualityHint: 'from the morning check-in, 7 = great',
      stages: { deep: 'Deep', rem: 'REM', light: 'Light', awake: 'Awake' },
      inBed: 'In bed',
      asleep: 'Asleep',
      consistency: 'Consistency',
      sleepHrv: 'HRV in sleep',
      noStages: 'Sleep stages appear once you connect a wearable. Right now ADP only knows your check-in rating.',
      hm: (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`,
    },
    bio: {
      title: 'Biometrics',
      note: 'Band = your 14-day normal range, dot = today',
      names: { hrv: 'HRV', rhr: 'Resting HR', spo2: 'SpO2', temp: 'Skin temp.', resp: 'Respiratory rate' },
      units: { hrv: 'ms', rhr: 'bpm', spo2: '%', temp: '°C', resp: '/min' },
      status: { good: 'in range', warn: 'near the edge', bad: 'out of range' },
      norm: 'range',
      today: 'today',
      days14: '14 days',
      badge: (n, all) => `${n}/${all} in range`,
      empty: 'Connect a wearable to see HRV, resting HR, SpO2, skin temperature and breathing here. ADP never makes these numbers up.',
    },
    insight: {
      title: 'ADP summary',
      sub: 'From the readiness engine rules',
      ask: 'Ask the AI coach',
      text: (v) => {
        const out = [`Readiness ${v.score} — ${NP.en.zone[v.zone].toLowerCase()}.`];
        if (v.delta !== null && v.delta !== 0) out.push(`That is ${Math.abs(v.delta)} ${v.delta < 0 ? 'below' : 'above'} your average.`);
        if (v.yesterdayIndex !== null && v.yesterdayZone) out.push(`Yesterday's load was ${v.yesterdayIndex} of 100 — ${NP.en.load.zones[v.yesterdayZone].toLowerCase()}.`);
        const why = v.penalties.map((p) => PENALTY.en[p](v.acwr));
        if (why.length) out.push(`Lowered by: ${why.join(', ')}.`);
        if (v.target) out.push(`Today keep your load at ${v.target.from}–${v.target.to}${TAIL.en[v.zone]}.`);
        out.push('You and your coach decide.');
        return out.join(' ');
      },
      disclaimer: 'Not a diagnosis. If something hurts — see a doctor or the school nurse.',
    },
    week: 'Week',
  },
};

/** One short reason per engine penalty code. */
const PENALTY: Record<Lang, Record<PenaltyCode, (acwr: string | null) => string>> = {
  ru: {
    ACWR_SPIKE: (a) => `резкий скачок нагрузки${a ? ` (ACWR ${a})` : ''}`,
    ACWR_RISING: (a) => `нагрузка за неделю выше обычной${a ? ` (ACWR ${a})` : ''}`,
    ACWR_LOW: () => 'нагрузка ниже обычной',
    WELLNESS_WORSE: () => 'самочувствие хуже обычного',
    NO_REST_STREAK: () => 'много дней без отдыха',
    EXAM_SOON: () => 'скоро экзамен',
    MONOTONY_HIGH: () => 'однообразная нагрузка',
  },
  lv: {
    ACWR_SPIKE: (a) => `straujš slodzes lēciens${a ? ` (ACWR ${a})` : ''}`,
    ACWR_RISING: (a) => `nedēļas slodze virs parastās${a ? ` (ACWR ${a})` : ''}`,
    ACWR_LOW: () => 'slodze zem parastās',
    WELLNESS_WORSE: () => 'pašsajūta sliktāka nekā parasti',
    NO_REST_STREAK: () => 'daudz dienu bez atpūtas',
    EXAM_SOON: () => 'drīz eksāmens',
    MONOTONY_HIGH: () => 'vienveidīga slodze',
  },
  en: {
    ACWR_SPIKE: (a) => `a sharp load spike${a ? ` (ACWR ${a})` : ''}`,
    ACWR_RISING: (a) => `weekly load above usual${a ? ` (ACWR ${a})` : ''}`,
    ACWR_LOW: () => 'load below usual',
    WELLNESS_WORSE: () => 'feeling worse than usual',
    NO_REST_STREAK: () => 'many days without rest',
    EXAM_SOON: () => 'an exam is coming',
    MONOTONY_HIGH: () => 'very uniform load',
  },
};

const TAIL: Record<Lang, Record<ReadinessZone, string>> = {
  ru: { green: '', yellow: ': техника и лёгкий темп, без максимальных усилий', red: ': только восстановление' },
  lv: { green: '', yellow: ': tehnika un viegls temps, bez maksimālas piepūles', red: ': tikai atjaunošanās' },
  en: { green: '', yellow: ': technique and an easy pace, no maximal efforts', red: ': recovery only' },
};

export function signed(n: number, lang: Lang): string {
  return signedNum(n, lang);
}
