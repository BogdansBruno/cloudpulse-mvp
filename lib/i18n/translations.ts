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
  common: {
    loading: string;
  };
};

export const translations: Record<Lang, Dict> = {
  ru: {
    nav: { brand: 'CloudPulse', chat: 'Чат', checkin: 'Чек-ин', progress: 'Прогресс', signOut: 'Выйти' },
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
    common: { loading: 'Загружаю…' },
  },
  lv: {
    nav: { brand: 'CloudPulse', chat: 'Tērzēšana', checkin: 'Pārbaude', progress: 'Progress', signOut: 'Iziet' },
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
    common: { loading: 'Ielādē…' },
  },
  en: {
    nav: { brand: 'CloudPulse', chat: 'Chat', checkin: 'Check-in', progress: 'Progress', signOut: 'Sign out' },
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
    common: { loading: 'Loading…' },
  },
};
