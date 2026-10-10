// components/np/appCopy.ts — texts of the v3 app shell, check-in flow and chat (RU / LV / EN).
// Everything that already exists in lib/i18n/translations.ts (nav names, check-in questions,
// chat welcome) is reused from there; only the NEW strings of the v3 screens live here.

import type { Lang } from '@/lib/i18n/translations';

export type AppCopy = {
  shell: {
    main: string;
    mobileNav: string;
    language: string;
    workout: string;
    pro: string;
    role: { athlete: string; coach: string; parent: string };
    online: string;
    offline: string;
    settings: string;
  };
  settings: {
    title: string;
    account: string;
    languageTitle: string;
    languageHint: string;
    status: string;
    adminOpen: string;
    signOutHint: string;
    privacy: string;
  };
  checkin: {
    stepOf: (i: number, n: number) => string;
    steps: { sleep: string; fatigue: string; stress: string; body: string; load: string };
    next: string;
    back: string;
    liveTitle: string;
    liveHint: string;
    liveNone: string;
    liveNote: string;
    sessionToday: string;
    sessionAu: (au: string) => string;
    sessionNone: string;
    painNote: string;
    doneTarget: string;
    doneTargetBody: (from: number, to: number) => string;
    doneTargetOf: string;
    doneTargetPain: string;
    doneTargetScale: string;
    doneOpenWorkout: string;
    doneNoScore: string;
  };
  chat: {
    statusIdle: string;
    statusThinking: string;
    statusListening: string;
    statusSees: (score: number | null, acwr: string | null) => string;
    chipYesterday: string;
    chipWhyScore: (score: number) => string;
    chipPlanToday: string;
    chipWhyAcwr: (acwr: string) => string;
    chipCheckinFirst: string;
    send: string;
    online: string;
    focusLabel: string;
    sidebarTitle: string;
    sidebarEmpty: string;
    codeCopy: string;
  };
  v3: V3Copy;
  progress: ProgressCopy;
  calendar: CalendarCopy;
  workout: WorkoutCopy;
};


export type AcwrBand = 'low' | 'sweet' | 'caution' | 'spike';

export type V3Copy = {
  greeting: (hour: number) => string;
  disclaimer: string;
  disclaimerShort: string;
  short: { sleep: string; fatigue: string; stress: string; soreness: string };
  telemetry: {
    title: string;
    readiness: string;
    load: string;
    wellness: string;
    wellnessSub: string;
    acwr: string;
    acwrHint: string;
    acwrBand: Record<AcwrBand, string>;
    monotony: string;
    monotonyHint: string;
    monotonyHigh: string;
    monotonyOk: string;
    hooper: string;
    hooperHint: string;
    vsBase: (d: string) => string;
    sleep: string;
    sleepHint: string;
    streak: string;
    streakHint: string;
    streakDays: (n: number) => string;
    none: string;
  };
};

export type ProgressCopy = {
  period: string;
  periods: Record<7 | 30 | 90, string>;
  chartTitle: string;
  chartSub: string;
  legendReadiness: string;
  legendLoad: string;
  acwrNow: string;
  acwrSub: string;
  avgReadiness: string;
  avgSleep: string;
  totalVolume: string;
  volumeUnit: string;
  volumeHint: string;
  monotony: string;
  greenDays: string;
  vsPrev: string;
  checkinDays: (n: number, all: number) => string;
  viewDay: string;
  viewAvg: string;
  viewLabel: string;
  hrvTitle: string;
  hrvEmpty: string;
  tableTitle: string;
  more: string;
  none: string;
  errLoad: string;
};

export type CalendarCopy = {
  prev: string;
  next: string;
  legendNoCheckin: string;
  today: string;
  close: string;
  answers: string;
  loadTitle: string;
  session: (rpe: number, min: number, au: string) => string;
  noSession: string;
  penalties: string;
  noPenalties: string;
  noCheckin: string;
  outside: string;
  events: string;
  inspect: string;
  datesTitle: string;
};

export type WorkoutCopy = {
  title: string;
  exit: string;
  elapsed: string;
  sets: string;
  set: (n: number) => string;
  work: string;
  rest: string;
  restLeft: string;
  restDone: string;
  restSec: string;
  startSet: string;
  endSet: string;
  skipRest: string;
  pause: string;
  resume: string;
  finish: string;
  finished: (min: number, sets: number) => string;
  logHint: string;
  toCheckin: string;
  ble: {
    connect: string;
    connecting: string;
    connected: string;
    unsupported: string;
    lost: string;
    error: string;
    noSensor: string;
  };
  bpm: string;
  hrDrop: (n: number) => string;
  hrv: string;
  hrvNote: string;
  ringNote: string;
  info: string;
  finishConfirm: string;
  finishYes: string;
  cancel: string;
  wake: string;
  startLink: string;
  startLinkSub: string;
};

export const APP: Record<Lang, AppCopy> = {
  ru: {
    shell: { main: 'Основное содержимое', mobileNav: 'Основная навигация', language: 'Язык', workout: 'Live', pro: 'Pro', role: { athlete: 'Атлет', coach: 'Тренер', parent: 'Родитель' }, online: 'Онлайн', offline: 'Офлайн — сохраним позже', settings: 'Настройки' },
    settings: { title: 'Настройки', account: 'Аккаунт', languageTitle: 'Язык', languageHint: 'Интерфейс и ответы тренера-ИИ на выбранном языке.', status: 'Статус', adminOpen: 'Панель администратора', signOutHint: 'Данные останутся в аккаунте. Войти можно в любой момент.', privacy: 'Мы показываем только первую букву почты — без имени и фото.' },
    checkin: {
      stepOf: (i, n) => `Шаг ${i} из ${n}`,
      steps: { sleep: 'Сон', fatigue: 'Усталость', stress: 'Стресс', body: 'Тело', load: 'Нагрузка' },
      next: 'Дальше',
      back: 'Назад',
      liveTitle: 'Балл готовности',
      liveHint: 'Считает тот же движок, что и после отправки',
      liveNone: 'Оценка появится после отправки.',
      liveNote: 'Предварительно: меняется вместе с ответами.',
      sessionToday: 'Нагрузка сегодняшней тренировки',
      sessionAu: (au) => `${au} ед. = RPE × минуты`,
      sessionNone: 'Тренировки сегодня не было — шаг можно пропустить.',
      painNote: 'При боли не тренируйся через неё: скажи тренеру или школьной медсестре, при необходимости — врачу.',
      doneTarget: 'Цель нагрузки на сегодня',
      doneTargetBody: (a, b) => `${a}–${b}`,
      doneTargetOf: 'из 100',
      doneTargetPain: 'Из-за боли сегодня без тренировки: цель нагрузки не задаём.',
      doneTargetScale: 'Шкала ADP Load Index: 50 — твой обычный день, выше 75 — перегруз.',
      doneOpenWorkout: 'К тренировке',
      doneNoScore: 'Балл не получен.',
    },
    chat: {
      statusIdle: 'Готов к вопросам',
      statusThinking: 'Думаю…',
      statusListening: 'Слушаю…',
      statusSees: (score, acwr) =>
        `Вижу: готовность ${score ?? '—'}${acwr ? `, ACWR ${acwr}` : ''}`,
      chipYesterday: 'Разбери мою вчерашнюю нагрузку',
      chipWhyScore: (n) => `Почему готовность ${n}?`,
      chipPlanToday: 'План на сегодня',
      chipWhyAcwr: (a) => `Почему ACWR ${a}?`,
      chipCheckinFirst: 'Зачем проходить чек-ин?',
      send: 'Отправить',
      online: 'AI-коуч',
      focusLabel: 'Фокус тренера',
      sidebarTitle: 'Сегодня',
      sidebarEmpty: 'Пройди чек-ин, и здесь появится твой балл.',
      codeCopy: 'Копировать',
    },
    v3: {
      greeting: (h) => (h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'),
      disclaimer:
        'Lotus — не медицинский прибор. Решение о тренировке принимаешь ты вместе с тренером; при боли или плохом самочувствии — к врачу или школьной медсестре.',
      disclaimerShort: 'Не медицинский совет — решаешь ты вместе с тренером.',
      short: { sleep: 'Сон', fatigue: 'Усталость', stress: 'Стресс', soreness: 'Мышцы' },
      telemetry: {
        title: 'Телеметрия дня',
        readiness: 'Готовность',
        load: 'Load Index',
        wellness: 'Самочувствие',
        wellnessSub: 'Hooper из чек-ина',
        acwr: 'ACWR',
        acwrHint: 'нагрузка 7 дн. ÷ 28 дн.',
        acwrBand: { low: 'Ниже обычной', sweet: 'Оптимум', caution: 'Растёт', spike: 'Скачок' },
        monotony: 'Монотонность',
        monotonyHint: 'однообразие недели',
        monotonyHigh: 'Высокая',
        monotonyOk: 'Норма',
        hooper: 'Индекс Hooper',
        hooperHint: '4–28, меньше — лучше',
        vsBase: (d) => `${d} к базе`,
        sleep: 'Сон',
        sleepHint: 'из чек-ина, 1–7',
        streak: 'Тренировок подряд',
        streakHint: 'дней без отдыха',
        streakDays: (n) => `${n} дн.`,
        none: '—',
      },
    },
    progress: {
      period: 'Период',
      periods: { 7: '7 дн', 30: '30 дн', 90: '90 дн' },
      chartTitle: 'Готовность и нагрузка',
      chartSub: 'Линия — готовность, столбцы — ADP Load Index. Обе шкалы 0–100.',
      legendReadiness: 'Готовность',
      legendLoad: 'Load Index',
      acwrNow: 'Сейчас',
      acwrSub: 'Зона 0,8–1,3 — нагрузка растёт безопасно.',
      avgReadiness: 'Средняя готовность',
      avgSleep: 'Средний сон',
      totalVolume: 'Объём',
      volumeUnit: 'ед.',
      volumeHint: 'Σ RPE × мин',
      monotony: 'Монотонность',
      greenDays: 'Зелёных дней',
      vsPrev: 'к прошл. периоду',
      checkinDays: (n, all) => `Чек-ин: ${n} из ${all} дн.`,
      viewDay: 'День',
      viewAvg: '7 дн. среднее',
      viewLabel: 'Вид графика',
      hrvTitle: 'HRV',
      hrvEmpty: 'Нужен датчик пульса. Без него HRV не показываем — цифры не придумываем.',
      tableTitle: 'Телеметрия периода',
      more: 'Команда и доступ',
      none: 'Нет данных за период.',
      errLoad: 'Не удалось загрузить историю. Проверь интернет и обнови страницу.',
    },
    calendar: {
      prev: 'Предыдущий месяц',
      next: 'Следующий месяц',
      legendNoCheckin: 'Без чек-ина',
      today: 'Сегодня',
      close: 'Закрыть',
      answers: 'Ответы чек-ина',
      loadTitle: 'Нагрузка дня',
      session: (rpe, min, au) => `RPE ${rpe} · ${min} мин · ${au} ед.`,
      noSession: 'Тренировки не было.',
      penalties: 'Что снизило балл',
      noPenalties: 'Ничего — штрафов нет.',
      noCheckin: 'В этот день чек-ина не было: балл посчитан только по нагрузке.',
      outside: 'Нет данных за этот день: в расчёте последние 90 дней.',
      events: 'События',
      inspect: 'Открыть день',
      datesTitle: 'Контрольные и матчи',
    },
    workout: {
      title: 'Live-тренировка',
      exit: 'Выйти',
      elapsed: 'Время',
      sets: 'Подходы',
      set: (n) => `Подход ${n}`,
      work: 'Работа',
      rest: 'Отдых',
      restLeft: 'до следующего подхода',
      restDone: 'Можно начинать',
      restSec: 'Отдых, сек',
      startSet: 'Начать подход',
      endSet: 'Подход сделан',
      skipRest: 'Пропустить отдых',
      pause: 'Пауза',
      resume: 'Продолжить',
      finish: 'Завершить',
      finished: (min, sets) => `${min} мин · ${sets} подх.`,
      logHint: 'Запиши тренировку в вечернем чек-ине: RPE и минуты дадут нагрузку.',
      toCheckin: 'К чек-ину',
      ble: {
        connect: 'Подключить пульсометр',
        connecting: 'Подключаю…',
        connected: 'Пульсометр',
        unsupported: 'Bluetooth недоступен в этом браузере (например, Safari на iPhone). Таймер работает и без датчика.',
        lost: 'Датчик отключился',
        error: 'Не удалось подключить датчик',
        noSensor: 'Без датчика',
      },
      bpm: 'уд/мин',
      hrDrop: (n) => `−${n} уд/мин за отдых`,
      hrv: 'HRV (RMSSD, 30 с)',
      hrvNote: 'Ориентир с нагрудного датчика, не диагноз.',
      ringNote: 'Цвет кольца — сколько отдыха прошло: красный → жёлтый → зелёный.',
      info: 'Подробнее',
      finishConfirm: 'Завершить тренировку?',
      finishYes: 'Да, завершить',
      cancel: 'Отмена',
      wake: 'Экран не гаснет',
      startLink: 'Live-тренировка',
      startLinkSub: 'Крупные цифры, таймер отдыха, пульсометр',
    },
  },
  lv: {
    shell: { main: 'Galvenais saturs', mobileNav: 'Galvenā navigācija', language: 'Valoda', workout: 'Live', pro: 'Pro', role: { athlete: 'Sportists', coach: 'Treneris', parent: 'Vecāks' }, online: 'Tiešsaistē', offline: 'Bezsaistē — saglabāsim vēlāk', settings: 'Iestatījumi' },
    settings: { title: 'Iestatījumi', account: 'Konts', languageTitle: 'Valoda', languageHint: 'Saskarne un AI trenera atbildes izvēlētajā valodā.', status: 'Statuss', adminOpen: 'Administratora panelis', signOutHint: 'Dati paliks kontā. Pieteikties var jebkurā brīdī.', privacy: 'Mēs rādām tikai e-pasta pirmo burtu — bez vārda un foto.' },
    checkin: {
      stepOf: (i, n) => `${i}. solis no ${n}`,
      steps: { sleep: 'Miegs', fatigue: 'Nogurums', stress: 'Stress', body: 'Ķermenis', load: 'Slodze' },
      next: 'Tālāk',
      back: 'Atpakaļ',
      liveTitle: 'Gatavības punkti',
      liveHint: 'Aprēķina tas pats dzinējs, kas pēc nosūtīšanas',
      liveNone: 'Vērtējums parādīsies pēc nosūtīšanas.',
      liveNote: 'Provizoriski: mainās līdz ar atbildēm.',
      sessionToday: 'Šodienas treniņa slodze',
      sessionAu: (au) => `${au} vien. = RPE × minūtes`,
      sessionNone: 'Šodien treniņa nebija — soli var izlaist.',
      painNote: 'Sāpju gadījumā netrenējies cauri sāpēm: pasaki treneram vai skolas medmāsai, vajadzības gadījumā — ārstam.',
      doneTarget: 'Šodienas slodzes mērķis',
      doneTargetBody: (a, b) => `${a}–${b}`,
      doneTargetOf: 'no 100',
      doneTargetPain: 'Sāpju dēļ šodien bez treniņa: slodzes mērķi neuzstādām.',
      doneTargetScale: 'ADP Load Index skala: 50 — tava ierastā diena, virs 75 — pārslodze.',
      doneOpenWorkout: 'Uz treniņu',
      doneNoScore: 'Punkti nav iegūti.',
    },
    chat: {
      statusIdle: 'Gatavs jautājumiem',
      statusThinking: 'Domāju…',
      statusListening: 'Klausos…',
      statusSees: (score, acwr) => `Redzu: gatavība ${score ?? '—'}${acwr ? `, ACWR ${acwr}` : ''}`,
      chipYesterday: 'Izanalizē manu vakardienas slodzi',
      chipWhyScore: (n) => `Kāpēc gatavība ir ${n}?`,
      chipPlanToday: 'Plāns šodienai',
      chipWhyAcwr: (a) => `Kāpēc ACWR ir ${a}?`,
      chipCheckinFirst: 'Kāpēc aizpildīt pārbaudi?',
      send: 'Sūtīt',
      online: 'AI treneris',
      focusLabel: 'Trenera fokuss',
      sidebarTitle: 'Šodien',
      sidebarEmpty: 'Aizpildi pārbaudi, un šeit parādīsies tavi punkti.',
      codeCopy: 'Kopēt',
    },
    v3: {
      greeting: (h) => (h < 5 ? 'Ar labu nakti' : h < 12 ? 'Labrīt' : h < 18 ? 'Labdien' : 'Labvakar'),
      disclaimer:
        'Lotus nav medicīniska ierīce. Lēmumu par treniņu pieņem tu kopā ar treneri; sāpju vai sliktas pašsajūtas gadījumā — pie ārsta vai skolas medmāsas.',
      disclaimerShort: 'Nav medicīnisks padoms — lem tu kopā ar treneri.',
      short: { sleep: 'Miegs', fatigue: 'Nogurums', stress: 'Stress', soreness: 'Muskuļi' },
      telemetry: {
        title: 'Dienas telemetrija',
        readiness: 'Gatavība',
        load: 'Load Index',
        wellness: 'Pašsajūta',
        wellnessSub: 'Hooper no pārbaudes',
        acwr: 'ACWR',
        acwrHint: 'slodze 7 d. ÷ 28 d.',
        acwrBand: { low: 'Zem ierastās', sweet: 'Optimāli', caution: 'Aug', spike: 'Lēciens' },
        monotony: 'Monotonija',
        monotonyHint: 'nedēļas vienveidība',
        monotonyHigh: 'Augsta',
        monotonyOk: 'Norma',
        hooper: 'Hooper indekss',
        hooperHint: '4–28, mazāk — labāk',
        vsBase: (d) => `${d} pret bāzi`,
        sleep: 'Miegs',
        sleepHint: 'no pārbaudes, 1–7',
        streak: 'Treniņi pēc kārtas',
        streakHint: 'dienas bez atpūtas',
        streakDays: (n) => `${n} d.`,
        none: '—',
      },
    },
    progress: {
      period: 'Periods',
      periods: { 7: '7 d.', 30: '30 d.', 90: '90 d.' },
      chartTitle: 'Gatavība un slodze',
      chartSub: 'Līnija — gatavība, stabiņi — ADP Load Index. Abas skalas 0–100.',
      legendReadiness: 'Gatavība',
      legendLoad: 'Load Index',
      acwrNow: 'Tagad',
      acwrSub: 'Zona 0,8–1,3 — slodze aug droši.',
      avgReadiness: 'Vidējā gatavība',
      avgSleep: 'Vidējais miegs',
      totalVolume: 'Apjoms',
      volumeUnit: 'vien.',
      volumeHint: 'Σ RPE × min',
      monotony: 'Monotonija',
      greenDays: 'Zaļās dienas',
      vsPrev: 'pret iepr. periodu',
      checkinDays: (n, all) => `Pārbaude: ${n} no ${all} d.`,
      viewDay: 'Diena',
      viewAvg: '7 d. vidējais',
      viewLabel: 'Grafika skats',
      hrvTitle: 'HRV',
      hrvEmpty: 'Vajag pulsa sensoru. Bez tā HRV nerādām — skaitļus neizdomājam.',
      tableTitle: 'Perioda telemetrija',
      more: 'Komanda un piekļuve',
      none: 'Par periodu nav datu.',
      errLoad: 'Neizdevās ielādēt vēsturi. Pārbaudi internetu un atjauno lapu.',
    },
    calendar: {
      prev: 'Iepriekšējais mēnesis',
      next: 'Nākamais mēnesis',
      legendNoCheckin: 'Bez pārbaudes',
      today: 'Šodien',
      close: 'Aizvērt',
      answers: 'Pārbaudes atbildes',
      loadTitle: 'Dienas slodze',
      session: (rpe, min, au) => `RPE ${rpe} · ${min} min · ${au} vien.`,
      noSession: 'Treniņa nebija.',
      penalties: 'Kas samazināja punktus',
      noPenalties: 'Nekas — sodu nav.',
      noCheckin: 'Šajā dienā pārbaudes nebija: punkti aprēķināti tikai pēc slodzes.',
      outside: 'Par šo dienu nav datu: aprēķinā pēdējās 90 dienas.',
      events: 'Notikumi',
      inspect: 'Atvērt dienu',
      datesTitle: 'Kontroldarbi un spēles',
    },
    workout: {
      title: 'Live treniņš',
      exit: 'Iziet',
      elapsed: 'Laiks',
      sets: 'Pieejas',
      set: (n) => `${n}. pieeja`,
      work: 'Darbs',
      rest: 'Atpūta',
      restLeft: 'līdz nākamajai pieejai',
      restDone: 'Var sākt',
      restSec: 'Atpūta, sek',
      startSet: 'Sākt pieeju',
      endSet: 'Pieeja izdarīta',
      skipRest: 'Izlaist atpūtu',
      pause: 'Pauze',
      resume: 'Turpināt',
      finish: 'Pabeigt',
      finished: (min, sets) => `${min} min · ${sets} pieej.`,
      logHint: 'Ieraksti treniņu vakara pārbaudē: RPE un minūtes dos slodzi.',
      toCheckin: 'Uz pārbaudi',
      ble: {
        connect: 'Pievienot pulsometru',
        connecting: 'Pievienoju…',
        connected: 'Pulsometrs',
        unsupported: 'Bluetooth šajā pārlūkā nav pieejams (piem., Safari iPhone). Taimeris strādā arī bez sensora.',
        lost: 'Sensors atvienojās',
        error: 'Neizdevās pievienot sensoru',
        noSensor: 'Bez sensora',
      },
      bpm: 'sit./min',
      hrDrop: (n) => `−${n} sit./min atpūtā`,
      hrv: 'HRV (RMSSD, 30 s)',
      hrvNote: 'Orientieris no krūšu sensora, nevis diagnoze.',
      ringNote: 'Gredzena krāsa — cik daudz atpūtas pagājis: sarkans → dzeltens → zaļš.',
      info: 'Vairāk',
      finishConfirm: 'Pabeigt treniņu?',
      finishYes: 'Jā, pabeigt',
      cancel: 'Atcelt',
      wake: 'Ekrāns neizslēdzas',
      startLink: 'Live treniņš',
      startLinkSub: 'Lieli cipari, atpūtas taimeris, pulsometrs',
    },
  },
  en: {
    shell: { main: 'Main content', mobileNav: 'Main navigation', language: 'Language', workout: 'Live', pro: 'Pro', role: { athlete: 'Athlete', coach: 'Coach', parent: 'Parent' }, online: 'Online', offline: 'Offline — saved for later', settings: 'Settings' },
    settings: { title: 'Settings', account: 'Account', languageTitle: 'Language', languageHint: 'The interface and the AI coach answer in the chosen language.', status: 'Status', adminOpen: 'Admin panel', signOutHint: 'Your data stays in your account. You can sign in again any time.', privacy: 'We only show the first letter of your e-mail — no name, no photo.' },
    checkin: {
      stepOf: (i, n) => `Step ${i} of ${n}`,
      steps: { sleep: 'Sleep', fatigue: 'Fatigue', stress: 'Stress', body: 'Body', load: 'Load' },
      next: 'Next',
      back: 'Back',
      liveTitle: 'Readiness score',
      liveHint: 'Calculated by the same engine as after you submit',
      liveNone: 'The score appears after you submit.',
      liveNote: 'Preview: it changes with your answers.',
      sessionToday: 'Load of today’s session',
      sessionAu: (au) => `${au} AU = RPE × minutes`,
      sessionNone: 'No session today — you can skip this step.',
      painNote: 'If something hurts, do not train through it: tell your coach or the school nurse, and see a doctor if needed.',
      doneTarget: 'Load target for today',
      doneTargetBody: (a, b) => `${a}–${b}`,
      doneTargetOf: 'out of 100',
      doneTargetPain: 'No training today because of pain: no load target is set.',
      doneTargetScale: 'ADP Load Index: 50 is your ordinary day, above 75 is overload.',
      doneOpenWorkout: 'Go to workout',
      doneNoScore: 'No score.',
    },
    chat: {
      statusIdle: 'Ready for questions',
      statusThinking: 'Thinking…',
      statusListening: 'Listening…',
      statusSees: (score, acwr) => `I see: readiness ${score ?? '—'}${acwr ? `, ACWR ${acwr}` : ''}`,
      chipYesterday: 'Review my load from yesterday',
      chipWhyScore: (n) => `Why is my readiness ${n}?`,
      chipPlanToday: 'Plan for today',
      chipWhyAcwr: (a) => `Why is ACWR ${a}?`,
      chipCheckinFirst: 'Why do the check-in?',
      send: 'Send',
      online: 'AI coach',
      focusLabel: 'Coach focus',
      sidebarTitle: 'Today',
      sidebarEmpty: 'Do a check-in and your score shows up here.',
      codeCopy: 'Copy',
    },
    v3: {
      greeting: (h) => (h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'),
      disclaimer:
        'Lotus is not a medical device. You decide on training together with your coach; if something hurts or you feel unwell, see a doctor or the school nurse.',
      disclaimerShort: 'Not medical advice — you decide with your coach.',
      short: { sleep: 'Sleep', fatigue: 'Fatigue', stress: 'Stress', soreness: 'Muscles' },
      telemetry: {
        title: 'Today’s telemetry',
        readiness: 'Readiness',
        load: 'Load Index',
        wellness: 'Wellness',
        wellnessSub: 'Hooper from check-in',
        acwr: 'ACWR',
        acwrHint: '7-day load ÷ 28-day load',
        acwrBand: { low: 'Below usual', sweet: 'Sweet spot', caution: 'Rising', spike: 'Spike' },
        monotony: 'Monotony',
        monotonyHint: 'how same-y the week was',
        monotonyHigh: 'High',
        monotonyOk: 'Normal',
        hooper: 'Hooper index',
        hooperHint: '4–28, lower is better',
        vsBase: (d) => `${d} vs baseline`,
        sleep: 'Sleep',
        sleepHint: 'from check-in, 1–7',
        streak: 'Training days in a row',
        streakHint: 'days without rest',
        streakDays: (n) => `${n} d`,
        none: '—',
      },
    },
    progress: {
      period: 'Period',
      periods: { 7: '7 d', 30: '30 d', 90: '90 d' },
      chartTitle: 'Readiness and load',
      chartSub: 'Line — readiness, bars — ADP Load Index. Both on 0–100.',
      legendReadiness: 'Readiness',
      legendLoad: 'Load Index',
      acwrNow: 'Now',
      acwrSub: 'The 0.8–1.3 zone means load is building safely.',
      avgReadiness: 'Avg readiness',
      avgSleep: 'Avg sleep',
      totalVolume: 'Volume',
      volumeUnit: 'AU',
      volumeHint: 'Σ RPE × min',
      monotony: 'Monotony',
      greenDays: 'Green days',
      vsPrev: 'vs previous',
      checkinDays: (n, all) => `Check-in: ${n} of ${all} days`,
      viewDay: 'Daily',
      viewAvg: '7-day avg',
      viewLabel: 'Chart view',
      hrvTitle: 'HRV',
      hrvEmpty: 'Needs a heart-rate sensor. Without one we show no HRV — we never invent numbers.',
      tableTitle: 'Period telemetry',
      more: 'Team and access',
      none: 'No data for this period.',
      errLoad: 'Could not load your history. Check the connection and reload.',
    },
    calendar: {
      prev: 'Previous month',
      next: 'Next month',
      legendNoCheckin: 'No check-in',
      today: 'Today',
      close: 'Close',
      answers: 'Check-in answers',
      loadTitle: 'Day load',
      session: (rpe, min, au) => `RPE ${rpe} · ${min} min · ${au} AU`,
      noSession: 'No session.',
      penalties: 'What lowered the score',
      noPenalties: 'Nothing — no penalties.',
      noCheckin: 'No check-in that day: the score is based on load only.',
      outside: 'No data for this day: the last 90 days are used.',
      events: 'Events',
      inspect: 'Open day',
      datesTitle: 'Tests and matches',
    },
    workout: {
      title: 'Live workout',
      exit: 'Exit',
      elapsed: 'Time',
      sets: 'Sets',
      set: (n) => `Set ${n}`,
      work: 'Work',
      rest: 'Rest',
      restLeft: 'until the next set',
      restDone: 'Ready to go',
      restSec: 'Rest, sec',
      startSet: 'Start set',
      endSet: 'Set done',
      skipRest: 'Skip rest',
      pause: 'Pause',
      resume: 'Resume',
      finish: 'Finish',
      finished: (min, sets) => `${min} min · ${sets} ${sets === 1 ? 'set' : 'sets'}`,
      logHint: 'Log the session in tonight’s check-in: RPE and minutes give the load.',
      toCheckin: 'Go to check-in',
      ble: {
        connect: 'Connect HR sensor',
        connecting: 'Connecting…',
        connected: 'HR sensor',
        unsupported: 'Bluetooth is not available in this browser (e.g. Safari on iPhone). The timer works without a sensor.',
        lost: 'Sensor disconnected',
        error: 'Could not connect the sensor',
        noSensor: 'No sensor',
      },
      bpm: 'bpm',
      hrDrop: (n) => `−${n} bpm during rest`,
      hrv: 'HRV (RMSSD, 30 s)',
      hrvNote: 'A guide from a chest strap, not a diagnosis.',
      ringNote: 'Ring colour shows how much rest has passed: red → yellow → green.',
      info: 'More info',
      finishConfirm: 'Finish the workout?',
      finishYes: 'Yes, finish',
      cancel: 'Cancel',
      wake: 'Screen stays on',
      startLink: 'Live workout',
      startLinkSub: 'Big digits, rest timer, HR sensor',
    },
  },
};
