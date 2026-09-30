// adp/src/components/labels.ts
//
// UI copy for the ADP components in the three pilot languages (roadmap rule
// 6: RU / LV / EN are part of every feature). Kept inside adp/ on purpose —
// ADP does not import CloudPulse's translations.
//
// `satisfies` makes the compiler check that every language has every key.

export type AdpLang = 'ru' | 'lv' | 'en';

export const ADP_LOCALES: Readonly<Record<AdpLang, string>> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export type RadarLabels = {
  title: string;
  subtitle: string;
  current: string;
  lastMonth: string;
  axes: { physical: string; discipline: string; academics: string; recovery: string };
  trendUp: string;
  trendDown: string;
  trendSame: string;
  noData: string;
  incomplete: string;
  privacyNote: string;
  sharedNote: string;
};

export const RADAR_LABELS = {
  ru: {
    title: 'Паспорт атлета',
    subtitle: 'Ты сейчас против себя месяц назад',
    current: 'Сейчас',
    lastMonth: 'Месяц назад',
    axes: { physical: 'Физика', discipline: 'Регулярность', academics: 'Учёба', recovery: 'Восстановление' },
    trendUp: 'лучше',
    trendDown: 'ниже',
    trendSame: 'без изменений',
    noData: 'нет данных',
    incomplete: 'Для полной фигуры пока мало данных — показаны только известные точки.',
    privacyNote: 'Сравнение только с тобой. Ось «Восстановление» видишь только ты.',
    sharedNote: 'Показаны только подтверждённые оси. Данных о здоровье здесь нет.',
  },
  lv: {
    title: 'Atlēta pase',
    subtitle: 'Tu tagad pret sevi pirms mēneša',
    current: 'Tagad',
    lastMonth: 'Pirms mēneša',
    axes: { physical: 'Fiziskā forma', discipline: 'Regularitāte', academics: 'Mācības', recovery: 'Atjaunošanās' },
    trendUp: 'labāk',
    trendDown: 'zemāk',
    trendSame: 'bez izmaiņām',
    noData: 'nav datu',
    incomplete: 'Pilnai figūrai vēl ir par maz datu — parādīti tikai zināmie punkti.',
    privacyNote: 'Salīdzinājums tikai ar tevi pašu. Asi «Atjaunošanās» redzi tikai tu.',
    sharedNote: 'Parādītas tikai apstiprinātās asis. Veselības datu šeit nav.',
  },
  en: {
    title: 'Athlete passport',
    subtitle: 'You now vs you a month ago',
    current: 'Now',
    lastMonth: 'A month ago',
    axes: { physical: 'Physical', discipline: 'Consistency', academics: 'Academics', recovery: 'Recovery' },
    trendUp: 'up',
    trendDown: 'down',
    trendSame: 'no change',
    noData: 'no data',
    incomplete: 'Not enough data for the full shape yet — only known points are shown.',
    privacyNote: 'Compared with yourself only. Only you can see the Recovery axis.',
    sharedNote: 'Verified axes only. No health data here.',
  },
} satisfies Record<AdpLang, RadarLabels>;

export type RescheduleLabels = {
  kicker: string;
  assessment: (subject: string, day: string) => string;
  reasons: { competition: string; travel: string; medical: string };
  medicalNote: string;
  summons: (eventName: string, from: string, to: string, issuedBy: string) => string;
  chooseDate: string;
  moveTo: (day: string) => string;
  reject: string;
  rejectConfirm: string;
  rejectFinalHint: string;
  rejectNotePlaceholder: string;
  cancel: string;
  approved: (day: string) => string;
  rejected: string;
  error: string;
  finalNote: string;
};

export const RESCHEDULE_LABELS = {
  ru: {
    kicker: 'Запрос на перенос',
    assessment: (subject, day) => `${subject} · контрольная ${day}`,
    reasons: { competition: 'Соревнования', travel: 'Выезд команды', medical: 'Медицинская причина' },
    medicalNote: 'Подробности не передаются учителю — только сам факт причины.',
    summons: (eventName, from, to, issuedBy) => `Вызов: ${eventName}, ${from}–${to}. Выдал: ${issuedBy}.`,
    chooseDate: 'Выберите новую дату — это одобрит перенос:',
    moveTo: (day) => `Перенести на ${day}`,
    reject: 'Отклонить',
    rejectConfirm: 'Отклонить окончательно',
    rejectFinalHint: 'Решение окончательное: повторно этот запрос не придёт.',
    rejectNotePlaceholder: 'Комментарий для ученика (необязательно)',
    cancel: 'Отмена',
    approved: (day) => `Одобрено: новая дата ${day}`,
    rejected: 'Отклонено',
    error: 'Не удалось сохранить решение. Попробуйте ещё раз.',
    finalNote: 'Система только предложила перенос. Решение принимаете вы.',
  },
  lv: {
    kicker: 'Pārcelšanas pieprasījums',
    assessment: (subject, day) => `${subject} · pārbaudes darbs ${day}`,
    reasons: { competition: 'Sacensības', travel: 'Komandas izbraukums', medical: 'Medicīnisks iemesls' },
    medicalNote: 'Sīkāka informācija skolotājam netiek nodota — tikai iemesla fakts.',
    summons: (eventName, from, to, issuedBy) => `Izsaukums: ${eventName}, ${from}–${to}. Izsniedza: ${issuedBy}.`,
    chooseDate: 'Izvēlieties jauno datumu — tas apstiprinās pārcelšanu:',
    moveTo: (day) => `Pārcelt uz ${day}`,
    reject: 'Noraidīt',
    rejectConfirm: 'Noraidīt galīgi',
    rejectFinalHint: 'Lēmums ir galīgs: šis pieprasījums atkārtoti nepienāks.',
    rejectNotePlaceholder: 'Komentārs skolēnam (nav obligāts)',
    cancel: 'Atcelt',
    approved: (day) => `Apstiprināts: jaunais datums ${day}`,
    rejected: 'Noraidīts',
    error: 'Neizdevās saglabāt lēmumu. Mēģiniet vēlreiz.',
    finalNote: 'Sistēma tikai ierosināja pārcelšanu. Lēmumu pieņemat jūs.',
  },
  en: {
    kicker: 'Reschedule request',
    assessment: (subject, day) => `${subject} · test on ${day}`,
    reasons: { competition: 'Competition', travel: 'Team travel', medical: 'Medical reason' },
    medicalNote: 'No details are shared with teachers — only that a reason exists.',
    summons: (eventName, from, to, issuedBy) => `Summons: ${eventName}, ${from}–${to}. Issued by ${issuedBy}.`,
    chooseDate: 'Pick the new date — this approves the move:',
    moveTo: (day) => `Move to ${day}`,
    reject: 'Decline',
    rejectConfirm: 'Decline for good',
    rejectFinalHint: 'This decision is final: the request will not be sent again.',
    rejectNotePlaceholder: 'Note for the student (optional)',
    cancel: 'Cancel',
    approved: (day) => `Approved: new date ${day}`,
    rejected: 'Declined',
    error: 'Could not save the decision. Please try again.',
    finalNote: 'The system only suggested this. The decision is yours.',
  },
} satisfies Record<AdpLang, RescheduleLabels>;

/** '2026-10-12' → '12 окт.' / '12. okt.' / '12 Oct' — always read as a UTC calendar day. */
export function formatDay(iso: string, lang: AdpLang): string {
  return new Intl.DateTimeFormat(ADP_LOCALES[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`)
  );
}

// ---------------------------------------------------------------------------
// Soreness silhouette (idea A)
// ---------------------------------------------------------------------------

export type SorenessLabels = {
  title: string;
  subtitle: string;
  front: string;
  back: string;
  /** Short marks at the figure's edges so nobody mixes up left and right. */
  leftMark: string;
  rightMark: string;
  zones: Record<import('../types/sportProfile').BodyZone, string>;
  sides: { left: string; right: string; both: string; center: string };
  severity: Record<1 | 2 | 3 | 4 | 5, string>;
  pickLevel: string;
  bothSides: string;
  remove: string;
  done: string;
  empty: string;
  selected: (n: number, max: number) => string;
  tooMany: (max: number) => string;
  referHint: string;
  notPain: string;
  zoneAria: (zone: string, side: string, level: string | null) => string;
};

export const SORENESS_LABELS = {
  ru: {
    title: 'Карта усталости',
    subtitle: 'Нажми на мышцу, которая сегодня забита, и выбери уровень.',
    front: 'Спереди',
    back: 'Сзади',
    leftMark: 'Л',
    rightMark: 'П',
    zones: {
      chest: 'Грудь',
      shoulder_front: 'Плечо спереди',
      biceps: 'Бицепс',
      forearm: 'Предплечье',
      abdominals: 'Пресс',
      obliques: 'Косые мышцы живота',
      hip_flexors: 'Сгибатели бедра',
      adductors: 'Внутренняя поверхность бедра',
      quadriceps: 'Квадрицепс',
      shins: 'Голень спереди',
      neck_upper_traps: 'Шея и трапеция',
      shoulder_back: 'Плечо сзади',
      upper_back: 'Верх спины',
      lower_back: 'Поясница',
      triceps: 'Трицепс',
      glutes: 'Ягодицы',
      hamstrings: 'Задняя поверхность бедра',
      calves: 'Икры',
    },
    sides: { left: 'левая', right: 'правая', both: 'обе стороны', center: '' },
    severity: {
      1: 'едва заметно',
      2: 'лёгкая забитость',
      3: 'заметно забито',
      4: 'сильно забито',
      5: 'очень сильно, мешает двигаться',
    },
    pickLevel: 'Насколько забито?',
    bothSides: 'Обе стороны',
    remove: 'Убрать',
    done: 'Готово',
    empty: 'Ничего не забито — отлично.',
    selected: (n, max) => `Отмечено: ${n} из ${max}`,
    tooMany: (max) => `Можно отметить не больше ${max} зон. Если забито почти всё — это общая усталость, её учитывает чек-ин.`,
    referHint:
      'Для этой зоны план не даст упражнений. Скажи тренеру; если не проходит — врач, школьная медсестра или физиотерапевт.',
    notPain:
      'Острая боль, отёк или боль в суставе — это не забитость. Отметь боль в чек-ине и скажи тренеру.',
    zoneAria: (zone, side, level) => `${zone}${side ? `, ${side}` : ''}: ${level ?? 'не отмечено'}`,
  },
  lv: {
    title: 'Noguruma karte',
    subtitle: 'Pieskaries muskulim, kas šodien ir sasprindzis, un izvēlies līmeni.',
    front: 'No priekšas',
    back: 'No mugurpuses',
    leftMark: 'K',
    rightMark: 'L',
    zones: {
      chest: 'Krūtis',
      shoulder_front: 'Plecs priekšā',
      biceps: 'Bicepss',
      forearm: 'Apakšdelms',
      abdominals: 'Vēdera prese',
      obliques: 'Slīpie vēdera muskuļi',
      hip_flexors: 'Gūžas saliecēji',
      adductors: 'Augšstilba iekšpuse',
      quadriceps: 'Kvadricepss',
      shins: 'Apakšstilbs priekšā',
      neck_upper_traps: 'Kakls un trapecveida muskulis',
      shoulder_back: 'Plecs aizmugurē',
      upper_back: 'Muguras augšdaļa',
      lower_back: 'Muguras lejasdaļa',
      triceps: 'Tricepss',
      glutes: 'Sēžamvieta',
      hamstrings: 'Augšstilba aizmugure',
      calves: 'Ikri',
    },
    sides: { left: 'kreisā', right: 'labā', both: 'abas puses', center: '' },
    severity: {
      1: 'tikko jūtams',
      2: 'viegli sasprindzis',
      3: 'jūtami sasprindzis',
      4: 'stipri sasprindzis',
      5: 'ļoti stipri, traucē kustēties',
    },
    pickLevel: 'Cik stipri?',
    bothSides: 'Abas puses',
    remove: 'Noņemt',
    done: 'Gatavs',
    empty: 'Nekas nav sasprindzis — lieliski.',
    selected: (n, max) => `Atzīmēts: ${n} no ${max}`,
    tooMany: (max) => `Var atzīmēt ne vairāk kā ${max} zonas. Ja sasprindzis ir gandrīz viss — tas ir vispārējs nogurums, to ņem vērā reģistrācija.`,
    referHint:
      'Šai zonai plāns nedos vingrinājumus. Pasaki trenerim; ja nepāriet — ārsts, skolas medmāsa vai fizioterapeits.',
    notPain:
      'Akūtas sāpes, tūska vai sāpes locītavā nav sasprindzinājums. Atzīmē sāpes reģistrācijā un pasaki trenerim.',
    zoneAria: (zone, side, level) => `${zone}${side ? `, ${side}` : ''}: ${level ?? 'nav atzīmēts'}`,
  },
  en: {
    title: 'Soreness map',
    subtitle: 'Tap a muscle that feels tight today and pick a level.',
    front: 'Front',
    back: 'Back',
    leftMark: 'L',
    rightMark: 'R',
    zones: {
      chest: 'Chest',
      shoulder_front: 'Front shoulder',
      biceps: 'Biceps',
      forearm: 'Forearm',
      abdominals: 'Abs',
      obliques: 'Obliques',
      hip_flexors: 'Hip flexors',
      adductors: 'Inner thigh',
      quadriceps: 'Quads',
      shins: 'Front of shin',
      neck_upper_traps: 'Neck and upper traps',
      shoulder_back: 'Back of shoulder',
      upper_back: 'Upper back',
      lower_back: 'Lower back',
      triceps: 'Triceps',
      glutes: 'Glutes',
      hamstrings: 'Hamstrings',
      calves: 'Calves',
    },
    sides: { left: 'left', right: 'right', both: 'both sides', center: '' },
    severity: {
      1: 'barely notice it',
      2: 'a little tight',
      3: 'clearly tight',
      4: 'very tight',
      5: 'so tight it limits movement',
    },
    pickLevel: 'How tight?',
    bothSides: 'Both sides',
    remove: 'Remove',
    done: 'Done',
    empty: 'Nothing feels tight — great.',
    selected: (n, max) => `Marked: ${n} of ${max}`,
    tooMany: (max) => `You can mark up to ${max} zones. If almost everything is tight, that is general fatigue — the check-in covers it.`,
    referHint:
      'No drills for this zone today. Tell your coach; if it does not ease — a doctor, the school nurse or a physio.',
    notPain: 'Sharp pain, swelling or pain in a joint is not tightness. Report pain in the check-in and tell your coach.',
    zoneAria: (zone, side, level) => `${zone}${side ? `, ${side}` : ''}: ${level ?? 'not marked'}`,
  },
} satisfies Record<AdpLang, SorenessLabels>;

// ---------------------------------------------------------------------------
// Preview page /demo/adp-ai-coach
// ---------------------------------------------------------------------------

export type AdpPreviewLabels = {
  badge: string;
  title: string;
  subtitle: string;
  outputTitle: string;
  outputNote: string;
  back: string;
};

export const ADP_PREVIEW_LABELS = {
  ru: {
    badge: 'Превью ADP · безопасный ИИ-тренер',
    title: 'Карта усталости',
    subtitle: 'Отметь забитые мышцы — из этого модуль тренера соберёт план на сегодня в пределах лимита движка готовности.',
    outputTitle: 'Что уходит в модуль тренера',
    outputNote: 'Ровно этот массив сохраняется в чек-ине (adp.check_ins.soreness_zones). Имени и id спортсмена в нём нет.',
    back: 'К демо',
  },
  lv: {
    badge: 'ADP priekšskatījums · drošs AI treneris',
    title: 'Noguruma karte',
    subtitle: 'Atzīmē sasprindzinātos muskuļus — no tā trenera modulis saliks šodienas plānu gatavības dzinēja robežās.',
    outputTitle: 'Kas nonāk trenera modulī',
    outputNote: 'Tieši šis masīvs tiek saglabāts reģistrācijā (adp.check_ins.soreness_zones). Sportista vārda un id tajā nav.',
    back: 'Uz demo',
  },
  en: {
    badge: 'ADP preview · safe AI coach',
    title: 'Soreness map',
    subtitle: 'Mark the tight muscles — the coach module builds today’s plan from this, within the readiness engine’s limit.',
    outputTitle: 'What goes to the coach module',
    outputNote: 'Exactly this array is stored with the check-in (adp.check_ins.soreness_zones). No name or athlete id in it.',
    back: 'Back to demo',
  },
} satisfies Record<AdpLang, AdpPreviewLabels>;

// ---------------------------------------------------------------------------
// AI coach screen + home widget
// ---------------------------------------------------------------------------

type _LimitReason = import('../services/coachingLimits').LimitReason;
type _PlanMode = import('../types/sportProfile').PlanMode;
type _BlockKind = import('../types/sportProfile').BlockKind;
type _Ceiling = import('../types/sportProfile').LoadCeiling;

export type CoachLabels = {
  title: string;
  guardTitle: string;
  guardBody: (rules: number, ceiling: string) => string;
  sourceAi: string;
  sourceRules: string;
  ceiling: Record<_Ceiling, string>;
  modes: Record<_PlanMode, string>;
  total: (minutes: number, rpe: number) => string;
  whyTitle: string;
  reasons: Record<_LimitReason, string>;
  noReasons: string;
  roles: { relief: string; prehab: string; general: string };
  kinds: Record<_BlockKind, string>;
  min: string;
  effort: (rpe: number) => string;
  dose: (d: { sets?: number; reps?: number; seconds?: number; minutes?: number }, perSide: boolean) => string;
  forZone: (zone: string) => string;
  referredTitle: string;
  noneBody: string;
  noCheckinTitle: string;
  noCheckinBody: string;
  toCheckin: string;
  error: string;
  retry: string;
  draftNote: string;
  /** Home-session timer on /training (a stopwatch — nothing is saved). */
  timer: {
    start: string;
    pause: string;
    resume: string;
    next: string;
    restart: string;
    now: string;
    done: string;
    progress: (done: number, total: number) => string;
    note: string;
  };
  widgetTitle: string;
  widgetOpen: string;
  widgetNoCheckin: string;
  widgetSummary: (minutes: number, blocks: number) => string;
  navLabel: string;
};

export const COACH_LABELS = {
  ru: {
    title: 'Моя тренировка на сегодня',
    guardTitle: 'Safety Guard активен',
    guardBody: (rules, ceiling) =>
      `План проверен кодом по ${rules} правилам и не выходит за лимит движка готовности (сегодня — ${ceiling}). Только упражнения из каталога, без медицинских советов.`,
    sourceAi: 'Составил ИИ, проверил код',
    sourceRules: 'Собран правилами движка, без ИИ',
    ceiling: { green: 'зелёный', yellow: 'жёлтый', red: 'красный', blocked: 'стоп' },
    modes: {
      full: 'Дополнительное занятие',
      micro_dose: 'Микро-доза',
      recovery_only: 'Только восстановление',
      rtp_progression: 'Постепенное возвращение',
      none: 'Сегодня без тренировки',
    },
    total: (m, r) => `${m} мин · усилие до ${r}/10`,
    whyTitle: 'Почему такой план',
    reasons: {
      ENGINE_CEILING: 'Движок готовности сегодня снизил допустимую нагрузку.',
      RTP_NOT_CLEARED: 'После боли: пока только восстановление, пока тренер не подтвердит возвращение.',
      RTP_PROGRESSION: 'Возвращение после паузы: нагрузка растёт по шагам.',
      MATCH_NEAR: 'Матч сегодня или завтра — только лёгкая активация и подвижность.',
      MATCH_AFTER: 'День после матча — восстановление.',
      TRAVEL_RECOVERY: 'После долгой дороги с выезда — 48 часов только лёгкая работа и подвижность.',
      SEASON_PHASE: 'Фаза сезона ограничивает объём.',
      EXAM_STORM_MICRO_DOSE: 'Скоро контрольная — короткая микро-доза вместо полной тренировки.',
      SORE_ZONE_RELIEF_ONLY: 'Забитые мышцы получают только мягкую работу — никакой силовой нагрузки на них.',
      SORE_ZONE_REFERRED: 'Некоторые зоны сегодня не нагружаем совсем.',
    },
    noReasons: 'Сегодня зелёный день — обычное дополнительное занятие.',
    roles: { relief: 'Мягко для забитой мышцы', prehab: 'Профилактика для твоего спорта', general: 'Основная часть' },
    kinds: {
      mobility: 'Подвижность',
      activation: 'Активация',
      isometric: 'Удержание',
      eccentric: 'Эксцентрика',
      bodyweight_strength: 'Сила с весом тела',
      aerobic_base: 'Лёгкая аэробика',
      breathing_recovery: 'Дыхание',
    },
    min: 'мин',
    effort: (r) => `усилие до ${r}/10`,
    dose: (d, perSide) => {
      const base =
        d.minutes !== undefined
          ? `${d.minutes} мин`
          : d.reps !== undefined
            ? `${d.sets} × ${d.reps}`
            : `${d.sets} × ${d.seconds} с`;
      return perSide ? `${base} на каждую сторону` : base;
    },
    forZone: (z) => `для зоны: ${z}`,
    referredTitle: 'Эти зоны сегодня не трогаем',
    noneBody: 'Движок готовности сегодня не разрешает дополнительную тренировку. Отдыхай; если что-то беспокоит — скажи тренеру.',
    noCheckinTitle: 'Сначала чек-ин',
    noCheckinBody: 'План строится по сегодняшнему чек-ину. Пройди его — это минута.',
    toCheckin: 'К чек-ину',
    error: 'Не удалось загрузить план. Попробуй ещё раз.',
    retry: 'Обновить',
    draftNote: 'Дозировки — черновик, их утверждает тренер по ОФП. Это не медицинская рекомендация.',
    timer: {
      start: 'Старт',
      pause: 'Пауза',
      resume: 'Продолжить',
      next: 'Дальше',
      restart: 'Сначала',
      now: 'Сейчас',
      done: 'Готово',
      progress: (d, n) => `Сделано ${d} из ${n}`,
      note: 'Таймер — просто секундомер, он ничего не сохраняет.',
    },
    widgetTitle: 'Моя домашняя тренировка',
    widgetOpen: 'Открыть план',
    widgetNoCheckin: 'Пройди чек-ин — и план на сегодня появится здесь.',
    widgetSummary: (m, n) => `${m} мин · ${n} ${n === 1 ? 'блок' : n < 5 ? 'блока' : 'блоков'}`,
    navLabel: 'Тренировка',
  },
  lv: {
    title: 'Mans šodienas treniņš',
    guardTitle: 'Safety Guard aktīvs',
    guardBody: (rules, ceiling) =>
      `Plānu kods pārbaudīja pēc ${rules} noteikumiem, un tas nepārsniedz gatavības dzinēja robežu (šodien — ${ceiling}). Tikai vingrinājumi no kataloga, bez medicīniskiem padomiem.`,
    sourceAi: 'Sastādīja AI, pārbaudīja kods',
    sourceRules: 'Salikts pēc dzinēja noteikumiem, bez AI',
    ceiling: { green: 'zaļš', yellow: 'dzeltens', red: 'sarkans', blocked: 'stop' },
    modes: {
      full: 'Papildu nodarbība',
      micro_dose: 'Mikrodeva',
      recovery_only: 'Tikai atjaunošanās',
      rtp_progression: 'Pakāpeniska atgriešanās',
      none: 'Šodien bez treniņa',
    },
    total: (m, r) => `${m} min · piepūle līdz ${r}/10`,
    whyTitle: 'Kāpēc tāds plāns',
    reasons: {
      ENGINE_CEILING: 'Gatavības dzinējs šodien samazināja pieļaujamo slodzi.',
      RTP_NOT_CLEARED: 'Pēc sāpēm: pagaidām tikai atjaunošanās, līdz treneris apstiprina atgriešanos.',
      RTP_PROGRESSION: 'Atgriešanās pēc pauzes: slodze pieaug pa soļiem.',
      MATCH_NEAR: 'Spēle šodien vai rīt — tikai viegla aktivācija un kustīgums.',
      MATCH_AFTER: 'Diena pēc spēles — atjaunošanās.',
      TRAVEL_RECOVERY: 'Pēc gara ceļa no izbraukuma — 48 stundas tikai viegls darbs un kustīgums.',
      SEASON_PHASE: 'Sezonas fāze ierobežo apjomu.',
      EXAM_STORM_MICRO_DOSE: 'Drīz kontroldarbs — īsa mikrodeva pilna treniņa vietā.',
      SORE_ZONE_RELIEF_ONLY: 'Sasprindzinātie muskuļi saņem tikai maigu darbu — bez spēka slodzes.',
      SORE_ZONE_REFERRED: 'Dažas zonas šodien nenoslogojam nemaz.',
    },
    noReasons: 'Šodien zaļā diena — parasta papildu nodarbība.',
    roles: { relief: 'Maigi sasprindzinātajam muskulim', prehab: 'Profilakse tavam sporta veidam', general: 'Pamatdaļa' },
    kinds: {
      mobility: 'Kustīgums',
      activation: 'Aktivācija',
      isometric: 'Noturēšana',
      eccentric: 'Ekscentrika',
      bodyweight_strength: 'Spēks ar ķermeņa svaru',
      aerobic_base: 'Viegla aerobika',
      breathing_recovery: 'Elpošana',
    },
    min: 'min',
    effort: (r) => `piepūle līdz ${r}/10`,
    dose: (d, perSide) => {
      const base =
        d.minutes !== undefined
          ? `${d.minutes} min`
          : d.reps !== undefined
            ? `${d.sets} × ${d.reps}`
            : `${d.sets} × ${d.seconds} s`;
      return perSide ? `${base} katrai pusei` : base;
    },
    forZone: (z) => `zonai: ${z}`,
    referredTitle: 'Šīs zonas šodien neaiztiekam',
    noneBody: 'Gatavības dzinējs šodien neatļauj papildu treniņu. Atpūties; ja kaut kas satrauc — pasaki trenerim.',
    noCheckinTitle: 'Vispirms reģistrācija',
    noCheckinBody: 'Plāns tiek veidots pēc šodienas reģistrācijas. Aizpildi to — tā ir minūte.',
    toCheckin: 'Uz reģistrāciju',
    error: 'Neizdevās ielādēt plānu. Mēģini vēlreiz.',
    retry: 'Atjaunot',
    draftNote: 'Devas ir melnraksts, tās apstiprina VFS treneris. Tas nav medicīnisks ieteikums.',
    timer: {
      start: 'Sākt',
      pause: 'Pauze',
      resume: 'Turpināt',
      next: 'Tālāk',
      restart: 'No sākuma',
      now: 'Tagad',
      done: 'Gatavs',
      progress: (d, n) => `Izdarīti ${d} no ${n}`,
      note: 'Taimeris ir tikai hronometrs, tas neko nesaglabā.',
    },
    widgetTitle: 'Mans mājas treniņš',
    widgetOpen: 'Atvērt plānu',
    widgetNoCheckin: 'Aizpildi reģistrāciju — un šodienas plāns parādīsies šeit.',
    widgetSummary: (m, n) => `${m} min · ${n} ${n === 1 ? 'bloks' : 'bloki'}`,
    navLabel: 'Treniņš',
  },
  en: {
    title: 'My workout for today',
    guardTitle: 'Safety Guard on',
    guardBody: (rules, ceiling) =>
      `This plan was checked by code against ${rules} rules and stays within the readiness engine’s limit (today: ${ceiling}). Catalogue exercises only, no medical advice.`,
    sourceAi: 'Written by AI, checked by code',
    sourceRules: 'Built by the engine’s rules, no AI',
    ceiling: { green: 'green', yellow: 'yellow', red: 'red', blocked: 'stop' },
    modes: {
      full: 'Extra session',
      micro_dose: 'Micro-dose',
      recovery_only: 'Recovery only',
      rtp_progression: 'Gradual return',
      none: 'No training today',
    },
    total: (m, r) => `${m} min · effort up to ${r}/10`,
    whyTitle: 'Why this plan',
    reasons: {
      ENGINE_CEILING: 'The readiness engine lowered today’s allowed load.',
      RTP_NOT_CLEARED: 'After pain: recovery only until your coach confirms your return.',
      RTP_PROGRESSION: 'Coming back after a break: the load goes up step by step.',
      MATCH_NEAR: 'Match today or tomorrow — light activation and mobility only.',
      MATCH_AFTER: 'Day after a match — recovery.',
      TRAVEL_RECOVERY: 'Back from a long away trip — 48 hours of easy work and mobility only.',
      SEASON_PHASE: 'The season phase limits the volume.',
      EXAM_STORM_MICRO_DOSE: 'Exam coming up — a short micro-dose instead of a full session.',
      SORE_ZONE_RELIEF_ONLY: 'Tight muscles get gentle work only — no strength load on them.',
      SORE_ZONE_REFERRED: 'Some areas get no load at all today.',
    },
    noReasons: 'A green day — a normal extra session.',
    roles: { relief: 'Gentle work for a tight muscle', prehab: 'Prehab for your sport', general: 'Main part' },
    kinds: {
      mobility: 'Mobility',
      activation: 'Activation',
      isometric: 'Holds',
      eccentric: 'Eccentric',
      bodyweight_strength: 'Bodyweight strength',
      aerobic_base: 'Easy aerobic',
      breathing_recovery: 'Breathing',
    },
    min: 'min',
    effort: (r) => `effort up to ${r}/10`,
    dose: (d, perSide) => {
      const base =
        d.minutes !== undefined
          ? `${d.minutes} min`
          : d.reps !== undefined
            ? `${d.sets} × ${d.reps}`
            : `${d.sets} × ${d.seconds} s`;
      return perSide ? `${base} per side` : base;
    },
    forZone: (z) => `for: ${z}`,
    referredTitle: 'We leave these areas alone today',
    noneBody: 'The readiness engine does not allow an extra session today. Rest; if something worries you, tell your coach.',
    noCheckinTitle: 'Check in first',
    noCheckinBody: 'The plan is built from today’s check-in. It takes a minute.',
    toCheckin: 'Go to check-in',
    error: 'Could not load the plan. Please try again.',
    retry: 'Refresh',
    draftNote: 'Doses are a draft for the S&C coach to approve. This is not medical advice.',
    timer: {
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      next: 'Next',
      restart: 'Restart',
      now: 'Now',
      done: 'Done',
      progress: (d, n) => `${d} of ${n} done`,
      note: 'The timer is just a stopwatch — it saves nothing.',
    },
    widgetTitle: 'My home workout',
    widgetOpen: 'Open plan',
    widgetNoCheckin: 'Do your check-in and today’s plan appears here.',
    widgetSummary: (m, n) => `${m} min · ${n} ${n === 1 ? 'block' : 'blocks'}`,
    navLabel: 'Workout',
  },
} satisfies Record<AdpLang, CoachLabels>;
