// adp/src/design-explorer/feed/copy.ts
//
// Texts of the "Night Feed" direction (RU / LV / EN): the 3-tab phone shell
// and the time-of-day feed. Everything else comes from ../copy.ts and the
// product labels, so the numbers and rules read exactly like the real app.

import type { AdpLang } from '../../components/labels';

export type Daypart = 'morning' | 'day' | 'evening';

export type FeedCopy = {
  tabs: { today: string; body: string; pass: string };
  daypart: Record<Daypart, string>;
  greeting: Record<Daypart, string>;
  demoTime: string;
  score: string;
  mainReason: string;
  mini: { readiness: string; sleep: string; load: string };
  sleep: { title: string; body: string };
  load: { title: string; body: (acwr: string, state: string) => string };
  exam: { title: string; body: string };
  plan: { title: string; open: string; blocks: (n: number, min: number) => string };
  windDown: { title: string; body: string };
  passMini: { title: string; body: string };
  factors: string;
  howTitle: string;
  how: Record<Daypart, string>;
  howNote: string;
  /** Serif verdict of the readiness engine, by zone. */
  verdict: { green: string; yellow: string; red: string };
  chart: { title: string; caption: string; unit: string; today: string; usual: string; formula: string };
  scales: { title: string; legend: string; here: string; hooperNorm: (baseline: number) => string; better: string };
  tags: { inNorm: string; belowNorm: string; aboveNorm: string; outOfNorm: (n: number, total: number) => string; soon: string; limited: string };
  /** Safety Guard capsule: one line by zone + the main reason; details sit behind (i). */
  guard: { line: { green: string; yellow: string; red: string }; main: (reason: string) => string; info: string; hide: string; reasons: string };
  /** Vitals list: the norm under each slider. */
  norm: (range: string) => string;
  actions: { markedAll: string; editMap: string; markedToday: string; start: string; details: string; showPass: string; quickAdd: string };
  /** Plaque under a tapped muscle: what it means for today's training. */
  restriction: string;
};

/** Lower-case the first letter so a label reads inside a sentence (keeps "ACWR"). */
const lc = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

export const FEED: Record<AdpLang, FeedCopy> = {
  ru: {
    tabs: { today: 'Сегодня', body: 'Тело', pass: 'Допуск' },
    daypart: { morning: 'Утро', day: 'День', evening: 'Вечер' },
    greeting: { morning: 'Доброе утро', day: 'Добрый день', evening: 'Добрый вечер' },
    demoTime: 'Время суток (демо)',
    score: 'Готовность',
    mainReason: 'Главная причина',
    mini: { readiness: 'Готовность', sleep: 'Сон', load: 'Нагрузка' },
    sleep: { title: 'Сон этой ночью', body: 'Оценка из утреннего чек-ина. Если сон слабый, движок сам снижает потолок нагрузки.' },
    load: { title: 'Нагрузка за 4 недели', body: (a, s) => `ACWR ${a} — ${s}. Резкий рост нагрузки повышает риск травмы.` },
    exam: { title: 'Контрольная скоро', body: 'Движок уже снизил балл. Короткая тренировка поможет голове, но без рекордов.' },
    plan: { title: 'Тренировка на сегодня', open: 'Открыть план', blocks: (n, m) => `${n} блоков · ${m} мин` },
    windDown: { title: 'Перед сном', body: 'Отметь, какие мышцы забиты, — завтрашний план учтёт это. Сон — лучшее восстановление.' },
    passMini: { title: 'Safety Pass на завтра', body: 'Завтра матч — пропуск уже готов, покажи его учителю физкультуры.' },
    factors: 'Из чего сложился балл',
    howTitle: 'Как лента выбирает карточки',
    how: {
      morning: 'Сон, балл готовности и главная причина — чтобы спортсмен сразу понял, какой сегодня день.',
      day: 'Контрольные, тренировка по плану и Safety Pass перед матчем.',
      evening: 'Карта забитости и напоминание про сон — данные для завтрашнего плана.',
    },
    howNote: 'Лента не придумывает данные: каждая карточка берёт числа из чек-ина и движка готовности.',
    restriction: 'Ограничение на тренировку',
    guard: {
      line: { green: 'Нагрузка в пределах нормы — тренируйся по плану.', yellow: 'Сегодня без максимальных усилий.', red: 'Сегодня только восстановление.' },
      main: (r) => `Главное: ${lc(r)}.`,
      info: 'Как это проверено',
      hide: 'Скрыть',
      reasons: 'Что снизило балл',
    },
    norm: (r) => `норма ${r}`,
    tags: { inNorm: 'В норме', belowNorm: 'Ниже нормы', aboveNorm: 'Выше нормы', outOfNorm: (n, t) => `${n} из ${t} вне нормы`, soon: 'Скоро', limited: 'Ограничено' },
    actions: {
      markedAll: '✓ Всё отметил',
      editMap: '✎ Изменить карту',
      markedToday: 'Отмечено на сегодня — завтрашний план это учтёт.',
      start: '▶ Начать',
      details: 'Подробнее',
      showPass: 'Показать Safety Pass',
      quickAdd: 'Отметить самочувствие',
    },
    verdict: { green: 'Оптимальное состояние', yellow: 'Сегодня — день полегче', red: 'Сегодня — день восстановления' },
    chart: {
      title: 'Нагрузка за неделю',
      caption: 'Столбик — нагрузка за день, пунктир — твоя обычная за 4 недели.',
      unit: 'ед.',
      today: 'сегодня',
      usual: 'обычно',
      formula: 'Нагрузка = усилие (RPE) × минуты тренировки.',
    },
    scales: {
      title: 'Где ты сейчас',
      legend: 'Светлая зона — норма',
      here: 'ты сейчас здесь',
      hooperNorm: (b) => `норма — не выше твоей базы ${b}`,
      better: 'лучше →',
    },
  },
  lv: {
    tabs: { today: 'Šodien', body: 'Ķermenis', pass: 'Caurlaide' },
    daypart: { morning: 'Rīts', day: 'Diena', evening: 'Vakars' },
    greeting: { morning: 'Labrīt', day: 'Labdien', evening: 'Labvakar' },
    demoTime: 'Diennakts laiks (demo)',
    score: 'Gatavība',
    mainReason: 'Galvenais iemesls',
    mini: { readiness: 'Gatavība', sleep: 'Miegs', load: 'Slodze' },
    sleep: { title: 'Miegs šonakt', body: 'Vērtējums no rīta pieteikšanās. Ja miegs vājš, dzinējs pats samazina slodzes griestus.' },
    load: { title: 'Slodze 4 nedēļās', body: (a, s) => `ACWR ${a} — ${s}. Straujš slodzes pieaugums palielina traumu risku.` },
    exam: { title: 'Drīz kontroldarbs', body: 'Dzinējs jau samazināja punktus. Īss treniņš palīdzēs galvai, bet bez rekordiem.' },
    plan: { title: 'Šodienas treniņš', open: 'Atvērt plānu', blocks: (n, m) => `${n} bloki · ${m} min` },
    windDown: { title: 'Pirms miega', body: 'Atzīmē, kuri muskuļi ir noguruši, — rītdienas plāns to ņems vērā. Miegs ir labākā atjaunošanās.' },
    passMini: { title: 'Safety Pass rītdienai', body: 'Rīt spēle — caurlaide jau gatava, parādi to sporta skolotājam.' },
    factors: 'No kā veidojās punkti',
    howTitle: 'Kā lenta izvēlas kartītes',
    how: {
      morning: 'Miegs, gatavības punkti un galvenais iemesls — lai sportists uzreiz saprot, kāda ir diena.',
      day: 'Kontroldarbi, treniņš pēc plāna un Safety Pass pirms spēles.',
      evening: 'Noguruma karte un atgādinājums par miegu — dati rītdienas plānam.',
    },
    howNote: 'Lenta neizdomā datus: katra kartīte ņem skaitļus no pieteikšanās un gatavības dzinēja.',
    restriction: 'Ierobežojums treniņam',
    guard: {
      line: { green: 'Slodze normas robežās — trenējies pēc plāna.', yellow: 'Šodien bez maksimālas piepūles.', red: 'Šodien tikai atjaunošanās.' },
      main: (r) => `Galvenais: ${lc(r)}.`,
      info: 'Kā tas pārbaudīts',
      hide: 'Paslēpt',
      reasons: 'Kas samazināja punktus',
    },
    norm: (r) => `norma ${r}`,
    tags: { inNorm: 'Normā', belowNorm: 'Zem normas', aboveNorm: 'Virs normas', outOfNorm: (n, t) => `${n} no ${t} ārpus normas`, soon: 'Drīz', limited: 'Ierobežots' },
    actions: {
      markedAll: '✓ Viss atzīmēts',
      editMap: '✎ Mainīt karti',
      markedToday: 'Atzīmēts šodienai — rītdienas plāns to ņems vērā.',
      start: '▶ Sākt',
      details: 'Sīkāk',
      showPass: 'Parādīt Safety Pass',
      quickAdd: 'Atzīmēt pašsajūtu',
    },
    verdict: { green: 'Optimāls stāvoklis', yellow: 'Šodien — vieglāka diena', red: 'Šodien — atjaunošanās diena' },
    chart: {
      title: 'Slodze nedēļā',
      caption: 'Stabiņš — dienas slodze, svītrlīnija — tava parastā 4 nedēļās.',
      unit: 'v.',
      today: 'šodien',
      usual: 'parasti',
      formula: 'Slodze = piepūle (RPE) × treniņa minūtes.',
    },
    scales: {
      title: 'Kur tu esi tagad',
      legend: 'Gaišā zona — norma',
      here: 'tu esi šeit',
      hooperNorm: (b) => `norma — ne augstāk par tavu bāzi ${b}`,
      better: 'labāk →',
    },
  },
  en: {
    tabs: { today: 'Today', body: 'Body', pass: 'Pass' },
    daypart: { morning: 'Morning', day: 'Day', evening: 'Evening' },
    greeting: { morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening' },
    demoTime: 'Time of day (demo)',
    score: 'Readiness',
    mainReason: 'Main reason',
    mini: { readiness: 'Readiness', sleep: 'Sleep', load: 'Load' },
    sleep: { title: 'Last night’s sleep', body: 'Rated in the morning check-in. If sleep is poor, the engine lowers the load ceiling itself.' },
    load: { title: 'Load over 4 weeks', body: (a, s) => `ACWR ${a} — ${s}. A sharp rise in load raises injury risk.` },
    exam: { title: 'Exam coming up', body: 'The engine already lowered the score. A short session helps the head — no personal bests.' },
    plan: { title: 'Today’s session', open: 'Open plan', blocks: (n, m) => `${n} blocks · ${m} min` },
    windDown: { title: 'Before bed', body: 'Mark which muscles feel sore — tomorrow’s plan will use it. Sleep is the best recovery.' },
    passMini: { title: 'Safety Pass for tomorrow', body: 'Match tomorrow — the pass is ready, show it to your PE teacher.' },
    factors: 'What made the score',
    howTitle: 'How the feed picks cards',
    how: {
      morning: 'Sleep, the readiness score and the main reason — the athlete sees what kind of day it is.',
      day: 'Exams, the planned session and the Safety Pass before a match.',
      evening: 'The soreness map and a sleep reminder — input for tomorrow’s plan.',
    },
    howNote: 'The feed invents nothing: every card takes its numbers from the check-in and the readiness engine.',
    restriction: 'Training restriction',
    guard: {
      line: { green: 'Load is within range — train to plan.', yellow: 'No maximal efforts today.', red: 'Recovery only today.' },
      main: (r) => `Main reason: ${lc(r)}.`,
      info: 'How this is checked',
      hide: 'Hide',
      reasons: 'What lowered the score',
    },
    norm: (r) => `normal ${r}`,
    tags: { inNorm: 'Normal', belowNorm: 'Below normal', aboveNorm: 'Above normal', outOfNorm: (n, t) => `${n} of ${t} out of range`, soon: 'Soon', limited: 'Restricted' },
    actions: {
      markedAll: '✓ All marked',
      editMap: '✎ Edit map',
      markedToday: 'Marked for today — tomorrow’s plan will use it.',
      start: '▶ Start',
      details: 'Details',
      showPass: 'Show Safety Pass',
      quickAdd: 'Log how you feel',
    },
    verdict: { green: 'Optimal state', yellow: 'Today is a lighter day', red: 'Today is a recovery day' },
    chart: {
      title: 'Load this week',
      caption: 'Bars — load per day, dashed line — your usual over 4 weeks.',
      unit: 'AU',
      today: 'today',
      usual: 'usual',
      formula: 'Load = effort (RPE) × training minutes.',
    },
    scales: {
      title: 'Where you are now',
      legend: 'Light zone — normal range',
      here: 'you are here',
      hooperNorm: (b) => `normal — not above your baseline ${b}`,
      better: 'better →',
    },
  },
};

/** Morning until 11:00, day until 18:00, evening after. */
export function daypartOf(hour: number): Daypart {
  if (hour < 11) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}
