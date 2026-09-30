// adp/src/design-explorer/copy.ts
//
// Texts of the design studio in RU / LV / EN. Zone names, severity words and
// the coach-plan wording come from the product's own labels (../components/
// labels.ts) so every direction says exactly what the real app says.

import type { AdpLang } from '../components/labels';

export type DxCopy = {
  studio: {
    title: string;
    subtitle: string;
    compare: string;
    demoNote: string;
    inspired: (ref: string) => string;
    linked: string;
  };
  readiness: {
    title: string;
    zone: { green: string; yellow: string; red: string };
    zoneHint: { green: string; yellow: string; red: string };
    factorsTitle: string;
    acwr: string;
    acwrState: { low: string; ok: string; rising: string; spike: string };
    hooper: string;
    hooperHint: string;
    sleep: string;
    stress: string;
    fatigue: string;
    soreness: string;
    scale7: (v: number) => string;
    penaltiesTitle: string;
    penalties: Record<'EXAM_SOON' | 'WELLNESS_WORSE' | 'ACWR_RISING', string>;
    byCode: string;
    today: string;
  };
  soreness: {
    title: string;
    hint: string;
    front: string;
    back: string;
    clear: string;
    pick: string;
    none: string;
    marked: (n: number) => string;
    feedsPlan: string;
  };
  pass: {
    title: string;
    status: { block: string; caution: string };
    codes: Record<'PRE_MATCH' | 'EXAM_WINDOW', string>;
    show: string;
    validToday: (date: string) => string;
    valid: string;
    id: string;
    signature: string;
    demoQr: string;
    noHealth: string;
  };
  plan: {
    start: string;
    pause: string;
    resume: string;
    next: string;
    reset: string;
    now: string;
    done: string;
    upNext: string;
    left: string;
    blocksDone: (d: number, n: number) => string;
    guard: string;
    rules: (n: number) => string;
  };
  gamified: {
    streak: string;
    streakDays: (n: number) => string;
    badgesTitle: string;
    badges: { week: string; month: string; honest: string };
    progress: (a: number, b: number) => string;
    earned: string;
    level: string;
  };
};

export const DX = {
  ru: {
    studio: {
      title: 'Дизайн-студия ADP',
      subtitle: 'Пять направлений дизайна на одних и тех же данных. Флагман — Liquid Glass.',
      compare: 'Сравнение',
      demoNote: 'Демо-данные, не реальный спортсмен. Числа движка — пример.',
      inspired: (r) => `референс: ${r}`,
      linked: 'Карта усталости связана с планом: отметь мышцу — план пересоберётся по правилам движка.',
    },
    readiness: {
      title: 'Готовность',
      zone: { green: 'Зелёная зона', yellow: 'Жёлтая зона', red: 'Красная зона' },
      zoneHint: {
        green: 'Полная нагрузка разрешена',
        yellow: 'Нагрузку лучше снизить',
        red: 'Сегодня — восстановление',
      },
      factorsTitle: 'Из чего сложился балл',
      acwr: 'Нагрузка (ACWR)',
      acwrState: { low: 'ниже обычной', ok: 'в норме', rising: 'растёт', spike: 'резкий скачок' },
      hooper: 'Индекс Hooper',
      hooperHint: 'сон, стресс, усталость, забитость; меньше — лучше',
      sleep: 'Сон',
      stress: 'Стресс',
      fatigue: 'Усталость',
      soreness: 'Забитость',
      scale7: (v) => `${v}/7`,
      penaltiesTitle: 'Минус к баллу',
      penalties: {
        EXAM_SOON: 'Контрольная в ближайшие 3 дня',
        WELLNESS_WORSE: 'Самочувствие хуже обычного',
        ACWR_RISING: 'Нагрузка растёт быстрее обычного',
      },
      byCode: 'Считается кодом по чек-ину, не ИИ',
      today: 'Сегодня',
    },
    soreness: {
      title: 'Карта усталости',
      hint: 'Нажми на мышцу и выбери уровень',
      front: 'Спереди',
      back: 'Сзади',
      clear: 'Сбросить',
      pick: 'Уровень',
      none: 'Ничего не отмечено',
      marked: (n) => `Отмечено: ${n}`,
      feedsPlan: 'План ниже учитывает карту',
    },
    pass: {
      title: 'Safety Pass',
      status: { block: 'Нагрузки ограничены', caution: 'Осторожно' },
      codes: {
        PRE_MATCH: 'Завтра матч: тяжёлые силовые и интервалы под запретом.',
        EXAM_WINDOW: 'Окно контрольной: движок уже снизил балл.',
      },
      show: 'Покажи учителю физкультуры или тренеру — он отсканирует QR и увидит подтверждённый статус.',
      validToday: (d) => `Действует только ${d}`,
      valid: 'Действует',
      id: 'ID пропуска',
      signature: 'Подпись HMAC-SHA256 · без имени и данных о здоровье',
      demoQr: 'Демо-QR: подпись не проверяется',
      noHealth: 'В пропуске нет имени, баллов и места боли',
    },
    plan: {
      start: 'Старт',
      pause: 'Пауза',
      resume: 'Продолжить',
      next: 'Дальше',
      reset: 'Сначала',
      now: 'Сейчас',
      done: 'Готово',
      upNext: 'Дальше',
      left: 'осталось',
      blocksDone: (d, n) => `${d} из ${n} блоков`,
      guard: 'Safety Guard активен',
      rules: (n) => `${n} правил`,
    },
    gamified: {
      streak: 'Серия чек-инов',
      streakDays: (n) => `${n} дней подряд`,
      badgesTitle: 'Бейджи',
      badges: { week: 'Неделя без пропусков', month: 'Месяц чек-инов', honest: 'Честная карта мышц' },
      progress: (a, b) => `${a}/${b}`,
      earned: 'Получен',
      level: 'Уровень',
    },
  },
  lv: {
    studio: {
      title: 'ADP dizaina studija',
      subtitle: 'Pieci dizaina virzieni uz tiem pašiem datiem. Flagmanis — Liquid Glass.',
      compare: 'Salīdzinājums',
      demoNote: 'Demo dati, nav īsts sportists. Dzinēja skaitļi — piemērs.',
      inspired: (r) => `atsauce: ${r}`,
      linked: 'Noguruma karte saistīta ar plānu: atzīmē muskuli — plāns pārbūvēsies pēc dzinēja noteikumiem.',
    },
    readiness: {
      title: 'Gatavība',
      zone: { green: 'Zaļā zona', yellow: 'Dzeltenā zona', red: 'Sarkanā zona' },
      zoneHint: {
        green: 'Pilna slodze atļauta',
        yellow: 'Slodzi labāk samazināt',
        red: 'Šodien — atjaunošanās',
      },
      factorsTitle: 'No kā veidojās punkti',
      acwr: 'Slodze (ACWR)',
      acwrState: { low: 'zemāka nekā parasti', ok: 'normā', rising: 'aug', spike: 'strauss lēciens' },
      hooper: 'Hooper indekss',
      hooperHint: 'miegs, stress, nogurums, sasprindzinājums; mazāk — labāk',
      sleep: 'Miegs',
      stress: 'Stress',
      fatigue: 'Nogurums',
      soreness: 'Sasprindzinājums',
      scale7: (v) => `${v}/7`,
      penaltiesTitle: 'Mīnus punktiem',
      penalties: {
        EXAM_SOON: 'Kontroldarbs tuvāko 3 dienu laikā',
        WELLNESS_WORSE: 'Pašsajūta sliktāka nekā parasti',
        ACWR_RISING: 'Slodze aug ātrāk nekā parasti',
      },
      byCode: 'Aprēķina kods pēc reģistrācijas, nevis AI',
      today: 'Šodien',
    },
    soreness: {
      title: 'Noguruma karte',
      hint: 'Pieskaries muskulim un izvēlies līmeni',
      front: 'No priekšas',
      back: 'No mugurpuses',
      clear: 'Notīrīt',
      pick: 'Līmenis',
      none: 'Nekas nav atzīmēts',
      marked: (n) => `Atzīmēts: ${n}`,
      feedsPlan: 'Plāns zemāk ņem vērā karti',
    },
    pass: {
      title: 'Safety Pass',
      status: { block: 'Slodze ierobežota', caution: 'Uzmanīgi' },
      codes: {
        PRE_MATCH: 'Rīt spēle: smagi spēka treniņi un intervāli aizliegti.',
        EXAM_WINDOW: 'Kontroldarba logs: dzinējs jau samazināja punktus.',
      },
      show: 'Parādi sporta skolotājam vai trenerim — viņš noskenēs QR un redzēs apstiprinātu statusu.',
      validToday: (d) => `Derīgs tikai ${d}`,
      valid: 'Derīgs',
      id: 'Caurlaides ID',
      signature: 'HMAC-SHA256 paraksts · bez vārda un veselības datiem',
      demoQr: 'Demo QR: paraksts netiek pārbaudīts',
      noHealth: 'Caurlaidē nav vārda, punktu un sāpju vietas',
    },
    plan: {
      start: 'Sākt',
      pause: 'Pauze',
      resume: 'Turpināt',
      next: 'Tālāk',
      reset: 'No sākuma',
      now: 'Tagad',
      done: 'Gatavs',
      upNext: 'Tālāk',
      left: 'atlicis',
      blocksDone: (d, n) => `${d} no ${n} blokiem`,
      guard: 'Safety Guard aktīvs',
      rules: (n) => `${n} noteikumi`,
    },
    gamified: {
      streak: 'Reģistrāciju sērija',
      streakDays: (n) => `${n} dienas pēc kārtas`,
      badgesTitle: 'Nozīmītes',
      badges: { week: 'Nedēļa bez izlaidumiem', month: 'Mēnesis reģistrāciju', honest: 'Godīga muskuļu karte' },
      progress: (a, b) => `${a}/${b}`,
      earned: 'Iegūta',
      level: 'Līmenis',
    },
  },
  en: {
    studio: {
      title: 'ADP design studio',
      subtitle: 'Five design directions on the same data. Flagship: Liquid Glass.',
      compare: 'Compare',
      demoNote: 'Demo data, not a real athlete. Engine numbers are an example.',
      inspired: (r) => `reference: ${r}`,
      linked: 'The soreness map is linked to the plan: mark a muscle and the plan is rebuilt by the engine’s rules.',
    },
    readiness: {
      title: 'Readiness',
      zone: { green: 'Green zone', yellow: 'Yellow zone', red: 'Red zone' },
      zoneHint: {
        green: 'Full load allowed',
        yellow: 'Better to reduce the load',
        red: 'Recovery today',
      },
      factorsTitle: 'What made the score',
      acwr: 'Load (ACWR)',
      acwrState: { low: 'below usual', ok: 'on track', rising: 'rising', spike: 'sharp spike' },
      hooper: 'Hooper index',
      hooperHint: 'sleep, stress, fatigue, soreness; lower is better',
      sleep: 'Sleep',
      stress: 'Stress',
      fatigue: 'Fatigue',
      soreness: 'Soreness',
      scale7: (v) => `${v}/7`,
      penaltiesTitle: 'Taken off the score',
      penalties: {
        EXAM_SOON: 'Exam within 3 days',
        WELLNESS_WORSE: 'Feeling worse than usual',
        ACWR_RISING: 'Load rising faster than usual',
      },
      byCode: 'Computed by code from the check-in, not by AI',
      today: 'Today',
    },
    soreness: {
      title: 'Soreness map',
      hint: 'Tap a muscle and pick a level',
      front: 'Front',
      back: 'Back',
      clear: 'Clear',
      pick: 'Level',
      none: 'Nothing marked',
      marked: (n) => `Marked: ${n}`,
      feedsPlan: 'The plan below follows the map',
    },
    pass: {
      title: 'Safety Pass',
      status: { block: 'Load restricted', caution: 'Caution' },
      codes: {
        PRE_MATCH: 'Match tomorrow: heavy strength work and intervals are off.',
        EXAM_WINDOW: 'Exam window: the engine already lowered the score.',
      },
      show: 'Show this to your PE teacher or coach — they scan the QR and see the verified status.',
      validToday: (d) => `Valid only on ${d}`,
      valid: 'Valid on',
      id: 'Pass ID',
      signature: 'HMAC-SHA256 signature · no name, no health data',
      demoQr: 'Demo QR: signature not checked',
      noHealth: 'No name, score or pain location on the pass',
    },
    plan: {
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      next: 'Next',
      reset: 'Restart',
      now: 'Now',
      done: 'Done',
      upNext: 'Up next',
      left: 'left',
      blocksDone: (d, n) => `${d} of ${n} blocks`,
      guard: 'Safety Guard active',
      rules: (n) => `${n} rules`,
    },
    gamified: {
      streak: 'Check-in streak',
      streakDays: (n) => `${n} days in a row`,
      badgesTitle: 'Badges',
      badges: { week: 'Week without a miss', month: 'Month of check-ins', honest: 'Honest muscle map' },
      progress: (a, b) => `${a}/${b}`,
      earned: 'Earned',
      level: 'Level',
    },
  },
} satisfies Record<AdpLang, DxCopy>;
