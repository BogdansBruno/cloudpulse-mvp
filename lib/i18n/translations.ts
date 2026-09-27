export type Lang = 'en' | 'ru' | 'lv';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'lv', label: 'LV' },
  { code: 'en', label: 'EN' },
];

type Dict = {
  nav: {
    brand: string;
    chat: string;
    checkin: string;
    progress: string;
    calendar: string;
    signOut: string;
  };
  chat: {
    title: string;
    subtitle: string;
    heroTag: string;
    welcome: string;
    placeholder: string;
    send: string;
    addToCalendar: string;
    connectionError: string;
    genericError: string;
    promptChips: string[];
  };
  checkin: {
    title: string;
    subtitle: string;
    sleep: string;
    sleepLow: string;
    sleepHigh: string;
    stress: string;
    stressLow: string;
    stressHigh: string;
    fatigue: string;
    fatigueLow: string;
    fatigueHigh: string;
    soreness: string;
    sorenessLow: string;
    sorenessHigh: string;
    painFlag: string;
    painZonePlaceholder: string;
    trainedToday: string;
    submit: string;
    toPlan: string;
    whyScore: string;
    duration: string;
    rpe: string;
    rpeHint: string;
  };
  progress: {
    title: string;
    subtitle: string;
    today: string;
    avg7d: string;
    redDays: string;
    perWeek: string;
    last30: string;
    zoneGreen: string;
    zoneYellow: string;
    zoneRed: string;
    slowDownTitle: string;
    slowDownBody: (n: number) => string;
    empty: string;
    emptyLink: string;
    acwrTitle: string;
    acwrSweetSpot: string;
    insightLoading: string;
    insightRedStreak: (n: number) => string;
    insightAcwrSpike: (v: string) => string;
    insightMonotony: string;
    insightStreakPositive: (n: number) => string;
    insightGreatShape: string;
    insightNotEnoughData: string;
    insightNeutral: string;
    badge: string;
    noCheckinDay: string;
    vsPrevWeek: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    stepOf: (i: number, n: number) => string;
    ageQ: string;
    ageUnit: string;
    sportQ: string;
    sports: Record<'football' | 'basketball' | 'athletics' | 'swimming' | 'gym' | 'other', string>;
    datesTitle: string;
    datesBody: string;
    matchDates: string;
    examDates: string;
    add: string;
    remove: string;
    next: string;
    back: string;
    start: string;
    saving: string;
    errAge: string;
    errSport: string;
    errSave: string;
    errGeneric: string;
  };
  hub: {
    readiness: string;
    readinessHint: string;
    load: string;
    loadSafe: string;
    loadLow: string;
    loadOk: string;
    loadHigh: string;
    notEnoughData: string;
    streak: string;
    sleep: string;
    calm: string;
    energy: string;
    muscles: string;
    trend: string;
    noCheckinTitle: string;
    noCheckinBody: string;
    doCheckin: string;
    coachSees: string;
    modeRecovery: string;
    modeStrength: string;
    modeCardio: string;
    attach: string;
    voice: string;
    listening: string;
    metricsSnippet: (score: number | null, acwr: number | null, sleep: number | null) => string;
    planTitle: string;
    min: string;
  };
  auth: {
    brandTag: string;
    encrypted: string;
    signInTitle: string;
    signInSubtitle: string;
    signUpTitle: string;
    signUpSubtitle: string;
    email: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    signIn: string;
    signingIn: string;
    signUp: string;
    creatingAccount: string;
    noAccount: string;
    haveAccount: string;
    orContinueWith: string;
    continueGoogle: string;
    continueApple: string;
    passwordMismatch: string;
    passwordTooShort: string;
    accountCreated: string;
    enterEmailFirst: string;
    resetSent: string;
  };
  access: {
    lockdownTitle: string;
    lockdownBody: string;
    bannedTitle: string;
    bannedBody: string;
    backToLogin: string;
  };
  coach: {
    navLabel: string;
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyBody: string;
    loadingRoster: string;
    errorRoster: string;
    pickAthlete: string;
    athleteFallback: (id: string) => string;
    loadingReadiness: string;
    errorReadiness: string;
    noCheckinToday: string;
    hasCheckinToday: string;
    scoreLabel: string;
    loadLabel: string;
    hooperLabel: string;
    hooperHint: string;
    monotonyLabel: string;
    streakLabel: string;
    penaltiesTitle: string;
    noPenalties: string;
    safetyTitle: string;
    noSafety: string;
    inconsistencyTitle: string;
    forbidden: string;
  };
  shield: {
    title: string;
    blockedHeading: string;
    cautionHeading: string;
    showToTeacher: string;
    validUntil: (date: string) => string;
    passId: string;
    qrUnavailable: string;
    loadError: string;
    dirPain: (zone: string | null) => string;
    dirMatchDay: string;
    dirPreMatch: string;
    dirPostMatch: string;
    dirLoad: (acwr: string) => string;
    verifyTitle: string;
    verifyChecking: string;
    verifyValid: string;
    verifyInvalid: string;
    verifyInvalidBody: string;
    verifyExpired: (date: string) => string;
    verifyStatusBlock: string;
    verifyStatusCaution: string;
    verifyDate: string;
    rPain: string;
    rMatchDay: string;
    rPreMatch: string;
    rPostMatch: string;
    rLoad: string;
    verifyNote: string;
  };
  calendar: {
    title: string;
    subtitle: string;
    addTitle: string;
    typeExam: string;
    typeMatch: string;
    datePlaceholder: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    add: string;
    upcomingTitle: string;
    empty: string;
    loading: string;
    today: string;
    tomorrow: string;
    yesterday: string;
    inDays: (n: number) => string;
    examFallback: string;
    matchTitle: string;
    effectExamNow: string;
    effectExamLater: string;
    effectMatchNow: string;
    effectMatchLater: string;
    remove: string;
    saving: string;
    saved: string;
    errLoad: string;
    errSave: string;
    errDate: string;
    errDuplicate: string;
    pastNote: (n: number) => string;
    howTitle: string;
    howExam: string;
    howMatch: string;
  };
  admin: {
    title: string;
    subtitle: string;
    lockdownLabel: string;
    lockdownOn: string;
    lockdownOff: string;
    lockdownHint: string;
    banListTitle: string;
    banPlaceholderEmail: string;
    banPlaceholderReason: string;
    banButton: string;
    unbanButton: string;
    noBans: string;
    navLabel: string;
    notAllowed: string;
    saveError: string;
  };
  theme: {
    label: string;
    light: string;
    dark: string;
    system: string;
    scheduled: string;
    lightHint: string;
    darkHint: string;
    systemHint: string;
    scheduledHint: string;
    darkFrom: string;
    darkTo: string;
    nowDark: string;
    nowLight: string;
  };
  plan: {
    steps: string;
    protocol: string;
    tempo: string;
    breathing: string;
    heartRate: string;
    safety: string;
    zone: string;
    light: string;
    moderate: string;
    hard: string;
    details: string;
    hideDetails: string;
  };
  exportCal: {
    title: string;
    subtitle: string;
    google: string;
    googleHint: string;
    apple: string;
    appleHint: string;
    outlook: string;
    outlookHint: string;
    pickDay: string;
    open: string;
    downloadAll: string;
    importTip: string;
    reminderIcs: string;
    reminderWeb: string;
    downloaded: string;
    back: string;
    close: string;
  };
  common: {
    loading: string;
  };
};

export const translations: Record<Lang, Dict> = {
  ru: {
    nav: { brand: 'CloudPulse', chat: 'Чат', checkin: 'Чек-ин', progress: 'Прогресс', calendar: 'Календарь', signOut: 'Выйти' },
    chat: {
      title: 'CloudPulse Coach',
      subtitle: 'Твой AI-партнёр по тренировкам',
      heroTag: 'AI Athletic Coach',
      welcome:
        'Привет! Я CloudPulse, твой AI-коуч. Составим классный план тренировок?\n\nРасскажи о своих целях, любимых видах спорта, или спроси что угодно про тренировки, восстановление и активность!',
      placeholder: 'Спроси о тренировках, целях, восстановлении...',
      send: 'Отправить',
      addToCalendar: 'Добавить в календарь',
      connectionError: 'Проблема с подключением. Проверь интернет и попробуй снова.',
      genericError: 'Что-то пошло не так. Попробуй ещё раз.',
      promptChips: ['Составь план на неделю', 'Как мне восстановиться?', 'Что съесть перед тренировкой?'],
    },
    checkin: {
      title: 'Как ты сегодня?',
      subtitle: '30 секунд — и узнаешь, можно ли сегодня тренироваться в полную силу',
      sleep: 'Как спал?',
      sleepLow: 'Ужасно',
      sleepHigh: 'Отлично',
      stress: 'Уровень стресса',
      stressLow: 'Очень напряжён',
      stressHigh: 'Спокоен',
      fatigue: 'Усталость',
      fatigueLow: 'Вымотан',
      fatigueHigh: 'Свеж',
      soreness: 'Мышечная боль',
      sorenessLow: 'Сильно болит',
      sorenessHigh: 'Не болит',
      painFlag: 'Есть боль или дискомфорт',
      painZonePlaceholder: 'Где болит? (например: колено)',
      trainedToday: 'Уже тренировался сегодня',
      submit: 'Узнать готовность',
      toPlan: 'К плану тренировок',
      whyScore: 'Почему такой балл',
      duration: 'Длительность',
      rpe: 'Тяжесть тренировки (RPE)',
      rpeHint: '1 очень легко, 10 максимум',
    },
    progress: {
      title: 'Твоя готовность',
      subtitle: 'Readiness Score за последние 30 дней — считается детерминированно, без ИИ',
      today: 'Сегодня',
      avg7d: 'Средний за 7 дней',
      redDays: 'Красных дней',
      perWeek: 'за неделю',
      last30: 'Последние 30 дней',
      zoneGreen: 'Зелёная',
      zoneYellow: 'Жёлтая',
      zoneRed: 'Красная',
      slowDownTitle: 'Стоит притормозить',
      slowDownBody: (n) =>
        `${n} из последних 7 дней в красной зоне — это сигнал, а не совпадение. Обсуди нагрузку с тренером.`,
      empty: 'Пока нет данных. Заполни',
      emptyLink: 'ежедневный чек-ин',
      acwrTitle: 'Нагрузка (ACWR)',
      acwrSweetSpot: 'безопасная зона 0.8–1.3',
      insightLoading: 'Считаю тренд...',
      insightRedStreak: (n) =>
        `${n} дня(ей) подряд в красной зоне. Это не совпадение — телу нужен настоящий отдых, а не просто более лёгкая тренировка.`,
      insightAcwrSpike: (v) =>
        `Нагрузка выросла слишком резко за неделю (ACWR ${v}) — риск травмы сейчас выше обычного. Снизь интенсивность на пару дней.`,
      insightMonotony: 'Тренировки в последнее время слишком однообразные по нагрузке — добавь лёгкие дни для разнообразия, это снижает риск перетренированности.',
      insightStreakPositive: (n) =>
        `${n}+ дней подряд без пропуска при хорошей готовности — отличная стабильность. Не забудь про плановый день отдыха.`,
      insightGreatShape: 'Последняя неделя стабильно в зелёной зоне — организм хорошо восстанавливается. Можно постепенно наращивать нагрузку.',
      insightNotEnoughData: 'Ещё мало чек-инов, чтобы увидеть тренд — заполняй ежедневно, и здесь появятся более точные наблюдения.',
      insightNeutral: 'Готовность в норме, явных сигналов риска не видно. Продолжай ежедневные чек-ины.',
      badge: 'Считается кодом, не ИИ',
      noCheckinDay: 'нет чек-ина',
      vsPrevWeek: 'к прошлой неделе',
    },
    onboarding: {
      title: 'Настроим твой профиль',
      subtitle: 'CloudPulse',
      stepOf: (i, n) => `Шаг ${i} из ${n}`,
      ageQ: 'Сколько тебе лет?',
      ageUnit: 'лет',
      sportQ: 'Каким спортом занимаешься?',
      sports: {
        football: 'Футбол',
        basketball: 'Баскетбол',
        athletics: 'Лёгкая атлетика',
        swimming: 'Плавание',
        gym: 'Зал / общая физподготовка',
        other: 'Другое',
      },
      datesTitle: 'Матчи и экзамены',
      datesBody:
        'Необязательно, но так CloudPulse сможет снижать нагрузку перед экзаменами и беречь тебя вокруг матчей. Можно пропустить и добавить позже.',
      matchDates: 'Даты матчей',
      examDates: 'Даты экзаменов',
      add: 'Добавить',
      remove: 'Удалить',
      next: 'Далее',
      back: 'Назад',
      start: 'Начать',
      saving: 'Сохраняю...',
      errAge: 'Выбери возраст',
      errSport: 'Выбери вид спорта',
      errSave: 'Не удалось сохранить профиль',
      errGeneric: 'Что-то пошло не так',
    },
    hub: {
      readiness: 'Готовность',
      readinessHint: 'Считается кодом по чек-ину, не ИИ',
      load: 'Нагрузка (ACWR)',
      loadSafe: 'Безопасно 0.8-1.3',
      loadLow: 'Недогруз',
      loadOk: 'В норме',
      loadHigh: 'Резкий рост',
      notEnoughData: 'Мало данных',
      streak: 'Дней подряд',
      sleep: 'Сон',
      calm: 'Спокойствие',
      energy: 'Энергия',
      muscles: 'Мышцы',
      trend: 'Последние 7 дней',
      noCheckinTitle: 'Сегодня ещё нет чек-ина',
      noCheckinBody: 'Без него коуч не знает, как ты восстановился.',
      doCheckin: 'Пройти чек-ин',
      coachSees: 'Коуч видит',
      modeRecovery: 'Восстановление',
      modeStrength: 'Силовая',
      modeCardio: 'Кардио',
      attach: 'Вставить мои показатели',
      voice: 'Голосовой ввод',
      listening: 'Слушаю...',
      metricsSnippet: (score, acwr, sleep) =>
        `Мои показатели сегодня: готовность ${score ?? 'нет'}/100, ACWR ${acwr !== null ? acwr.toFixed(2) : 'нет данных'}, сон ${sleep ?? '-'}/7.`,
      planTitle: 'План тренировок',
      min: 'мин',
    },
    auth: {
      brandTag: 'Performance Auth',
      encrypted: '256-bit шифрование',
      signInTitle: 'С возвращением',
      signInSubtitle: 'Войди, чтобы продолжить тренировки',
      signUpTitle: 'Создать аккаунт',
      signUpSubtitle: 'Начни отслеживать готовность уже сегодня',
      email: 'Email',
      password: 'Пароль',
      confirmPassword: 'Повтори пароль',
      forgotPassword: 'Забыли пароль?',
      signIn: 'Войти',
      signingIn: 'Входим...',
      signUp: 'Создать аккаунт',
      creatingAccount: 'Создаём аккаунт...',
      noAccount: 'Нет аккаунта?',
      haveAccount: 'Уже есть аккаунт?',
      orContinueWith: 'или продолжить с',
      continueGoogle: 'Google',
      continueApple: 'Apple',
      passwordMismatch: 'Пароли не совпадают',
      passwordTooShort: 'Пароль должен быть от 6 символов',
      accountCreated: 'Аккаунт создан! Перенаправляем...',
      enterEmailFirst: 'Сначала введи свой email',
      resetSent: 'Проверь почту — мы отправили ссылку для сброса пароля.',
    },
    access: {
      lockdownTitle: 'Сайт временно недоступен',
      lockdownBody: 'Владелец CloudPulse временно закрыл доступ для всех, кроме команды. Попробуй зайти чуть позже.',
      bannedTitle: 'Доступ закрыт',
      bannedBody: 'Владелец CloudPulse ограничил доступ для этого аккаунта. Если это ошибка, свяжись с командой.',
      backToLogin: 'К странице входа',
    },
    shield: {
      title: 'Safety Pass',
      blockedHeading: 'Нагрузки ограничены',
      cautionHeading: 'Нужна осторожность',
      showToTeacher: 'Покажи этот экран учителю физкультуры или тренеру. Он отсканирует QR-код и увидит подтверждённый статус.',
      validUntil: (date: string) => `Действует только ${date}`,
      passId: 'ID пропуска',
      qrUnavailable: 'QR-код временно недоступен: сервер не настроен для подписи пропусков.',
      loadError: 'Не удалось проверить статус пропуска',
      dirPain: (zone: string | null) =>
        `Зафиксирована боль${zone ? ` (${zone})` : ''}. Силовые и высокоинтенсивные нагрузки заблокированы. Покажись врачу, школьной медсестре или физиотерапевту.`,
      dirMatchDay: 'Сегодня матч: только активация и лёгкая разминка, без силовой работы.',
      dirPreMatch: 'Завтра матч: тяжёлые силовые и высокоинтенсивные интервалы под запретом.',
      dirPostMatch: 'Вчера был матч: сегодня восстановление, не силовая.',
      dirLoad: (acwr: string) =>
        `Нагрузка за неделю в ${acwr} раза выше твоей обычной. Риск травмы повышен: снизь интенсивность.`,
      verifyTitle: 'Проверка Safety Pass',
      verifyChecking: 'Проверяю подпись…',
      verifyValid: 'Подлинный пропуск CloudPulse',
      verifyInvalid: 'Пропуск недействителен',
      verifyInvalidBody: 'Подпись не совпадает: этот QR-код не выдан CloudPulse или был изменён.',
      verifyExpired: (date: string) => `Пропуск был действителен ${date} и сегодня уже не действует.`,
      verifyStatusBlock: 'Нагрузки ограничены',
      verifyStatusCaution: 'Рекомендована осторожность',
      verifyDate: 'Дата',
      rPain: 'По состоянию здоровья: без силовых и высокоинтенсивных нагрузок',
      rMatchDay: 'День матча: только разминка и активация',
      rPreMatch: 'Накануне матча: без тяжёлых силовых нагрузок',
      rPostMatch: 'После матча: только восстановительная нагрузка',
      rLoad: 'Резкий рост нагрузки: рекомендовано снизить интенсивность',
      verifyNote: 'Статус рассчитан системой CloudPulse по ежедневному чек-ину спортсмена. Подробности о здоровье не раскрываются.',
    },
    coach: {
      navLabel: 'Тренер',
      title: 'Панель тренера',
      subtitle: 'Готовность атлетов твоей команды',
      emptyTitle: 'Пока нет привязанных атлетов',
      emptyBody:
        'Связь тренер—атлет пока создаётся вручную через базу данных (таблица team_members). Как только появится первая запись, атлет отобразится здесь.',
      loadingRoster: 'Загружаю список атлетов...',
      errorRoster: 'Не удалось загрузить список атлетов',
      pickAthlete: 'Выбери атлета',
      athleteFallback: (id: string) => `Атлет #${id}`,
      loadingReadiness: 'Считаю готовность...',
      errorReadiness: 'Не удалось получить данные атлета',
      noCheckinToday: 'Сегодня атлет ещё не отправил чек-ин',
      hasCheckinToday: 'Чек-ин на сегодня получен',
      scoreLabel: 'Готовность',
      loadLabel: 'Нагрузка (ACWR)',
      hooperLabel: 'Индекс самочувствия',
      hooperHint: 'Чем ниже, тем лучше (из 28)',
      monotonyLabel: 'Однообразность нагрузки',
      streakLabel: 'Дней подряд без отдыха',
      penaltiesTitle: 'Из чего сложился балл',
      noPenalties: 'Штрафов нет — чистый результат',
      safetyTitle: 'Safety Guard',
      noSafety: 'Ограничений нет',
      inconsistencyTitle: 'Несостыковки в самооценке',
      forbidden: 'Нет доступа к данным этого атлета',
    },
    calendar: {
      title: 'Школьный календарь',
      subtitle: 'Контрольные, экзамены и матчи. CloudPulse учитывает их в расчёте готовности.',
      addTitle: 'Добавить событие',
      typeExam: 'Контрольная',
      typeMatch: 'Матч',
      datePlaceholder: 'Выбери дату',
      subjectLabel: 'Предмет (необязательно)',
      subjectPlaceholder: 'Например, математика',
      add: 'Добавить',
      upcomingTitle: 'Ближайшие события',
      empty: 'Пока пусто. Добавь ближайшую контрольную или матч, и CloudPulse заранее снизит нагрузку.',
      loading: 'Загружаю календарь...',
      today: 'Сегодня',
      tomorrow: 'Завтра',
      yesterday: 'Вчера',
      inDays: (n) => {
        const m10 = n % 10;
        const m100 = n % 100;
        const word = m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней';
        return `Через ${n} ${word}`;
      },
      examFallback: 'Контрольная',
      matchTitle: 'Матч',
      effectExamNow: 'Сейчас снижает балл готовности на 15',
      effectExamLater: 'Учтётся за 3 дня до даты',
      effectMatchNow: 'Safety Guard ограничивает нагрузки',
      effectMatchLater: 'Safety Guard включится накануне',
      remove: 'Удалить',
      saving: 'Сохраняю...',
      saved: 'Сохранено, балл пересчитан',
      errLoad: 'Не удалось загрузить календарь.',
      errSave: 'Не удалось сохранить. Попробуй ещё раз.',
      errDate: 'Выбери дату',
      errDuplicate: 'Это событие уже есть в календаре',
      pastNote: (n) => `Прошедших событий в истории: ${n}`,
      howTitle: 'Как это влияет на расчёт',
      howExam: 'Контрольная или экзамен: за 3 дня до даты и в сам день балл готовности снижается на 15. Учебный стресс тоже нагрузка.',
      howMatch: 'Матч: накануне, в день матча и на следующий день Safety Guard запрещает тяжёлые нагрузки.',
    },
    admin: {
      title: 'Панель управления',
      subtitle: 'Доступ только для владельца',
      lockdownLabel: 'Заблокировать доступ всем',
      lockdownOn: 'Сайт закрыт для всех, кроме тебя',
      lockdownOff: 'Сайт открыт для всех',
      lockdownHint: 'Мгновенно закрывает /chat, /checkin, /progress и /onboarding для всех, кроме твоего аккаунта.',
      banListTitle: 'Забаненные email',
      banPlaceholderEmail: 'email нарушителя',
      banPlaceholderReason: 'причина (необязательно)',
      banButton: 'Забанить',
      unbanButton: 'Разбанить',
      noBans: 'Пока никого не забанили',
      navLabel: 'Админ',
      notAllowed: 'Эта страница только для владельца аккаунта.',
      saveError: 'Не удалось сохранить изменение',
    },
    theme: {
      label: 'Тема',
      light: 'Светлая',
      dark: 'Тёмная',
      system: 'Как в системе',
      scheduled: 'По расписанию',
      lightHint: 'Всегда светлая',
      darkHint: 'Всегда тёмная',
      systemHint: 'Следует настройкам устройства',
      scheduledHint: 'Тёмная вечером, светлая днём',
      darkFrom: 'Тёмная с',
      darkTo: 'до',
      nowDark: 'Сейчас включена тёмная',
      nowLight: 'Сейчас включена светлая',
    },
    plan: {
      steps: 'Пошаговый план',
      protocol: 'Протокол',
      tempo: 'Темп',
      breathing: 'Дыхание',
      heartRate: 'Пульс',
      safety: 'Безопасность',
      zone: 'Зона',
      light: 'Лёгкая',
      moderate: 'Средняя',
      hard: 'Высокая',
      details: 'Подробнее',
      hideDetails: 'Свернуть',
    },
    exportCal: {
      title: 'Добавить в календарь',
      subtitle: 'Выбери, куда отправить план',
      google: 'Google Календарь',
      googleHint: 'По одной тренировке',
      apple: 'Apple Календарь',
      appleHint: 'Все тренировки одним файлом .ics',
      outlook: 'Outlook',
      outlookHint: 'Outlook.com, по одной тренировке',
      pickDay: 'Выбери тренировку',
      open: 'Открыть',
      downloadAll: 'Скачать все (.ics)',
      importTip: 'Чтобы добавить все тренировки сразу, скачай .ics и импортируй его в календарь.',
      reminderIcs: 'В файле .ics есть напоминание за 15 минут до начала.',
      reminderWeb: 'По ссылке сработает напоминание по умолчанию из твоего календаря.',
      downloaded: 'Файл скачан. Открой его, чтобы добавить тренировки в календарь.',
      back: 'Назад',
      close: 'Закрыть',
    },
    common: { loading: 'Загружаю…' },
  },
  lv: {
    nav: { brand: 'CloudPulse', chat: 'Tērzēšana', checkin: 'Pārbaude', progress: 'Progress', calendar: 'Kalendārs', signOut: 'Iziet' },
    chat: {
      title: 'CloudPulse Coach',
      subtitle: 'Tavs AI treniņu partneris',
      heroTag: 'AI Athletic Coach',
      welcome:
        'Sveiks! Es esmu CloudPulse, tavs AI treneris. Izveidosim lielisku treniņu plānu?\n\nPastāsti par saviem mērķiem, iecienītākajiem sporta veidiem, vai jautā jebko par treniņiem, atveseļošanos un aktivitāti!',
      placeholder: 'Jautā par treniņiem, mērķiem, atveseļošanos...',
      send: 'Sūtīt',
      addToCalendar: 'Pievienot kalendāram',
      connectionError: 'Savienojuma problēma. Pārbaudi internetu un mēģini vēlreiz.',
      genericError: 'Kaut kas nogāja greizi. Mēģini vēlreiz.',
      promptChips: ['Izveido plānu nedēļai', 'Kā man atgūties?', 'Ko ēst pirms treniņa?'],
    },
    checkin: {
      title: 'Kā tu jūties šodien?',
      subtitle: '30 sekundes — un uzzināsi, vai šodien vari trenēties pilnā spēkā',
      sleep: 'Kā gulēji?',
      sleepLow: 'Šausmīgi',
      sleepHigh: 'Lieliski',
      stress: 'Stresa līmenis',
      stressLow: 'Ļoti saspringts',
      stressHigh: 'Mierīgs',
      fatigue: 'Nogurums',
      fatigueLow: 'Izsmelts',
      fatigueHigh: 'Svaigs',
      soreness: 'Muskuļu sāpes',
      sorenessLow: 'Ļoti sāp',
      sorenessHigh: 'Nesāp',
      painFlag: 'Ir sāpes vai diskomforts',
      painZonePlaceholder: 'Kur sāp? (piemēram: celis)',
      trainedToday: 'Jau trenējos šodien',
      submit: 'Uzzināt gatavību',
      toPlan: 'Uz treniņu plānu',
      whyScore: 'Kāpēc tāds rezultāts',
      duration: 'Ilgums',
      rpe: 'Treniņa smagums (RPE)',
      rpeHint: '1 ļoti viegli, 10 maksimums',
    },
    progress: {
      title: 'Tava gatavība',
      subtitle: 'Readiness Score par pēdējām 30 dienām — aprēķināts deterministiski, bez MI',
      today: 'Šodien',
      avg7d: 'Vidēji 7 dienās',
      redDays: 'Sarkanās dienas',
      perWeek: 'nedēļā',
      last30: 'Pēdējās 30 dienas',
      zoneGreen: 'Zaļā',
      zoneYellow: 'Dzeltenā',
      zoneRed: 'Sarkanā',
      slowDownTitle: 'Vajadzētu palēnināt',
      slowDownBody: (n) =>
        `${n} no pēdējām 7 dienām sarkanajā zonā — tas ir signāls, ne sakritība. Pārrunā slodzi ar treneri.`,
      empty: 'Vēl nav datu. Aizpildi',
      emptyLink: 'ikdienas pārbaudi',
      acwrTitle: 'Slodze (ACWR)',
      acwrSweetSpot: 'droša zona 0.8–1.3',
      insightLoading: 'Aprēķinu tendenci...',
      insightRedStreak: (n) =>
        `${n} dienas pēc kārtas sarkanajā zonā. Tā nav sakritība — ķermenim vajadzīga īsta atpūta, ne tikai vieglāks treniņš.`,
      insightAcwrSpike: (v) =>
        `Slodze pēdējā nedēļā pieaugusi pārāk strauji (ACWR ${v}) — traumu risks tagad ir augstāks nekā parasti. Samazini intensitāti pāris dienas.`,
      insightMonotony: 'Pēdējā laikā treniņi ir pārāk vienveidīgi pēc slodzes — pievieno vieglākas dienas dažādībai, tas samazina pārtrenēšanās risku.',
      insightStreakPositive: (n) =>
        `${n}+ dienas pēc kārtas bez izlaišanas ar labu gatavību — lieliska stabilitāte. Neaizmirsti par plānotu atpūtas dienu.`,
      insightGreatShape: 'Pēdējā nedēļa stabili zaļajā zonā — organisms labi atveseļojas. Var pakāpeniski palielināt slodzi.',
      insightNotEnoughData: 'Vēl par maz pārbaužu, lai redzētu tendenci — aizpildi katru dienu, un šeit parādīsies precīzāki novērojumi.',
      insightNeutral: 'Gatavība ir normā, skaidru riska signālu nav. Turpini ikdienas pārbaudes.',
      badge: 'Aprēķina kods, nevis MI',
      noCheckinDay: 'nav pārbaudes',
      vsPrevWeek: 'pret iepriekšējo nedēļu',
    },
    onboarding: {
      title: 'Iestatīsim tavu profilu',
      subtitle: 'CloudPulse',
      stepOf: (i, n) => `${i}. solis no ${n}`,
      ageQ: 'Cik tev ir gadu?',
      ageUnit: 'gadi',
      sportQ: 'Ar kādu sportu tu nodarbojies?',
      sports: {
        football: 'Futbols',
        basketball: 'Basketbols',
        athletics: 'Vieglatlētika',
        swimming: 'Peldēšana',
        gym: 'Zāle / vispārējā fiziskā sagatavotība',
        other: 'Cits',
      },
      datesTitle: 'Spēles un eksāmeni',
      datesBody:
        'Nav obligāti, bet tā CloudPulse var samazināt slodzi pirms eksāmeniem un sargāt tevi ap spēlēm. Vari izlaist un pievienot vēlāk.',
      matchDates: 'Spēļu datumi',
      examDates: 'Eksāmenu datumi',
      add: 'Pievienot',
      remove: 'Noņemt',
      next: 'Tālāk',
      back: 'Atpakaļ',
      start: 'Sākt',
      saving: 'Saglabāju...',
      errAge: 'Izvēlies vecumu',
      errSport: 'Izvēlies sporta veidu',
      errSave: 'Neizdevās saglabāt profilu',
      errGeneric: 'Kaut kas nogāja greizi',
    },
    hub: {
      readiness: 'Gatavība',
      readinessHint: 'Aprēķina kods pēc pārbaudes, nevis MI',
      load: 'Slodze (ACWR)',
      loadSafe: 'Droši 0.8-1.3',
      loadLow: 'Par maz',
      loadOk: 'Normā',
      loadHigh: 'Straujš kāpums',
      notEnoughData: 'Par maz datu',
      streak: 'Dienas pēc kārtas',
      sleep: 'Miegs',
      calm: 'Miers',
      energy: 'Enerģija',
      muscles: 'Muskuļi',
      trend: 'Pēdējās 7 dienas',
      noCheckinTitle: 'Šodien vēl nav pārbaudes',
      noCheckinBody: 'Bez tās treneris nezina, kā tu esi atguvies.',
      doCheckin: 'Aizpildīt pārbaudi',
      coachSees: 'Treneris redz',
      modeRecovery: 'Atgūšanās',
      modeStrength: 'Spēks',
      modeCardio: 'Kardio',
      attach: 'Ievietot manus rādītājus',
      voice: 'Balss ievade',
      listening: 'Klausos...',
      metricsSnippet: (score, acwr, sleep) =>
        `Mani šodienas rādītāji: gatavība ${score ?? 'nav'}/100, ACWR ${acwr !== null ? acwr.toFixed(2) : 'nav datu'}, miegs ${sleep ?? '-'}/7.`,
      planTitle: 'Treniņu plāns',
      min: 'min',
    },
    auth: {
      brandTag: 'Performance Auth',
      encrypted: '256-bitu šifrēšana',
      signInTitle: 'Ar atgriešanos',
      signInSubtitle: 'Pieslēdzies, lai turpinātu treniņus',
      signUpTitle: 'Izveidot kontu',
      signUpSubtitle: 'Sāc sekot savai gatavībai jau šodien',
      email: 'E-pasts',
      password: 'Parole',
      confirmPassword: 'Atkārto paroli',
      forgotPassword: 'Aizmirsi paroli?',
      signIn: 'Pieslēgties',
      signingIn: 'Pieslēdzas...',
      signUp: 'Izveidot kontu',
      creatingAccount: 'Veido kontu...',
      noAccount: 'Nav konta?',
      haveAccount: 'Jau ir konts?',
      orContinueWith: 'vai turpini ar',
      continueGoogle: 'Google',
      continueApple: 'Apple',
      passwordMismatch: 'Paroles nesakrīt',
      passwordTooShort: 'Parolei jābūt vismaz 6 rakstzīmes',
      accountCreated: 'Konts izveidots! Novirzām...',
      enterEmailFirst: 'Vispirms ievadi savu e-pastu',
      resetSent: 'Pārbaudi e-pastu — nosūtījām saiti paroles atiestatīšanai.',
    },
    access: {
      lockdownTitle: 'Vietne īslaicīgi nav pieejama',
      lockdownBody: 'CloudPulse īpašnieks īslaicīgi slēdzis piekļuvi visiem, izņemot komandu. Mēģini vēlreiz pēc brīža.',
      bannedTitle: 'Piekļuve liegta',
      bannedBody: 'CloudPulse īpašnieks ierobežojis piekļuvi šim kontam. Ja tā ir kļūda, sazinies ar komandu.',
      backToLogin: 'Uz pieslēgšanās lapu',
    },
    shield: {
      title: 'Safety Pass',
      blockedHeading: 'Slodze ierobežota',
      cautionHeading: 'Nepieciešama piesardzība',
      showToTeacher: 'Parādi šo ekrānu sporta skolotājam vai trenerim. Viņš noskenēs QR kodu un redzēs apstiprinātu statusu.',
      validUntil: (date: string) => `Derīgs tikai ${date}`,
      passId: 'Caurlaides ID',
      qrUnavailable: 'QR kods īslaicīgi nav pieejams: serveris nav iestatīts caurlaižu parakstīšanai.',
      loadError: 'Neizdevās pārbaudīt caurlaides statusu',
      dirPain: (zone: string | null) =>
        `Reģistrētas sāpes${zone ? ` (${zone})` : ''}. Spēka un augstas intensitātes slodze ir bloķēta. Parādies ārstam, skolas medmāsai vai fizioterapeitam.`,
      dirMatchDay: 'Šodien spēle: tikai aktivizācija un viegla iesildīšanās, bez spēka darba.',
      dirPreMatch: 'Rīt spēle: smagi spēka un augstas intensitātes intervāli ir aizliegti.',
      dirPostMatch: 'Vakar bija spēle: šodien atjaunošanās, nevis spēka treniņš.',
      dirLoad: (acwr: string) =>
        `Nedēļas slodze ir ${acwr} reizes lielāka par tavu parasto. Traumu risks ir paaugstināts: samazini intensitāti.`,
      verifyTitle: 'Safety Pass pārbaude',
      verifyChecking: 'Pārbaudu parakstu…',
      verifyValid: 'Īsta CloudPulse caurlaide',
      verifyInvalid: 'Caurlaide nav derīga',
      verifyInvalidBody: 'Paraksts nesakrīt: šo QR kodu nav izsniedzis CloudPulse vai tas ir mainīts.',
      verifyExpired: (date: string) => `Caurlaide bija derīga ${date} un šodien vairs nav derīga.`,
      verifyStatusBlock: 'Slodze ierobežota',
      verifyStatusCaution: 'Ieteicama piesardzība',
      verifyDate: 'Datums',
      rPain: 'Veselības dēļ: bez spēka un augstas intensitātes slodzes',
      rMatchDay: 'Spēles diena: tikai iesildīšanās un aktivizācija',
      rPreMatch: 'Dienu pirms spēles: bez smagas spēka slodzes',
      rPostMatch: 'Pēc spēles: tikai atjaunojoša slodze',
      rLoad: 'Straujš slodzes pieaugums: ieteicams samazināt intensitāti',
      verifyNote: 'Statusu aprēķinājusi CloudPulse sistēma pēc sportista ikdienas pārbaudes. Veselības detaļas netiek atklātas.',
    },
    coach: {
      navLabel: 'Treneris',
      title: 'Trenera panelis',
      subtitle: 'Tavas komandas atlētu gatavība',
      emptyTitle: 'Vēl nav piesaistītu atlētu',
      emptyBody:
        'Treneris—atlēts saikne pagaidām tiek izveidota manuāli datubāzē (tabula team_members). Tiklīdz parādīsies pirmais ieraksts, atlēts būs redzams šeit.',
      loadingRoster: 'Ielādēju atlētu sarakstu...',
      errorRoster: 'Neizdevās ielādēt atlētu sarakstu',
      pickAthlete: 'Izvēlies atlētu',
      athleteFallback: (id: string) => `Atlēts #${id}`,
      loadingReadiness: 'Aprēķinu gatavību...',
      errorReadiness: 'Neizdevās iegūt atlēta datus',
      noCheckinToday: 'Atlēts šodien vēl nav iesniedzis pārbaudi',
      hasCheckinToday: 'Šodienas pārbaude saņemta',
      scoreLabel: 'Gatavība',
      loadLabel: 'Slodze (ACWR)',
      hooperLabel: 'Pašsajūtas indekss',
      hooperHint: 'Jo zemāk, jo labāk (no 28)',
      monotonyLabel: 'Slodzes vienveidība',
      streakLabel: 'Dienas pēc kārtas bez atpūtas',
      penaltiesTitle: 'No kā veidojas rezultāts',
      noPenalties: 'Sodu nav — tīrs rezultāts',
      safetyTitle: 'Safety Guard',
      noSafety: 'Ierobežojumu nav',
      inconsistencyTitle: 'Neatbilstības pašnovērtējumā',
      forbidden: 'Nav piekļuves šī atlēta datiem',
    },
    calendar: {
      title: 'Skolas kalendārs',
      subtitle: 'Kontroldarbi, eksāmeni un spēles. CloudPulse tos ņem vērā gatavības aprēķinā.',
      addTitle: 'Pievienot notikumu',
      typeExam: 'Kontroldarbs',
      typeMatch: 'Spēle',
      datePlaceholder: 'Izvēlies datumu',
      subjectLabel: 'Priekšmets (nav obligāti)',
      subjectPlaceholder: 'Piemēram, matemātika',
      add: 'Pievienot',
      upcomingTitle: 'Tuvākie notikumi',
      empty: 'Pagaidām tukšs. Pievieno tuvāko kontroldarbu vai spēli, un CloudPulse laikus samazinās slodzi.',
      loading: 'Ielādēju kalendāru...',
      today: 'Šodien',
      tomorrow: 'Rīt',
      yesterday: 'Vakar',
      inDays: (n) => `Pēc ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'dienas' : 'dienām'}`,
      examFallback: 'Kontroldarbs',
      matchTitle: 'Spēle',
      effectExamNow: 'Šobrīd samazina gatavību par 15 punktiem',
      effectExamLater: 'Tiks ņemts vērā 3 dienas pirms datuma',
      effectMatchNow: 'Safety Guard ierobežo slodzi',
      effectMatchLater: 'Safety Guard ieslēgsies dienu iepriekš',
      remove: 'Dzēst',
      saving: 'Saglabāju...',
      saved: 'Saglabāts, gatavība pārrēķināta',
      errLoad: 'Neizdevās ielādēt kalendāru.',
      errSave: 'Neizdevās saglabāt. Mēģini vēlreiz.',
      errDate: 'Izvēlies datumu',
      errDuplicate: 'Šis notikums jau ir kalendārā',
      pastNote: (n) => `Pagājušie notikumi vēsturē: ${n}`,
      howTitle: 'Kā tas ietekmē aprēķinu',
      howExam: 'Kontroldarbs vai eksāmens: 3 dienas pirms datuma un pašā dienā gatavība samazinās par 15 punktiem. Mācību stress arī ir slodze.',
      howMatch: 'Spēle: dienu pirms, spēles dienā un nākamajā dienā Safety Guard aizliedz smagas slodzes.',
    },
    admin: {
      title: 'Vadības panelis',
      subtitle: 'Pieejams tikai īpašniekam',
      lockdownLabel: 'Bloķēt piekļuvi visiem',
      lockdownOn: 'Vietne slēgta visiem, izņemot tevi',
      lockdownOff: 'Vietne atvērta visiem',
      lockdownHint: 'Nekavējoties slēdz /chat, /checkin, /progress un /onboarding visiem, izņemot tavu kontu.',
      banListTitle: 'Bloķētie e-pasti',
      banPlaceholderEmail: 'pārkāpēja e-pasts',
      banPlaceholderReason: 'iemesls (nav obligāts)',
      banButton: 'Bloķēt',
      unbanButton: 'Atbloķēt',
      noBans: 'Pagaidām neviens nav bloķēts',
      navLabel: 'Admins',
      notAllowed: 'Šī lapa ir pieejama tikai konta īpašniekam.',
      saveError: 'Neizdevās saglabāt izmaiņas',
    },
    theme: {
      label: 'Tēma',
      light: 'Gaiša',
      dark: 'Tumša',
      system: 'Kā sistēmā',
      scheduled: 'Pēc grafika',
      lightHint: 'Vienmēr gaiša',
      darkHint: 'Vienmēr tumša',
      systemHint: 'Seko ierīces iestatījumiem',
      scheduledHint: 'Vakarā tumša, dienā gaiša',
      darkFrom: 'Tumša no',
      darkTo: 'līdz',
      nowDark: 'Tagad ieslēgta tumšā',
      nowLight: 'Tagad ieslēgta gaišā',
    },
    plan: {
      steps: 'Soli pa solim',
      protocol: 'Protokols',
      tempo: 'Temps',
      breathing: 'Elpošana',
      heartRate: 'Pulss',
      safety: 'Drošība',
      zone: 'Zona',
      light: 'Viegla',
      moderate: 'Vidēja',
      hard: 'Augsta',
      details: 'Sīkāk',
      hideDetails: 'Sakļaut',
    },
    exportCal: {
      title: 'Pievienot kalendāram',
      subtitle: 'Izvēlies, kur nosūtīt plānu',
      google: 'Google kalendārs',
      googleHint: 'Pa vienam treniņam',
      apple: 'Apple kalendārs',
      appleHint: 'Visi treniņi vienā .ics failā',
      outlook: 'Outlook',
      outlookHint: 'Outlook.com, pa vienam treniņam',
      pickDay: 'Izvēlies treniņu',
      open: 'Atvērt',
      downloadAll: 'Lejupielādēt visus (.ics)',
      importTip: 'Lai pievienotu visus treniņus uzreiz, lejupielādē .ics un importē to kalendārā.',
      reminderIcs: '.ics failā ir atgādinājums 15 minūtes pirms sākuma.',
      reminderWeb: 'Saite izmantos tava kalendāra noklusējuma atgādinājumu.',
      downloaded: 'Fails lejupielādēts. Atver to, lai pievienotu treniņus kalendāram.',
      back: 'Atpakaļ',
      close: 'Aizvērt',
    },
    common: { loading: 'Ielādē…' },
  },
  en: {
    nav: { brand: 'CloudPulse', chat: 'Chat', checkin: 'Check-in', progress: 'Progress', calendar: 'Calendar', signOut: 'Sign out' },
    chat: {
      title: 'CloudPulse Coach',
      subtitle: 'Your AI fitness partner for better training',
      heroTag: 'AI Athletic Coach',
      welcome:
        "Hey! I'm CloudPulse, your AI fitness coach. Ready to build an awesome training plan?\n\nTell me about your fitness goals, what sports you like, or ask me anything about training, recovery, or staying active!",
      placeholder: 'Ask anything about your training, goals, recovery...',
      send: 'Send',
      addToCalendar: 'Add to Calendar',
      connectionError: 'Connection problem. Check your internet and try again.',
      genericError: 'Something went wrong. Try again.',
      promptChips: ['Plan my week', 'How should I recover?', 'What should I eat before training?'],
    },
    checkin: {
      title: 'How are you today?',
      subtitle: "30 seconds — and you'll know if you can train at full strength today",
      sleep: 'How did you sleep?',
      sleepLow: 'Terrible',
      sleepHigh: 'Great',
      stress: 'Stress level',
      stressLow: 'Very stressed',
      stressHigh: 'Calm',
      fatigue: 'Fatigue',
      fatigueLow: 'Exhausted',
      fatigueHigh: 'Fresh',
      soreness: 'Muscle soreness',
      sorenessLow: 'Very sore',
      sorenessHigh: 'Not sore',
      painFlag: 'I have pain or discomfort',
      painZonePlaceholder: 'Where does it hurt? (e.g. knee)',
      trainedToday: 'Already trained today',
      submit: 'Check my readiness',
      toPlan: 'Go to training plan',
      whyScore: 'Why this score',
      duration: 'Duration',
      rpe: 'Session effort (RPE)',
      rpeHint: '1 very easy, 10 all-out',
    },
    progress: {
      title: 'Your readiness',
      subtitle: 'Readiness Score for the last 30 days — calculated deterministically, no AI',
      today: 'Today',
      avg7d: '7-day average',
      redDays: 'Red days',
      perWeek: 'this week',
      last30: 'Last 30 days',
      zoneGreen: 'Green',
      zoneYellow: 'Yellow',
      zoneRed: 'Red',
      slowDownTitle: 'Time to slow down',
      slowDownBody: (n) =>
        `${n} of the last 7 days in the red zone — that's a signal, not a coincidence. Talk to your coach about load.`,
      empty: 'No data yet. Fill in your',
      emptyLink: 'daily check-in',
      acwrTitle: 'Workload (ACWR)',
      acwrSweetSpot: 'safe zone 0.8–1.3',
      insightLoading: 'Crunching the trend...',
      insightRedStreak: (n) =>
        `${n} day(s) in a row in the red zone. That's a pattern, not a coincidence — your body needs real rest, not just a lighter session.`,
      insightAcwrSpike: (v) =>
        `Workload has climbed too fast this week (ACWR ${v}) — injury risk is higher than usual right now. Ease off intensity for a couple of days.`,
      insightMonotony: "Training load has been too repetitive lately — add an easier day for variety, it lowers overtraining risk.",
      insightStreakPositive: (n) =>
        `${n}+ days in a row without missing while readiness stays good — great consistency. Don't forget a planned rest day.`,
      insightGreatShape: "The last week has stayed steadily in the green zone — recovery is working well. You can gradually build up load.",
      insightNotEnoughData: "Not enough check-ins yet to see a trend — keep filling it in daily and sharper insights will show up here.",
      insightNeutral: 'Readiness looks normal, no clear risk signals right now. Keep up the daily check-ins.',
      badge: 'Calculated by code, not AI',
      noCheckinDay: 'no check-in',
      vsPrevWeek: 'vs last week',
    },
    onboarding: {
      title: "Let's set up your profile",
      subtitle: 'CloudPulse',
      stepOf: (i, n) => `Step ${i} of ${n}`,
      ageQ: 'How old are you?',
      ageUnit: 'years',
      sportQ: 'What sport do you do?',
      sports: {
        football: 'Football',
        basketball: 'Basketball',
        athletics: 'Athletics',
        swimming: 'Swimming',
        gym: 'Gym / general fitness',
        other: 'Other',
      },
      datesTitle: 'Matches and exams',
      datesBody:
        'Optional, but it lets CloudPulse ease your load before exams and protect you around match days. You can skip this and add it later.',
      matchDates: 'Match dates',
      examDates: 'Exam dates',
      add: 'Add',
      remove: 'Remove',
      next: 'Next',
      back: 'Back',
      start: 'Start',
      saving: 'Saving...',
      errAge: 'Pick your age',
      errSport: 'Pick your sport',
      errSave: 'Could not save your profile',
      errGeneric: 'Something went wrong',
    },
    hub: {
      readiness: 'Readiness',
      readinessHint: 'Calculated by code from your check-in, not by AI',
      load: 'Workload (ACWR)',
      loadSafe: 'Safe 0.8-1.3',
      loadLow: 'Underloaded',
      loadOk: 'On track',
      loadHigh: 'Sharp spike',
      notEnoughData: 'Not enough data',
      streak: 'Days in a row',
      sleep: 'Sleep',
      calm: 'Calm',
      energy: 'Energy',
      muscles: 'Muscles',
      trend: 'Last 7 days',
      noCheckinTitle: 'No check-in yet today',
      noCheckinBody: "Without it your coach can't tell how you've recovered.",
      doCheckin: 'Do check-in',
      coachSees: 'Coach sees',
      modeRecovery: 'Recovery',
      modeStrength: 'Strength',
      modeCardio: 'Cardio',
      attach: 'Insert my metrics',
      voice: 'Voice input',
      listening: 'Listening...',
      metricsSnippet: (score, acwr, sleep) =>
        `My numbers today: readiness ${score ?? 'none'}/100, ACWR ${acwr !== null ? acwr.toFixed(2) : 'no data'}, sleep ${sleep ?? '-'}/7.`,
      planTitle: 'Training plan',
      min: 'min',
    },
    auth: {
      brandTag: 'Performance Auth',
      encrypted: '256-bit encrypted',
      signInTitle: 'Welcome back',
      signInSubtitle: 'Sign in to keep training',
      signUpTitle: 'Create your account',
      signUpSubtitle: 'Start tracking your readiness today',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      forgotPassword: 'Forgot password?',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      signUp: 'Create account',
      creatingAccount: 'Creating account...',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      orContinueWith: 'or continue with',
      continueGoogle: 'Google',
      continueApple: 'Apple',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      accountCreated: 'Account created! Redirecting...',
      enterEmailFirst: 'Enter your email first',
      resetSent: 'Check your inbox for a reset link.',
    },
    access: {
      lockdownTitle: 'Site temporarily unavailable',
      lockdownBody: "The CloudPulse owner has temporarily closed access to everyone but the team. Please check back shortly.",
      bannedTitle: 'Access revoked',
      bannedBody: 'The CloudPulse owner has restricted access for this account. If this seems wrong, reach out to the team.',
      backToLogin: 'Back to sign in',
    },
    shield: {
      title: 'Safety Pass',
      blockedHeading: 'Training restricted',
      cautionHeading: 'Caution advised',
      showToTeacher: 'Show this screen to your PE teacher or coach. They scan the QR code and see a verified status.',
      validUntil: (date: string) => `Valid only on ${date}`,
      passId: 'Pass ID',
      qrUnavailable: 'QR code temporarily unavailable: the server is not set up to sign passes.',
      loadError: 'Could not check your pass status',
      dirPain: (zone: string | null) =>
        `Pain reported${zone ? ` (${zone})` : ''}. Strength and high-intensity work is blocked. See a doctor, the school nurse or a physiotherapist.`,
      dirMatchDay: 'Match day: activation and a light warm-up only, no strength work.',
      dirPreMatch: 'Match tomorrow: heavy strength and high-intensity intervals are off limits.',
      dirPostMatch: 'Match yesterday: today is recovery, not strength work.',
      dirLoad: (acwr: string) =>
        `This week's load is ${acwr}× your usual. Injury risk is elevated: lower the intensity.`,
      verifyTitle: 'Safety Pass check',
      verifyChecking: 'Checking signature…',
      verifyValid: 'Genuine CloudPulse pass',
      verifyInvalid: 'Pass is not valid',
      verifyInvalidBody: "The signature doesn't match: this QR code wasn't issued by CloudPulse or has been altered.",
      verifyExpired: (date: string) => `This pass was valid on ${date} and is no longer valid today.`,
      verifyStatusBlock: 'Training restricted',
      verifyStatusCaution: 'Caution advised',
      verifyDate: 'Date',
      rPain: 'Health reasons: no strength or high-intensity work',
      rMatchDay: 'Match day: warm-up and activation only',
      rPreMatch: 'Day before a match: no heavy strength work',
      rPostMatch: 'After a match: recovery load only',
      rLoad: 'Sharp load increase: lower the intensity',
      verifyNote: "Status calculated by CloudPulse from the athlete's daily check-in. No health details are disclosed.",
    },
    coach: {
      navLabel: 'Coach',
      title: 'Coach panel',
      subtitle: "Your team's athlete readiness",
      emptyTitle: 'No athletes linked yet',
      emptyBody:
        'Coach-athlete links are currently created manually in the database (the team_members table). Once the first link exists, the athlete will show up here.',
      loadingRoster: 'Loading your roster...',
      errorRoster: 'Could not load the athlete roster',
      pickAthlete: 'Pick an athlete',
      athleteFallback: (id: string) => `Athlete #${id}`,
      loadingReadiness: 'Calculating readiness...',
      errorReadiness: "Could not load this athlete's data",
      noCheckinToday: "This athlete hasn't checked in today",
      hasCheckinToday: "Today's check-in received",
      scoreLabel: 'Readiness',
      loadLabel: 'Load (ACWR)',
      hooperLabel: 'Wellness index',
      hooperHint: 'Lower is better (out of 28)',
      monotonyLabel: 'Load monotony',
      streakLabel: 'Days in a row without rest',
      penaltiesTitle: 'What shaped the score',
      noPenalties: 'No penalties — clean score',
      safetyTitle: 'Safety Guard',
      noSafety: 'No restrictions',
      inconsistencyTitle: 'Self-report inconsistencies',
      forbidden: "No access to this athlete's data",
    },
    calendar: {
      title: 'School calendar',
      subtitle: 'Tests, exams and matches. CloudPulse factors them into your readiness.',
      addTitle: 'Add an event',
      typeExam: 'Test / exam',
      typeMatch: 'Match',
      datePlaceholder: 'Pick a date',
      subjectLabel: 'Subject (optional)',
      subjectPlaceholder: 'e.g. Maths',
      add: 'Add',
      upcomingTitle: 'Coming up',
      empty: 'Nothing here yet. Add your next test or match and CloudPulse will ease your load ahead of it.',
      loading: 'Loading calendar...',
      today: 'Today',
      tomorrow: 'Tomorrow',
      yesterday: 'Yesterday',
      inDays: (n) => `In ${n} days`,
      examFallback: 'Test',
      matchTitle: 'Match',
      effectExamNow: 'Lowering your readiness by 15 right now',
      effectExamLater: 'Counts from 3 days before',
      effectMatchNow: 'Safety Guard is limiting load',
      effectMatchLater: 'Safety Guard turns on the day before',
      remove: 'Remove',
      saving: 'Saving...',
      saved: 'Saved, readiness recalculated',
      errLoad: 'Could not load the calendar.',
      errSave: 'Could not save. Try again.',
      errDate: 'Pick a date',
      errDuplicate: 'This event is already in your calendar',
      pastNote: (n) => `Past events in history: ${n}`,
      howTitle: 'How this affects your score',
      howExam: 'Test or exam: from 3 days before and on the day itself, readiness drops by 15. School stress is load too.',
      howMatch: 'Match: the day before, match day and the day after, Safety Guard blocks heavy training.',
    },
    admin: {
      title: 'Control panel',
      subtitle: 'Owner access only',
      lockdownLabel: 'Lock access for everyone',
      lockdownOn: 'Site is locked for everyone but you',
      lockdownOff: 'Site is open to everyone',
      lockdownHint: 'Instantly closes /chat, /checkin, /progress and /onboarding to everyone except your account.',
      banListTitle: 'Banned emails',
      banPlaceholderEmail: "offender's email",
      banPlaceholderReason: 'reason (optional)',
      banButton: 'Ban',
      unbanButton: 'Unban',
      noBans: 'No one is banned yet',
      navLabel: 'Admin',
      notAllowed: 'This page is for the account owner only.',
      saveError: 'Could not save that change',
    },
    theme: {
      label: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      scheduled: 'Scheduled',
      lightHint: 'Always light',
      darkHint: 'Always dark',
      systemHint: 'Follows your device',
      scheduledHint: 'Dark in the evening, light by day',
      darkFrom: 'Dark from',
      darkTo: 'to',
      nowDark: 'Dark is on right now',
      nowLight: 'Light is on right now',
    },
    plan: {
      steps: 'Step by step',
      protocol: 'Protocol',
      tempo: 'Tempo',
      breathing: 'Breathing',
      heartRate: 'Heart rate',
      safety: 'Safety',
      zone: 'Zone',
      light: 'Light',
      moderate: 'Moderate',
      hard: 'Hard',
      details: 'Details',
      hideDetails: 'Collapse',
    },
    exportCal: {
      title: 'Add to calendar',
      subtitle: 'Choose where to send your plan',
      google: 'Google Calendar',
      googleHint: 'One workout at a time',
      apple: 'Apple Calendar',
      appleHint: 'All workouts in one .ics file',
      outlook: 'Outlook',
      outlookHint: 'Outlook.com, one workout at a time',
      pickDay: 'Pick a workout',
      open: 'Open',
      downloadAll: 'Download all (.ics)',
      importTip: 'To add every workout at once, download the .ics and import it into your calendar.',
      reminderIcs: 'The .ics file includes a reminder 15 minutes before each start.',
      reminderWeb: 'Web links use your calendar’s default reminder.',
      downloaded: 'File downloaded. Open it to add the workouts to your calendar.',
      back: 'Back',
      close: 'Close',
    },
    common: { loading: 'Loading…' },
  },
};
