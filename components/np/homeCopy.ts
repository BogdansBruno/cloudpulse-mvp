// components/np/homeCopy.ts — texts of the app shell (header, ☰ menu, bottom dock) in RU / LV / EN.

import type { Lang } from '@/lib/i18n/translations';
import type { ReadinessZone } from '@/lib/readiness-engine';
import type { Status } from './status';

export type HomeCopy = {
  vitals: VitalsCopy;
  live: LiveCopy;
  nav: {
    today: string;
    vitals: string;
    coach: string;
    health: string;
    /** short dock labels (four tabs must fit a 320 px phone) */
    tab: { coach: string; calendar: string };
    plus: string;
    menu: string;
    menuClose: string;
    share: string;
    shared: string;
    shareText: string;
  };
  today: {
    rings: { readiness: string; sleep: string; load: string };
    status: Record<Status, string>;
    headline: Record<ReadinessZone, string>;
    noCheckinHeadline: string;
    insightTitle: string;
    /** Two short sentences from the engine's numbers (zone, score, Δ to the athlete's average, load target). */
    insight: (zone: ReadinessZone, score: number, delta: number | null, target: { from: number; to: number }) => string;
    noCheckin: string;
    cta: string;
    loadError: string;
    ringLabel: (name: string, value: number | null, max: number) => string;
    loadCard: { title: string; target: (from: number, to: number) => string; none: string; scale: string };
    heart: {
      title: string;
      demoTag: string;
      bpm: string;
      ms: string;
      lowest: string;
      at: (time: string) => string;
      hrv: string;
      balanced: string;
      empty: string;
      live: string;
      chart: string;
    };
    sleep: {
      title: string;
      hm: (minutes: number) => string;
      stages: { deep: string; rem: string; light: string; awake: string };
      deep: string;
      rem: string;
      efficiency: string;
      restfulness: string;
      rating: (v: number) => string;
      ratingBadge: (v: number) => string;
      noRating: string;
      empty: string;
      bar: string;
    };
  };
};

export type LiveCopy = {
  live: string;
  ready: string;
  paused: string;
  title: string;
  focus: (zone: number) => string;
  zone: (n: number, name: string, from: number, to: number) => string;
  below: string;
  zoneNames: [string, string, string, string, string];
  noAge: string;
  zonesNote: string;
  inZone: string;
  trimp: string;
  trimpHint: string;
  avg: string;
  max: string;
  min: string;
  noHr: string;
  start: string;
  pause: string;
  resume: string;
  holdEnd: string;
  holdHint: string;
  summary: string;
};

export type VitalsCopy = {
  title: string;
  period: string;
  range: { today: string; d7: string; d30: string };
  checkinTitle: string;
  checkinSub: string;
  wearTitle: string;
  tile: { readiness: string; wellness: string; load: string; acwr: string; rhr: string; hrv: string; temp: string; resp: string };
  unit: { bpm: string; ms: string; rpm: string };
  vsAvg: (delta: string) => string;
  vsPrev: (delta: string) => string;
  balanced: string;
  normal: string;
  avgOf: (n: number) => string;
  latest: string;
  wearEmpty: string;
  hrvChart: { title: string; band: (lo: number, hi: number) => string; insight: (inBand: number, n: number) => string };
  readyChart: {
    title: string;
    band: (lo: number, hi: number) => string;
    insight: (inBand: number, n: number) => string;
    noBand: (n: number) => string;
    noData: string;
  };
};

const delta = (d: number | null, below: string, above: string, wrap: (s: string) => string): string =>
  d === null || Math.abs(d) < 3 ? '' : wrap(`${Math.abs(d)} ${d < 0 ? below : above}`);

export const HOME: Record<Lang, HomeCopy> = {
  ru: {
    live: {
      live: 'Идёт тренировка',
      ready: 'Готово к старту',
      paused: 'Пауза',
      title: 'Тренировка',
      focus: (z) => `фокус: зона ${z}`,
      zone: (n, name, a, b) => `Зона ${n} • ${name} (${a}–${b} уд/мин)`,
      below: 'Ниже зоны 1',
      zoneNames: ['Восстановление', 'Выносливость', 'Аэробная', 'Порог', 'Максимум'],
      noAge: 'Укажи возраст в профиле — тогда появятся пульсовые зоны.',
      zonesNote: 'Зоны — % от макс. пульса (208 − 0,7 × возраст). Ориентир, не диагноз.',
      inZone: 'Время в зоне 3+',
      trimp: 'Нагрузка TRIMP',
      trimpHint: 'минуты × номер зоны',
      avg: 'Средний пульс',
      max: 'Макс. пульс',
      min: 'мин',
      noHr: 'нужен пульсовой датчик',
      start: 'Начать тренировку',
      pause: 'Пауза',
      resume: 'Продолжить',
      holdEnd: 'Удерживай, чтобы закончить',
      holdHint: 'Удерживай 1,5 с',
      summary: 'Итог тренировки',
    },
    vitals: {
      title: 'Показатели и восстановление',
      period: 'Период',
      range: { today: 'Сегодня', d7: '7 дней', d30: '30 дней' },
      checkinTitle: 'Чек-ин и нагрузка',
      checkinSub: 'Из твоих утренних чек-инов и записанных тренировок.',
      wearTitle: 'Показатели браслета',
      tile: { readiness: 'Готовность', wellness: 'Самочувствие', load: 'Load Index', acwr: 'ACWR', rhr: 'Пульс покоя', hrv: 'ВСР (rMSSD)', temp: 'Темп. кожи', resp: 'Дыхание' },
      unit: { bpm: 'уд/мин', ms: 'мс', rpm: 'вд/мин' },
      vsAvg: (d) => `${d} к среднему`,
      vsPrev: (d) => `${d} к прошлому периоду`,
      balanced: 'В балансе',
      normal: 'Норма',
      avgOf: (n) => `среднее за ${n} дн.`,
      latest: 'последнее значение',
      wearEmpty: 'Пульс покоя, ВСР, температура кожи и частота дыхания появятся, когда подключишь браслет. Lotus их не придумывает.',
      hrvChart: {
        title: 'Баланс ВСР и восстановление',
        band: (a, b) => `Зона баланса ${a}–${b} мс`,
        insight: (k, n) => `ВСР была в зоне баланса ${k} из ${n} дней на этой неделе.`,
      },
      readyChart: {
        title: 'Баланс готовности',
        band: (a, b) => `Твой обычный диапазон ${a}–${b}`,
        insight: (k, n) => `Готовность была в твоём обычном диапазоне ${k} из ${n} дней с чек-ином.`,
        noBand: (n) => `Твой обычный диапазон появится после 5 чек-инов (сейчас ${n}).`,
        noData: 'За этот период чек-инов ещё нет.',
      },
    },
    nav: {
      today: 'Сегодня',
      vitals: 'Метрики',
      coach: 'ИИ-Тренер',
      health: 'Здоровье',
      tab: { coach: 'Тренер', calendar: 'Календарь' },
      plus: 'Новый чек-ин',
      menu: 'Меню',
      menuClose: 'Закрыть меню',
      share: 'Поделиться приложением',
      shared: 'Ссылка скопирована',
      shareText: 'Lotus — готовность к тренировке для юных спортсменов',
    },
    today: {
      rings: { readiness: 'Готовность', sleep: 'Сон', load: 'Нагрузка' },
      status: { optimal: 'Оптимально', good: 'Хорошо', fair: 'Средне', light: 'Легко', attention: 'Внимание' },
      headline: { green: 'Готов к работе', yellow: 'Ровный темп', red: 'Время восстановиться' },
      noCheckinHeadline: 'Начни с чек-ина',
      insightTitle: 'Итог дня',
      insight: (z, sc, d, t) => {
        const dd = delta(d, 'ниже', 'выше', (x) => ` (на ${x} твоего среднего)`);
        if (z === 'green') return `Ты хорошо восстановился: готовность ${sc} — зелёная зона${dd}. Цель нагрузки на сегодня — ${t.from}–${t.to}.`;
        if (z === 'yellow') return `Готовность ${sc} — средняя зона${dd}. Тренируйся, но без рывков: нагрузка ${t.from}–${t.to}.`;
        return `Готовность ${sc} — низкая${dd}, сегодня восстановление. Нагрузка не выше ${t.to}, обсуди день с тренером.`;
      },
      noCheckin: 'Пять коротких вопросов, около 30 секунд — и Lotus посчитает готовность и цель нагрузки на сегодня.',
      cta: 'Пройти чек-ин',
      loadError: 'Не удалось загрузить данные. Чек-ин всё равно можно пройти — он сохранится.',
      ringLabel: (n, v, m) => (v === null ? `${n}: нет данных` : `${n}: ${v} из ${m}`),
      heart: {
        title: 'Пульс покоя и ВСР',
        demoTag: 'Демо · нужен браслет',
        bpm: 'уд/мин',
        ms: 'мс',
        lowest: 'Минимальный пульс',
        at: (t) => `в ${t}`,
        hrv: 'Средняя ВСР',
        balanced: 'В балансе',
        empty: 'Пока нет источника пульса. Пульс покоя и ВСР появятся здесь, когда подключишь браслет, — Lotus их не придумывает.',
        live: 'Измерить пульс в Live-тренировке',
        chart: 'Пульс за день',
      },
      sleep: {
        title: 'Качество сна и фазы',
        hm: (m) => `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`,
        stages: { deep: 'Глубокий', rem: 'REM', light: 'Лёгкий', awake: 'Бодрствование' },
        deep: 'Глубокий сон',
        rem: 'Фаза REM',
        efficiency: 'Эффективность',
        restfulness: 'Спокойствие сна',
        rating: (v) => `${v}/7`,
        ratingBadge: (v) => `Оценка в чек-ине: ${v}/7`,
        noRating: 'Чек-ина сегодня ещё нет',
        empty: 'Фазы сна (глубокий, REM, лёгкий) появятся, когда подключишь браслет, — Lotus их не придумывает. Твоя оценка сна из утреннего чек-ина остаётся здесь.',
        bar: 'Состав сна',
      },
      loadCard: { title: 'Тренировочная нагрузка', target: (a, b) => `Цель на сегодня ${a}–${b}`, none: 'Цель появится после чек-ина', scale: 'ADP Load Index · RPE × минуты' },
    },
  },
  lv: {
    live: {
      live: 'Treniņš notiek',
      ready: 'Gatavs sākt',
      paused: 'Pauze',
      title: 'Treniņš',
      focus: (z) => `fokuss: ${z}. zona`,
      zone: (n, name, a, b) => `${n}. zona • ${name} (${a}–${b} sit./min)`,
      below: 'Zem 1. zonas',
      zoneNames: ['Atjaunošanās', 'Izturība', 'Aerobā', 'Slieksnis', 'Maksimums'],
      noAge: 'Norādi vecumu profilā — tad parādīsies pulsa zonas.',
      zonesNote: 'Zonas — % no maks. pulsa (208 − 0,7 × vecums). Orientieris, ne diagnoze.',
      inZone: 'Laiks 3.+ zonā',
      trimp: 'TRIMP slodze',
      trimpHint: 'minūtes × zonas numurs',
      avg: 'Vidējais pulss',
      max: 'Maks. pulss',
      min: 'min',
      noHr: 'vajag pulsa sensoru',
      start: 'Sākt treniņu',
      pause: 'Pauze',
      resume: 'Turpināt',
      holdEnd: 'Turi, lai beigtu',
      holdHint: 'Turi 1,5 s',
      summary: 'Treniņa kopsavilkums',
    },
    vitals: {
      title: 'Rādītāji un atjaunošanās',
      period: 'Periods',
      range: { today: 'Šodien', d7: '7 dienas', d30: '30 dienas' },
      checkinTitle: 'Ieraksts un slodze',
      checkinSub: 'No taviem rīta ierakstiem un pierakstītajiem treniņiem.',
      wearTitle: 'Aproces rādītāji',
      tile: { readiness: 'Gatavība', wellness: 'Pašsajūta', load: 'Load Index', acwr: 'ACWR', rhr: 'Miera pulss', hrv: 'SMV (rMSSD)', temp: 'Ādas temp.', resp: 'Elpošana' },
      unit: { bpm: 'sit./min', ms: 'ms', rpm: 'ieelpas/min' },
      vsAvg: (d) => `${d} pret vidējo`,
      vsPrev: (d) => `${d} pret iepriekšējo periodu`,
      balanced: 'Līdzsvarā',
      normal: 'Normā',
      avgOf: (n) => `vidēji ${n} d.`,
      latest: 'pēdējā vērtība',
      wearEmpty: 'Miera pulss, SMV, ādas temperatūra un elpošanas biežums parādīsies, kad pieslēgsi aproci. Lotus tos neizdomā.',
      hrvChart: {
        title: 'SMV līdzsvars un atjaunošanās',
        band: (a, b) => `Līdzsvara zona ${a}–${b} ms`,
        insight: (k, n) => `SMV šonedēļ bija līdzsvara zonā ${k} no ${n} dienām.`,
      },
      readyChart: {
        title: 'Gatavības līdzsvars',
        band: (a, b) => `Tavs ierastais diapazons ${a}–${b}`,
        insight: (k, n) => `Gatavība bija tavā ierastajā diapazonā ${k} no ${n} dienām ar ierakstu.`,
        noBand: (n) => `Tavs ierastais diapazons parādīsies pēc 5 ierakstiem (tagad ${n}).`,
        noData: 'Šajā periodā ierakstu vēl nav.',
      },
    },
    nav: {
      today: 'Šodien',
      vitals: 'Rādītāji',
      coach: 'MI treneris',
      tab: { coach: 'Treneris', calendar: 'Kalendārs' },
      health: 'Veselība',
      plus: 'Jauns ieraksts',
      menu: 'Izvēlne',
      menuClose: 'Aizvērt izvēlni',
      share: 'Dalīties ar lietotni',
      shared: 'Saite nokopēta',
      shareText: 'Lotus — gatavība treniņam jaunajiem sportistiem',
    },
    today: {
      rings: { readiness: 'Gatavība', sleep: 'Miegs', load: 'Slodze' },
      status: { optimal: 'Optimāli', good: 'Labi', fair: 'Vidēji', light: 'Viegli', attention: 'Uzmanību' },
      headline: { green: 'Gatavs darbam', yellow: 'Vienmērīgs temps', red: 'Laiks atgūties' },
      noCheckinHeadline: 'Sāc ar ierakstu',
      insightTitle: 'Dienas kopsavilkums',
      insight: (z, sc, d, t) => {
        const dd = delta(d, 'zem', 'virs', (x) => ` (${x} tava vidējā)`);
        if (z === 'green') return `Tu labi atguvies: gatavība ${sc} — zaļā zona${dd}. Šodienas slodzes mērķis — ${t.from}–${t.to}.`;
        if (z === 'yellow') return `Gatavība ${sc} — vidējā zona${dd}. Trenējies, bet bez rāvieniem: slodze ${t.from}–${t.to}.`;
        return `Gatavība ${sc} — zema${dd}, šodien atjaunošanās. Slodze ne vairāk kā ${t.to}, pārrunā dienu ar treneri.`;
      },
      noCheckin: 'Pieci īsi jautājumi, ap 30 sekundēm — un Lotus aprēķinās gatavību un šodienas slodzes mērķi.',
      cta: 'Aizpildīt ierakstu',
      loadError: 'Neizdevās ielādēt datus. Ierakstu tik un tā var aizpildīt — tas saglabāsies.',
      ringLabel: (n, v, m) => (v === null ? `${n}: nav datu` : `${n}: ${v} no ${m}`),
      heart: {
        title: 'Miera pulss un SMV',
        demoTag: 'Demo · vajag aproci',
        bpm: 'sit./min',
        ms: 'ms',
        lowest: 'Zemākais pulss',
        at: (t) => `plkst. ${t}`,
        hrv: 'Vidējā SMV',
        balanced: 'Līdzsvarā',
        empty: 'Pulsa avota vēl nav. Miera pulss un SMV parādīsies šeit, kad pieslēgsi aproci, — Lotus tos neizdomā.',
        live: 'Mērīt pulsu Live treniņā',
        chart: 'Pulss dienas laikā',
      },
      sleep: {
        title: 'Miega kvalitāte un fāzes',
        hm: (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`,
        stages: { deep: 'Dziļais', rem: 'REM', light: 'Vieglais', awake: 'Nomods' },
        deep: 'Dziļais miegs',
        rem: 'REM fāze',
        efficiency: 'Efektivitāte',
        restfulness: 'Miega mierīgums',
        rating: (v) => `${v}/7`,
        ratingBadge: (v) => `Ieraksta vērtējums: ${v}/7`,
        noRating: 'Šodien ieraksta vēl nav',
        empty: 'Miega fāzes (dziļais, REM, vieglais) parādīsies, kad pieslēgsi aproci, — Lotus tās neizdomā. Tavs miega vērtējums no rīta ieraksta paliek šeit.',
        bar: 'Miega sastāvs',
      },
      loadCard: { title: 'Treniņa slodze', target: (a, b) => `Šodienas mērķis ${a}–${b}`, none: 'Mērķis parādīsies pēc ieraksta', scale: 'ADP Load Index · RPE × minūtes' },
    },
  },
  en: {
    live: {
      live: 'Live session',
      ready: 'Ready',
      paused: 'Paused',
      title: 'Workout',
      focus: (z) => `Zone ${z} focus`,
      zone: (n, name, a, b) => `Zone ${n} • ${name} (${a}–${b} bpm)`,
      below: 'Below zone 1',
      zoneNames: ['Recovery', 'Endurance', 'Aerobic', 'Threshold', 'Maximum'],
      noAge: 'Add your age in your profile to see heart-rate zones.',
      zonesNote: 'Zones are % of max heart rate (208 − 0.7 × age). A guide, not a diagnosis.',
      inZone: 'Time in Zone 3+',
      trimp: 'TRIMP load',
      trimpHint: 'minutes × zone number',
      avg: 'Avg heart rate',
      max: 'Max heart rate',
      min: 'min',
      noHr: 'needs a heart-rate strap',
      start: 'Start workout',
      pause: 'Pause workout',
      resume: 'Resume workout',
      holdEnd: 'Hold to end',
      holdHint: 'Hold for 1.5 s',
      summary: 'Workout summary',
    },
    vitals: {
      title: 'Vitals & Recovery',
      period: 'Period',
      range: { today: 'Today', d7: '7 Days', d30: '30 Days' },
      checkinTitle: 'Check-in & training load',
      checkinSub: 'From your morning check-ins and logged sessions.',
      wearTitle: 'Wearable vitals',
      tile: { readiness: 'Readiness', wellness: 'Wellness', load: 'Load Index', acwr: 'ACWR', rhr: 'Resting HR', hrv: 'HRV (rMSSD)', temp: 'Skin Temp', resp: 'Resp. Rate' },
      unit: { bpm: 'bpm', ms: 'ms', rpm: 'rpm' },
      vsAvg: (d) => `${d} vs avg`,
      vsPrev: (d) => `${d} vs prev.`,
      balanced: 'Balanced',
      normal: 'Normal',
      avgOf: (n) => `avg of ${n} days`,
      latest: 'latest value',
      wearEmpty: 'Resting heart rate, HRV, skin temperature and breathing rate appear once a wearable is connected. Lotus never estimates them.',
      hrvChart: {
        title: 'HRV Balance & Recovery Curve',
        band: (a, b) => `Balanced range ${a}–${b} ms`,
        insight: (k, n) => `Your HRV stayed inside the balanced range on ${k} of ${n} days this week.`,
      },
      readyChart: {
        title: 'Readiness Balance',
        band: (a, b) => `Your usual range ${a}–${b}`,
        insight: (k, n) => `Readiness stayed inside your usual range on ${k} of ${n} check-in days.`,
        noBand: (n) => `Your usual range appears after 5 check-ins (now ${n}).`,
        noData: 'No check-ins in this period yet.',
      },
    },
    nav: {
      today: 'Today',
      vitals: 'Vitals',
      coach: 'AI Coach',
      tab: { coach: 'Coach', calendar: 'Calendar' },
      health: 'My Health',
      plus: 'New check-in',
      menu: 'Menu',
      menuClose: 'Close menu',
      share: 'Share the app',
      shared: 'Link copied',
      shareText: 'Lotus — training readiness for young athletes',
    },
    today: {
      rings: { readiness: 'Readiness', sleep: 'Sleep', load: 'Load' },
      status: { optimal: 'Optimal', good: 'Good', fair: 'Fair', light: 'Light', attention: 'Pay attention' },
      headline: { green: 'Ready for action', yellow: 'Steady does it', red: 'Time to recover' },
      noCheckinHeadline: 'Start with your check-in',
      insightTitle: 'Daily insight',
      insight: (z, sc, d, t) => {
        const dd = delta(d, 'below', 'above', (x) => ` (${x} your average)`);
        if (z === 'green') return `You recovered well: readiness ${sc} is in the green zone${dd}. Aim for a training load of ${t.from}–${t.to} today.`;
        if (z === 'yellow') return `Readiness ${sc} is in the middle zone${dd}. Train, but keep it controlled: a load of ${t.from}–${t.to}.`;
        return `Readiness ${sc} is low${dd} — today is for recovery. Keep the load under ${t.to} and talk the day through with your coach.`;
      },
      noCheckin: 'Five quick questions, about 30 seconds — then Lotus works out today’s readiness and load target.',
      cta: 'Check in',
      loadError: 'Couldn’t load your data. You can still check in — it will be saved.',
      ringLabel: (n, v, m) => (v === null ? `${n}: no data` : `${n}: ${v} of ${m}`),
      heart: {
        title: 'Resting Heart Rate & HRV',
        demoTag: 'Demo · needs a wearable',
        bpm: 'bpm',
        ms: 'ms',
        lowest: 'Lowest HR',
        at: (t) => `at ${t}`,
        hrv: 'Avg HRV',
        balanced: 'Balanced',
        empty: 'No heart-rate source yet. Resting heart rate and HRV appear here once a wearable is connected — Lotus never estimates them.',
        live: 'Measure heart rate in a Live workout',
        chart: 'Heart rate over the day',
      },
      sleep: {
        title: 'Sleep Quality & Stages',
        hm: (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`,
        stages: { deep: 'Deep', rem: 'REM', light: 'Light', awake: 'Awake' },
        deep: 'Deep Sleep',
        rem: 'REM Sleep',
        efficiency: 'Efficiency',
        restfulness: 'Restfulness',
        rating: (v) => `${v}/7`,
        ratingBadge: (v) => `Check-in rating: ${v}/7`,
        noRating: 'No check-in yet today',
        empty: 'Sleep stages (deep, REM, light) appear once a wearable is connected — Lotus never estimates them. Your own rating from the morning check-in stays here.',
        bar: 'Sleep composition',
      },
      loadCard: { title: 'Training load', target: (a, b) => `Today’s target ${a}–${b}`, none: 'Your target appears after the check-in', scale: 'ADP Load Index · RPE × minutes' },
    },
  },
};
