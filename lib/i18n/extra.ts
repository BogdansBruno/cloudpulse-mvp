// lib/i18n/extra.ts
//
// Copy for the 30.09 features (team pulse, pre-match brief, scout passport,
// away-trip recovery) in RU / LV / EN. Kept apart from translations.ts so
// the big file does not grow further; `satisfies` checks every language has
// every key.

import type { Lang } from './translations';
import type { PulseSuggestion } from '@/lib/team-pulse';
import type { ShareStatus } from '@/lib/scout-cv';
import type { TripError } from '@/lib/travel';
import type { RosterGroup } from '@/lib/match-roster';

export type ExtraCopy = {
  pulse: {
    title: string;
    subtitle: string;
    checkedIn: (n: number, of: number) => string;
    tooFew: string;
    levels: { calm: string; watch: string; high: string };
    stress: string;
    sleep: string;
    fatigue: string;
    soreness: string;
    ofChecked: (n: string, of: number) => string;
    fewer: string;
    trend: { higher: string; same: string; lower: string };
    suggestionsTitle: string;
    suggestions: Record<PulseSuggestion, string>;
    week: string;
    privacy: string;
    notMood: string;
  };
  brief: {
    title: string;
    when: (day: string, inDays: number) => string;
    groups: Record<RosterGroup, string>;
    reasons: {
      PAIN: string;
      LOW_READINESS: string;
      LOAD_SPIKE: string;
      RTP_RESTRICTED: (clean: number, required: number) => string;
      RTP_AWAITING: string;
      NO_CHECKIN: string;
      NOT_COMPUTED: string;
      OK: string;
    };
    sameAsCoach: string;
    coachDecides: string;
    locked: string;
    coachHint: string;
  };
  scout: {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    recipientLabel: string;
    recipientPlaceholder: string;
    daysLabel: string;
    days: (n: number) => string;
    includesTitle: string;
    includeDiscipline: string;
    includeReadiness: string;
    includeHealth: string;
    healthHint: string;
    noGrades: string;
    create: string;
    creating: string;
    copyOnce: string;
    copy: string;
    copied: string;
    status: Record<ShareStatus, string>;
    views: (n: number) => string;
    until: (d: string) => string;
    revoke: string;
    empty: string;
    errors: Record<'NO_PARENT_LINK' | 'TOO_MANY_LINKS' | 'BAD_NAME' | 'BAD_RECIPIENT' | 'GENERIC', string>;
    parentTitle: string;
    parentBody: (child: string, recipient: string) => string;
    parentIncludes: string;
    approve: string;
    decline: string;
    parentActive: (views: number) => string;
  };
  cv: {
    title: string;
    verified: string;
    invalidTitle: string;
    invalidBody: string;
    loading: string;
    forRecipient: (r: string) => string;
    sport: string;
    period: (from: string, to: string) => string;
    disciplineTitle: string;
    weeks: (w: number, of: number) => string;
    checkinDays: (n: number, of: number) => string;
    longestStreak: (n: number) => string;
    sessions: (n: number) => string;
    readinessTitle: string;
    readinessHint: string;
    avg: string;
    green: string;
    yellow: string;
    red: string;
    healthTitle: string;
    painReports: (n: number) => string;
    returnsConfirmed: (n: number) => string;
    healthNote: string;
    gradesTitle: string;
    gradesBody: string;
    source: string;
    ref: (id: string, until: string) => string;
    print: string;
  };
  travel: {
    coachTitle: string;
    coachSubtitle: string;
    tripTitle: string;
    tripTitlePlaceholder: string;
    matchDate: string;
    returnDate: string;
    hours: string;
    hoursHint: (min: number) => string;
    add: string;
    adding: string;
    errors: Record<TripError | 'GENERIC', string>;
    empty: string;
    tripLine: (title: string, day: string, hours: number) => string;
    shortTrip: string;
    recoveryUntil: (day: string) => string;
    coachReminder: string;
    remove: string;
    athleteTitle: string;
    athleteBody: (hours: number, until: string) => string;
    athleteDay: (n: number) => string;
    noteButton: string;
    noteLoading: string;
    noteUnavailable: string;
    noteShow: string;
    noteHint: string;
  };
  note: {
    title: string;
    checking: string;
    invalid: string;
    invalidBody: string;
    valid: string;
    body: (day: string, hours: number) => string;
    request: string;
    teacherDecides: string;
    expired: (until: string) => string;
    id: string;
    footer: string;
  };
};

export const EXTRA = {
  ru: {
    pulse: {
      title: 'Пульс команды',
      subtitle: 'Сумма по сегодняшним чек-инам — без имён',
      checkedIn: (n, of) => `Чек-ин сегодня: ${n} из ${of}`,
      tooFew: 'Сегодня меньше 3 чек-инов — пульс не показываем, чтобы никого нельзя было узнать.',
      levels: { calm: 'Спокойно', watch: 'Стоит присмотреться', high: 'Команда под нагрузкой' },
      stress: 'Высокий стресс',
      sleep: 'Плохой сон',
      fatigue: 'Сильная усталость',
      soreness: 'Сильная забитость',
      ofChecked: (n, of) => `${n} из ${of}`,
      fewer: 'меньше 3',
      trend: { higher: 'Выше, чем обычно у этой команды', same: 'Как обычно у этой команды', lower: 'Ниже, чем обычно у этой команды' },
      suggestionsTitle: 'Что можно сделать (решаете вы)',
      suggestions: {
        LIGHTER_OR_GAME: 'Сделать сегодняшнюю тренировку легче или игровой.',
        SHORT_TALK: 'Коротко спросить команду в начале, как дела со школой и сном.',
        EXAMS_AHEAD: 'У многих скоро контрольные — это видно в «Экзаменационном шторме».',
      },
      week: 'Последние 8 дней',
      privacy: 'Считает база данных: личные ответы на этот экран не приходят, числа 1–2 показываются как «меньше 3».',
      notMood: 'Это стресс, сон, усталость и забитость из чек-ина. Настроение и атмосферу в команде чек-ин не измеряет.',
    },
    brief: {
      title: 'Перед матчем',
      when: (day, n) => (n === 0 ? `Матч сегодня, ${day}` : n === 1 ? `Матч завтра, ${day}` : `Матч ${day} (через ${n} дн.)`),
      groups: { available: 'Готов по данным', limited: 'С осторожностью', out: 'Сегодня не играет', unknown: 'Нет данных за сегодня' },
      reasons: {
        PAIN: 'Сегодня отмечена боль — сначала врач, медсестра или физиотерапевт.',
        LOW_READINESS: 'Готовность сегодня низкая (красный день).',
        LOAD_SPIKE: 'Нагрузка за последние недели выросла резко.',
        RTP_RESTRICTED: (c, r) => `Возвращение после боли: дней без боли ${c} из ${r}.`,
        RTP_AWAITING: 'Боль прошла, ждём подтверждения тренера.',
        NO_CHECKIN: 'Сегодня ещё нет чек-ина.',
        NOT_COMPUTED: 'Чек-ин есть, итог ещё считается.',
        OK: 'Ограничений нет.',
      },
      sameAsCoach: 'Тренер видит ровно то же самое.',
      coachDecides: 'Состав и минуты выбирает тренер.',
      locked: 'Предматчевую сводку видно, когда включены оба согласия: цвет дня и календарь.',
      coachHint: 'Родители, которым спортсмен открыл цвет дня и календарь, видят эту же сводку по своему ребёнку — без баллов и подробностей.',
    },
    scout: {
      title: 'Паспорт для скаутов',
      subtitle: 'Ссылка на сводку для академии или университета. Включает родитель, срок до 30 дней, отзывается в любой момент.',
      nameLabel: 'Как тебя подписать',
      namePlaceholder: 'Например: Максим К.',
      recipientLabel: 'Для кого',
      recipientPlaceholder: 'Например: FK Academy, скаут',
      daysLabel: 'Срок',
      days: (n) => `${n} дней`,
      includesTitle: 'Что будет видно',
      includeDiscipline: 'Регулярность: чек-ины и записанные тренировки (всегда)',
      includeReadiness: 'Цвета готовности по месяцам',
      includeHealth: 'Сколько раз за 12 месяцев отмечалась боль',
      healthHint: 'Только число. Где болело и ответы чек-ина не видны никогда.',
      noGrades: 'Школьных оценок в паспорте нет: подтверждения школой пока нет, а непроверенное мы не показываем.',
      create: 'Создать ссылку',
      creating: 'Создаём…',
      copyOnce: 'Скопируй ссылку сейчас — потом её не покажет никто, даже мы. Заработает, когда родитель её включит.',
      copy: 'Копировать',
      copied: 'Скопировано',
      status: { pending: 'Ждёт родителя', active: 'Работает', expired: 'Срок истёк', revoked: 'Отозвана' },
      views: (n) => `Открыта: ${n}`,
      until: (d) => `до ${d}`,
      revoke: 'Отозвать',
      empty: 'Пока ни одной ссылки.',
      errors: {
        NO_PARENT_LINK: 'Сначала нужна связь с родителем в CloudPulse — ссылку включает он.',
        TOO_MANY_LINKS: 'Можно не больше 3 работающих ссылок. Отзови ненужную.',
        BAD_NAME: 'Подпись — от 1 до 60 символов.',
        BAD_RECIPIENT: '«Для кого» — от 1 до 80 символов.',
        GENERIC: 'Не получилось. Попробуй ещё раз.',
      },
      parentTitle: 'Паспорт для скаутов — нужно ваше решение',
      parentBody: (child, r) => `${child} хочет открыть сводку для: ${r}.`,
      parentIncludes: 'Будет видно:',
      approve: 'Включить ссылку',
      decline: 'Отклонить',
      parentActive: (v) => `Ссылка работает. Открыта: ${v}.`,
    },
    cv: {
      title: 'Паспорт спортсмена',
      verified: 'Данные из CloudPulse: чек-ины и тренировки спортсмена, баллы посчитал движок. Вручную не редактируются.',
      invalidTitle: 'Ссылка не работает',
      invalidBody: 'Срок истёк, ссылку отозвали или она ещё не включена родителем.',
      loading: 'Загружаем…',
      forRecipient: (r) => `Для: ${r}`,
      sport: 'Вид спорта',
      period: (f, t) => `Период: ${f} — ${t}`,
      disciplineTitle: 'Регулярность',
      weeks: (w, of) => `Активен ${w} из ${of} недель`,
      checkinDays: (n, of) => `Чек-ин в ${n} из ${of} дней`,
      longestStreak: (n) => `Самая длинная серия чек-инов: ${n} дн.`,
      sessions: (n) => `Записано тренировок: ${n}`,
      readinessTitle: 'Готовность по месяцам',
      readinessHint: 'Цвет дня по чек-ину: зелёный — полная нагрузка, жёлтый — сниженная, красный — восстановление.',
      avg: 'ср.',
      green: 'зелёных',
      yellow: 'жёлтых',
      red: 'красных',
      healthTitle: 'Здоровье (открыл спортсмен)',
      painReports: (n) => `Сообщений о боли за 12 месяцев: ${n}`,
      returnsConfirmed: (n) => `Возвращений после боли, подтверждённых тренером: ${n}`,
      healthNote: 'Это не медицинский документ и не диагноз.',
      gradesTitle: 'Учёба',
      gradesBody: 'Школьные оценки здесь не показываются: подтверждения от школы пока нет.',
      source: 'CloudPulse — приложение готовности для юных спортсменов.',
      ref: (id, until) => `Паспорт ${id} · ссылка действует до ${until}`,
      print: 'Распечатать / PDF',
    },
    travel: {
      coachTitle: 'Выезды',
      coachSubtitle: 'После долгой дороги — 48 часов восстановления',
      tripTitle: 'Куда',
      tripTitlePlaceholder: 'Например: Лиепая, кубок',
      matchDate: 'Матч',
      returnDate: 'Возвращение',
      hours: 'Часов в дороге (туда и обратно)',
      hoursHint: (m) => `С ${m} часов включается режим «после выезда».`,
      add: 'Добавить выезд',
      adding: 'Сохраняем…',
      errors: {
        TITLE: 'Название — от 1 до 60 символов.',
        MATCH_DATE: 'Укажи дату матча.',
        RETURN_DATE: 'Возвращение — в день матча или в течение 7 дней после.',
        HOURS: 'Часы в дороге — от 1 до 48.',
        GENERIC: 'Не удалось сохранить. Запущен ли SQL 15?',
      },
      empty: 'Выездов пока нет.',
      tripLine: (t, d, h) => `${t} · ${d} · ${h} ч в дороге`,
      shortTrip: 'короткая дорога — без режима',
      recoveryUntil: (d) => `Восстановление до ${d}`,
      coachReminder: 'Первая тренировка после дороги — подвижность, растяжка и лёгкая работа. Решаете вы.',
      remove: 'Удалить',
      athleteTitle: 'После выезда',
      athleteBody: (h, u) => `Ты провёл в дороге ${h} ч. До ${u} план — только лёгкая работа и подвижность, чтобы тело восстановилось после сидения и недосыпа.`,
      athleteDay: (n) => `День ${n} из 2`,
      noteButton: 'Записка для учителя',
      noteLoading: 'Готовим записку…',
      noteUnavailable: 'Записка сейчас недоступна.',
      noteShow: 'Покажи учителю: он отсканирует QR и увидит подтверждённую записку.',
      noteHint: 'В записке нет имени и данных о здоровье — только дата и часы в дороге. Решение принимает учитель.',
    },
    note: {
      title: 'Записка после выезда',
      checking: 'Проверяем…',
      invalid: 'Записка не подтверждена',
      invalidBody: 'Подпись не совпала — такую записку CloudPulse не выдавал.',
      valid: 'Подпись CloudPulse подтверждена',
      body: (d, h) => `Спортсмен вернулся с выездного матча ${d}, в дороге провёл ${h} ч.`,
      request: 'Просим по возможности перенести устные ответы на 24 часа.',
      teacherDecides: 'Решение принимает учитель.',
      expired: (u) => `Записка действовала до ${u}.`,
      id: 'Номер записки',
      footer: 'CloudPulse не хранит здесь имени и данных о здоровье.',
    },
  },
  lv: {
    pulse: {
      title: 'Komandas pulss',
      subtitle: 'Kopsumma no šodienas reģistrācijām — bez vārdiem',
      checkedIn: (n, of) => `Reģistrējušies šodien: ${n} no ${of}`,
      tooFew: 'Šodien mazāk nekā 3 reģistrācijas — pulsu nerādām, lai nevienu nevarētu atpazīt.',
      levels: { calm: 'Mierīgi', watch: 'Vērts pievērst uzmanību', high: 'Komanda zem slodzes' },
      stress: 'Augsts stress',
      sleep: 'Slikts miegs',
      fatigue: 'Stiprs nogurums',
      soreness: 'Stiprs sasprindzinājums',
      ofChecked: (n, of) => `${n} no ${of}`,
      fewer: 'mazāk par 3',
      trend: { higher: 'Augstāk nekā parasti šai komandai', same: 'Kā parasti šai komandai', lower: 'Zemāk nekā parasti šai komandai' },
      suggestionsTitle: 'Ko var darīt (izlemjat jūs)',
      suggestions: {
        LIGHTER_OR_GAME: 'Padarīt šodienas treniņu vieglāku vai spēļu formā.',
        SHORT_TALK: 'Sākumā īsi pajautāt komandai par skolu un miegu.',
        EXAMS_AHEAD: 'Daudziem drīz kontroldarbi — to redz «Eksāmenu vētrā».',
      },
      week: 'Pēdējās 8 dienas',
      privacy: 'Skaita datubāze: personīgās atbildes uz šo ekrānu nenonāk, skaitļi 1–2 rādīti kā «mazāk par 3».',
      notMood: 'Tas ir stress, miegs, nogurums un sasprindzinājums no reģistrācijas. Garastāvokli un atmosfēru komandā reģistrācija nemēra.',
    },
    brief: {
      title: 'Pirms spēles',
      when: (day, n) => (n === 0 ? `Spēle šodien, ${day}` : n === 1 ? `Spēle rīt, ${day}` : `Spēle ${day} (pēc ${n} d.)`),
      groups: { available: 'Gatavs pēc datiem', limited: 'Ar piesardzību', out: 'Šodien nespēlē', unknown: 'Nav šodienas datu' },
      reasons: {
        PAIN: 'Šodien atzīmētas sāpes — vispirms ārsts, medmāsa vai fizioterapeits.',
        LOW_READINESS: 'Gatavība šodien zema (sarkanā diena).',
        LOAD_SPIKE: 'Slodze pēdējās nedēļās strauji pieaugusi.',
        RTP_RESTRICTED: (c, r) => `Atgriešanās pēc sāpēm: dienas bez sāpēm ${c} no ${r}.`,
        RTP_AWAITING: 'Sāpes pārgājušas, gaidām trenera apstiprinājumu.',
        NO_CHECKIN: 'Šodien vēl nav reģistrācijas.',
        NOT_COMPUTED: 'Reģistrācija ir, rezultāts vēl tiek aprēķināts.',
        OK: 'Ierobežojumu nav.',
      },
      sameAsCoach: 'Treneris redz tieši to pašu.',
      coachDecides: 'Sastāvu un minūtes izvēlas treneris.',
      locked: 'Pirmsspēles kopsavilkums redzams, kad ieslēgtas abas piekrišanas: dienas krāsa un kalendārs.',
      coachHint: 'Vecāki, kuriem sportists atvēris dienas krāsu un kalendāru, redz šo pašu kopsavilkumu par savu bērnu — bez punktiem un detaļām.',
    },
    scout: {
      title: 'Pase skautiem',
      subtitle: 'Saite uz kopsavilkumu akadēmijai vai universitātei. Ieslēdz vecāks, derīga līdz 30 dienām, atsaucama jebkurā brīdī.',
      nameLabel: 'Kā tevi parakstīt',
      namePlaceholder: 'Piemēram: Maksims K.',
      recipientLabel: 'Kam',
      recipientPlaceholder: 'Piemēram: FK Academy, skauts',
      daysLabel: 'Termiņš',
      days: (n) => `${n} dienas`,
      includesTitle: 'Kas būs redzams',
      includeDiscipline: 'Regularitāte: reģistrācijas un ierakstītie treniņi (vienmēr)',
      includeReadiness: 'Gatavības krāsas pa mēnešiem',
      includeHealth: 'Cik reizes 12 mēnešos atzīmētas sāpes',
      healthHint: 'Tikai skaitlis. Kur sāpēja un reģistrācijas atbildes nav redzamas nekad.',
      noGrades: 'Skolas atzīmju pasē nav: skolas apstiprinājuma vēl nav, un nepārbaudītu mēs nerādām.',
      create: 'Izveidot saiti',
      creating: 'Veidojam…',
      copyOnce: 'Nokopē saiti tagad — vēlāk to neparādīs neviens, pat mēs. Tā sāks darboties, kad vecāks to ieslēgs.',
      copy: 'Kopēt',
      copied: 'Nokopēts',
      status: { pending: 'Gaida vecāku', active: 'Darbojas', expired: 'Termiņš beidzies', revoked: 'Atsaukta' },
      views: (n) => `Atvērta: ${n}`,
      until: (d) => `līdz ${d}`,
      revoke: 'Atsaukt',
      empty: 'Vēl nav nevienas saites.',
      errors: {
        NO_PARENT_LINK: 'Vispirms vajadzīga saite ar vecāku CloudPulse — saiti ieslēdz viņš.',
        TOO_MANY_LINKS: 'Var būt ne vairāk kā 3 darbojošās saites. Atsauc nevajadzīgo.',
        BAD_NAME: 'Paraksts — no 1 līdz 60 rakstzīmēm.',
        BAD_RECIPIENT: '«Kam» — no 1 līdz 80 rakstzīmēm.',
        GENERIC: 'Neizdevās. Mēģini vēlreiz.',
      },
      parentTitle: 'Pase skautiem — vajadzīgs jūsu lēmums',
      parentBody: (child, r) => `${child} vēlas atvērt kopsavilkumu: ${r}.`,
      parentIncludes: 'Būs redzams:',
      approve: 'Ieslēgt saiti',
      decline: 'Noraidīt',
      parentActive: (v) => `Saite darbojas. Atvērta: ${v}.`,
    },
    cv: {
      title: 'Sportista pase',
      verified: 'Dati no CloudPulse: sportista reģistrācijas un treniņi, punktus aprēķināja dzinējs. Manuāli netiek laboti.',
      invalidTitle: 'Saite nedarbojas',
      invalidBody: 'Termiņš beidzies, saite atsaukta vai vecāks to vēl nav ieslēdzis.',
      loading: 'Ielādējam…',
      forRecipient: (r) => `Kam: ${r}`,
      sport: 'Sporta veids',
      period: (f, t) => `Periods: ${f} — ${t}`,
      disciplineTitle: 'Regularitāte',
      weeks: (w, of) => `Aktīvs ${w} no ${of} nedēļām`,
      checkinDays: (n, of) => `Reģistrācija ${n} no ${of} dienām`,
      longestStreak: (n) => `Garākā reģistrāciju sērija: ${n} d.`,
      sessions: (n) => `Ierakstīti treniņi: ${n}`,
      readinessTitle: 'Gatavība pa mēnešiem',
      readinessHint: 'Dienas krāsa pēc reģistrācijas: zaļa — pilna slodze, dzeltena — samazināta, sarkana — atjaunošanās.',
      avg: 'vid.',
      green: 'zaļas',
      yellow: 'dzeltenas',
      red: 'sarkanas',
      healthTitle: 'Veselība (atvēra sportists)',
      painReports: (n) => `Ziņojumi par sāpēm 12 mēnešos: ${n}`,
      returnsConfirmed: (n) => `Atgriešanās pēc sāpēm, ko apstiprināja treneris: ${n}`,
      healthNote: 'Tas nav medicīnisks dokuments un nav diagnoze.',
      gradesTitle: 'Mācības',
      gradesBody: 'Skolas atzīmes šeit netiek rādītas: skolas apstiprinājuma vēl nav.',
      source: 'CloudPulse — gatavības lietotne jaunajiem sportistiem.',
      ref: (id, until) => `Pase ${id} · saite derīga līdz ${until}`,
      print: 'Drukāt / PDF',
    },
    travel: {
      coachTitle: 'Izbraukumi',
      coachSubtitle: 'Pēc gara ceļa — 48 stundas atjaunošanās',
      tripTitle: 'Uz kurieni',
      tripTitlePlaceholder: 'Piemēram: Liepāja, kauss',
      matchDate: 'Spēle',
      returnDate: 'Atgriešanās',
      hours: 'Stundas ceļā (turp un atpakaļ)',
      hoursHint: (m) => `No ${m} stundām ieslēdzas režīms «pēc izbraukuma».`,
      add: 'Pievienot izbraukumu',
      adding: 'Saglabājam…',
      errors: {
        TITLE: 'Nosaukums — no 1 līdz 60 rakstzīmēm.',
        MATCH_DATE: 'Norādi spēles datumu.',
        RETURN_DATE: 'Atgriešanās — spēles dienā vai 7 dienu laikā pēc tās.',
        HOURS: 'Stundas ceļā — no 1 līdz 48.',
        GENERIC: 'Neizdevās saglabāt. Vai SQL 15 ir palaists?',
      },
      empty: 'Izbraukumu vēl nav.',
      tripLine: (t, d, h) => `${t} · ${d} · ${h} h ceļā`,
      shortTrip: 'īss ceļš — bez režīma',
      recoveryUntil: (d) => `Atjaunošanās līdz ${d}`,
      coachReminder: 'Pirmais treniņš pēc ceļa — kustīgums, stiepšanās un viegls darbs. Izlemjat jūs.',
      remove: 'Dzēst',
      athleteTitle: 'Pēc izbraukuma',
      athleteBody: (h, u) => `Tu biji ceļā ${h} h. Līdz ${u} plānā tikai viegls darbs un kustīgums, lai ķermenis atgūtos pēc sēdēšanas un miega trūkuma.`,
      athleteDay: (n) => `${n}. diena no 2`,
      noteButton: 'Zīmīte skolotājam',
      noteLoading: 'Gatavojam zīmīti…',
      noteUnavailable: 'Zīmīte pašlaik nav pieejama.',
      noteShow: 'Parādi skolotājam: viņš noskenēs QR un redzēs apstiprinātu zīmīti.',
      noteHint: 'Zīmītē nav vārda un veselības datu — tikai datums un stundas ceļā. Lēmumu pieņem skolotājs.',
    },
    note: {
      title: 'Zīmīte pēc izbraukuma',
      checking: 'Pārbaudām…',
      invalid: 'Zīmīte nav apstiprināta',
      invalidBody: 'Paraksts nesakrita — tādu zīmīti CloudPulse nav izsniedzis.',
      valid: 'CloudPulse paraksts apstiprināts',
      body: (d, h) => `Sportists atgriezās no izbraukuma spēles ${d}, ceļā pavadīja ${h} h.`,
      request: 'Lūdzam, ja iespējams, pārcelt mutiskās atbildes par 24 stundām.',
      teacherDecides: 'Lēmumu pieņem skolotājs.',
      expired: (u) => `Zīmīte bija derīga līdz ${u}.`,
      id: 'Zīmītes numurs',
      footer: 'CloudPulse šeit neglabā vārdu un veselības datus.',
    },
  },
  en: {
    pulse: {
      title: 'Team pulse',
      subtitle: 'Totals from today’s check-ins — no names',
      checkedIn: (n, of) => `Checked in today: ${n} of ${of}`,
      tooFew: 'Fewer than 3 check-ins today — no pulse shown, so nobody can be singled out.',
      levels: { calm: 'Calm', watch: 'Worth a look', high: 'Team under strain' },
      stress: 'High stress',
      sleep: 'Poor sleep',
      fatigue: 'Very tired',
      soreness: 'Very sore',
      ofChecked: (n, of) => `${n} of ${of}`,
      fewer: 'fewer than 3',
      trend: { higher: 'Higher than usual for this team', same: 'Usual for this team', lower: 'Lower than usual for this team' },
      suggestionsTitle: 'Options (your call)',
      suggestions: {
        LIGHTER_OR_GAME: 'Make today’s session lighter or game-based.',
        SHORT_TALK: 'Ask the team briefly at the start how school and sleep are going.',
        EXAMS_AHEAD: 'Many have exams soon — see the exam storm card.',
      },
      week: 'Last 8 days',
      privacy: 'Counted by the database: individual answers never reach this screen; counts of 1–2 show as “fewer than 3”.',
      notMood: 'This is stress, sleep, fatigue and soreness from the check-in. The check-in does not measure mood or team atmosphere.',
    },
    brief: {
      title: 'Before the match',
      when: (day, n) => (n === 0 ? `Match today, ${day}` : n === 1 ? `Match tomorrow, ${day}` : `Match on ${day} (in ${n} days)`),
      groups: { available: 'Ready by the data', limited: 'With caution', out: 'Not playing today', unknown: 'No data for today' },
      reasons: {
        PAIN: 'Pain reported today — a doctor, nurse or physio first.',
        LOW_READINESS: 'Low readiness today (red day).',
        LOAD_SPIKE: 'Training load rose sharply in recent weeks.',
        RTP_RESTRICTED: (c, r) => `Returning after pain: pain-free days ${c} of ${r}.`,
        RTP_AWAITING: 'Pain is gone; waiting for the coach to confirm.',
        NO_CHECKIN: 'No check-in yet today.',
        NOT_COMPUTED: 'Check-in done, result still being computed.',
        OK: 'No restrictions.',
      },
      sameAsCoach: 'The coach sees exactly the same.',
      coachDecides: 'The coach picks the team and the minutes.',
      locked: 'The pre-match brief shows when both consents are on: colour of the day and calendar.',
      coachHint: 'Parents the athlete opened colour and calendar to see this same brief for their own child — no scores, no details.',
    },
    scout: {
      title: 'Passport for scouts',
      subtitle: 'A link to a summary for an academy or university. A parent switches it on; valid up to 30 days; can be revoked any time.',
      nameLabel: 'Name to show',
      namePlaceholder: 'e.g. Max K.',
      recipientLabel: 'For whom',
      recipientPlaceholder: 'e.g. FK Academy, scout',
      daysLabel: 'Valid for',
      days: (n) => `${n} days`,
      includesTitle: 'What will be visible',
      includeDiscipline: 'Regularity: check-ins and logged sessions (always)',
      includeReadiness: 'Readiness colours by month',
      includeHealth: 'How many times pain was reported in 12 months',
      healthHint: 'A number only. Where it hurt and check-in answers are never shown.',
      noGrades: 'No school grades in the passport: there is no school confirmation yet, and we show nothing unverified.',
      create: 'Create link',
      creating: 'Creating…',
      copyOnce: 'Copy the link now — nobody can show it again later, not even us. It starts working when a parent switches it on.',
      copy: 'Copy',
      copied: 'Copied',
      status: { pending: 'Waiting for parent', active: 'Active', expired: 'Expired', revoked: 'Revoked' },
      views: (n) => `Opened: ${n}`,
      until: (d) => `until ${d}`,
      revoke: 'Revoke',
      empty: 'No links yet.',
      errors: {
        NO_PARENT_LINK: 'You need a parent linked in CloudPulse first — they switch the link on.',
        TOO_MANY_LINKS: 'At most 3 active links. Revoke one you no longer need.',
        BAD_NAME: 'Name: 1 to 60 characters.',
        BAD_RECIPIENT: '“For whom”: 1 to 80 characters.',
        GENERIC: 'That did not work. Please try again.',
      },
      parentTitle: 'Passport for scouts — your decision',
      parentBody: (child, r) => `${child} wants to share a summary with: ${r}.`,
      parentIncludes: 'Visible:',
      approve: 'Switch the link on',
      decline: 'Decline',
      parentActive: (v) => `The link is active. Opened: ${v}.`,
    },
    cv: {
      title: 'Athlete passport',
      verified: 'Data from CloudPulse: the athlete’s check-ins and sessions, scores computed by the engine. Not edited by hand.',
      invalidTitle: 'This link does not work',
      invalidBody: 'It has expired, was revoked, or a parent has not switched it on yet.',
      loading: 'Loading…',
      forRecipient: (r) => `For: ${r}`,
      sport: 'Sport',
      period: (f, t) => `Period: ${f} — ${t}`,
      disciplineTitle: 'Regularity',
      weeks: (w, of) => `Active in ${w} of ${of} weeks`,
      checkinDays: (n, of) => `Checked in on ${n} of ${of} days`,
      longestStreak: (n) => `Longest check-in streak: ${n} days`,
      sessions: (n) => `Sessions logged: ${n}`,
      readinessTitle: 'Readiness by month',
      readinessHint: 'Colour of the day from the check-in: green — full load, yellow — reduced, red — recovery.',
      avg: 'avg',
      green: 'green',
      yellow: 'yellow',
      red: 'red',
      healthTitle: 'Health (shared by the athlete)',
      painReports: (n) => `Pain reports in 12 months: ${n}`,
      returnsConfirmed: (n) => `Returns after pain confirmed by the coach: ${n}`,
      healthNote: 'This is not a medical document or a diagnosis.',
      gradesTitle: 'School',
      gradesBody: 'School grades are not shown here: there is no school confirmation yet.',
      source: 'CloudPulse — a readiness app for young athletes.',
      ref: (id, until) => `Passport ${id} · link valid until ${until}`,
      print: 'Print / PDF',
    },
    travel: {
      coachTitle: 'Away trips',
      coachSubtitle: 'After a long journey — 48 hours of recovery',
      tripTitle: 'Where',
      tripTitlePlaceholder: 'e.g. Liepāja, cup',
      matchDate: 'Match',
      returnDate: 'Back home',
      hours: 'Hours on the road (there and back)',
      hoursHint: (m) => `From ${m} hours the “after the trip” mode switches on.`,
      add: 'Add trip',
      adding: 'Saving…',
      errors: {
        TITLE: 'Name: 1 to 60 characters.',
        MATCH_DATE: 'Set the match date.',
        RETURN_DATE: 'Back home: on the match day or within 7 days after.',
        HOURS: 'Hours on the road: 1 to 48.',
        GENERIC: 'Could not save. Has SQL 15 been run?',
      },
      empty: 'No trips yet.',
      tripLine: (t, d, h) => `${t} · ${d} · ${h} h on the road`,
      shortTrip: 'short journey — no recovery mode',
      recoveryUntil: (d) => `Recovery until ${d}`,
      coachReminder: 'First session back — mobility, stretching and easy work. Your call.',
      remove: 'Delete',
      athleteTitle: 'After the away trip',
      athleteBody: (h, u) => `You spent ${h} h on the road. Until ${u} your plan is easy work and mobility only, so your body recovers from sitting and short sleep.`,
      athleteDay: (n) => `Day ${n} of 2`,
      noteButton: 'Note for my teacher',
      noteLoading: 'Preparing the note…',
      noteUnavailable: 'The note is not available right now.',
      noteShow: 'Show your teacher: they scan the QR and see a verified note.',
      noteHint: 'No name and no health data in the note — only the date and hours on the road. The teacher decides.',
    },
    note: {
      title: 'Note after an away trip',
      checking: 'Checking…',
      invalid: 'Note not verified',
      invalidBody: 'The signature does not match — CloudPulse did not issue this note.',
      valid: 'CloudPulse signature verified',
      body: (d, h) => `The athlete came back from an away match on ${d} after ${h} h on the road.`,
      request: 'If possible, please consider moving oral answers by 24 hours.',
      teacherDecides: 'The teacher decides.',
      expired: (u) => `The note was valid until ${u}.`,
      id: 'Note number',
      footer: 'CloudPulse keeps no name or health data here.',
    },
  },
} satisfies Record<Lang, ExtraCopy>;
