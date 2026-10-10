// lib/strain-copy.ts — texts of the overload signal (Today), the visible plan change (Today) and the War Room (/coach/war-room),
// RU / LV / EN. Rules: no percentages, no "injury probability", no medical advice. With pain the only line is
// "doctor, school nurse or physio decides" (roadmap rule 3). Every card says it is a rule, and that people decide.

import type { Lang } from '@/lib/i18n/translations';
import type { StrainFactor } from '@/lib/strain-signal';
import type { WarFilter, WarStatus } from '@/lib/war-room';

export type StrainCopy = {
  signal: {
    title: string;
    watch: string;
    high: string;
    spike: string;
    factors: Record<StrainFactor, string>;
    advice: { watch: string; high: string };
    coachLine: string;
    rule: string;
    painLine: string;
  };
  plan: {
    title: string;
    changed: string;
    to: string;
    why: string;
    open: string;
    limit: (minutes: number, rpe: number) => string;
  };
  war: {
    nav: string;
    title: string;
    subtitle: string;
    back: string;
    loading: string;
    error: string;
    empty: string;
    emptyFilter: string;
    filters: Record<WarFilter, string>;
    status: Record<WarStatus, string>;
    factors: Record<StrainFactor, string>;
    strainWatch: string;
    strainHigh: string;
    exam: (d: number) => string;
    painLine: string;
    askTitle: string;
    askBody: (n: number) => string;
    askNone: string;
    askButton: (n: number) => string;
    copied: string;
    message: string;
    rule: string;
    live: string;
  };
};

export const STRAIN: Record<Lang, StrainCopy> = {
  ru: {
    signal: {
      title: 'Сигнал перегрузки',
      watch: 'Совпало два фактора нагрузки',
      high: 'Совпало несколько факторов нагрузки',
      spike: 'Нагрузка резко выросла за последние дни',
      factors: {
        load: 'Нагрузка растёт быстрее привычной',
        wellness: 'Самочувствие хуже твоей обычной нормы',
        rest: 'Больше 6 дней подряд без отдыха',
        exam: 'Экзамен в ближайшие 3 дня',
        monotony: 'Нагрузка однообразная',
      },
      advice: {
        watch: 'Подумай о более лёгком дне. Если что-то непонятно, скажи тренеру.',
        high: 'Лучше облегчить сегодняшнюю нагрузку и сказать об этом тренеру.',
      },
      coachLine: 'Тренер видит команду в War Room.',
      rule: 'Это правило на данных приложения, а не прогноз травмы. Решаете вы с тренером.',
      painLine: 'Если есть боль: врач, школьная медсестра или физиотерапевт.',
    },
    plan: {
      title: 'План на сегодня изменён',
      changed: 'Готовность и нагрузка сегодня ниже обычного уровня, поэтому план стал мягче.',
      to: 'Сегодня',
      why: 'Почему',
      open: 'Открыть план',
      limit: (m, r) => `до ${m} мин, усилие до ${r}/10`,
    },
    war: {
      nav: 'War Room',
      title: 'War Room',
      subtitle: 'Вся команда на одном экране: цвет готовности, боль и сигнал перегрузки.',
      back: 'К странице тренера',
      loading: 'Загружаю команду…',
      error: 'Не удалось загрузить команду. Проверь соединение.',
      empty: 'В команде пока нет спортсменов.',
      emptyFilter: 'Под этот фильтр никого нет.',
      filters: { all: 'Все', pain: 'Боль', red: 'Красные', yellow: 'Жёлтые', strain: 'Сигнал', no_checkin: 'Без чек-ина' },
      status: { pain: 'Боль', red: 'Красная зона', yellow: 'Жёлтая зона', no_checkin: 'Нет данных', green: 'Зелёная зона' },
      factors: {
        load: 'нагрузка растёт',
        wellness: 'самочувствие',
        rest: 'без отдыха',
        exam: 'экзамен',
        monotony: 'однообразие',
      },
      strainWatch: 'Сигнал: наблюдать',
      strainHigh: 'Сигнал: облегчить',
      exam: (d) => (d === 0 ? 'экзамен сегодня' : d === 1 ? 'экзамен завтра' : `экзамен через ${d} дн.`),
      painLine: 'Решает врач, школьная медсестра или физиотерапевт.',
      askTitle: 'Спросить жёлтых',
      askBody: (n) => `Короткий вопрос ${n === 1 ? 'одному спортсмену' : `${n} спортсменам`} в жёлтой зоне. Решение о нагрузке остаётся за тобой.`,
      askNone: 'Сейчас в жёлтой зоне никого нет.',
      askButton: (n) => `Скопировать сообщение (${n})`,
      copied: 'Скопировано. Отправь в чат команды или лично.',
      message: 'Привет! По данным приложения сегодня у тебя жёлтая зона. Как самочувствие? Если тяжело, скажи, облегчим тренировку.',
      rule: 'Сигнал считается по правилам движка: ACWR, зона и экзамены. Это не диагноз и не прогноз.',
      live: 'Обновляется само',
    },
  },
  lv: {
    signal: {
      title: 'Pārslodzes signāls',
      watch: 'Sakrita divi slodzes faktori',
      high: 'Sakrita vairāki slodzes faktori',
      spike: 'Slodze pēdējās dienās strauji pieaugusi',
      factors: {
        load: 'Slodze aug straujāk nekā ierasti',
        wellness: 'Pašsajūta sliktāka nekā tavs ierastais līmenis',
        rest: 'Vairāk nekā 6 dienas pēc kārtas bez atpūtas',
        exam: 'Eksāmens tuvāko 3 dienu laikā',
        monotony: 'Slodze ir vienveidīga',
      },
      advice: {
        watch: 'Padomā par vieglāku dienu. Ja kaut kas nav skaidrs, pasaki treneram.',
        high: 'Labāk šodien samazināt slodzi un pastāstīt par to treneram.',
      },
      coachLine: 'Treneris redz komandu War Room skatā.',
      rule: 'Tas ir noteikums lietotnes datiem, nevis traumas prognoze. Lemj tu kopā ar treneri.',
      painLine: 'Ja ir sāpes: ārsts, skolas medmāsa vai fizioterapeits.',
    },
    plan: {
      title: 'Šodienas plāns mainīts',
      changed: 'Gatavība un slodze šodien ir zemāka par ierasto, tāpēc plāns kļuva maigāks.',
      to: 'Šodien',
      why: 'Kāpēc',
      open: 'Atvērt plānu',
      limit: (m, r) => `līdz ${m} min, piepūle līdz ${r}/10`,
    },
    war: {
      nav: 'War Room',
      title: 'War Room',
      subtitle: 'Visa komanda vienā ekrānā: gatavības krāsa, sāpes un pārslodzes signāls.',
      back: 'Uz trenera lapu',
      loading: 'Ielādēju komandu…',
      error: 'Neizdevās ielādēt komandu. Pārbaudi savienojumu.',
      empty: 'Komandā vēl nav sportistu.',
      emptyFilter: 'Šim filtram neviena nav.',
      filters: { all: 'Visi', pain: 'Sāpes', red: 'Sarkanie', yellow: 'Dzeltenie', strain: 'Signāls', no_checkin: 'Bez čeka' },
      status: { pain: 'Sāpes', red: 'Sarkanā zona', yellow: 'Dzeltenā zona', no_checkin: 'Nav datu', green: 'Zaļā zona' },
      factors: {
        load: 'slodze aug',
        wellness: 'pašsajūta',
        rest: 'bez atpūtas',
        exam: 'eksāmens',
        monotony: 'vienveidība',
      },
      strainWatch: 'Signāls: uzraudzīt',
      strainHigh: 'Signāls: atvieglot',
      exam: (d) => (d === 0 ? 'eksāmens šodien' : d === 1 ? 'eksāmens rīt' : `eksāmens pēc ${d} d.`),
      painLine: 'Lemj ārsts, skolas medmāsa vai fizioterapeits.',
      askTitle: 'Pajautāt dzeltenajiem',
      askBody: (n) => `Īss jautājums ${n === 1 ? 'vienam sportistam' : `${n} sportistiem`} dzeltenajā zonā. Lēmums par slodzi paliek tavs.`,
      askNone: 'Pašlaik dzeltenajā zonā neviena nav.',
      askButton: (n) => `Kopēt ziņu (${n})`,
      copied: 'Nokopēts. Nosūti komandas čatā vai personīgi.',
      message: 'Sveiki! Pēc lietotnes datiem šodien tev ir dzeltenā zona. Kā jūties? Ja ir grūti, pasaki, atvieglosim treniņu.',
      rule: 'Signāls tiek rēķināts pēc dzinēja noteikumiem: ACWR, zona un eksāmeni. Tā nav diagnoze vai prognoze.',
      live: 'Atjaunojas pats',
    },
  },
  en: {
    signal: {
      title: 'Overload signal',
      watch: 'Two load factors line up',
      high: 'Several load factors line up',
      spike: 'The load jumped sharply over the last days',
      factors: {
        load: 'Load is rising faster than usual',
        wellness: 'Wellness is worse than your usual level',
        rest: 'More than 6 training days in a row',
        exam: 'An exam in the next 3 days',
        monotony: 'The load is monotonous',
      },
      advice: {
        watch: 'Think about an easier day. If something is unclear, tell your coach.',
        high: 'It is better to ease today’s load and tell your coach.',
      },
      coachLine: 'Your coach sees the team in the War Room.',
      rule: 'This is a rule on the app’s data, not an injury forecast. You and your coach decide.',
      painLine: 'If you have pain: a doctor, the school nurse or a physio.',
    },
    plan: {
      title: 'Today’s plan was changed',
      changed: 'Readiness and load are below your usual level today, so the plan became gentler.',
      to: 'Today',
      why: 'Why',
      open: 'Open the plan',
      limit: (m, r) => `up to ${m} min, effort up to ${r}/10`,
    },
    war: {
      nav: 'War Room',
      title: 'War Room',
      subtitle: 'The whole team on one screen: readiness colour, pain and the overload signal.',
      back: 'Back to the coach page',
      loading: 'Loading the team…',
      error: 'Could not load the team. Check your connection.',
      empty: 'No athletes on the team yet.',
      emptyFilter: 'Nobody matches this filter.',
      filters: { all: 'All', pain: 'Pain', red: 'Red', yellow: 'Yellow', strain: 'Signal', no_checkin: 'No check-in' },
      status: { pain: 'Pain', red: 'Red zone', yellow: 'Yellow zone', no_checkin: 'No data', green: 'Green zone' },
      factors: {
        load: 'load rising',
        wellness: 'wellness',
        rest: 'no rest',
        exam: 'exam',
        monotony: 'monotony',
      },
      strainWatch: 'Signal: watch',
      strainHigh: 'Signal: ease off',
      exam: (d) => (d === 0 ? 'exam today' : d === 1 ? 'exam tomorrow' : `exam in ${d} days`),
      painLine: 'A doctor, the school nurse or a physio decides.',
      askTitle: 'Ask the yellows',
      askBody: (n) => `A short question to ${n === 1 ? '1 athlete' : `${n} athletes`} in the yellow zone. The load decision stays with you.`,
      askNone: 'Nobody is in the yellow zone right now.',
      askButton: (n) => `Copy the message (${n})`,
      copied: 'Copied. Send it to the team chat or personally.',
      message: 'Hi! The app shows a yellow zone for you today. How do you feel? If it is hard, tell me and we will ease the session.',
      rule: 'The signal follows the engine’s rules: ACWR, zone and exams. It is not a diagnosis or a forecast.',
      live: 'Updates by itself',
    },
  },
};
