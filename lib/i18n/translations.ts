export type Lang = 'en' | 'ru' | 'lv';

// Day-count plurals for streak copy ("1 день / 2 дня / 5 дней").
function ruDays(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'день';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'дня';
  return 'дней';
}
function lvDays(n: number): string {
  if (n === 0) return 'dienu';
  return n % 10 === 1 && n % 100 !== 11 ? 'diena' : 'dienas';
}

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
    sorenessMapToggle: string;
    sorenessMapHint: string;
    sorenessMapNotSaved: string;
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
    dirRtp: (cleanDays: number, required: number) => string;
    dirRtpAwaiting: string;
    rRtp: string;
    rRtpAwaiting: string;
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
  parent: {
    navLabel: string;
    title: string;
    subtitle: string;
    loading: string;
    errLoad: string;
    empty: string;
    athleteFallback: string;
    noConsentTitle: string;
    noConsentBody: (name: string) => string;
    noCheckin: string;
    statusGreen: string;
    statusYellow: string;
    statusRed: string;
    restricted: string;
    todayLabel: string;
    privacyTitle: string;
    privacyBody: string;
    weekTitle: string;
    weekCount: (n: number, total: number) => string;
    weekNoCheckin: string;
    coachWaiting: string;
    coachAnswered: (time: string) => string;
    coachReply: { contact: string; rest: string; specialist: string };
    calendarTitle: string;
    calendarLocked: (name: string) => string;
    calendarEmpty: string;
    examOn: (date: string) => string;
    matchOn: (date: string) => string;
    legendExam: string;
    legendMatch: string;
    legendWindow: string;
    tightLine: (range: string) => string;
    dayAria: (day: string, exam: boolean, match: boolean, window: boolean) => string;
    tipsTitle: string;
    tips: {
      RED_TODAY: string;
      EXAM_AND_MATCH_CLOSE: string;
      MATCH_TODAY: string;
      EXAM_TOMORROW: string;
      MATCH_TOMORROW: string;
      BUSY_WEEK: string;
    };
  };
  consent: {
    title: string;
    body: (parent: string) => string;
    colorTitle: string;
    calendarTitle: string;
    calendarBody: (parent: string) => string;
    on: string;
    off: string;
    changed: (date: string) => string;
    parentFallback: string;
    errSave: string;
  };
  invite: {
    joinTitle: string;
    joinSubtitle: string;
    checking: string;
    teamLabel: string;
    signInToJoin: string;
    createAccount: string;
    signIn: string;
    signedInAs: (email: string) => string;
    switchAccount: string;
    labelField: string;
    labelPlaceholder: string;
    labelHint: string;
    coachSeesTitle: string;
    coachSees: string[];
    leaveHint: string;
    agree: string;
    join: string;
    joining: string;
    joinedTitle: (team: string) => string;
    joinedBody: string;
    alreadyMember: (team: string) => string;
    continue: string;
    errInvalid: string;
    errNotAthlete: string;
    errOwnTeam: string;
    errLabel: string;
    errGeneric: string;
    panelTitle: string;
    panelHint: string;
    teamName: string;
    teamNamePlaceholder: string;
    createTeam: string;
    creating: string;
    addTeam: string;
    cancel: string;
    members: (n: number) => string;
    scanHint: string;
    codeLabel: string;
    copyLink: string;
    copied: string;
    fullscreen: string;
    close: string;
    accepting: string;
    acceptingOn: string;
    acceptingOff: string;
    newCode: string;
    newCodeConfirm: string;
    confirm: string;
    errCreate: string;
    errAction: string;
    cardTitle: string;
    cardNone: string;
    cardLabel: (label: string) => string;
    cardCoachSees: string;
    leave: string;
    leaveConfirm: (team: string) => string;
    errLeave: string;
    codeEntryLabel: string;
    codeEntryButton: string;
    codeEntryInvalid: string;
    errDemoAccount: string;
    errDemoTeam: string;
  };
  demo: {
    title: string;
    subtitle: string;
    note: string;
    athleteTitle: string;
    athleteDesc: string;
    coachTitle: string;
    coachDesc: string;
    parentTitle: string;
    parentDesc: string;
    enter: string;
    entering: string;
    disabled: string;
    error: string;
    realDataNote: string;
    bannerText: string;
    reset: string;
    resetting: string;
    resetError: string;
    switchRole: string;
  };
  streak: {
    title: string;
    days: (n: number) => string;
    best: (n: number) => string;
    doneToday: string;
    keepGoing: string;
    startNew: string;
    honesty: string;
    last14: string;
    dayDone: string;
    dayMissed: string;
    teamTitle: string;
    teamCount: (done: number, total: number) => string;
    teamAllDone: string;
    teamMissing: string;
    teamHint: string;
    athleteStreak: (n: number) => string;
  };
  offline: {
    savedTitle: string;
    savedBody: (date: string) => string;
    noScore: string;
    painNote: string;
    needLogin: string;
    offlineBanner: string;
    pending: (n: number) => string;
    sendNow: string;
    sending: string;
    synced: (n: number) => string;
    expired: string;
    installTitle: string;
    installBody: string;
    installButton: string;
    installIos: string;
    installClose: string;
  };
  roster: {
    title: string;
    basis: string;
    nextMatch: (date: string, inDays: number) => string;
    noMatch: string;
    groups: { out: string; limited: string; unknown: string; available: string };
    reasonPain: (zone: string | null) => string;
    reasonLowReadiness: (score: number | null) => string;
    reasonLoadSpike: (acwr: string) => string;
    reasonRtpRestricted: (cleanDays: number, required: number) => string;
    reasonRtpAwaiting: string;
    reasonNoCheckin: string;
    reasonNotComputed: string;
    reasonOk: (score: number | null) => string;
    copy: string;
    copied: string;
    shareHeader: (date: string) => string;
    shareGroups: { out: string; limited: string; unknown: string; available: string };
    empty: string;
  };
  storm: {
    title: string;
    subtitle: string;
    fewer: string;
    legendStorm: (threshold: number) => string;
    legendMatch: string;
    none: string;
    noneHint: string;
    calm: string;
    stormLine: (range: string, peak: string, team: number) => string;
    matchInStorm: (dates: string) => string;
    engineNote: string;
    privacy: string;
    dayAria: (day: string, count: string, match: boolean) => string;
  };
  rtp: {
    title: string;
    painOn: (date: string, zone: string | null) => string;
    cleanProgress: (n: number, required: number) => string;
    stepPain: string;
    stepClean: string;
    stepCoach: string;
    stateRestricted: (required: number) => string;
    stateReady: string;
    stateCleared: (date: string) => string;
    noCheckinNote: string;
    disclaimer: string;
    followupTitle: (day: 1 | 3) => string;
    qTrend: (zone: string | null) => string;
    trend: { better: string; same: string; worse: string };
    qSpecialist: string;
    yes: string;
    notYet: string;
    send: string;
    sendError: string;
    worseNote: string;
    coachTitle: string;
    coachHint: string;
    coachRestricted: (n: number, required: number) => string;
    coachReady: string;
    coachCleared: (time: string) => string;
    answerLine: (day: 1 | 3, trend: string, sawSpecialist: boolean) => string;
    noAnswers: string;
    clearButton: string;
    clearConfirm: string;
    clearYes: string;
    cancel: string;
    clearError: string;
    coachBasis: string;
  };
  alerts: {
    title: string;
    live: string;
    polling: string;
    soundOn: string;
    soundOff: string;
    soundHint: string;
    none: string;
    kindPain: (zone: string | null) => string;
    kindRed: (score: number | null) => string;
    yesterdayAt: (time: string) => string;
    react: { contact: string; rest: string; specialist: string };
    reactError: string;
    answeredTitle: string;
    basis: string;
    replyWaitingTitle: string;
    replyWaiting: (kind: 'pain' | 'red') => string;
    replyTitle: (time: string) => string;
    reply: { contact: string; rest: string; specialist: string };
  };
  engine: {
    penaltyAcwrSpike: (acwr: string) => string;
    penaltyAcwrRising: (acwr: string) => string;
    penaltyAcwrLow: (acwr: string) => string;
    penaltyWellnessWorse: (score: number, baseline: string) => string;
    penaltyNoRestStreak: (days: number) => string;
    penaltyExamSoon: string;
    penaltyMonotonyHigh: (value: string) => string;
    violationPain: (zone: string | null) => string;
    violationMatchDay: string;
    violationPreMatch: string;
    violationPostMatch: string;
    inconsistencyFatigueVsAcwr: (fatigue: number, acwr: string) => string;
    inconsistencyFatigueVsStreak: (streak: number) => string;
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
      sorenessMapToggle: 'Отметить забитые мышцы (по желанию)',
      sorenessMapHint: 'Карту видишь только ты. По ней ИИ-тренер даст забитой мышце только мягкую работу. На балл готовности она не влияет.',
      sorenessMapNotSaved: 'Чек-ин сохранён, а карта мышц — нет. Попробуй отметить её ещё раз позже.',
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
        `${n} ${ruDays(n)} подряд с чек-ином — отличная привычка. Честные ответы делают оценку точнее.`,
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
      streak: 'Дней без отдыха',
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
      dirRtp: (n, req) =>
        `Возвращение после боли: без боли ${n} из ${req} дней. Полная нагрузка — только после допуска тренера.`,
      dirRtpAwaiting: 'Боли нет 2 дня. Полная нагрузка — после подтверждения тренера.',
      rRtp: 'После перерыва по здоровью: без полной нагрузки до допуска тренера',
      rRtpAwaiting: 'После перерыва по здоровью: ждёт подтверждения тренера',
      verifyNote: 'Статус рассчитан системой CloudPulse по ежедневному чек-ину спортсмена. Подробности о здоровье не раскрываются.',
    },
    coach: {
      navLabel: 'Тренер',
      title: 'Панель тренера',
      subtitle: 'Готовность атлетов твоей команды',
      emptyTitle: 'Пока нет привязанных атлетов',
      emptyBody:
        'Создай команду выше и покажи спортсменам QR-код — как только кто-то вступит, он появится здесь.',
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
    parent: {
      navLabel: 'Родителям',
      title: 'Кабинет родителя',
      subtitle: 'Статус, неделя и календарь — только то, что ребёнок сам открыл.',
      loading: 'Загружаю...',
      errLoad: 'Не удалось загрузить статус.',
      empty: 'К твоему аккаунту пока не привязан спортсмен. Связь создаёт школа или тренер.',
      athleteFallback: 'Спортсмен',
      noConsentTitle: 'Доступ закрыт',
      noConsentBody: (name) =>
        `${name} пока не открыл(а) доступ к своему статусу. Это можно сделать в приложении CloudPulse, раздел «Прогресс».`,
      noCheckin: 'Сегодня чек-ина ещё не было.',
      statusGreen: 'Готов(а) к тренировке',
      statusYellow: 'Лучше тренироваться полегче',
      statusRed: 'Сегодня нужен щадящий режим',
      restricted: 'Тяжёлые нагрузки сегодня ограничены. Подробности знают сам спортсмен и тренер.',
      todayLabel: 'Сегодня',
      privacyTitle: 'Что ты видишь',
      privacyBody:
        'Цвет дня за неделю, ограничения и ответ тренера — если ребёнок открыл доступ. Даты контрольных и матчей — только по отдельному разрешению. Ответы о сне, стрессе и боли, баллы и тренировки остаются у спортсмена: так GDPR защищает данные о здоровье несовершеннолетних.',
      weekTitle: 'Последние 7 дней',
      weekCount: (n, total) => `Чек-ин: ${n} из ${total} дней`,
      weekNoCheckin: 'нет чек-ина',
      coachWaiting: 'Тренер получил сигнал сегодня и скоро ответит.',
      coachAnswered: (time) => `Ответ тренера · ${time}`,
      coachReply: {
        contact: 'Тренер свяжется с ребёнком.',
        rest: 'Сегодня — отдых, без тренировки.',
        specialist: 'Показаться врачу, школьной медсестре или физиотерапевту.',
      },
      calendarTitle: 'Ближайшие 2 недели',
      calendarLocked: (name) => `${name} пока не открыл(а) календарь контрольных и матчей. Это делается в разделе «Прогресс».`,
      calendarEmpty: 'В ближайшие 2 недели контрольных и матчей не отмечено.',
      examOn: (date) => `Контрольная — ${date}`,
      matchOn: (date) => `Матч — ${date}`,
      legendExam: 'контрольная',
      legendMatch: 'матч',
      legendWindow: 'дни перед контрольной',
      tightLine: (range) => `Напряжённые дни: ${range} — контрольная и матч рядом.`,
      dayAria: (day, exam, match, window) =>
        [day, exam ? 'контрольная' : null, match ? 'матч' : null, !exam && window ? 'перед контрольной' : null].filter(Boolean).join(', '),
      tipsTitle: 'Что может помочь дома',
      tips: {
        RED_TODAY:
          'Сегодня красный день: дома лучше без дополнительных нагрузок — пробежек, зала, секций. Если что-то болит — врач, школьная медсестра или физиотерапевт.',
        EXAM_AND_MATCH_CLOSE: 'Контрольная и матч идут подряд — помогите разгрузить эти вечера от лишних дел.',
        MATCH_TODAY: 'Сегодня матч: после игры — спокойный вечер и обычное время отбоя.',
        EXAM_TOMORROW: 'Завтра контрольная — обычное время отбоя поможет больше, чем учёба допоздна.',
        MATCH_TOMORROW: 'Завтра матч — ранний отбой и форма, собранная с вечера.',
        BUSY_WEEK: 'На этой неделе несколько контрольных: приложение уже снижает спортивную нагрузку, дома поможет ровный режим сна.',
      },
    },
    consent: {
      title: 'Доступ для родителей',
      body: (parent) =>
        `${parent} будет видеть цвет твоего дня за последнюю неделю, есть ли ограничения и ответ тренера на сигнал. Ответы о самочувствии, боли и баллы остаются у тебя.`,
      colorTitle: 'Цвет дня',
      calendarTitle: 'Календарь: контрольные и матчи',
      calendarBody: (parent) => `${parent} увидит даты твоих контрольных и матчей на 2 недели вперёд — без предметов и оценок.`,
      on: 'Доступ открыт',
      off: 'Доступ закрыт',
      changed: (date) => `Изменено ${date}`,
      parentFallback: 'Родитель',
      errSave: 'Не удалось сохранить. Попробуй ещё раз.',
    },
    invite: {
      joinTitle: 'Приглашение в команду',
      joinSubtitle: 'Тренер приглашает тебя в CloudPulse',
      checking: 'Проверяю приглашение…',
      teamLabel: 'Команда',
      signInToJoin: 'Чтобы вступить, войди в аккаунт или создай новый — это займёт минуту.',
      createAccount: 'Создать аккаунт',
      signIn: 'У меня уже есть аккаунт',
      signedInAs: (email) => `Ты вошёл как ${email}`,
      switchAccount: 'Сменить аккаунт',
      labelField: 'Как тебя подписать для тренера',
      labelPlaceholder: 'Например: Макс К.',
      labelHint: 'Имя или ник — его видит только твой тренер.',
      coachSeesTitle: 'Что будет видеть тренер',
      coachSees: [
        'Твой балл готовности и зону дня',
        'Ответы чек-ина: сон, стресс, усталость, мышцы, боль',
        'Тренировки, даты экзаменов и матчей',
        'Профиль: возраст, вид спорта, прошлые травмы',
      ],
      leaveHint: 'Выйти из команды можно в любой момент в разделе «Прогресс» — доступ тренера сразу закроется.',
      agree: 'Понятно, согласен(на)',
      join: 'Вступить в команду',
      joining: 'Вступаю…',
      joinedTitle: (team) => `Ты в команде «${team}»!`,
      joinedBody: 'Тренер уже видит тебя в списке. Каждый твой чек-ин помогает ему вовремя заметить перегрузку.',
      alreadyMember: (team) => `Ты уже состоишь в команде «${team}».`,
      continue: 'Продолжить',
      errInvalid: 'Приглашение недействительно: код устарел или тренер закрыл приём. Попроси у тренера новый QR-код.',
      errNotAthlete: 'Вступить в команду может только аккаунт спортсмена. Сейчас ты вошёл как тренер или родитель.',
      errOwnTeam: 'Это твоя собственная команда — вступать в неё не нужно.',
      errLabel: 'Напиши, как тебя подписать (до 40 символов).',
      errGeneric: 'Что-то пошло не так. Проверь интернет и попробуй ещё раз.',
      panelTitle: 'Команды и приглашения',
      panelHint: 'Покажи QR-код команде — спортсмены вступят сами за полминуты. Добавлять никого вручную не нужно.',
      teamName: 'Название команды',
      teamNamePlaceholder: 'Например: RFS U17',
      createTeam: 'Создать команду',
      creating: 'Создаю…',
      addTeam: 'Ещё команда',
      cancel: 'Отмена',
      members: (n) => {
        if (n === 0) return 'Пока никто не вступил';
        const m10 = n % 10;
        const m100 = n % 100;
        const word =
          m10 === 1 && m100 !== 11
            ? 'спортсмен'
            : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
              ? 'спортсмена'
              : 'спортсменов';
        return `${n} ${word}`;
      },
      scanHint: 'Наведи камеру телефона на код',
      codeLabel: 'Код',
      copyLink: 'Скопировать ссылку',
      copied: 'Скопировано',
      fullscreen: 'На весь экран',
      close: 'Закрыть',
      accepting: 'Приём в команду',
      acceptingOn: 'Открыт',
      acceptingOff: 'Закрыт — по коду вступить нельзя',
      newCode: 'Новый код',
      newCodeConfirm: 'Старый QR-код сразу перестанет работать. Уже вступившие останутся в команде.',
      confirm: 'Создать новый код',
      errCreate: 'Не удалось создать команду. Попробуй ещё раз.',
      errAction: 'Не удалось сохранить. Попробуй ещё раз.',
      cardTitle: 'Моя команда',
      cardNone: 'Ты пока не в команде. Отсканируй QR-код у тренера или введи код ниже — это займёт полминуты.',
      cardLabel: (label) => `У тренера ты подписан как «${label}»`,
      cardCoachSees: 'Тренер видит твои чек-ины, тренировки и статус готовности.',
      leave: 'Выйти из команды',
      leaveConfirm: (team) => `Выйти из «${team}»? Тренер перестанет видеть твои данные.`,
      errLeave: 'Не удалось выйти из команды. Попробуй ещё раз.',
      codeEntryLabel: 'Есть код от тренера?',
      codeEntryButton: 'Вступить',
      codeEntryInvalid: 'Код — 8 символов, например MS49-U5P4.',
      errDemoAccount: 'Это демо-аккаунт: вступать в настоящие команды из демо нельзя.',
      errDemoTeam: 'Это демонстрационная команда — в неё нельзя вступить. Попроси у своего тренера настоящий код.',
    },
    demo: {
      title: 'Демо CloudPulse',
      subtitle: 'Попробуйте приложение за любую роль — в один клик, без регистрации.',
      note: 'Все люди и данные здесь вымышленные. Демо-данные сбрасываются каждый день и по кнопке «Сбросить демо» — нажимайте что угодно.',
      athleteTitle: 'Спортсмен',
      athleteDesc: '«Скрытая травма»: болит колено, а завтра матч. Посмотрите, как Safety Guard блокирует нагрузку и выдаёт пропуск с QR-кодом.',
      coachTitle: 'Тренер',
      coachDesc: 'Команда из 4 спортсменов — от «звезды в зоне риска» до «новичка». Готовность, ACWR и причина каждого балла.',
      parentTitle: 'Родитель',
      parentDesc: 'Видит только цвет дня — и только если спортсмен сам разрешит. Никаких ответов о самочувствии.',
      enter: 'Войти',
      entering: 'Вхожу…',
      disabled: 'Демо-режим сейчас выключен.',
      error: 'Не удалось войти. Попробуйте ещё раз через минуту.',
      realDataNote: 'Данные настоящих тестеров к демо не относятся и отсюда недоступны.',
      bannerText: 'Демо-режим — все данные вымышленные',
      reset: 'Сбросить демо',
      resetting: 'Сбрасываю…',
      resetError: 'Не удалось сбросить',
      switchRole: 'Сменить роль',
    },
    streak: {
      title: 'Серия чек-инов',
      days: (n) => `${n} ${ruDays(n)} подряд`,
      best: (n) => `Лучшая серия: ${n}`,
      doneToday: 'Сегодня отмечено',
      keepGoing: 'Сделай чек-ин сегодня — и серия продолжится',
      startNew: 'Начни новую серию сегодня',
      honesty: 'Засчитывается сам факт чек-ина, а не цвет зоны. Честное «мне плохо» считается так же, как зелёный день.',
      last14: 'Последние 14 дней',
      dayDone: 'чек-ин есть',
      dayMissed: 'нет чек-ина',
      teamTitle: 'Чек-ин сегодня',
      teamCount: (done, total) => `${done} из ${total}`,
      teamAllDone: 'Вся команда отметилась',
      teamMissing: 'Ещё не отметились:',
      teamHint: 'Считается сам факт чек-ина, а не результат.',
      athleteStreak: (n) => `Серия чек-инов: ${n}`,
    },
    offline: {
      savedTitle: 'Сохранено на телефоне',
      savedBody: (date) =>
        `Интернета сейчас нет. Чек-ин за ${date} сохранён и отправится сам, когда ты снова откроешь CloudPulse с интернетом.`,
      noScore: 'Оценку готовности движок посчитает после отправки: без твоей истории из базы мы её не выдумываем.',
      painNote:
        'Ты отметил(а) боль. Не тренируйся через боль и скажи тренеру или школьной медсестре — это правило работает и без интернета.',
      needLogin: 'Без интернета чек-ин можно сохранить, только если ты уже входил(а) в аккаунт на этом телефоне.',
      offlineBanner: 'Нет сети. Чек-ин всё равно можно заполнить — он сохранится на телефоне.',
      pending: (n) => `${n} ${n === 1 ? 'чек-ин ждёт' : n < 5 ? 'чек-ина ждут' : 'чек-инов ждут'} отправки`,
      sendNow: 'Отправить',
      sending: 'Отправляю…',
      synced: (n) => (n === 1 ? 'Офлайн-чек-ин отправлен' : `Отправлено офлайн-чек-инов: ${n}`),
      expired: 'Чек-ин старше 7 дней не отправлен — такие сервер не принимает.',
      installTitle: 'Установи CloudPulse на телефон',
      installBody: 'Иконка на главном экране и чек-ин даже без интернета.',
      installButton: 'Установить',
      installIos: 'В Safari нажми «Поделиться», затем «На экран „Домой“».',
      installClose: 'Закрыть',
    },
    roster: {
      title: 'Заявка на матч',
      basis: 'По сегодняшним чек-инам. Это подсказка движка — состав выбирает тренер.',
      nextMatch: (date, d) =>
        d === 0 ? `Матч сегодня, ${date}` : d === 1 ? `Матч завтра, ${date}` : `Ближайший матч: ${date}, через ${d} ${ruDays(d)}`,
      noMatch: 'Матч в календаре команды не найден.',
      groups: {
        out: 'Не допущены до осмотра',
        limited: 'С ограничением нагрузки',
        unknown: 'Нет чек-ина сегодня',
        available: 'Доступны',
      },
      reasonPain: (zone) =>
        zone ? `Боль: ${zone} — сначала врач, медсестра или физиотерапевт` : 'Боль — сначала врач, медсестра или физиотерапевт',
      reasonLowReadiness: (score) => (score === null ? 'Красная зона готовности' : `Готовность ${score} — красная зона`),
      reasonLoadSpike: (acwr) => `Резкий рост нагрузки (ACWR ${acwr})`,
      reasonRtpRestricted: (n, req) => `После боли: без боли ${n} из ${req} дней`,
      reasonRtpAwaiting: 'Без боли 2 дня — ждёт вашего допуска',
      reasonNoCheckin: 'Попросите заполнить чек-ин',
      reasonNotComputed: 'Оценка ещё не посчитана',
      reasonOk: (score) => (score === null ? 'Без ограничений' : `Готовность ${score}`),
      copy: 'Скопировать заявку',
      copied: 'Скопировано',
      shareHeader: (date) => `Заявка на ${date}`,
      shareGroups: { out: 'Не заявлены', limited: 'С ограничением нагрузки', unknown: 'Нет данных', available: 'Доступны' },
      empty: 'никого',
    },
    storm: {
      title: 'Экзаменационный шторм',
      subtitle: 'Ближайшие 2 недели: сколько спортсменов в окне контрольных — день контрольной и 3 дня до неё.',
      fewer: '<3',
      legendStorm: (n) => `шторм — в окне треть команды или больше (от ${n})`,
      legendMatch: 'матч',
      none: 'В ближайшие 2 недели контрольных у команды не отмечено.',
      noneHint: 'Спортсмены добавляют контрольные в разделе «Календарь».',
      calm: 'Шторма нет: одновременно в окне контрольных меньше трети команды.',
      stormLine: (range, peak, team) => `Шторм ${range}: в окне контрольных до ${peak} из ${team}.`,
      matchInStorm: (dates) => `Матч в дни шторма: ${dates}.`,
      engineNote: 'Движок уже снижает этим спортсменам балл готовности на 15. Лёгкая тренировка или перенос — решаете вы.',
      privacy: 'Только числа, без имён. Меньше 3 точно не показываем — чтобы нельзя было угадать, о ком речь.',
      dayAria: (day, count, match) => `${day}: в окне контрольных ${count}${match ? ', матч' : ''}`,
    },
    rtp: {
      title: 'Возвращение после боли',
      painOn: (date, zone) => (zone ? `Боль ${date}: ${zone}` : `Боль ${date}`),
      cleanProgress: (n, req) => `Дней без боли: ${Math.min(n, req)} из ${req}`,
      stepPain: 'Боль',
      stepClean: '2 дня без боли',
      stepCoach: 'Допуск тренера',
      stateRestricted: (req) => `Пока без полной нагрузки. Нужно ${req} дня с чек-ином без боли.`,
      stateReady: 'Боли нет 2 дня. Полную нагрузку подтверждает тренер.',
      stateCleared: (date) => `Тренер допустил к полной нагрузке · ${date}`,
      noCheckinNote: 'День без чек-ина не считается днём без боли.',
      disclaimer: 'Это не медицинский допуск. Если боль вернулась — врач, школьная медсестра или физиотерапевт.',
      followupTitle: (day) => (day === 1 ? 'Переспрос: день после боли' : 'Переспрос: третий день после боли'),
      qTrend: (zone) => (zone ? `Как ${zone} сейчас по сравнению с днём боли?` : 'Как сейчас по сравнению с днём боли?'),
      trend: { better: 'Лучше', same: 'Так же', worse: 'Хуже' },
      qSpecialist: 'Тебя осматривал врач, школьная медсестра или физиотерапевт?',
      yes: 'Да',
      notYet: 'Пока нет',
      send: 'Отправить',
      sendError: 'Не получилось отправить. Проверь интернет и попробуй ещё раз.',
      worseNote: 'Если стало хуже — покажись врачу, школьной медсестре или физиотерапевту и отметь боль в чек-ине.',
      coachTitle: 'Возвращение после боли',
      coachHint: 'Кто недавно отмечал боль. Полную нагрузку разрешаете вы — после 2 дней без боли.',
      coachRestricted: (n, req) => `Без боли ${n} из ${req} дней — ещё рано`,
      coachReady: 'Без боли 2 дня — ждёт вашего допуска',
      coachCleared: (time) => `Допущен вами · ${time}`,
      answerLine: (day, trend, seen) =>
        `День ${day}: ${trend.toLowerCase()} · ${seen ? 'осмотрел специалист' : 'специалист не осматривал'}`,
      noAnswers: 'Ответов на переспрос пока нет',
      clearButton: 'Допустить к полной нагрузке',
      clearConfirm: 'Подтверждаю: я поговорил со спортсменом, боли нет. Это не медицинский допуск — при сомнении сначала специалист.',
      clearYes: 'Да, допустить',
      cancel: 'Отмена',
      clearError: 'Не получилось. Обновите страницу — возможно, спортсмен снова отметил боль.',
      coachBasis: 'Кнопка появляется только после 2 дней с чек-ином без боли — это проверяет база, а не браузер.',
    },
    alerts: {
      title: 'Тревоги',
      live: 'Онлайн — сигнал придёт сразу',
      polling: 'Проверяем каждые 10 секунд',
      soundOn: 'Звук включён',
      soundOff: 'Включить звук',
      soundHint: 'Браузер не даёт сайту играть звук без нажатия — включите один раз на этом устройстве.',
      none: 'Тревог нет. Если спортсмен отметит боль или окажется в красной зоне, здесь появится сигнал.',
      kindPain: (zone) => (zone ? `Боль: ${zone}` : 'Отмечена боль'),
      kindRed: (score) => (score === null ? 'Красная зона готовности' : `Готовность ${score} — красная зона`),
      yesterdayAt: (time) => `вчера, ${time}`,
      react: { contact: 'Видел, свяжусь', rest: 'Сегодня отдых', specialist: 'К врачу или физио' },
      reactError: 'Не получилось отправить ответ. Проверьте интернет и нажмите ещё раз.',
      answeredTitle: 'Отвечено',
      basis:
        'Сигнал — не диагноз. Спортсмен видит ваш ответ. О нагрузке решает тренер, при боли — врач, медсестра или физиотерапевт.',
      replyWaitingTitle: 'Тренер получил сигнал',
      replyWaiting: (kind) =>
        kind === 'pain'
          ? 'Отмечена боль — тренер уже видит это. Его ответ появится здесь.'
          : 'Готовность в красной зоне — тренер уже видит это. Его ответ появится здесь.',
      replyTitle: (time) => `Ответ тренера · ${time}`,
      reply: {
        contact: 'Видел. Свяжусь с тобой.',
        rest: 'Сегодня — отдых, без тренировки.',
        specialist: 'Покажись врачу, школьной медсестре или физиотерапевту.',
      },
    },
    engine: {
      penaltyAcwrSpike: (acwr) => `ACWR ${acwr} — резкий скачок нагрузки (риск травмы)`,
      penaltyAcwrRising: (acwr) => `ACWR ${acwr} — нагрузка растёт быстрее обычного`,
      penaltyAcwrLow: (acwr) => `ACWR ${acwr} — нагрузка заметно ниже обычной`,
      penaltyWellnessWorse: (score, baseline) => `Самочувствие хуже обычного (индекс ${score} против базы ${baseline})`,
      penaltyNoRestStreak: (days) => `${days} дней подряд без отдыха`,
      penaltyExamSoon: 'Экзамен в ближайшие 3 дня',
      penaltyMonotonyHigh: (value) => `Однообразная нагрузка (монотонность ${value})`,
      violationPain: (zone) =>
        `Заявлена боль${zone ? ` (зона: ${zone})` : ''}. Силовые и высокоинтенсивные упражнения на сегодня заблокированы. Рекомендация: показаться врачу, школьной медсестре или физиотерапевту — не гадать самостоятельно.`,
      violationMatchDay: 'Сегодня день матча — только активация и лёгкая разминка, без силовой работы.',
      violationPreMatch: 'Завтра матч — тяжёлые силовые и высокоинтенсивные интервалы под запретом, только техника и лёгкий объём.',
      violationPostMatch: 'Вчера был матч — сегодня восстановление (растяжка, лёгкое кардио), не силовая.',
      inconsistencyFatigueVsAcwr: (fatigue, acwr) =>
        `Самооценка усталости низкая (${fatigue}/7 = "почти свеж"), но ACWR = ${acwr} — острая нагрузка резко выше обычной.`,
      inconsistencyFatigueVsStreak: (streak) => `Самооценка усталости низкая, но это ${streak}-й день подряд без отдыха.`,
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
      sorenessMapToggle: 'Atzīmēt sasprindzinātos muskuļus (pēc izvēles)',
      sorenessMapHint: 'Karti redzi tikai tu. Pēc tās AI treneris dos sasprindzinātajam muskulim tikai maigu darbu. Gatavības punktus tā neietekmē.',
      sorenessMapNotSaved: 'Reģistrācija saglabāta, bet muskuļu karte — nē. Pamēģini to atzīmēt vēlāk vēlreiz.',
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
        `${n} ${lvDays(n)} pēc kārtas ar pārbaudi — lielisks ieradums. Godīgas atbildes padara novērtējumu precīzāku.`,
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
      streak: 'Dienas bez atpūtas',
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
      dirRtp: (n, req) =>
        `Atgriešanās pēc sāpēm: bez sāpēm ${n} no ${req} dienām. Pilna slodze — tikai pēc trenera atļaujas.`,
      dirRtpAwaiting: 'Sāpju nav 2 dienas. Pilna slodze — pēc trenera apstiprinājuma.',
      rRtp: 'Pēc veselības pārtraukuma: bez pilnas slodzes līdz trenera atļaujai',
      rRtpAwaiting: 'Pēc veselības pārtraukuma: gaida trenera apstiprinājumu',
      verifyNote: 'Statusu aprēķinājusi CloudPulse sistēma pēc sportista ikdienas pārbaudes. Veselības detaļas netiek atklātas.',
    },
    coach: {
      navLabel: 'Treneris',
      title: 'Trenera panelis',
      subtitle: 'Tavas komandas atlētu gatavība',
      emptyTitle: 'Vēl nav piesaistītu atlētu',
      emptyBody:
        'Izveido komandu augstāk un parādi sportistiem QR kodu — tiklīdz kāds pievienosies, viņš parādīsies šeit.',
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
    parent: {
      navLabel: 'Vecākiem',
      title: 'Vecāku skats',
      subtitle: 'Statuss, nedēļa un kalendārs — tikai tas, ko bērns pats atvēris.',
      loading: 'Ielādēju...',
      errLoad: 'Neizdevās ielādēt statusu.',
      empty: 'Tavam kontam vēl nav piesaistīts sportists. Saiti izveido skola vai treneris.',
      athleteFallback: 'Sportists',
      noConsentTitle: 'Piekļuve slēgta',
      noConsentBody: (name) =>
        `${name} vēl nav atvēris(-usi) piekļuvi savam statusam. To var izdarīt CloudPulse lietotnē, sadaļā «Progress».`,
      noCheckin: 'Šodien pārbaude vēl nav veikta.',
      statusGreen: 'Gatavs(-a) treniņam',
      statusYellow: 'Labāk trenēties vieglāk',
      statusRed: 'Šodien vajadzīgs saudzīgs režīms',
      restricted: 'Smagas slodzes šodien ir ierobežotas. Sīkāk zina pats sportists un treneris.',
      todayLabel: 'Šodien',
      privacyTitle: 'Ko tu redzi',
      privacyBody:
        'Dienas krāsu par nedēļu, ierobežojumus un trenera atbildi — ja bērns atvēris piekļuvi. Kontroldarbu un spēļu datumus — tikai ar atsevišķu atļauju. Atbildes par miegu, stresu un sāpēm, punkti un treniņi paliek pie sportista: tā GDPR aizsargā nepilngadīgo veselības datus.',
      weekTitle: 'Pēdējās 7 dienas',
      weekCount: (n, total) => `Aptauja: ${n} no ${total} dienām`,
      weekNoCheckin: 'nav aptaujas',
      coachWaiting: 'Treneris šodien saņēma signālu un drīz atbildēs.',
      coachAnswered: (time) => `Trenera atbilde · ${time}`,
      coachReply: {
        contact: 'Treneris sazināsies ar bērnu.',
        rest: 'Šodien — atpūta, bez treniņa.',
        specialist: 'Parādīties ārstam, skolas medmāsai vai fizioterapeitam.',
      },
      calendarTitle: 'Nākamās 2 nedēļas',
      calendarLocked: (name) => `${name} vēl nav atvēris kontroldarbu un spēļu kalendāru. To var izdarīt sadaļā «Progress».`,
      calendarEmpty: 'Nākamajās 2 nedēļās kontroldarbi un spēles nav atzīmēti.',
      examOn: (date) => `Kontroldarbs — ${date}`,
      matchOn: (date) => `Spēle — ${date}`,
      legendExam: 'kontroldarbs',
      legendMatch: 'spēle',
      legendWindow: 'dienas pirms kontroldarba',
      tightLine: (range) => `Saspringtas dienas: ${range} — kontroldarbs un spēle blakus.`,
      dayAria: (day, exam, match, window) =>
        [day, exam ? 'kontroldarbs' : null, match ? 'spēle' : null, !exam && window ? 'pirms kontroldarba' : null].filter(Boolean).join(', '),
      tipsTitle: 'Kas var palīdzēt mājās',
      tips: {
        RED_TODAY:
          'Šodien sarkanā diena: mājās labāk bez papildu slodzes — skriešanas, zāles, pulciņiem. Ja kaut kas sāp — ārsts, skolas medmāsa vai fizioterapeits.',
        EXAM_AND_MATCH_CLOSE: 'Kontroldarbs un spēle ir pēc kārtas — palīdziet atbrīvot šos vakarus no liekām lietām.',
        MATCH_TODAY: 'Šodien spēle: pēc tās — mierīgs vakars un parastais gulētiešanas laiks.',
        EXAM_TOMORROW: 'Rīt kontroldarbs — parastais gulētiešanas laiks palīdzēs vairāk nekā mācīšanās līdz vēlam vakaram.',
        MATCH_TOMORROW: 'Rīt spēle — agrāk gulēt un forma sakravāta jau vakarā.',
        BUSY_WEEK: 'Šonedēļ vairāki kontroldarbi: lietotne jau samazina sporta slodzi, mājās palīdzēs vienmērīgs miega režīms.',
      },
    },
    consent: {
      title: 'Piekļuve vecākiem',
      body: (parent) =>
        `${parent} redzēs tavas dienas krāsu par pēdējo nedēļu, vai ir ierobežojumi un trenera atbildi uz signālu. Atbildes par pašsajūtu, sāpēm un punkti paliek pie tevis.`,
      colorTitle: 'Dienas krāsa',
      calendarTitle: 'Kalendārs: kontroldarbi un spēles',
      calendarBody: (parent) => `${parent} redzēs tavu kontroldarbu un spēļu datumus 2 nedēļas uz priekšu — bez priekšmetiem un atzīmēm.`,
      on: 'Piekļuve atvērta',
      off: 'Piekļuve slēgta',
      changed: (date) => `Mainīts ${date}`,
      parentFallback: 'Vecāks',
      errSave: 'Neizdevās saglabāt. Mēģini vēlreiz.',
    },
    invite: {
      joinTitle: 'Uzaicinājums komandā',
      joinSubtitle: 'Treneris aicina tevi pievienoties CloudPulse',
      checking: 'Pārbaudu uzaicinājumu…',
      teamLabel: 'Komanda',
      signInToJoin: 'Lai pievienotos, ienāc kontā vai izveido jaunu — tas aizņems minūti.',
      createAccount: 'Izveidot kontu',
      signIn: 'Man jau ir konts',
      signedInAs: (email) => `Tu esi ienācis kā ${email}`,
      switchAccount: 'Mainīt kontu',
      labelField: 'Kā tevi parakstīt trenerim',
      labelPlaceholder: 'Piemēram: Maksis K.',
      labelHint: 'Vārds vai segvārds — to redz tikai tavs treneris.',
      coachSeesTitle: 'Ko redzēs treneris',
      coachSees: [
        'Tavu gatavības punktu skaitu un dienas zonu',
        'Pārbaudes atbildes: miegs, stress, nogurums, muskuļi, sāpes',
        'Treniņus, eksāmenu un spēļu datumus',
        'Profilu: vecumu, sporta veidu, iepriekšējās traumas',
      ],
      leaveHint: 'Izstāties no komandas var jebkurā brīdī sadaļā «Progress» — trenera piekļuve uzreiz tiks slēgta.',
      agree: 'Skaidrs, piekrītu',
      join: 'Pievienoties komandai',
      joining: 'Pievienojos…',
      joinedTitle: (team) => `Tu esi komandā «${team}»!`,
      joinedBody: 'Treneris tevi jau redz sarakstā. Katra tava pārbaude palīdz viņam laikus pamanīt pārslodzi.',
      alreadyMember: (team) => `Tu jau esi komandā «${team}».`,
      continue: 'Turpināt',
      errInvalid: 'Uzaicinājums nav derīgs: kods ir novecojis vai treneris ir slēdzis pieteikšanos. Palūdz trenerim jaunu QR kodu.',
      errNotAthlete: 'Komandai var pievienoties tikai sportista konts. Pašlaik tu esi ienācis kā treneris vai vecāks.',
      errOwnTeam: 'Šī ir tava paša komanda — tai nav jāpievienojas.',
      errLabel: 'Uzraksti, kā tevi parakstīt (līdz 40 rakstzīmēm).',
      errGeneric: 'Kaut kas nogāja greizi. Pārbaudi internetu un mēģini vēlreiz.',
      panelTitle: 'Komandas un uzaicinājumi',
      panelHint: 'Parādi QR kodu komandai — sportisti pievienosies paši pusminūtes laikā. Nevienu nav jāpievieno manuāli.',
      teamName: 'Komandas nosaukums',
      teamNamePlaceholder: 'Piemēram: RFS U17',
      createTeam: 'Izveidot komandu',
      creating: 'Veidoju…',
      addTeam: 'Vēl viena komanda',
      cancel: 'Atcelt',
      members: (n) => {
        if (n === 0) return 'Vēl neviens nav pievienojies';
        return `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'sportists' : 'sportisti'}`;
      },
      scanHint: 'Notēmē telefona kameru uz kodu',
      codeLabel: 'Kods',
      copyLink: 'Kopēt saiti',
      copied: 'Nokopēts',
      fullscreen: 'Pilnekrāns',
      close: 'Aizvērt',
      accepting: 'Pieteikšanās komandā',
      acceptingOn: 'Atvērta',
      acceptingOff: 'Slēgta — ar kodu pievienoties nevar',
      newCode: 'Jauns kods',
      newCodeConfirm: 'Vecais QR kods uzreiz pārstās darboties. Jau pievienojušies paliks komandā.',
      confirm: 'Izveidot jaunu kodu',
      errCreate: 'Neizdevās izveidot komandu. Mēģini vēlreiz.',
      errAction: 'Neizdevās saglabāt. Mēģini vēlreiz.',
      cardTitle: 'Mana komanda',
      cardNone: 'Tu vēl neesi komandā. Noskenē trenera QR kodu vai ievadi kodu zemāk — tas aizņems pusminūti.',
      cardLabel: (label) => `Trenerim tu esi parakstīts kā «${label}»`,
      cardCoachSees: 'Treneris redz tavas pārbaudes, treniņus un gatavības statusu.',
      leave: 'Izstāties no komandas',
      leaveConfirm: (team) => `Izstāties no «${team}»? Treneris vairs neredzēs tavus datus.`,
      errLeave: 'Neizdevās izstāties no komandas. Mēģini vēlreiz.',
      codeEntryLabel: 'Ir kods no trenera?',
      codeEntryButton: 'Pievienoties',
      codeEntryInvalid: 'Kods — 8 rakstzīmes, piemēram, MS49-U5P4.',
      errDemoAccount: 'Šis ir demo konts: no demo nevar pievienoties īstām komandām.',
      errDemoTeam: 'Šī ir demonstrācijas komanda — tai nevar pievienoties. Palūdz savam trenerim īsto kodu.',
    },
    demo: {
      title: 'CloudPulse demo',
      subtitle: 'Izmēģiniet lietotni jebkurā lomā — ar vienu klikšķi, bez reģistrācijas.',
      note: 'Visi cilvēki un dati šeit ir izdomāti. Demo dati tiek atiestatīti katru dienu un ar pogu «Atiestatīt demo» — droši spiediet jebko.',
      athleteTitle: 'Sportists',
      athleteDesc: '«Slēptā trauma»: sāp celis, bet rīt ir spēle. Apskatiet, kā Safety Guard bloķē slodzi un izsniedz caurlaidi ar QR kodu.',
      coachTitle: 'Treneris',
      coachDesc: 'Komanda no 4 sportistiem — no «zvaigznes riska zonā» līdz «iesācējam». Gatavība, ACWR un katra rezultāta iemesls.',
      parentTitle: 'Vecāks',
      parentDesc: 'Redz tikai dienas krāsu — un tikai tad, ja sportists pats to atļauj. Nekādu atbilžu par pašsajūtu.',
      enter: 'Ieiet',
      entering: 'Ieeju…',
      disabled: 'Demo režīms pašlaik ir izslēgts.',
      error: 'Neizdevās ieiet. Mēģiniet vēlreiz pēc minūtes.',
      realDataNote: 'Īsto testētāju dati ar demo nav saistīti un no šejienes nav pieejami.',
      bannerText: 'Demo režīms — visi dati ir izdomāti',
      reset: 'Atiestatīt demo',
      resetting: 'Atiestatu…',
      resetError: 'Neizdevās atiestatīt',
      switchRole: 'Mainīt lomu',
    },
    streak: {
      title: 'Pārbaužu sērija',
      days: (n) => `${n} ${lvDays(n)} pēc kārtas`,
      best: (n) => `Labākā sērija: ${n}`,
      doneToday: 'Šodien atzīmēts',
      keepGoing: 'Aizpildi pārbaudi šodien, lai sērija turpinātos',
      startNew: 'Sāc jaunu sēriju šodien',
      honesty: 'Tiek skaitīts pats pārbaudes fakts, nevis zonas krāsa. Godīgs «man ir slikti» skaitās tāpat kā zaļa diena.',
      last14: 'Pēdējās 14 dienas',
      dayDone: 'pārbaude ir',
      dayMissed: 'nav pārbaudes',
      teamTitle: 'Pārbaude šodien',
      teamCount: (done, total) => `${done} no ${total}`,
      teamAllDone: 'Visa komanda ir atzīmējusies',
      teamMissing: 'Vēl nav atzīmējušies:',
      teamHint: 'Tiek skaitīts tikai pārbaudes fakts, nevis rezultāts.',
      athleteStreak: (n) => `Pārbaužu sērija: ${n}`,
    },
    offline: {
      savedTitle: 'Saglabāts telefonā',
      savedBody: (date) =>
        `Internets šobrīd nav pieejams. Pārbaude par ${date} ir saglabāta un tiks nosūtīta pati, kad atkal atvērsi CloudPulse ar internetu.`,
      noScore: 'Gatavības novērtējumu dzinējs aprēķinās pēc nosūtīšanas: bez tavas vēstures no datubāzes mēs to neizdomājam.',
      painNote:
        'Tu atzīmēji sāpes. Netrenējies caur sāpēm un pasaki trenerim vai skolas medmāsai — šis noteikums darbojas arī bez interneta.',
      needLogin: 'Bez interneta pārbaudi var saglabāt tikai tad, ja šajā telefonā jau esi pieslēdzies savam kontam.',
      offlineBanner: 'Nav tīkla. Pārbaudi vari aizpildīt tāpat — tā saglabāsies telefonā.',
      pending: (n) => (n === 1 ? '1 pārbaude gaida nosūtīšanu' : `${n} pārbaudes gaida nosūtīšanu`),
      sendNow: 'Nosūtīt',
      sending: 'Sūtu…',
      synced: (n) => (n === 1 ? 'Bezsaistes pārbaude nosūtīta' : `Nosūtītas bezsaistes pārbaudes: ${n}`),
      expired: 'Pārbaude, kas vecāka par 7 dienām, netika nosūtīta — serveris tādas nepieņem.',
      installTitle: 'Uzstādi CloudPulse telefonā',
      installBody: 'Ikona sākuma ekrānā un pārbaude pat bez interneta.',
      installButton: 'Uzstādīt',
      installIos: 'Safari nospied «Kopīgot», tad «Pievienot sākuma ekrānam».',
      installClose: 'Aizvērt',
    },
    roster: {
      title: 'Pieteikums spēlei',
      basis: 'Pēc šodienas pārbaudēm. Tas ir dzinēja ieteikums — sastāvu izvēlas treneris.',
      nextMatch: (date, d) =>
        d === 0 ? `Spēle šodien, ${date}` : d === 1 ? `Spēle rīt, ${date}` : `Tuvākā spēle: ${date}, pēc ${d} ${lvDays(d)}`,
      noMatch: 'Komandas kalendārā spēle nav atrasta.',
      groups: {
        out: 'Nav pielaisti līdz apskatei',
        limited: 'Ar samazinātu slodzi',
        unknown: 'Šodien nav pārbaudes',
        available: 'Pieejami',
      },
      reasonPain: (zone) =>
        zone ? `Sāpes: ${zone} — vispirms ārsts, medmāsa vai fizioterapeits` : 'Sāpes — vispirms ārsts, medmāsa vai fizioterapeits',
      reasonLowReadiness: (score) => (score === null ? 'Sarkanā gatavības zona' : `Gatavība ${score} — sarkanā zona`),
      reasonLoadSpike: (acwr) => `Straujš slodzes pieaugums (ACWR ${acwr})`,
      reasonRtpRestricted: (n, req) => `Pēc sāpēm: bez sāpēm ${n} no ${req} dienām`,
      reasonRtpAwaiting: 'Bez sāpēm 2 dienas — gaida jūsu atļauju',
      reasonNoCheckin: 'Palūdziet aizpildīt pārbaudi',
      reasonNotComputed: 'Novērtējums vēl nav aprēķināts',
      reasonOk: (score) => (score === null ? 'Bez ierobežojumiem' : `Gatavība ${score}`),
      copy: 'Kopēt pieteikumu',
      copied: 'Nokopēts',
      shareHeader: (date) => `Pieteikums ${date}`,
      shareGroups: { out: 'Nav pieteikti', limited: 'Ar samazinātu slodzi', unknown: 'Nav datu', available: 'Pieejami' },
      empty: 'neviena',
    },
    storm: {
      title: 'Eksāmenu vētra',
      subtitle: 'Nākamās 2 nedēļas: cik sportistu ir kontroldarbu logā — kontroldarba diena un 3 dienas pirms tās.',
      fewer: '<3',
      legendStorm: (n) => `vētra — logā ir trešdaļa komandas vai vairāk (no ${n})`,
      legendMatch: 'spēle',
      none: 'Nākamajās 2 nedēļās komandai kontroldarbi nav atzīmēti.',
      noneHint: 'Sportisti pievieno kontroldarbus sadaļā «Kalendārs».',
      calm: 'Vētras nav: kontroldarbu logā vienlaikus ir mazāk nekā trešdaļa komandas.',
      stormLine: (range, peak, team) => `Vētra ${range}: kontroldarbu logā līdz ${peak} no ${team}.`,
      matchInStorm: (dates) => `Spēle vētras dienās: ${dates}.`,
      engineNote: 'Dzinējs jau samazina šiem sportistiem gatavības punktus par 15. Viegls treniņš vai pārcelšana — jūsu lēmums.',
      privacy: 'Tikai skaitļi, bez vārdiem. Mazāk par 3 precīzi nerādām — lai nevarētu uzminēt, par ko ir runa.',
      dayAria: (day, count, match) => `${day}: kontroldarbu logā ${count}${match ? ', spēle' : ''}`,
    },
    rtp: {
      title: 'Atgriešanās pēc sāpēm',
      painOn: (date, zone) => (zone ? `Sāpes ${date}: ${zone}` : `Sāpes ${date}`),
      cleanProgress: (n, req) => `Dienas bez sāpēm: ${Math.min(n, req)} no ${req}`,
      stepPain: 'Sāpes',
      stepClean: '2 dienas bez sāpēm',
      stepCoach: 'Trenera atļauja',
      stateRestricted: (req) => `Pagaidām bez pilnas slodzes. Vajag ${req} dienas ar aptauju bez sāpēm.`,
      stateReady: 'Sāpju nav 2 dienas. Pilnu slodzi apstiprina treneris.',
      stateCleared: (date) => `Treneris atļāva pilnu slodzi · ${date}`,
      noCheckinNote: 'Diena bez aptaujas netiek skaitīta kā diena bez sāpēm.',
      disclaimer: 'Tā nav medicīniska atļauja. Ja sāpes atgriezušās — ārsts, skolas medmāsa vai fizioterapeits.',
      followupTitle: (day) => (day === 1 ? 'Atkārtots jautājums: diena pēc sāpēm' : 'Atkārtots jautājums: trešā diena pēc sāpēm'),
      qTrend: (zone) => (zone ? `Kā ${zone} jūtas tagad, salīdzinot ar sāpju dienu?` : 'Kā ir tagad, salīdzinot ar sāpju dienu?'),
      trend: { better: 'Labāk', same: 'Tāpat', worse: 'Sliktāk' },
      qSpecialist: 'Vai tevi apskatīja ārsts, skolas medmāsa vai fizioterapeits?',
      yes: 'Jā',
      notYet: 'Vēl nē',
      send: 'Nosūtīt',
      sendError: 'Neizdevās nosūtīt. Pārbaudi internetu un mēģini vēlreiz.',
      worseNote: 'Ja kļuvis sliktāk — parādies ārstam, skolas medmāsai vai fizioterapeitam un atzīmē sāpes aptaujā.',
      coachTitle: 'Atgriešanās pēc sāpēm',
      coachHint: 'Kuri nesen atzīmēja sāpes. Pilnu slodzi atļaujat jūs — pēc 2 dienām bez sāpēm.',
      coachRestricted: (n, req) => `Bez sāpēm ${n} no ${req} dienām — vēl par agru`,
      coachReady: 'Bez sāpēm 2 dienas — gaida jūsu atļauju',
      coachCleared: (time) => `Jūs atļāvāt · ${time}`,
      answerLine: (day, trend, seen) =>
        `${day}. diena: ${trend.toLowerCase()} · ${seen ? 'apskatīja speciālists' : 'speciālists neapskatīja'}`,
      noAnswers: 'Atbilžu uz atkārtoto jautājumu vēl nav',
      clearButton: 'Atļaut pilnu slodzi',
      clearConfirm: 'Apstiprinu: runāju ar sportistu, sāpju nav. Tā nav medicīniska atļauja — šaubu gadījumā vispirms speciālists.',
      clearYes: 'Jā, atļaut',
      cancel: 'Atcelt',
      clearError: 'Neizdevās. Atjaunojiet lapu — iespējams, sportists atkal atzīmēja sāpes.',
      coachBasis: 'Poga parādās tikai pēc 2 dienām ar aptauju bez sāpēm — to pārbauda datubāze, nevis pārlūks.',
    },
    alerts: {
      title: 'Trauksmes',
      live: 'Tiešsaistē — signāls pienāks uzreiz',
      polling: 'Pārbaudām ik pēc 10 sekundēm',
      soundOn: 'Skaņa ieslēgta',
      soundOff: 'Ieslēgt skaņu',
      soundHint: 'Pārlūks neļauj vietnei atskaņot skaņu bez pieskāriena — ieslēdziet to vienreiz šajā ierīcē.',
      none: 'Trauksmju nav. Ja sportists atzīmēs sāpes vai nonāks sarkanajā zonā, šeit parādīsies signāls.',
      kindPain: (zone) => (zone ? `Sāpes: ${zone}` : 'Atzīmētas sāpes'),
      kindRed: (score) => (score === null ? 'Gatavība sarkanajā zonā' : `Gatavība ${score} — sarkanā zona`),
      yesterdayAt: (time) => `vakar, ${time}`,
      react: { contact: 'Redzēju, sazināšos', rest: 'Šodien atpūta', specialist: 'Pie ārsta vai fizioterapeita' },
      reactError: 'Atbildi neizdevās nosūtīt. Pārbaudiet internetu un mēģiniet vēlreiz.',
      answeredTitle: 'Atbildēts',
      basis:
        'Signāls nav diagnoze. Sportists redz jūsu atbildi. Par slodzi lemj treneris, sāpju gadījumā — ārsts, medmāsa vai fizioterapeits.',
      replyWaitingTitle: 'Treneris saņēma signālu',
      replyWaiting: (kind) =>
        kind === 'pain'
          ? 'Atzīmētas sāpes — treneris to jau redz. Viņa atbilde parādīsies šeit.'
          : 'Gatavība sarkanajā zonā — treneris to jau redz. Viņa atbilde parādīsies šeit.',
      replyTitle: (time) => `Trenera atbilde · ${time}`,
      reply: {
        contact: 'Redzēju. Sazināšos ar tevi.',
        rest: 'Šodien — atpūta, bez treniņa.',
        specialist: 'Parādies ārstam, skolas medmāsai vai fizioterapeitam.',
      },
    },
    engine: {
      penaltyAcwrSpike: (acwr) => `ACWR ${acwr} — straujš slodzes lēciens (traumas risks)`,
      penaltyAcwrRising: (acwr) => `ACWR ${acwr} — slodze pieaug straujāk nekā parasti`,
      penaltyAcwrLow: (acwr) => `ACWR ${acwr} — slodze manāmi zemāka nekā parasti`,
      penaltyWellnessWorse: (score, baseline) => `Pašsajūta sliktāka nekā parasti (indekss ${score} pret bāzi ${baseline})`,
      penaltyNoRestStreak: (days) => `${days} dienas pēc kārtas bez atpūtas`,
      penaltyExamSoon: 'Eksāmens tuvāko 3 dienu laikā',
      penaltyMonotonyHigh: (value) => `Vienmuļa slodze (monotonija ${value})`,
      violationPain: (zone) =>
        `Ziņots par sāpēm${zone ? ` (zona: ${zone})` : ''}. Spēka un augstas intensitātes vingrinājumi šodien ir bloķēti. Ieteikums: dodies pie ārsta, skolas medmāsas vai fizioterapeita — nemini pats.`,
      violationMatchDay: 'Šodien ir spēles diena — tikai aktivizācija un viegla iesildīšanās, bez spēka darba.',
      violationPreMatch: 'Rīt spēle — smags spēka darbs un augstas intensitātes intervāli aizliegti, tikai tehnika un neliels apjoms.',
      violationPostMatch: 'Vakar bija spēle — šodien atveseļošanās (stiepšanās, viegls kardio), ne spēka treniņš.',
      inconsistencyFatigueVsAcwr: (fatigue, acwr) =>
        `Pašnovērtētais nogurums zems (${fatigue}/7 = "gandrīz svaigs"), bet ACWR = ${acwr} — akūtā slodze strauji augstāka nekā parasti.`,
      inconsistencyFatigueVsStreak: (streak) => `Pašnovērtētais nogurums zems, bet šī ir ${streak}. diena pēc kārtas bez atpūtas.`,
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
      sorenessMapToggle: 'Mark tight muscles (optional)',
      sorenessMapHint: 'Only you see this map. The AI coach uses it to give a tight muscle gentle work only. It does not change your readiness score.',
      sorenessMapNotSaved: 'Check-in saved, but the muscle map was not. Try marking it again later.',
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
        `${n} ${n === 1 ? 'day' : 'days'} in a row with a check-in — great habit. Honest answers make the score more accurate.`,
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
      streak: 'Days without rest',
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
      dirRtp: (n, req) =>
        `Return after pain: ${n} of ${req} days without pain. Full load only after your coach confirms.`,
      dirRtpAwaiting: 'No pain for 2 days. Full load after your coach confirms.',
      rRtp: 'After a health break: no full load until the coach confirms',
      rRtpAwaiting: 'After a health break: waiting for the coach to confirm',
      verifyNote: "Status calculated by CloudPulse from the athlete's daily check-in. No health details are disclosed.",
    },
    coach: {
      navLabel: 'Coach',
      title: 'Coach panel',
      subtitle: "Your team's athlete readiness",
      emptyTitle: 'No athletes linked yet',
      emptyBody:
        'Create a team above and show your athletes the QR code — as soon as someone joins, they will appear here.',
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
    parent: {
      navLabel: 'Parents',
      title: 'Parent view',
      subtitle: 'Status, week and calendar — only what your child has chosen to share.',
      loading: 'Loading...',
      errLoad: 'Could not load the status.',
      empty: 'No athlete is linked to your account yet. The school or coach creates the link.',
      athleteFallback: 'Athlete',
      noConsentTitle: 'Access closed',
      noConsentBody: (name) =>
        `${name} hasn't shared their status yet. They can turn it on in the CloudPulse app, under "Progress".`,
      noCheckin: 'No check-in yet today.',
      statusGreen: 'Ready to train',
      statusYellow: 'Better to train lighter',
      statusRed: 'Needs an easy day today',
      restricted: 'Heavy training is restricted today. The athlete and coach know the details.',
      todayLabel: 'Today',
      privacyTitle: 'What you can see',
      privacyBody:
        "The colour of each day this week, restrictions and the coach's reply — if your child has opened access. Exam and match dates — only with a separate permission. Answers about sleep, stress and pain, scores and training stay with the athlete: that's how GDPR protects minors' health data.",
      weekTitle: 'Last 7 days',
      weekCount: (n, total) => `Check-in: ${n} of ${total} days`,
      weekNoCheckin: 'no check-in',
      coachWaiting: 'The coach got a signal today and will reply soon.',
      coachAnswered: (time) => `Coach replied · ${time}`,
      coachReply: {
        contact: 'The coach will get in touch with your child.',
        rest: 'Rest today — no training.',
        specialist: 'See a doctor, the school nurse or a physio.',
      },
      calendarTitle: 'Next 2 weeks',
      calendarLocked: (name) => `${name} hasn't shared the exam and match calendar yet. It can be turned on in the Progress section.`,
      calendarEmpty: 'No exams or matches marked for the next 2 weeks.',
      examOn: (date) => `Exam — ${date}`,
      matchOn: (date) => `Match — ${date}`,
      legendExam: 'exam',
      legendMatch: 'match',
      legendWindow: 'days before an exam',
      tightLine: (range) => `Busy stretch: ${range} — an exam and a match back to back.`,
      dayAria: (day, exam, match, window) =>
        [day, exam ? 'exam' : null, match ? 'match' : null, !exam && window ? 'before an exam' : null].filter(Boolean).join(', '),
      tipsTitle: 'What can help at home',
      tips: {
        RED_TODAY:
          'Red day today: better no extra load at home — no runs, gym or clubs. If something hurts — a doctor, the school nurse or a physio.',
        EXAM_AND_MATCH_CLOSE: 'An exam and a match back to back — help keep those evenings free of extra tasks.',
        MATCH_TODAY: 'Match today: a calm evening afterwards and the usual bedtime.',
        EXAM_TOMORROW: 'Exam tomorrow — the usual bedtime helps more than studying late.',
        MATCH_TOMORROW: 'Match tomorrow — an early night and the kit packed the evening before.',
        BUSY_WEEK: 'Several exams this week: the app already lowers the sports load, a steady sleep routine helps at home.',
      },
    },
    consent: {
      title: 'Parent access',
      body: (parent) =>
        `${parent} will see the colour of your days this week, whether there are restrictions and the coach's reply to a signal. Your wellness answers, pain and scores stay with you.`,
      colorTitle: 'Colour of the day',
      calendarTitle: 'Calendar: exams and matches',
      calendarBody: (parent) => `${parent} will see the dates of your exams and matches for the next 2 weeks — no subjects, no grades.`,
      on: 'Access on',
      off: 'Access off',
      changed: (date) => `Changed ${date}`,
      parentFallback: 'Parent',
      errSave: 'Could not save. Try again.',
    },
    invite: {
      joinTitle: 'Team invitation',
      joinSubtitle: 'Your coach is inviting you to CloudPulse',
      checking: 'Checking the invitation…',
      teamLabel: 'Team',
      signInToJoin: 'To join, sign in or create an account — it takes a minute.',
      createAccount: 'Create account',
      signIn: 'I already have an account',
      signedInAs: (email) => `Signed in as ${email}`,
      switchAccount: 'Switch account',
      labelField: 'How your coach should see your name',
      labelPlaceholder: 'e.g. Max K.',
      labelHint: 'A name or nickname — only your coach sees it.',
      coachSeesTitle: 'What your coach will see',
      coachSees: [
        'Your readiness score and zone for the day',
        'Check-in answers: sleep, stress, fatigue, soreness, pain',
        'Training sessions, exam and match dates',
        'Profile: age, sport, past injuries',
      ],
      leaveHint: 'You can leave the team any time under “Progress” — your coach loses access immediately.',
      agree: 'Got it, I agree',
      join: 'Join the team',
      joining: 'Joining…',
      joinedTitle: (team) => `You're in “${team}”!`,
      joinedBody: 'Your coach can already see you on the roster. Every check-in helps them spot overload in time.',
      alreadyMember: (team) => `You're already on “${team}”.`,
      continue: 'Continue',
      errInvalid: 'This invitation is no longer valid: the code has changed or the coach closed sign-ups. Ask your coach for a new QR code.',
      errNotAthlete: 'Only an athlete account can join a team. You are signed in as a coach or parent.',
      errOwnTeam: "This is your own team — you don't need to join it.",
      errLabel: 'Enter the name your coach should see (up to 40 characters).',
      errGeneric: 'Something went wrong. Check your connection and try again.',
      panelTitle: 'Teams & invitations',
      panelHint: 'Show the QR code to your team — athletes join on their own in 30 seconds. No manual setup needed.',
      teamName: 'Team name',
      teamNamePlaceholder: 'e.g. RFS U17',
      createTeam: 'Create team',
      creating: 'Creating…',
      addTeam: 'Another team',
      cancel: 'Cancel',
      members: (n) => (n === 0 ? 'No one has joined yet' : `${n} athlete${n === 1 ? '' : 's'}`),
      scanHint: 'Point a phone camera at the code',
      codeLabel: 'Code',
      copyLink: 'Copy link',
      copied: 'Copied',
      fullscreen: 'Full screen',
      close: 'Close',
      accepting: 'Accepting new members',
      acceptingOn: 'Open',
      acceptingOff: 'Closed — the code cannot be used',
      newCode: 'New code',
      newCodeConfirm: 'The old QR code will stop working immediately. Athletes who already joined stay on the team.',
      confirm: 'Create new code',
      errCreate: 'Could not create the team. Try again.',
      errAction: 'Could not save. Try again.',
      cardTitle: 'My team',
      cardNone: "You're not on a team yet. Scan your coach's QR code or enter the code below — it takes 30 seconds.",
      cardLabel: (label) => `Your coach sees you as “${label}”`,
      cardCoachSees: 'Your coach sees your check-ins, training sessions and readiness status.',
      leave: 'Leave team',
      leaveConfirm: (team) => `Leave “${team}”? Your coach will no longer see your data.`,
      errLeave: 'Could not leave the team. Try again.',
      codeEntryLabel: 'Got a code from your coach?',
      codeEntryButton: 'Join',
      codeEntryInvalid: 'The code is 8 characters, e.g. MS49-U5P4.',
      errDemoAccount: 'This is a demo account: it can’t join real teams.',
      errDemoTeam: 'This is a demo team — it can’t be joined. Ask your coach for the real code.',
    },
    demo: {
      title: 'CloudPulse demo',
      subtitle: 'Try the app in any role — one click, no sign-up.',
      note: 'Every person and number here is made up. Demo data resets every day and with the “Reset demo” button — click anything you like.',
      athleteTitle: 'Athlete',
      athleteDesc: '“Hidden injury”: knee pain and a match tomorrow. See Safety Guard block heavy training and issue a pass with a QR code.',
      coachTitle: 'Coach',
      coachDesc: 'A team of 4 athletes — from “star at risk” to “rookie”. Readiness, ACWR and the reason behind every score.',
      parentTitle: 'Parent',
      parentDesc: 'Sees only the colour of the day — and only if the athlete allows it. No wellness answers.',
      enter: 'Enter',
      entering: 'Signing in…',
      disabled: 'Demo mode is currently switched off.',
      error: 'Could not sign in. Try again in a minute.',
      realDataNote: 'Real testers’ data is separate from the demo and cannot be reached from here.',
      bannerText: 'Demo mode — all data is made up',
      reset: 'Reset demo',
      resetting: 'Resetting…',
      resetError: 'Reset failed',
      switchRole: 'Switch role',
    },
    streak: {
      title: 'Check-in streak',
      days: (n) => `${n} ${n === 1 ? 'day' : 'days'} in a row`,
      best: (n) => `Best streak: ${n}`,
      doneToday: 'Done today',
      keepGoing: 'Check in today to keep it going',
      startNew: 'Start a new streak today',
      honesty: 'Only the check-in itself counts, not the zone colour. An honest "I feel bad" counts the same as a green day.',
      last14: 'Last 14 days',
      dayDone: 'checked in',
      dayMissed: 'no check-in',
      teamTitle: 'Checked in today',
      teamCount: (done, total) => `${done} of ${total}`,
      teamAllDone: 'The whole team has checked in',
      teamMissing: 'Not yet:',
      teamHint: 'Counts the check-in itself, not the result.',
      athleteStreak: (n) => `Check-in streak: ${n}`,
    },
    offline: {
      savedTitle: 'Saved on your phone',
      savedBody: (date) =>
        `You're offline. Your check-in for ${date} is saved and will be sent automatically the next time you open CloudPulse with internet.`,
      noScore: "The engine calculates your readiness score once it's sent: without your history from the database, we don't make one up.",
      painNote:
        "You reported pain. Don't train through pain, and tell your coach or the school nurse — this rule works without internet too.",
      needLogin: 'Offline check-ins can only be saved if you have already signed in on this phone.',
      offlineBanner: "You're offline. You can still fill in your check-in — it will be saved on your phone.",
      pending: (n) => (n === 1 ? '1 check-in waiting to be sent' : `${n} check-ins waiting to be sent`),
      sendNow: 'Send',
      sending: 'Sending…',
      synced: (n) => (n === 1 ? 'Offline check-in sent' : `Offline check-ins sent: ${n}`),
      expired: "A check-in older than 7 days was not sent — the server doesn't accept those.",
      installTitle: 'Install CloudPulse on your phone',
      installBody: 'An icon on your home screen and check-ins even without internet.',
      installButton: 'Install',
      installIos: 'In Safari, tap Share, then "Add to Home Screen".',
      installClose: 'Close',
    },
    roster: {
      title: 'Match squad',
      basis: "From today's check-ins. This is the engine's suggestion — the coach picks the team.",
      nextMatch: (date, d) =>
        d === 0 ? `Match today, ${date}` : d === 1 ? `Match tomorrow, ${date}` : `Next match: ${date}, in ${d} days`,
      noMatch: 'No match found in the team calendar.',
      groups: {
        out: 'Not selected until examined',
        limited: 'Reduced load',
        unknown: 'No check-in today',
        available: 'Available',
      },
      reasonPain: (zone) =>
        zone ? `Pain: ${zone} — see a doctor, nurse or physio first` : 'Pain — see a doctor, nurse or physio first',
      reasonLowReadiness: (score) => (score === null ? 'Readiness in the red zone' : `Readiness ${score} — red zone`),
      reasonLoadSpike: (acwr) => `Sharp load increase (ACWR ${acwr})`,
      reasonRtpRestricted: (n, req) => `After pain: ${n} of ${req} days without pain`,
      reasonRtpAwaiting: 'No pain for 2 days — waiting for your OK',
      reasonNoCheckin: 'Ask them to check in',
      reasonNotComputed: 'Score not calculated yet',
      reasonOk: (score) => (score === null ? 'No restrictions' : `Readiness ${score}`),
      copy: 'Copy squad',
      copied: 'Copied',
      shareHeader: (date) => `Squad for ${date}`,
      shareGroups: { out: 'Not selected', limited: 'Reduced load', unknown: 'No data', available: 'Available' },
      empty: 'nobody',
    },
    storm: {
      title: 'Exam storm',
      subtitle: 'Next 2 weeks: how many athletes are in their exam window — the exam day and the 3 days before it.',
      fewer: '<3',
      legendStorm: (n) => `storm — a third of the team or more in the window (from ${n})`,
      legendMatch: 'match',
      none: 'No exams marked for the team in the next 2 weeks.',
      noneHint: 'Athletes add exams in the Calendar section.',
      calm: 'No storm: fewer than a third of the team is in an exam window at the same time.',
      stormLine: (range, peak, team) => `Storm ${range}: up to ${peak} of ${team} in the exam window.`,
      matchInStorm: (dates) => `Match during the storm: ${dates}.`,
      engineNote: 'The engine already takes 15 points off these athletes’ readiness. A lighter session or moving it — your call.',
      privacy: 'Numbers only, no names. Counts below 3 are never shown exactly, so no one can guess who it is.',
      dayAria: (day, count, match) => `${day}: ${count} in the exam window${match ? ', match' : ''}`,
    },
    rtp: {
      title: 'Return after pain',
      painOn: (date, zone) => (zone ? `Pain on ${date}: ${zone}` : `Pain on ${date}`),
      cleanProgress: (n, req) => `Days without pain: ${Math.min(n, req)} of ${req}`,
      stepPain: 'Pain',
      stepClean: '2 days without pain',
      stepCoach: 'Coach confirms',
      stateRestricted: (req) => `No full load yet. You need ${req} check-in days without pain.`,
      stateReady: 'No pain for 2 days. Your coach confirms full load.',
      stateCleared: (date) => `Your coach cleared you for full load · ${date}`,
      noCheckinNote: 'A day without a check-in does not count as a day without pain.',
      disclaimer: 'This is not a medical clearance. If the pain comes back — a doctor, the school nurse or a physio.',
      followupTitle: (day) => (day === 1 ? 'Follow-up: the day after the pain' : 'Follow-up: day 3 after the pain'),
      qTrend: (zone) => (zone ? `How is your ${zone} now compared with the day of pain?` : 'How is it now compared with the day of pain?'),
      trend: { better: 'Better', same: 'The same', worse: 'Worse' },
      qSpecialist: 'Has a doctor, the school nurse or a physio looked at it?',
      yes: 'Yes',
      notYet: 'Not yet',
      send: 'Send',
      sendError: "Couldn't send. Check the connection and try again.",
      worseNote: 'If it got worse — see a doctor, the school nurse or a physio, and mark pain in your check-in.',
      coachTitle: 'Return after pain',
      coachHint: 'Athletes who reported pain recently. You allow full load — after 2 days without pain.',
      coachRestricted: (n, req) => `${n} of ${req} days without pain — too early`,
      coachReady: 'No pain for 2 days — waiting for your OK',
      coachCleared: (time) => `Cleared by you · ${time}`,
      answerLine: (day, trend, seen) =>
        `Day ${day}: ${trend.toLowerCase()} · ${seen ? 'seen by a specialist' : 'not seen by a specialist'}`,
      noAnswers: 'No follow-up answers yet',
      clearButton: 'Allow full load',
      clearConfirm: 'I confirm: I talked to the athlete and there is no pain. This is not a medical clearance — if in doubt, a specialist first.',
      clearYes: 'Yes, allow',
      cancel: 'Cancel',
      clearError: 'That didn’t work. Refresh the page — the athlete may have reported pain again.',
      coachBasis: 'The button appears only after 2 check-in days without pain — the database checks this, not the browser.',
    },
    alerts: {
      title: 'Alerts',
      live: 'Live — alerts arrive instantly',
      polling: 'Checking every 10 seconds',
      soundOn: 'Sound on',
      soundOff: 'Turn on sound',
      soundHint: 'Browsers block sound until you tap — turn it on once on this device.',
      none: 'No alerts. If an athlete reports pain or lands in the red zone, a signal will appear here.',
      kindPain: (zone) => (zone ? `Pain: ${zone}` : 'Reported pain'),
      kindRed: (score) => (score === null ? 'Red readiness zone' : `Readiness ${score} — red zone`),
      yesterdayAt: (time) => `yesterday, ${time}`,
      react: { contact: 'Seen, will contact', rest: 'Rest today', specialist: 'See a doctor or physio' },
      reactError: "Couldn't send the answer. Check the connection and tap again.",
      answeredTitle: 'Answered',
      basis:
        'A signal is not a diagnosis. The athlete sees your answer. Training load is the coach’s call; with pain, a doctor, nurse or physio decides.',
      replyWaitingTitle: 'Your coach has been notified',
      replyWaiting: (kind) =>
        kind === 'pain'
          ? 'Pain reported — your coach can already see it. Their answer will appear here.'
          : 'Readiness in the red zone — your coach can already see it. Their answer will appear here.',
      replyTitle: (time) => `Coach replied · ${time}`,
      reply: {
        contact: 'Seen. I’ll get in touch with you.',
        rest: 'Rest today — no training.',
        specialist: 'Please see a doctor, the school nurse or a physio.',
      },
    },
    engine: {
      penaltyAcwrSpike: (acwr) => `ACWR ${acwr} — sharp load spike (injury risk)`,
      penaltyAcwrRising: (acwr) => `ACWR ${acwr} — load rising faster than usual`,
      penaltyAcwrLow: (acwr) => `ACWR ${acwr} — load noticeably below usual`,
      penaltyWellnessWorse: (score, baseline) => `Feeling worse than usual (index ${score} vs baseline ${baseline})`,
      penaltyNoRestStreak: (days) => `${days} days in a row without rest`,
      penaltyExamSoon: 'Exam within the next 3 days',
      penaltyMonotonyHigh: (value) => `Monotonous load (monotony ${value})`,
      violationPain: (zone) =>
        `Pain reported${zone ? ` (area: ${zone})` : ''}. Strength and high-intensity exercise is blocked for today. Recommendation: see a doctor, school nurse or physiotherapist — don't guess on your own.`,
      violationMatchDay: "Today is match day — activation and light warm-up only, no strength work.",
      violationPreMatch: 'Match tomorrow — heavy strength and high-intensity intervals are off-limits, technique and light volume only.',
      violationPostMatch: 'There was a match yesterday — today is recovery (stretching, light cardio), not strength.',
      inconsistencyFatigueVsAcwr: (fatigue, acwr) =>
        `Self-reported fatigue is low (${fatigue}/7 = "almost fresh"), but ACWR = ${acwr} — acute load is sharply above usual.`,
      inconsistencyFatigueVsStreak: (streak) => `Self-reported fatigue is low, but this is day ${streak} in a row without rest.`,
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
