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
