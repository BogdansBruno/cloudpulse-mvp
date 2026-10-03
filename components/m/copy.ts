// components/m/copy.ts — texts of the Dark Minimal mobile screens (RU / LV / EN).

import type { Lang } from '@/lib/i18n/translations';

export type Zone = 'green' | 'yellow' | 'red';

export type MCopy = {
  today: string;
  readiness: string;
  zone: Record<Zone, string>;
  state: Record<Zone, string>;
  /** Exactly one sentence under the score. */
  advice: Record<Zone, string>;
  noCheckin: string;
  doCheckin: string;
  metrics: string;
  sleep: string;
  acwr: string;
  load: string;
  loadUnit: string;
  norm: (range: string) => string;
  noBase: string;
  inNorm: string;
  belowNorm: string;
  aboveNorm: string;
  planTitle: string;
  planBody: string;
  startTraining: string;
  tabs: { today: string; progress: string; training: string; pass: string };
  pass: {
    overline: string;
    title: string;
    status: { block: string; caution: string };
    holder: string;
    holderMissing: string;
    date: string;
    restrictions: string;
    decidedBy: string;
    decidedByValue: string;
    liveTime: string;
    scan: string;
    qrLoading: string;
    notMedical: string;
    close: string;
  };
};

export const M: Record<Lang, MCopy> = {
  ru: {
    today: 'Сегодня',
    readiness: 'Готовность',
    zone: { green: 'Зелёная зона', yellow: 'Жёлтая зона', red: 'Красная зона' },
    state: { green: 'Оптимальное состояние', yellow: 'День полегче', red: 'День восстановления' },
    advice: { green: 'Можно тренироваться по плану.', yellow: 'Сегодня без максимальных усилий.', red: 'Сегодня только восстановление.' },
    noCheckin: 'Балл появится после чек-ина.',
    doCheckin: 'Пройти чек-ин',
    metrics: 'Показатели',
    sleep: 'Сон',
    acwr: 'ACWR',
    load: 'Нагрузка за 7 дней',
    loadUnit: 'ед.',
    norm: (r) => `норма ${r}`,
    noBase: 'база ещё копится',
    inNorm: 'В норме',
    belowNorm: 'Ниже нормы',
    aboveNorm: 'Выше нормы',
    planTitle: 'Тренировка на сегодня',
    planBody: 'План уже учитывает твой балл.',
    startTraining: 'Начать тренировку',
    tabs: { today: 'Сегодня', progress: 'Прогресс', training: 'Тренировка', pass: 'QR-допуск' },
    pass: {
      overline: 'ADP · Safety Pass',
      title: 'Safety Pass: ограничения нагрузки',
      status: { block: 'Стоп: нагрузка ограничена', caution: 'Осторожно: облегчённая нагрузка' },
      holder: 'Ученик',
      holderMissing: 'Имя и класс не указаны в профиле',
      date: 'Действует',
      restrictions: 'Ограничения',
      decidedBy: 'Решение',
      decidedByValue: 'Движок готовности ADP — правила, не ИИ',
      liveTime: 'Живое время — сверь со своими часами',
      scan: 'Учитель сканирует камерой — проверка без входа',
      qrLoading: 'QR-код готовится…',
      notMedical: 'Не медицинская справка. При боли или травме — к врачу, школьной медсестре или физиотерапевту.',
      close: 'Закрыть',
    },
  },
  lv: {
    today: 'Šodien',
    readiness: 'Gatavība',
    zone: { green: 'Zaļā zona', yellow: 'Dzeltenā zona', red: 'Sarkanā zona' },
    state: { green: 'Optimāls stāvoklis', yellow: 'Vieglāka diena', red: 'Atjaunošanās diena' },
    advice: { green: 'Vari trenēties pēc plāna.', yellow: 'Šodien bez maksimālas piepūles.', red: 'Šodien tikai atjaunošanās.' },
    noCheckin: 'Punkti parādīsies pēc pieteikšanās.',
    doCheckin: 'Aizpildīt pieteikšanos',
    metrics: 'Rādītāji',
    sleep: 'Miegs',
    acwr: 'ACWR',
    load: 'Slodze 7 dienās',
    loadUnit: 'v.',
    norm: (r) => `norma ${r}`,
    noBase: 'bāze vēl veidojas',
    inNorm: 'Normā',
    belowNorm: 'Zem normas',
    aboveNorm: 'Virs normas',
    planTitle: 'Šodienas treniņš',
    planBody: 'Plāns jau ņem vērā tavus punktus.',
    startTraining: 'Sākt treniņu',
    tabs: { today: 'Šodien', progress: 'Progress', training: 'Treniņš', pass: 'QR caurlaide' },
    pass: {
      overline: 'ADP · Safety Pass',
      title: 'Safety Pass: slodzes ierobežojumi',
      status: { block: 'Stop: slodze ierobežota', caution: 'Uzmanīgi: vieglāka slodze' },
      holder: 'Skolēns',
      holderMissing: 'Vārds un klase profilā nav norādīti',
      date: 'Derīgs',
      restrictions: 'Ierobežojumi',
      decidedBy: 'Lēmums',
      decidedByValue: 'ADP gatavības dzinējs — noteikumi, nevis MI',
      liveTime: 'Dzīvais laiks — salīdzini ar saviem pulksteņiem',
      scan: 'Skolotājs skenē ar kameru — pārbaude bez pieteikšanās',
      qrLoading: 'QR kods tiek sagatavots…',
      notMedical: 'Nav medicīniska izziņa. Sāpju vai traumas gadījumā — pie ārsta, skolas medmāsas vai fizioterapeita.',
      close: 'Aizvērt',
    },
  },
  en: {
    today: 'Today',
    readiness: 'Readiness',
    zone: { green: 'Green zone', yellow: 'Yellow zone', red: 'Red zone' },
    state: { green: 'Optimal state', yellow: 'Lighter day', red: 'Recovery day' },
    advice: { green: 'You can train to plan.', yellow: 'No maximal efforts today.', red: 'Recovery only today.' },
    noCheckin: 'Your score appears after the check-in.',
    doCheckin: 'Do the check-in',
    metrics: 'Metrics',
    sleep: 'Sleep',
    acwr: 'ACWR',
    load: 'Load, last 7 days',
    loadUnit: 'AU',
    norm: (r) => `normal ${r}`,
    noBase: 'baseline still building',
    inNorm: 'Normal',
    belowNorm: 'Below normal',
    aboveNorm: 'Above normal',
    planTitle: 'Today’s session',
    planBody: 'The plan already accounts for your score.',
    startTraining: 'Start training',
    tabs: { today: 'Today', progress: 'Progress', training: 'Training', pass: 'QR pass' },
    pass: {
      overline: 'ADP · Safety Pass',
      title: 'Safety Pass: load restrictions',
      status: { block: 'Stop: load restricted', caution: 'Caution: lighter load' },
      holder: 'Student',
      holderMissing: 'Name and class are not set in the profile',
      date: 'Valid on',
      restrictions: 'Restrictions',
      decidedBy: 'Decided by',
      decidedByValue: 'ADP readiness engine — rules, not AI',
      liveTime: 'Live time — check it against your clock',
      scan: 'The teacher scans it with a camera — no login needed',
      qrLoading: 'Preparing the QR code…',
      notMedical: 'Not a medical certificate. For pain or injury — see a doctor, the school nurse or a physio.',
      close: 'Close',
    },
  },
};

export const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

/** Zone → text colour class. Green uses the accent (the score is the accent's one job). */
export const ZONE_TEXT: Record<Zone, string> = { green: 'text-ds-accent', yellow: 'text-ds-warn', red: 'text-ds-danger' };
export const ZONE_STROKE: Record<Zone, string> = { green: '#CCFF00', yellow: '#D9A441', red: '#E5636F' };
