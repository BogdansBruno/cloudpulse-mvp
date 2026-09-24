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
    welcome: string;
    placeholder: string;
    send: string;
    addToCalendar: string;
    connectionError: string;
    genericError: string;
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
  };
  onboarding: {
    title: string;
    subtitle: string;
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
      welcome:
        '👋 Привет! Я CloudPulse — твой AI-коуч. Составим классный план тренировок?\n\nРасскажи о своих целях, любимых видах спорта, или спроси что угодно про тренировки, восстановление и активность!',
      placeholder: 'Спроси о тренировках, целях, восстановлении...',
      send: 'Отправить',
      addToCalendar: 'Добавить в календарь',
      connectionError: 'Проблема с подключением. Проверь интернет и попробуй снова.',
      genericError: 'Что-то пошло не так. Попробуй ещё раз.',
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
    },
    onboarding: { title: 'Настроим твой профиль', subtitle: 'CloudPulse' },
    common: { loading: 'Загружаю…' },
  },
  lv: {
    nav: { brand: 'CloudPulse', chat: 'Tērzēšana', checkin: 'Pārbaude', progress: 'Progress', signOut: 'Iziet' },
    chat: {
      title: 'CloudPulse Coach',
      subtitle: 'Tavs AI treniņu partneris',
      welcome:
        '👋 Sveiks! Es esmu CloudPulse — tavs AI treneris. Izveidosim lielisku treniņu plānu?\n\nPastāsti par saviem mērķiem, iecienītākajiem sporta veidiem, vai jautā jebko par treniņiem, atveseļošanos un aktivitāti!',
      placeholder: 'Jautā par treniņiem, mērķiem, atveseļošanos...',
      send: 'Sūtīt',
      addToCalendar: 'Pievienot kalendāram',
      connectionError: 'Savienojuma problēma. Pārbaudi internetu un mēģini vēlreiz.',
      genericError: 'Kaut kas nogāja greizi. Mēģini vēlreiz.',
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
    },
    onboarding: { title: 'Iestatīsim tavu profilu', subtitle: 'CloudPulse' },
    common: { loading: 'Ielādē…' },
  },
  en: {
    nav: { brand: 'CloudPulse', chat: 'Chat', checkin: 'Check-in', progress: 'Progress', signOut: 'Sign out' },
    chat: {
      title: 'CloudPulse Coach',
      subtitle: 'Your AI fitness partner for better training',
      welcome:
        "👋 Hey! I'm CloudPulse, your AI fitness coach. Ready to build an awesome training plan?\n\nTell me about your fitness goals, what sports you like, or ask me anything about training, recovery, or staying active!",
      placeholder: 'Ask anything about your training, goals, recovery...',
      send: 'Send',
      addToCalendar: 'Add to Calendar',
      connectionError: 'Connection problem. Check your internet and try again.',
      genericError: 'Something went wrong. Try again.',
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
    },
    onboarding: { title: "Let's set up your profile", subtitle: 'CloudPulse' },
    common: { loading: 'Loading…' },
  },
};
