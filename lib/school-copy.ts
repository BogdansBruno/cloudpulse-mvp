// lib/school-copy.ts — texts of the School role (RU / LV / EN): the school screen (/school), the pupil's
// "School" card on Progress, and the demo tile. No medical advice: with pain the only line is
// "doctor, school nurse or physio decides" (roadmap rule 3).

import type { Lang } from '@/lib/i18n/translations';
import type { SchoolState } from '@/lib/school-view';

export type SchoolCopy = {
  nav: string;
  title: string;
  subtitle: string;
  loading: string;
  errLoad: string;
  errNotRun: string;
  createTitle: string;
  createBody: string;
  createName: string;
  createButton: string;
  codeTitle: string;
  codeHint: string;
  copy: string;
  copied: string;
  newCode: string;
  members: (n: number) => string;
  boardTitle: string;
  emptyBoard: string;
  attention: (n: number) => string;
  allCalm: string;
  state: Record<SchoolState, string>;
  stateHint: Record<SchoolState, string>;
  lockedBody: string;
  examTitle: string;
  examBody: string;
  examEmpty: string;
  examDay: (n: number) => string;
  privacyTitle: string;
  privacy: string[];
  disclaimer: string;
  // the pupil's side
  card: {
    title: string;
    intro: string;
    codePlaceholder: string;
    labelPlaceholder: string;
    join: string;
    joining: string;
    safetyTitle: string;
    safetyBody: (school: string) => string;
    calendarTitle: string;
    calendarBody: (school: string) => string;
    on: string;
    off: string;
    changed: (when: string) => string;
    leave: string;
    errors: Record<'INVALID_CODE' | 'BAD_LABEL' | 'NOT_ATHLETE' | 'DEMO_MISMATCH' | 'UNKNOWN' | 'SAVE', string>;
    joined: (school: string) => string;
  };
  demo: { title: string; desc: string };
};

const RU: SchoolCopy = {
  nav: 'Школа',
  title: 'Школа: безопасность',
  subtitle: 'Только светофор и только то, что открыл сам ученик.',
  loading: 'Загружаем…',
  errLoad: 'Не удалось загрузить данные. Проверьте соединение, экран обновится сам.',
  errNotRun: 'База ещё не готова для роли «Школа» (нужен SQL 16).',
  createTitle: 'Создайте школу',
  createBody: 'Название увидят ученики, когда будут вводить код. Больше ничего о школе не передаётся.',
  createName: 'Название школы',
  createButton: 'Создать',
  codeTitle: 'Код для учеников',
  codeHint: 'Ученик вводит его в «Прогресс → Школа». По умолчанию вы не видите ничего, пока ученик сам не включит доступ.',
  copy: 'Скопировать',
  copied: 'Скопировано',
  newCode: 'Новый код',
  members: (n) => `Учеников: ${n}`,
  boardTitle: 'Сегодня',
  emptyBoard: 'Пока никто не вступил. Покажите ученикам код выше.',
  attention: (n) => (n === 1 ? 'Одному ученику сегодня нужно внимание' : `Ученикам сегодня нужно внимание: ${n}`),
  allCalm: 'Сегодня сигналов нет',
  state: {
    pain: 'Сообщил(а) о боли',
    red: 'Красный день',
    restricted: 'Нагрузка ограничена',
    yellow: 'Лучше полегче',
    no_checkin: 'Чек-ина ещё нет',
    green: 'Готов(а)',
    locked: 'Доступ закрыт',
  },
  stateHint: {
    pain: 'Поговорите с учеником. Решает врач, школьная медсестра или физиотерапевт.',
    red: 'На физкультуре — щадящий режим.',
    restricted: 'Тяжёлая нагрузка сегодня не нужна.',
    yellow: 'Можно заниматься, но без максимума.',
    no_checkin: 'Ученик ещё не отметился сегодня.',
    green: 'Без ограничений.',
    locked: 'Ученик решает сам, что показывать.',
  },
  lockedBody: 'Ученик не включил доступ. Школа видит только подпись.',
  examTitle: 'Контрольные',
  examBody: 'Сколько учеников пишут контрольную в один день. Показываем день, только когда их трое и больше.',
  examEmpty: 'Дней, где трое и больше учеников пишут контрольную, нет.',
  examDay: (n) => `${n} уч.`,
  privacyTitle: 'Что школа не видит никогда',
  privacy: ['баллы готовности и ответы о самочувствии', 'где именно болит', 'тренировки и нагрузку', 'названия предметов и оценки'],
  disclaimer: 'Это сигнал, а не диагноз и не медицинская карта. Решения принимают ученик, врач, школьная медсестра или физиотерапевт.',
  card: {
    title: 'Школа',
    intro: 'Введите код школьной медсестры. По умолчанию школа не видит ничего: вы сами включаете каждый доступ и отключаете в любой момент.',
    codePlaceholder: 'Код школы',
    labelPlaceholder: 'Как вас подписать (имя)',
    join: 'Подключиться',
    joining: 'Подключаем…',
    safetyTitle: 'Светофор безопасности',
    safetyBody: (s) => `${s} увидит цвет дня, ограничение нагрузки и отметку «сообщил о боли». Без баллов и без места боли.`,
    calendarTitle: 'Дни контрольных',
    calendarBody: (s) => `${s} учтёт ваши контрольные только в общей сумме по дню, если таких учеников трое и больше.`,
    on: 'Включено',
    off: 'Выключено',
    changed: (w) => `изменено ${w}`,
    leave: 'Выйти из школы',
    errors: {
      INVALID_CODE: 'Такого кода нет или он отключён.',
      BAD_LABEL: 'Подпись — от 1 до 40 символов.',
      NOT_ATHLETE: 'Подключиться может только спортсмен.',
      DEMO_MISMATCH: 'Демо и настоящие аккаунты не смешиваются.',
      UNKNOWN: 'Не получилось. Попробуйте ещё раз.',
      SAVE: 'Не удалось сохранить.',
    },
    joined: (s) => `Вы подключены к школе «${s}». Пока ничего не открыто.`,
  },
  demo: { title: 'Школа', desc: 'Светофор безопасности только с согласия ученика' },
};

const LV: SchoolCopy = {
  nav: 'Skola',
  title: 'Skola: drošība',
  subtitle: 'Tikai luksofors un tikai tas, ko atvēris pats skolēns.',
  loading: 'Ielādējam…',
  errLoad: 'Neizdevās ielādēt datus. Pārbaudiet savienojumu, ekrāns atjaunosies pats.',
  errNotRun: 'Datubāze vēl nav gatava lomai “Skola” (vajag SQL 16).',
  createTitle: 'Izveidojiet skolu',
  createBody: 'Nosaukumu skolēni redzēs, ievadot kodu. Cita informācija par skolu netiek nodota.',
  createName: 'Skolas nosaukums',
  createButton: 'Izveidot',
  codeTitle: 'Kods skolēniem',
  codeHint: 'Skolēns to ievada sadaļā “Progress → Skola”. Pēc noklusējuma jūs neredzat neko, kamēr skolēns pats neieslēdz piekļuvi.',
  copy: 'Kopēt',
  copied: 'Nokopēts',
  newCode: 'Jauns kods',
  members: (n) => `Skolēnu: ${n}`,
  boardTitle: 'Šodien',
  emptyBoard: 'Neviens vēl nav pievienojies. Parādiet skolēniem kodu augstāk.',
  attention: (n) => (n === 1 ? 'Vienam skolēnam šodien vajadzīga uzmanība' : `Skolēniem šodien vajadzīga uzmanība: ${n}`),
  allCalm: 'Šodien signālu nav',
  state: {
    pain: 'Ziņoja par sāpēm',
    red: 'Sarkanā diena',
    restricted: 'Slodze ierobežota',
    yellow: 'Labāk mierīgāk',
    no_checkin: 'Check-in vēl nav',
    green: 'Gatavs',
    locked: 'Piekļuve slēgta',
  },
  stateHint: {
    pain: 'Aprunājieties ar skolēnu. Lemj ārsts, skolas medmāsa vai fizioterapeits.',
    red: 'Sporta stundā — saudzīgs režīms.',
    restricted: 'Smaga slodze šodien nav vajadzīga.',
    yellow: 'Var darboties, bet ne uz maksimumu.',
    no_checkin: 'Skolēns šodien vēl nav atzīmējies.',
    green: 'Bez ierobežojumiem.',
    locked: 'Skolēns pats izlemj, ko rādīt.',
  },
  lockedBody: 'Skolēns nav ieslēdzis piekļuvi. Skola redz tikai parakstu.',
  examTitle: 'Kontroldarbi',
  examBody: 'Cik skolēnu raksta kontroldarbu vienā dienā. Dienu rādām tikai tad, ja tādu skolēnu ir trīs vai vairāk.',
  examEmpty: 'Nav dienu, kurās trīs vai vairāk skolēnu raksta kontroldarbu.',
  examDay: (n) => `${n} skol.`,
  privacyTitle: 'Ko skola neredz nekad',
  privacy: ['gatavības punktus un atbildes par pašsajūtu', 'kur tieši sāp', 'treniņus un slodzi', 'mācību priekšmetu nosaukumus un atzīmes'],
  disclaimer: 'Tas ir signāls, nevis diagnoze vai medicīnas karte. Lēmumus pieņem skolēns, ārsts, skolas medmāsa vai fizioterapeits.',
  card: {
    title: 'Skola',
    intro: 'Ievadiet skolas medmāsas kodu. Pēc noklusējuma skola neredz neko: katru piekļuvi ieslēdzat jūs paši un varat izslēgt jebkurā brīdī.',
    codePlaceholder: 'Skolas kods',
    labelPlaceholder: 'Kā jūs parakstīt (vārds)',
    join: 'Pievienoties',
    joining: 'Pievienojam…',
    safetyTitle: 'Drošības luksofors',
    safetyBody: (s) => `${s} redzēs dienas krāsu, slodzes ierobežojumu un atzīmi “ziņoja par sāpēm”. Bez punktiem un bez sāpju vietas.`,
    calendarTitle: 'Kontroldarbu dienas',
    calendarBody: (s) => `${s} ņems vērā jūsu kontroldarbus tikai kopsummā par dienu, ja tādu skolēnu ir trīs vai vairāk.`,
    on: 'Ieslēgts',
    off: 'Izslēgts',
    changed: (w) => `mainīts ${w}`,
    leave: 'Iziet no skolas',
    errors: {
      INVALID_CODE: 'Tāda koda nav vai tas ir atslēgts.',
      BAD_LABEL: 'Paraksts — no 1 līdz 40 rakstzīmēm.',
      NOT_ATHLETE: 'Pievienoties var tikai sportists.',
      DEMO_MISMATCH: 'Demo un īstie konti netiek jaukti.',
      UNKNOWN: 'Neizdevās. Mēģiniet vēlreiz.',
      SAVE: 'Neizdevās saglabāt.',
    },
    joined: (s) => `Jūs esat pievienots skolai “${s}”. Pagaidām nekas nav atvērts.`,
  },
  demo: { title: 'Skola', desc: 'Drošības luksofors tikai ar skolēna piekrišanu' },
};

const EN: SchoolCopy = {
  nav: 'School',
  title: 'School safety',
  subtitle: 'Only a traffic light, and only what the pupil chose to share.',
  loading: 'Loading…',
  errLoad: 'Could not load the data. Check your connection; the screen refreshes itself.',
  errNotRun: 'The database is not ready for the School role yet (SQL 16 is needed).',
  createTitle: 'Create your school',
  createBody: 'Pupils see the name when they enter the code. Nothing else about the school is shared.',
  createName: 'School name',
  createButton: 'Create',
  codeTitle: 'Code for pupils',
  codeHint: 'A pupil enters it in Progress → School. By default you see nothing until the pupil turns access on.',
  copy: 'Copy',
  copied: 'Copied',
  newCode: 'New code',
  members: (n) => `Pupils: ${n}`,
  boardTitle: 'Today',
  emptyBoard: 'Nobody has joined yet. Show pupils the code above.',
  attention: (n) => (n === 1 ? 'One pupil needs attention today' : `${n} pupils need attention today`),
  allCalm: 'No signals today',
  state: {
    pain: 'Reported pain',
    red: 'Red day',
    restricted: 'Load restricted',
    yellow: 'Better take it easy',
    no_checkin: 'No check-in yet',
    green: 'Ready',
    locked: 'Access off',
  },
  stateHint: {
    pain: 'Talk to the pupil. The doctor, school nurse or physio decides.',
    red: 'PE: easy mode.',
    restricted: 'No heavy load today.',
    yellow: 'Fine to take part, just not at the maximum.',
    no_checkin: 'The pupil has not checked in today.',
    green: 'No restrictions.',
    locked: 'The pupil decides what to show.',
  },
  lockedBody: 'The pupil has not turned access on. The school sees only the name.',
  examTitle: 'Tests',
  examBody: 'How many pupils have a test on the same day. A day is shown only when three or more share it.',
  examEmpty: 'No day where three or more pupils have a test.',
  examDay: (n) => `${n} pupils`,
  privacyTitle: 'What the school never sees',
  privacy: ['readiness scores and wellness answers', 'where exactly it hurts', 'trainings and load', 'subject names and grades'],
  disclaimer: 'This is a signal, not a diagnosis and not a medical record. The pupil, a doctor, the school nurse or a physio decides.',
  card: {
    title: 'School',
    intro: 'Enter the school nurse’s code. By default the school sees nothing: you turn each access on yourself and can turn it off at any time.',
    codePlaceholder: 'School code',
    labelPlaceholder: 'How to label you (first name)',
    join: 'Join',
    joining: 'Joining…',
    safetyTitle: 'Safety traffic light',
    safetyBody: (s) => `${s} sees the colour of the day, the load restriction and a “reported pain” mark. No scores and no pain location.`,
    calendarTitle: 'Test days',
    calendarBody: (s) => `${s} counts your tests only as a total per day, and only when three or more pupils share it.`,
    on: 'On',
    off: 'Off',
    changed: (w) => `changed ${w}`,
    leave: 'Leave the school',
    errors: {
      INVALID_CODE: 'No such code, or it has been switched off.',
      BAD_LABEL: 'The label must be 1 to 40 characters.',
      NOT_ATHLETE: 'Only an athlete can join.',
      DEMO_MISMATCH: 'Demo and real accounts are never mixed.',
      UNKNOWN: 'That did not work. Please try again.',
      SAVE: 'Could not save.',
    },
    joined: (s) => `You joined “${s}”. Nothing is shared yet.`,
  },
  demo: { title: 'School', desc: 'A safety traffic light, only with the pupil’s consent' },
};

export const SCHOOL: Record<Lang, SchoolCopy> = { ru: RU, lv: LV, en: EN };
