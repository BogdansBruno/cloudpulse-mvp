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
    send: string;
    online: string;
    focusLabel: string;
    sidebarTitle: string;
    sidebarEmpty: string;
    codeCopy: string;
  };
};

export const APP: Record<Lang, AppCopy> = {
  ru: {
    shell: { main: 'Основное содержимое', mobileNav: 'Основная навигация', language: 'Язык', workout: 'Live', pro: 'Pro' },
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
      send: 'Отправить',
      online: 'AI-коуч',
      focusLabel: 'Фокус тренера',
      sidebarTitle: 'Сегодня',
      sidebarEmpty: 'Пройди чек-ин, и здесь появится твой балл.',
      codeCopy: 'Копировать',
    },
  },
  lv: {
    shell: { main: 'Galvenais saturs', mobileNav: 'Galvenā navigācija', language: 'Valoda', workout: 'Live', pro: 'Pro' },
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
      send: 'Sūtīt',
      online: 'AI treneris',
      focusLabel: 'Trenera fokuss',
      sidebarTitle: 'Šodien',
      sidebarEmpty: 'Aizpildi pārbaudi, un šeit parādīsies tavi punkti.',
      codeCopy: 'Kopēt',
    },
  },
  en: {
    shell: { main: 'Main content', mobileNav: 'Main navigation', language: 'Language', workout: 'Live', pro: 'Pro' },
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
      send: 'Send',
      online: 'AI coach',
      focusLabel: 'Coach focus',
      sidebarTitle: 'Today',
      sidebarEmpty: 'Do a check-in and your score shows up here.',
      codeCopy: 'Copy',
    },
  },
};
