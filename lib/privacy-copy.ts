import type { Lang } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Texts for /privacy, the guardian confirmation and the data-deletion panel.
// Kept in one file (like lib/strain-copy.ts) so the legal text can be read,
// reviewed and corrected in one place, in all three languages.
//
// Facts written here must match the code and the database:
//   - who sees what: supabase/sql/06, 16, 17, 18 and lib/safety-pass.ts;
//   - deletion: public.delete_my_data() in supabase/sql/17;
//   - guardian confirmation: lib/guardian-rules.ts.
// Decisions the team must confirm before 06.11 are marked in the handover
// notes (retention wording, server region, contact address).
// ---------------------------------------------------------------------------

export const PRIVACY_UPDATED = '12.10.2026';

export type PolicySection = { h: string; p?: string[]; ul?: string[] };

export type PrivacyCopy = {
  pageTitle: string;
  updated: string;
  lead: string;
  langLabel: string;
  back: string;
  sections: PolicySection[];
  contactLabel: string;
};

export const PRIVACY: Record<Lang, PrivacyCopy> = {
  en: {
    pageTitle: 'Privacy and data',
    updated: `Last updated ${PRIVACY_UPDATED}`,
    lead: 'Lotus helps young athletes see how ready they are to train, using a short daily check-in. It is a student project made for the Samsung Solve for Tomorrow competition in Latvia. Below is what we keep, why, who can see it, and how to delete it.',
    langLabel: 'Language',
    back: 'Back',
    contactLabel: 'Contact',
    sections: [
      {
        h: 'What we collect',
        ul: [
          'Account: your email address. Your password is handled by Supabase Auth; we never see it.',
          'Profile: age bracket (13–15, 16–17, 18+), sport, your role, and your match and exam dates.',
          'Daily check-in: sleep, stress, fatigue and muscle soreness on a 1–7 scale, whether you have pain and in which body zone, and training sessions (effort and minutes).',
          'Calculated from those: a readiness score, a traffic-light colour and a training-load ratio.',
          'Chat with the AI coach: your messages, sent to an external AI service only to write the reply.',
          'Heart-rate and similar device data exist only on demo accounts used for the competition jury.',
        ],
        p: ['Check-in answers and pain information are health data. We process them only with your explicit consent (GDPR Art. 9(2)(a)), which you give by using the check-in.'],
      },
      {
        h: 'Why we collect it',
        ul: [
          'To show you your own readiness and to warn you when your load or recovery looks risky.',
          'To give your coach a team picture, and, only if you switch it on, to tell a parent or the school how you are doing.',
          'We do not sell data, show advertising or build profiles beyond the readiness calculation.',
        ],
        p: ['Lotus is not a medical device and does not diagnose. For pain or injury, speak to a doctor, the school nurse or a physiotherapist. The AI reads the numbers; the person decides.'],
      },
      {
        h: 'Who can see what',
        ul: [
          'You: all of your own data.',
          'Your coach (only after you joined their team with an invite): traffic-light colour, readiness score, load ratio, pain flag and body zone, sport, age, and your match and exam dates. Not your individual 1–7 answers, and not your chat.',
          'A parent (only if you switch it on, per type): the colour of the day for the last week, restrictions and your coach’s reply; match and exam dates are a separate switch. No scores, no answers.',
          'The school (only if you switch it on): the traffic light and, separately, exam dates, in a group view. Groups smaller than 3 people are not shown.',
          'Safety Pass (a code you show a teacher or nurse): the date, a restriction level and a reason code. It carries no name and no body zone.',
          'The project owner can lock the app or ban an account, and processes deletion requests.',
          'Service providers: Supabase (database and sign-in), Vercel (website hosting) and the AI service used for the chat.',
        ],
        p: ['Access is enforced in the database (row-level security). This is a student project and has not had an external security audit.'],
      },
      {
        h: 'Young people (under 18)',
        ul: [
          'Lotus is for people aged 13 and over.',
          'If you are under 18, a parent or the school can get access only after a parent or guardian has confirmed it. The confirmation is a tick-box with a date; it is not an identity check. The database refuses to turn the sharing on without it.',
          'You can switch each kind of sharing off at any time in Settings.',
        ],
      },
      {
        h: 'How long we keep it',
        p: [
          'Your data is kept while your account exists. When you delete it (below), your check-ins, training sessions, profile and everything linked to the profile are removed immediately. We do not delete data automatically on a timer yet; after the competition the team reviews and removes inactive pilot accounts.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'You can see and correct your data in the app, withdraw consent by switching sharing off, ask for a copy, and delete your data. You can also complain to the Data State Inspectorate of Latvia (Datu valsts inspekcija).',
        ],
      },
    ],
  },
  lv: {
    pageTitle: 'Privātums un dati',
    updated: `Atjaunināts ${PRIVACY_UPDATED}`,
    lead: 'Lotus palīdz jauniem sportistiem saprast, cik viņi ir gatavi treniņam, izmantojot īsu ikdienas pārbaudi. Tas ir skolēnu projekts Samsung Solve for Tomorrow konkursam Latvijā. Zemāk: ko glabājam, kāpēc, kas to var redzēt un kā to izdzēst.',
    langLabel: 'Valoda',
    back: 'Atpakaļ',
    contactLabel: 'Kontakti',
    sections: [
      {
        h: 'Ko mēs vācam',
        ul: [
          'Konts: tava e-pasta adrese. Paroli apstrādā Supabase Auth, mēs to neredzam.',
          'Profils: vecuma grupa (13–15, 16–17, 18+), sporta veids, loma, spēļu un eksāmenu datumi.',
          'Ikdienas pārbaude: miegs, stress, nogurums un muskuļu sāpes skalā 1–7, vai ir sāpes un kurā ķermeņa daļā, kā arī treniņi (piepūle un minūtes).',
          'No tiem aprēķina: gatavības punktus, luksofora krāsu un slodzes attiecību.',
          'Tērzēšana ar AI treneri: tavas ziņas, kuras ārējam AI pakalpojumam nosūta tikai atbildes sagatavošanai.',
          'Pulsa un līdzīgi ierīču dati ir tikai demo kontos, ko izmanto konkursa žūrijai.',
        ],
        p: ['Pārbaudes atbildes un informācija par sāpēm ir veselības dati. Mēs tos apstrādājam tikai ar tavu skaidru piekrišanu (VDAR 9. panta 2. punkta a) apakšpunkts), ko tu sniedz, izmantojot pārbaudi.'],
      },
      {
        h: 'Kāpēc mēs to vācam',
        ul: [
          'Lai parādītu tavu gatavību un brīdinātu, kad slodze vai atgūšanās izskatās riskanta.',
          'Lai treneris redzētu komandas kopainu un, tikai ja tu to ieslēdz, lai vecāks vai skola zinātu, kā tev iet.',
          'Mēs nepārdodam datus, nerādām reklāmu un neveidojam profilus ārpus gatavības aprēķina.',
        ],
        p: ['Lotus nav medicīnas ierīce un nenosaka diagnozes. Sāpju vai traumas gadījumā vērsies pie ārsta, skolas medmāsas vai fizioterapeita. AI nolasa skaitļus, lēmumu pieņem cilvēks.'],
      },
      {
        h: 'Kas ko redz',
        ul: [
          'Tu: visus savus datus.',
          'Treneris (tikai pēc tam, kad tu pievienojies viņa komandai ar ielūgumu): luksofora krāsu, gatavības punktus, slodzes attiecību, sāpju atzīmi un ķermeņa daļu, sporta veidu, vecumu, spēļu un eksāmenu datumus. Nevis atsevišķās atbildes 1–7 un nevis tērzēšanu.',
          'Vecāks (tikai ja tu ieslēdz, katram veidam atsevišķi): dienas krāsu pēdējai nedēļai, ierobežojumus un trenera atbildi; spēļu un eksāmenu datumi ir atsevišķs slēdzis. Bez punktiem un atbildēm.',
          'Skola (tikai ja tu ieslēdz): luksoforu un atsevišķi eksāmenu datumus grupas skatā. Grupas, kurās ir mazāk par 3 cilvēkiem, netiek rādītas.',
          'Drošības caurlaide (kods, ko parādi skolotājam vai medmāsai): datums, ierobežojuma līmenis un iemesla kods. Tajā nav vārda un ķermeņa daļas.',
          'Projekta īpašnieks var slēgt lietotni vai bloķēt kontu un apstrādā dzēšanas pieprasījumus.',
          'Pakalpojumu sniedzēji: Supabase (datubāze un pieteikšanās), Vercel (vietnes mitināšana) un AI pakalpojums tērzēšanai.',
        ],
        p: ['Piekļuve tiek nodrošināta datubāzē (rindu līmeņa drošība). Šis ir skolēnu projekts, un tam nav veikts ārējs drošības audits.'],
      },
      {
        h: 'Jaunieši (līdz 18 gadiem)',
        ul: [
          'Lotus paredzēts cilvēkiem no 13 gadu vecuma.',
          'Ja tev nav 18 gadu, vecāks vai skola var saņemt piekļuvi tikai pēc vecāka vai aizbildņa apstiprinājuma. Apstiprinājums ir atzīme ar datumu, nevis personas pārbaude. Datubāze neļauj ieslēgt kopīgošanu bez tā.',
          'Katru kopīgošanas veidu vari izslēgt jebkurā brīdī iestatījumos.',
        ],
      },
      {
        h: 'Cik ilgi glabājam',
        p: [
          'Dati tiek glabāti, kamēr pastāv tavs konts. Kad tu tos izdzēs (zemāk), pārbaudes, treniņi, profils un viss, kas ar profilu saistīts, tiek noņemts uzreiz. Automātiskas dzēšanas pēc laika pagaidām nav; pēc konkursa komanda pārskata un noņem neaktīvos pilota kontus.',
        ],
      },
      {
        h: 'Tavas tiesības',
        p: [
          'Tu vari redzēt un labot datus lietotnē, atsaukt piekrišanu, izslēdzot kopīgošanu, lūgt kopiju un dzēst datus. Vari arī iesniegt sūdzību Datu valsts inspekcijai.',
        ],
      },
    ],
  },
  ru: {
    pageTitle: 'Приватность и данные',
    updated: `Обновлено ${PRIVACY_UPDATED}`,
    lead: 'Lotus помогает юным спортсменам понять, насколько они готовы к тренировке, по короткому ежедневному чек-ину. Это школьный проект для конкурса Samsung Solve for Tomorrow в Латвии. Ниже: что мы храним, зачем, кто это видит и как всё удалить.',
    langLabel: 'Язык',
    back: 'Назад',
    contactLabel: 'Контакты',
    sections: [
      {
        h: 'Что мы собираем',
        ul: [
          'Аккаунт: твой email. Пароль обрабатывает Supabase Auth, мы его не видим.',
          'Профиль: возрастная группа (13–15, 16–17, 18+), вид спорта, роль, даты матчей и экзаменов.',
          'Ежедневный чек-ин: сон, стресс, усталость и мышечная боль по шкале 1–7, есть ли боль и в какой зоне тела, а также тренировки (усилие и минуты).',
          'Из этого считается: балл готовности, цвет светофора и соотношение нагрузки.',
          'Чат с AI-тренером: твои сообщения, которые уходят во внешний AI-сервис только для ответа.',
          'Пульс и похожие данные с устройств есть только на демо-аккаунтах для жюри конкурса.',
        ],
        p: ['Ответы чек-ина и сведения о боли относятся к данным о здоровье. Мы обрабатываем их только с твоего явного согласия (GDPR, ст. 9(2)(a)), которое ты даёшь, проходя чек-ин.'],
      },
      {
        h: 'Зачем мы это собираем',
        ul: [
          'Чтобы показывать тебе твою готовность и предупреждать, когда нагрузка или восстановление выглядят рискованно.',
          'Чтобы тренер видел картину по команде, а родитель или школа, только если ты это включишь, знали, как у тебя дела.',
          'Мы не продаём данные, не показываем рекламу и не строим профили сверх расчёта готовности.',
        ],
        p: ['Lotus не медицинское устройство и не ставит диагнозы. При боли или травме обратись к врачу, школьной медсестре или физиотерапевту. AI читает цифры, решает человек.'],
      },
      {
        h: 'Кто что видит',
        ul: [
          'Ты: все свои данные.',
          'Тренер (только после того, как ты вступил в его команду по приглашению): цвет светофора, балл готовности, соотношение нагрузки, отметку о боли и зону тела, вид спорта, возраст, даты матчей и экзаменов. Не твои отдельные ответы 1–7 и не чат.',
          'Родитель (только если ты включишь, по каждому виду отдельно): цвет дня за последнюю неделю, ограничения и ответ тренера; даты матчей и экзаменов — отдельный переключатель. Без баллов и ответов.',
          'Школа (только если ты включишь): светофор и, отдельно, даты экзаменов в групповом виде. Группы меньше 3 человек не показываются.',
          'Safety Pass (код, который ты показываешь учителю или медсестре): дата, уровень ограничения и код причины. Без имени и без зоны тела.',
          'Владелец проекта может закрыть приложение или заблокировать аккаунт и обрабатывает запросы на удаление.',
          'Сервисы: Supabase (база данных и вход), Vercel (хостинг сайта) и AI-сервис для чата.',
        ],
        p: ['Доступ ограничивается в самой базе данных (row-level security). Это школьный проект, внешнего аудита безопасности он не проходил.'],
      },
      {
        h: 'Молодые пользователи (до 18 лет)',
        ul: [
          'Lotus для тех, кому 13 лет и больше.',
          'Если тебе нет 18, родитель или школа получают доступ только после подтверждения родителя или опекуна. Подтверждение — это галочка с датой, а не проверка личности. База данных не даёт включить доступ без неё.',
          'Каждый вид доступа можно выключить в любой момент в настройках.',
        ],
      },
      {
        h: 'Как долго мы храним',
        p: [
          'Данные хранятся, пока существует твой аккаунт. Когда ты удаляешь данные (ниже), чек-ины, тренировки, профиль и всё, что к нему привязано, удаляются сразу. Автоматического удаления по таймеру пока нет; после конкурса команда проверяет и удаляет неактивные пилотные аккаунты.',
        ],
      },
      {
        h: 'Твои права',
        p: [
          'Ты можешь смотреть и исправлять данные в приложении, отозвать согласие, выключив доступ, запросить копию и удалить данные. Ещё можно подать жалобу в Государственную инспекцию данных Латвии (Datu valsts inspekcija).',
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Guardian confirmation (onboarding + sharing switches).
// ---------------------------------------------------------------------------
export type GuardianCopy = {
  title: string;
  body: string;
  checkbox: string;
  privacyLink: string;
  saved: string;
  lockedHint: string;
  confirmNow: string;
  saveFailed: string;
  under13: string;
  /** (i) button and the slide-up sheet with the details */
  moreLabel: string;
  close: string;
  points: string[];
};

export const GUARDIAN: Record<Lang, GuardianCopy> = {
  en: {
    title: 'Parent or guardian',
    body: 'You can use Lotus on your own. To let a parent or the school see how you are doing, a parent or guardian must agree first.',
    checkbox: 'My parent or guardian knows I use Lotus and agrees that I may share my status with a parent or the school.',
    privacyLink: 'Read what Lotus stores',
    saved: 'Confirmed. You can now switch sharing on.',
    lockedHint: 'Sharing is locked until a parent or guardian confirms. Tick the box below.',
    confirmNow: 'Confirm',
    saveFailed: 'Could not save the confirmation. Try again.',
    under13: 'Lotus is for ages 13 and over.',
    moreLabel: 'What this tick means',
    close: 'Close',
    points: [
      'Without the tick you use Lotus on your own as usual. Nothing is shared.',
      'With it, you may choose to let a parent or the school see your status colour (green, yellow, red) and, if you allow it, your calendar. Never your check-in answers.',
      'You can switch sharing off at any time in Settings.',
      'The tick is a confirmation from you, not an identity check.',
    ],
  },
  lv: {
    title: 'Vecāks vai aizbildnis',
    body: 'Lotus vari lietot pats. Lai vecāks vai skola redzētu, kā tev iet, vispirms jāpiekrīt vecākam vai aizbildnim.',
    checkbox: 'Mans vecāks vai aizbildnis zina, ka lietoju Lotus, un piekrīt, ka drīkstu kopīgot savu statusu ar vecāku vai skolu.',
    privacyLink: 'Ko Lotus glabā',
    saved: 'Apstiprināts. Tagad vari ieslēgt kopīgošanu.',
    lockedHint: 'Kopīgošana ir bloķēta, līdz vecāks vai aizbildnis apstiprina. Atzīmē lodziņu zemāk.',
    confirmNow: 'Apstiprināt',
    saveFailed: 'Neizdevās saglabāt apstiprinājumu. Mēģini vēlreiz.',
    under13: 'Lotus paredzēts no 13 gadu vecuma.',
    moreLabel: 'Ko nozīmē šī atzīme',
    close: 'Aizvērt',
    points: [
      'Bez atzīmes tu lieto Lotus pats, kā ierasts. Nekas netiek kopīgots.',
      'Ar to tu vari ļaut vecākam vai skolai redzēt sava statusa krāsu (zaļa, dzeltena, sarkana) un, ja atļauj, savu kalendāru. Nekad ne tavas atbildes.',
      'Kopīgošanu vari jebkurā brīdī izslēgt iestatījumos.',
      'Atzīme ir tavs apstiprinājums, nevis identitātes pārbaude.',
    ],
  },
  ru: {
    title: 'Родитель или опекун',
    body: 'Пользоваться Lotus можно самому. Чтобы родитель или школа видели, как у тебя дела, сначала должен согласиться родитель или опекун.',
    checkbox: 'Мой родитель или опекун знает, что я пользуюсь Lotus, и согласен, что я могу делиться статусом с родителем или школой.',
    privacyLink: 'Что хранит Lotus',
    saved: 'Подтверждено. Теперь можно включить доступ.',
    lockedHint: 'Доступ закрыт, пока родитель или опекун не подтвердит. Поставь галочку ниже.',
    confirmNow: 'Подтвердить',
    saveFailed: 'Не удалось сохранить подтверждение. Попробуй ещё раз.',
    under13: 'Lotus для тех, кому 13 лет и больше.',
    moreLabel: 'Что значит эта галочка',
    close: 'Закрыть',
    points: [
      'Без галочки ты пользуешься Lotus сам, как обычно. Никто ничего не видит.',
      'С ней ты можешь разрешить родителю или школе видеть цвет твоего статуса (зелёный, жёлтый, красный) и, если разрешишь, календарь. Твои ответы — никогда.',
      'Доступ можно выключить в любой момент в настройках.',
      'Галочка — твоё подтверждение, а не проверка личности.',
    ],
  },
};

// ---------------------------------------------------------------------------
// Data deletion panel.
// ---------------------------------------------------------------------------
export type DeleteCopy = {
  title: string;
  body: string;
  signInFirst: string;
  signIn: string;
  button: string;
  confirmBody: string;
  confirmButton: string;
  cancel: string;
  working: string;
  done: string;
  failed: string;
};

export const DELETE_DATA: Record<Lang, DeleteCopy> = {
  en: {
    title: 'Delete my data',
    body: 'One tap removes your check-ins, training sessions, profile and everything linked to it (team, sharing, alerts). It cannot be undone. Your sign-in record is removed by the project owner after the request.',
    signInFirst: 'Sign in to delete your data.',
    signIn: 'Sign in',
    button: 'Delete my data',
    confirmBody: 'This permanently deletes your data. Continue?',
    confirmButton: 'Yes, delete everything',
    cancel: 'Cancel',
    working: 'Deleting…',
    done: 'Your data was deleted. You are being signed out.',
    failed: 'Deletion did not finish. Nothing was lost; try again or contact the team.',
  },
  lv: {
    title: 'Dzēst manus datus',
    body: 'Ar vienu pieskārienu tiek noņemtas tavas pārbaudes, treniņi, profils un viss, kas ar to saistīts (komanda, kopīgošana, brīdinājumi). To nevar atsaukt. Tavu pieteikšanās ierakstu pēc pieprasījuma noņem projekta īpašnieks.',
    signInFirst: 'Piesakies, lai izdzēstu savus datus.',
    signIn: 'Pieteikties',
    button: 'Dzēst manus datus',
    confirmBody: 'Dati tiks neatgriezeniski izdzēsti. Turpināt?',
    confirmButton: 'Jā, dzēst visu',
    cancel: 'Atcelt',
    working: 'Dzēšu…',
    done: 'Tavi dati ir izdzēsti. Notiek izrakstīšanās.',
    failed: 'Dzēšana netika pabeigta. Nekas nav zaudēts; mēģini vēlreiz vai sazinies ar komandu.',
  },
  ru: {
    title: 'Удалить мои данные',
    body: 'Одно нажатие удаляет твои чек-ины, тренировки, профиль и всё, что к нему привязано (команда, доступ, оповещения). Это нельзя отменить. Запись о входе после запроса удаляет владелец проекта.',
    signInFirst: 'Войди, чтобы удалить свои данные.',
    signIn: 'Войти',
    button: 'Удалить мои данные',
    confirmBody: 'Данные будут удалены навсегда. Продолжить?',
    confirmButton: 'Да, удалить всё',
    cancel: 'Отмена',
    working: 'Удаляю…',
    done: 'Данные удалены. Выполняется выход.',
    failed: 'Удаление не завершилось. Ничего не потеряно; попробуй ещё раз или напиши команде.',
  },
};
