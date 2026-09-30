// adp/src/services/rehabCatalog.ts
//
// Sport-Aware AI Coach & Rehab Engine — step 2: the drill catalogue.
//
// The AI never invents an exercise. A plan may only contain ids from this
// list (types/sportProfile.ts → PlanBlock.drillIds), and step 3 rejects
// anything else. So everything an athlete can ever be told to do is here,
// reviewable by a coach, in three languages.
//
// What is in it: standard, general conditioning work — mobility, foam
// rolling, stretching, activation, isometrics, bodyweight strength, easy
// aerobic work, breathing. What is NOT in it (EU MDR): anything presented as
// treatment of an injury or a condition, anything "for tendinitis / for a
// strain". Pain is not handled here at all — pain goes to TriageSafetyGuard.
//
// Every drill has a USE:
//   relief  — gentle work that is fine on a zone that feels tight or tired
//             TODAY (mobility, rolling, stretching; RPE ≤ 2, so it also fits
//             under the red ceiling). The only thing a sore zone ever gets.
//   prehab  — strengthening for the sport's usual load areas
//             (SPORT_FOCUS_ZONES). Never given to a zone that is sore today:
//             e.g. tired calves get rolling and stretching, not eccentric
//             calf lowering — that goes into a day when they feel fine.
//   general — the body of a session: easy aerobic, bodyweight strength,
//             activation, breathing.
//
// Minutes, doses and RPE are drafts for the S&C coach to sign off (like
// TRIAGE_RULES). RPE is the CR-10 scale the CloudPulse check-in already uses.

import type { AdpLang } from '../components/labels';
import {
  BODY_ZONES,
  SPORT_FOCUS_ZONES,
  type BlockKind,
  type BodyZone,
  type CeilingRule,
  type SportType,
} from '../types/sportProfile';

export const DRILL_USES = ['relief', 'prehab', 'general'] as const;
export type DrillUse = (typeof DRILL_USES)[number];

export const EQUIPMENT = ['none', 'foam_roller', 'band', 'wall', 'mat', 'step', 'towel', 'ball', 'partner', 'bike', 'pool'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export type Dose =
  | { sets: number; reps: number }
  | { sets: number; seconds: number }
  | { minutes: number };

export type DrillText = { name: string; cue: string };

export type Drill = {
  id: string;
  kind: BlockKind;
  use: DrillUse;
  /** Zones the drill works on. Empty = whole body (aerobic, breathing). */
  zones: readonly BodyZone[];
  /** Sports where it is especially relevant. Empty = any sport. */
  sports: readonly SportType[];
  /** Typical time for the whole drill, both sides included. */
  minutes: number;
  /** Typical effort, CR-10 (1 = very easy … 10 = maximal). */
  rpe: number;
  equipment: readonly Equipment[];
  dose: Dose;
  perSide: boolean;
  text: Readonly<Record<AdpLang, DrillText>>;
};

/** Shown under every plan, in every language. */
export const STOP_RULE: Readonly<Record<AdpLang, string>> = {
  ru: 'Упражнения не должны вызывать боль. Если появилась резкая боль — остановись и отметь её в чек-ине.',
  lv: 'Vingrinājumiem nav jāizraisa sāpes. Ja parādās asas sāpes — apstājies un atzīmē tās aptaujā.',
  en: 'Exercises should not hurt. If you feel sharp pain, stop and report it in your check-in.',
};

/** For zones that get no drills today (severity too high / cautious zone). */
export const REFERRAL_LINE: Readonly<Record<AdpLang, string>> = {
  ru: 'Эту зону сегодня не нагружаем. Скажи тренеру; если не проходит — врач, школьная медсестра или физиотерапевт.',
  lv: 'Šo zonu šodien nenoslogojam. Pasaki trenerim; ja nepāriet — ārsts, skolas medmāsa vai fizioterapeits.',
  en: 'We leave this area alone today. Tell your coach; if it does not ease, see a doctor, the school nurse or a physio.',
};

type DrillDef = Omit<Drill, 'text'> & { ru: [string, string]; lv: [string, string]; en: [string, string] };

function d(def: DrillDef): Drill {
  const { ru, lv, en, ...rest } = def;
  return {
    ...rest,
    text: {
      ru: { name: ru[0], cue: ru[1] },
      lv: { name: lv[0], cue: lv[1] },
      en: { name: en[0], cue: en[1] },
    },
  };
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

export const DRILLS: readonly Drill[] = [
  // ---- relief: rolling, stretching, gentle mobility (RPE ≤ 2) -----------------
  d({
    id: 'calf_foam_roll', kind: 'mobility', use: 'relief', zones: ['calves'], sports: [],
    minutes: 2, rpe: 2, equipment: ['foam_roller'], dose: { sets: 1, seconds: 60 }, perSide: true,
    ru: ['Прокат икр роллером', 'Медленно катай икру от ахилла до подколенной ямки, не заходя на кость и под колено.'],
    lv: ['Ikru rullēšana ar rulli', 'Lēni rullē ikru no Ahileja cīpslas līdz paceles bedrītei, neuzejot uz kaula un zem ceļa.'],
    en: ['Calf foam roll', 'Roll slowly from above the heel to just below the back of the knee; stay off the bone.'],
  }),
  d({
    id: 'calf_wall_stretch', kind: 'mobility', use: 'relief', zones: ['calves'], sports: [],
    minutes: 2, rpe: 1, equipment: ['wall'], dose: { sets: 2, seconds: 30 }, perSide: true,
    ru: ['Растяжка икр у стены', 'Руки в стену, задняя нога прямая, пятка на полу. Мягко подайся вперёд.'],
    lv: ['Ikru stiepšana pie sienas', 'Rokas pret sienu, aizmugurējā kāja taisna, papēdis uz grīdas. Maigi virzies uz priekšu.'],
    en: ['Calf wall stretch', 'Hands on the wall, back leg straight, heel down. Lean in gently.'],
  }),
  d({
    id: 'quad_foam_roll', kind: 'mobility', use: 'relief', zones: ['quadriceps'], sports: [],
    minutes: 2, rpe: 2, equipment: ['foam_roller'], dose: { sets: 1, seconds: 60 }, perSide: true,
    ru: ['Прокат квадрицепса роллером', 'Лёжа на предплечьях, катай переднюю поверхность бедра от таза до колена, не заходя на коленную чашечку.'],
    lv: ['Četrgalvu muskuļa rullēšana', 'Balstā uz apakšdelmiem rullē augšstilba priekšpusi no gūžas līdz ceļgalam, neuzejot uz ceļa kauliņa.'],
    en: ['Quad foam roll', 'On your forearms, roll the front of the thigh from hip to just above the kneecap.'],
  }),
  d({
    id: 'quad_standing_stretch', kind: 'mobility', use: 'relief', zones: ['quadriceps', 'hip_flexors'], sports: [],
    minutes: 2, rpe: 1, equipment: ['wall'], dose: { sets: 2, seconds: 30 }, perSide: true,
    ru: ['Растяжка квадрицепса стоя', 'Держись за опору, пятку к ягодице, колени рядом, таз слегка вперёд.'],
    lv: ['Četrgalvu muskuļa stiepšana stāvus', 'Turies pie atbalsta, papēdi pie sēžamvietas, ceļgali blakus, iegurni nedaudz uz priekšu.'],
    en: ['Standing quad stretch', 'Hold a support, heel to glute, knees together, hips slightly forward.'],
  }),
  d({
    id: 'hamstring_foam_roll', kind: 'mobility', use: 'relief', zones: ['hamstrings'], sports: [],
    minutes: 2, rpe: 2, equipment: ['foam_roller'], dose: { sets: 1, seconds: 60 }, perSide: true,
    ru: ['Прокат задней поверхности бедра', 'Сидя, роллер под бедром, катай от ягодицы до колена, под коленом не катай.'],
    lv: ['Augšstilba aizmugures rullēšana', 'Sēdus, rullis zem augšstilba, rullē no sēžamvietas līdz ceļgalam, bet ne zem ceļa.'],
    en: ['Hamstring foam roll', 'Seated, roller under the thigh, roll from glute to just above the knee.'],
  }),
  d({
    id: 'hamstring_towel_stretch', kind: 'mobility', use: 'relief', zones: ['hamstrings'], sports: [],
    minutes: 2, rpe: 1, equipment: ['towel', 'mat'], dose: { sets: 2, seconds: 30 }, perSide: true,
    ru: ['Растяжка бедра с полотенцем', 'Лёжа на спине, полотенце на стопе, прямую ногу мягко тяни вверх до лёгкого натяжения.'],
    lv: ['Augšstilba stiepšana ar dvieli', 'Guļus uz muguras, dvielis ap pēdu, taisno kāju maigi velc uz augšu līdz vieglam stiepumam.'],
    en: ['Towel hamstring stretch', 'On your back, towel around the foot, raise the straight leg until you feel a light stretch.'],
  }),
  d({
    id: 'adductor_rockback', kind: 'mobility', use: 'relief', zones: ['adductors'], sports: ['football'],
    minutes: 2, rpe: 2, equipment: ['mat'], dose: { sets: 2, reps: 8 }, perSide: true,
    ru: ['Перекаты для паха', 'На четвереньках, одна нога прямая в сторону. Медленно отводи таз назад к пяткам и обратно.'],
    lv: ['Cirkšņa atmuguriskā šūpošana', 'Četrrāpus, viena kāja taisna sānis. Lēni virzi iegurni atpakaļ uz papēžiem un atpakaļ.'],
    en: ['Adductor rock-back', 'On hands and knees, one leg straight out to the side. Slowly sit back towards your heels and return.'],
  }),
  d({
    id: 'hip_flexor_half_kneel', kind: 'mobility', use: 'relief', zones: ['hip_flexors'], sports: [],
    minutes: 2, rpe: 1, equipment: ['mat'], dose: { sets: 2, seconds: 30 }, perSide: true,
    ru: ['Растяжка сгибателей бедра', 'В полувыпаде на колене подкрути таз и напряги ягодицу задней ноги, без прогиба в пояснице.'],
    lv: ['Gūžas saliecēju stiepšana', 'Pusizklupienā uz ceļa pagriez iegurni un sasprindzini aizmugurējās kājas sēžamvietu, neieliecot muguras lejasdaļu.'],
    en: ['Half-kneeling hip flexor stretch', 'Kneeling lunge, tuck the pelvis and squeeze the back-leg glute; no arching of the lower back.'],
  }),
  d({
    id: 'glute_figure_four', kind: 'mobility', use: 'relief', zones: ['glutes'], sports: [],
    minutes: 2, rpe: 1, equipment: ['mat'], dose: { sets: 2, seconds: 30 }, perSide: true,
    ru: ['Растяжка ягодиц «четвёрка»', 'Лёжа на спине, лодыжку на колено другой ноги, мягко подтяни ноги к груди.'],
    lv: ['Sēžamvietas stiepšana «četrinieks»', 'Guļus uz muguras, potīti uz otras kājas ceļa, maigi pievelc kājas pie krūtīm.'],
    en: ['Figure-four glute stretch', 'On your back, ankle over the other knee, gently draw both legs towards your chest.'],
  }),
  d({
    id: 'hip_90_90', kind: 'mobility', use: 'relief', zones: ['glutes', 'hip_flexors', 'adductors'], sports: [],
    minutes: 3, rpe: 2, equipment: ['mat'], dose: { sets: 2, reps: 8 }, perSide: false,
    ru: ['Смена ног 90/90', 'Сидя, обе ноги согнуты под 90°. Медленно переводи колени из стороны в сторону.'],
    lv: ['Kāju maiņa 90/90', 'Sēdus, abas kājas saliektas 90° leņķī. Lēni pārliec ceļgalus no vienas puses uz otru.'],
    en: ['90/90 hip switches', 'Seated, both knees bent at 90°. Slowly rotate your knees from side to side.'],
  }),
  d({
    id: 'open_book', kind: 'mobility', use: 'relief', zones: ['upper_back', 'chest', 'obliques'], sports: [],
    minutes: 2, rpe: 1, equipment: ['mat'], dose: { sets: 1, reps: 8 }, perSide: true,
    ru: ['«Открытая книга»', 'Лёжа на боку, колени согнуты. Верхнюю руку медленно раскрывай за спину, взгляд за рукой.'],
    lv: ['«Atvērtā grāmata»', 'Guļus uz sāniem, ceļgali saliekti. Augšējo roku lēni atver aiz muguras, skaties uz roku.'],
    en: ['Open book', 'Lying on your side, knees bent. Slowly open the top arm behind you and follow it with your eyes.'],
  }),
  d({
    id: 'cat_camel', kind: 'mobility', use: 'relief', zones: ['lower_back', 'upper_back'], sports: [],
    minutes: 2, rpe: 1, equipment: ['mat'], dose: { sets: 1, reps: 10 }, perSide: false,
    ru: ['«Кошка — верблюд»', 'На четвереньках медленно округляй и прогибай спину в удобной амплитуде.'],
    lv: ['«Kaķis — kamielis»', 'Četrrāpus lēni izliec un ieliec muguru ērtā amplitūdā.'],
    en: ['Cat–camel', 'On hands and knees, slowly round and arch your back within a comfortable range.'],
  }),
  d({
    id: 'childs_pose_breathing', kind: 'mobility', use: 'relief', zones: ['lower_back', 'upper_back'], sports: [],
    minutes: 2, rpe: 1, equipment: ['mat'], dose: { sets: 1, seconds: 90 }, perSide: false,
    ru: ['Поза ребёнка с дыханием', 'Сядь на пятки, руки вперёд, лоб к полу. Дыши медленно в спину.'],
    lv: ['Bērna poza ar elpošanu', 'Apsēdies uz papēžiem, rokas uz priekšu, piere pie grīdas. Elpo lēni «mugurā».'],
    en: ["Child's pose breathing", 'Sit back on your heels, arms forward, forehead down. Breathe slowly into your back.'],
  }),
  d({
    id: 'neck_gentle_mobility', kind: 'mobility', use: 'relief', zones: ['neck_upper_traps'], sports: [],
    minutes: 2, rpe: 1, equipment: ['none'], dose: { sets: 1, reps: 6 }, perSide: false,
    ru: ['Мягкая подвижность шеи', 'Медленные наклоны головы к плечам и вперёд, без круговых движений и без запрокидывания.'],
    lv: ['Maiga kakla kustīgums', 'Lēni noliec galvu pret pleciem un uz priekšu, bez apļveida kustībām un bez atliekšanas atpakaļ.'],
    en: ['Gentle neck mobility', 'Slow tilts of the head towards each shoulder and forward; no circles, no tipping back.'],
  }),
  d({
    id: 'doorway_chest_stretch', kind: 'mobility', use: 'relief', zones: ['chest', 'shoulder_front'], sports: [],
    minutes: 2, rpe: 1, equipment: ['wall'], dose: { sets: 2, seconds: 30 }, perSide: true,
    ru: ['Растяжка груди в дверном проёме', 'Предплечье на косяк, локоть на уровне плеча, мягко шагни вперёд.'],
    lv: ['Krūšu stiepšana durvju ailē', 'Apakšdelms pret stenderi, elkonis plecu augstumā, maigi paej uz priekšu.'],
    en: ['Doorway chest stretch', 'Forearm on the door frame, elbow at shoulder height, step gently forward.'],
  }),
  d({
    id: 'cross_body_shoulder', kind: 'mobility', use: 'relief', zones: ['shoulder_back', 'upper_back'], sports: ['swimming', 'tennis'],
    minutes: 2, rpe: 1, equipment: ['none'], dose: { sets: 2, seconds: 30 }, perSide: true,
    ru: ['Растяжка задней части плеча', 'Прямую руку поперёк груди, другой рукой мягко прижми выше локтя.'],
    lv: ['Pleca aizmugures stiepšana', 'Taisnu roku pāri krūtīm, ar otru roku maigi piespied virs elkoņa.'],
    en: ['Cross-body shoulder stretch', 'Straight arm across the chest; gently press it in above the elbow with the other hand.'],
  }),
  d({
    id: 'forearm_stretch', kind: 'mobility', use: 'relief', zones: ['forearm'], sports: ['tennis'],
    minutes: 2, rpe: 1, equipment: ['none'], dose: { sets: 2, seconds: 20 }, perSide: true,
    ru: ['Растяжка предплечья', 'Прямая рука вперёд, другой рукой мягко отведи кисть вниз, затем вверх.'],
    lv: ['Apakšdelma stiepšana', 'Taisna roka uz priekšu, ar otru roku maigi saliec plaukstu uz leju, tad uz augšu.'],
    en: ['Forearm stretch', 'Arm straight in front; with the other hand gently bend the wrist down, then up.'],
  }),
  d({
    id: 'triceps_overhead_stretch', kind: 'mobility', use: 'relief', zones: ['triceps'], sports: [],
    minutes: 2, rpe: 1, equipment: ['none'], dose: { sets: 2, seconds: 20 }, perSide: true,
    ru: ['Растяжка трицепса', 'Рука вверх, кисть за голову, другой рукой мягко потяни локоть.'],
    lv: ['Tricepsa stiepšana', 'Roka uz augšu, plauksta aiz galvas, ar otru roku maigi pavelc elkoni.'],
    en: ['Overhead triceps stretch', 'Arm up, hand behind your head; gently pull the elbow with the other hand.'],
  }),
  d({
    id: 'biceps_wall_stretch', kind: 'mobility', use: 'relief', zones: ['biceps', 'shoulder_front'], sports: [],
    minutes: 2, rpe: 1, equipment: ['wall'], dose: { sets: 2, seconds: 20 }, perSide: true,
    ru: ['Растяжка бицепса у стены', 'Ладонь на стену за спиной, рука прямая, медленно разворачивайся от стены.'],
    lv: ['Bicepsa stiepšana pie sienas', 'Plauksta uz sienas aiz muguras, roka taisna, lēni pagriezies prom no sienas.'],
    en: ['Wall biceps stretch', 'Palm on the wall behind you, arm straight; slowly turn away from the wall.'],
  }),
  d({
    id: 'seated_ankle_mobility', kind: 'mobility', use: 'relief', zones: ['shins', 'calves'], sports: [],
    minutes: 2, rpe: 1, equipment: ['none'], dose: { sets: 1, reps: 10 }, perSide: true,
    ru: ['Подвижность стопы сидя', 'Сидя, медленные круги стопой и подъёмы носка на себя, без нагрузки весом.'],
    lv: ['Pēdas kustīgums sēdus', 'Sēdus lēni apļi ar pēdu un purngala celšana pret sevi, bez svara slodzes.'],
    en: ['Seated ankle mobility', 'Seated, slow ankle circles and toes-up pulls, no body weight on them.'],
  }),
  d({
    id: 'supine_full_reach', kind: 'mobility', use: 'relief', zones: ['abdominals', 'chest'], sports: [],
    minutes: 2, rpe: 1, equipment: ['mat'], dose: { sets: 1, seconds: 60 }, perSide: false,
    ru: ['Вытяжение лёжа', 'Лёжа на спине, руки за голову по полу, мягко тянись руками и пятками в разные стороны.'],
    lv: ['Izstiepšanās guļus', 'Guļus uz muguras, rokas aiz galvas uz grīdas, maigi stiepies ar rokām un papēžiem pretējos virzienos.'],
    en: ['Supine full-body reach', 'On your back, arms overhead on the floor; gently reach hands and heels away from each other.'],
  }),
  d({
    id: 'standing_side_bend', kind: 'mobility', use: 'relief', zones: ['obliques'], sports: [],
    minutes: 2, rpe: 1, equipment: ['none'], dose: { sets: 2, seconds: 20 }, perSide: true,
    ru: ['Наклон в сторону стоя', 'Руку вверх и медленно наклонись в противоположную сторону, не заваливаясь вперёд.'],
    lv: ['Sānu noliekšanās stāvus', 'Roku uz augšu un lēni noliecies pretējā virzienā, nekrītot uz priekšu.'],
    en: ['Standing side bend', 'Reach one arm up and slowly lean to the other side without tipping forward.'],
  }),

  // ---- breathing / recovery -----------------------------------------------------
  d({
    id: 'box_breathing', kind: 'breathing_recovery', use: 'relief', zones: [], sports: [],
    minutes: 3, rpe: 1, equipment: ['none'], dose: { minutes: 3 }, perSide: false,
    ru: ['Дыхание «квадрат»', 'Вдох на 4 счёта, пауза 4, выдох 4, пауза 4. Спокойно, без напряжения.'],
    lv: ['Elpošana «kvadrāts»', 'Ieelpa uz 4, pauze 4, izelpa 4, pauze 4. Mierīgi, bez sasprindzinājuma.'],
    en: ['Box breathing', 'Breathe in for 4, hold 4, out for 4, hold 4. Calm, no strain.'],
  }),
  d({
    id: 'crocodile_breathing', kind: 'breathing_recovery', use: 'relief', zones: [], sports: [],
    minutes: 3, rpe: 1, equipment: ['mat'], dose: { minutes: 3 }, perSide: false,
    ru: ['Дыхание лёжа на животе', 'Лёжа на животе, лоб на кистях. Медленно дыши так, чтобы поясница поднималась на вдохе.'],
    lv: ['Elpošana guļus uz vēdera', 'Guļus uz vēdera, piere uz plaukstām. Elpo lēni, lai ieelpā cēlās muguras lejasdaļa.'],
    en: ['Crocodile breathing', 'Lying face down, forehead on your hands. Breathe slowly so your lower back rises on each breath in.'],
  }),

  // ---- activation (general / prehab) ---------------------------------------------
  d({
    id: 'glute_bridge', kind: 'activation', use: 'general', zones: ['glutes', 'hamstrings'], sports: [],
    minutes: 3, rpe: 3, equipment: ['mat'], dose: { sets: 2, reps: 12 }, perSide: false,
    ru: ['Ягодичный мостик', 'Лёжа на спине, стопы на полу, подними таз до прямой линии, пауза 2 с наверху.'],
    lv: ['Sēžamvietas tiltiņš', 'Guļus uz muguras, pēdas uz grīdas, pacel iegurni līdz taisnai līnijai, 2 s pauze augšā.'],
    en: ['Glute bridge', 'On your back, feet flat, lift the hips to a straight line, 2 s pause at the top.'],
  }),
  d({
    id: 'band_clamshell', kind: 'activation', use: 'general', zones: ['glutes'], sports: [],
    minutes: 3, rpe: 3, equipment: ['band', 'mat'], dose: { sets: 2, reps: 12 }, perSide: true,
    ru: ['«Ракушка» с резинкой', 'Лёжа на боку, колени согнуты, резинка над коленями. Раскрывай верхнее колено, стопы вместе.'],
    lv: ['«Gliemežvāks» ar gumiju', 'Guļus uz sāniem, ceļgali saliekti, gumija virs ceļgaliem. Atver augšējo ceļgalu, pēdas kopā.'],
    en: ['Banded clamshell', 'Side-lying, knees bent, band above the knees. Open the top knee, feet together.'],
  }),
  d({
    id: 'band_monster_walk', kind: 'activation', use: 'prehab', zones: ['glutes'], sports: ['basketball', 'football', 'athletics'],
    minutes: 3, rpe: 4, equipment: ['band'], dose: { sets: 2, reps: 10 }, perSide: true,
    ru: ['Шаги в сторону с резинкой', 'Резинка над коленями, полуприсед, шаги в сторону, колени не сводить внутрь.'],
    lv: ['Sānsoļi ar gumiju', 'Gumija virs ceļgaliem, pustupus, soļi uz sāniem, ceļgalus nevērst uz iekšu.'],
    en: ['Banded side walk', 'Band above the knees, half-squat, step sideways; keep knees from caving in.'],
  }),
  d({
    id: 'dead_bug', kind: 'activation', use: 'general', zones: ['abdominals'], sports: [],
    minutes: 3, rpe: 3, equipment: ['mat'], dose: { sets: 2, reps: 8 }, perSide: true,
    ru: ['«Мёртвый жук»', 'Лёжа на спине, поясница прижата. Медленно опускай противоположные руку и ногу.'],
    lv: ['«Beigtā vabole»', 'Guļus uz muguras, muguras lejasdaļa piespiesta. Lēni nolaid pretējo roku un kāju.'],
    en: ['Dead bug', 'On your back, lower back pressed down. Slowly lower the opposite arm and leg.'],
  }),
  d({
    id: 'bird_dog', kind: 'activation', use: 'prehab', zones: ['lower_back', 'glutes'], sports: [],
    minutes: 3, rpe: 3, equipment: ['mat'], dose: { sets: 2, reps: 8 }, perSide: true,
    ru: ['«Птица-собака»', 'На четвереньках вытягивай противоположные руку и ногу, спина ровная, пауза 2 с.'],
    lv: ['«Putns-suns»', 'Četrrāpus izstiep pretējo roku un kāju, mugura taisna, 2 s pauze.'],
    en: ['Bird dog', 'On hands and knees, reach the opposite arm and leg, back level, 2 s hold.'],
  }),
  d({
    id: 'scap_pushup', kind: 'activation', use: 'prehab', zones: ['shoulder_front', 'upper_back'], sports: ['swimming', 'tennis', 'basketball'],
    minutes: 2, rpe: 3, equipment: ['mat'], dose: { sets: 2, reps: 10 }, perSide: false,
    ru: ['Отжимания лопатками', 'В упоре на прямых руках своди и разводи лопатки, локти не сгибай.'],
    lv: ['Lāpstiņu atspiešanās', 'Balstā uz taisnām rokām savelc un izpletiet lāpstiņas, elkoņus nelokot.'],
    en: ['Scapular push-up', 'In a straight-arm plank, squeeze and spread the shoulder blades; elbows stay straight.'],
  }),
  d({
    id: 'band_external_rotation', kind: 'activation', use: 'prehab', zones: ['shoulder_back'], sports: ['swimming', 'tennis'],
    minutes: 3, rpe: 3, equipment: ['band'], dose: { sets: 2, reps: 12 }, perSide: true,
    ru: ['Наружная ротация плеча с резинкой', 'Локоть прижат к боку, согнут под 90°. Медленно отводи кисть наружу и возвращай.'],
    lv: ['Pleca ārējā rotācija ar gumiju', 'Elkonis piespiests pie sāniem, saliekts 90°. Lēni virzi plaukstu uz āru un atpakaļ.'],
    en: ['Band external rotation', 'Elbow at your side, bent to 90°. Slowly rotate the hand outwards and back.'],
  }),
  d({
    id: 'band_ytw', kind: 'activation', use: 'prehab', zones: ['upper_back', 'shoulder_back', 'neck_upper_traps'], sports: ['swimming', 'tennis'],
    minutes: 3, rpe: 3, equipment: ['band'], dose: { sets: 2, reps: 8 }, perSide: false,
    ru: ['Y-T-W с резинкой', 'Прямые руки с резинкой рисуют буквы Y, T и W, лопатки вниз и назад.'],
    lv: ['Y-T-W ar gumiju', 'Taisnas rokas ar gumiju zīmē burtus Y, T un W, lāpstiņas uz leju un atpakaļ.'],
    en: ['Band Y-T-W', 'Straight arms with a band trace Y, T and W; shoulder blades down and back.'],
  }),
  d({
    id: 'band_wrist_extension', kind: 'activation', use: 'prehab', zones: ['forearm'], sports: ['tennis'],
    minutes: 2, rpe: 3, equipment: ['band'], dose: { sets: 2, reps: 12 }, perSide: true,
    ru: ['Разгибание кисти с лёгкой резинкой', 'Предплечье на бедре, ладонь вниз. Медленно поднимай и опускай кисть.'],
    lv: ['Plaukstas atliekšana ar vieglu gumiju', 'Apakšdelms uz augšstilba, plauksta uz leju. Lēni cel un nolaid plaukstu.'],
    en: ['Light band wrist extension', 'Forearm on your thigh, palm down. Slowly lift and lower the hand.'],
  }),

  // ---- isometric (general / prehab) -----------------------------------------------
  d({
    id: 'wall_sit', kind: 'isometric', use: 'general', zones: ['quadriceps', 'glutes'], sports: [],
    minutes: 3, rpe: 5, equipment: ['wall'], dose: { sets: 3, seconds: 30 }, perSide: false,
    ru: ['Стульчик у стены', 'Спина к стене, колени под углом, удобным без дискомфорта, держи позицию.'],
    lv: ['Krēsliņš pie sienas', 'Mugura pret sienu, ceļgali leņķī, kas ir ērts bez diskomforta, noturi pozu.'],
    en: ['Wall sit', 'Back against the wall, knees at an angle that feels comfortable; hold.'],
  }),
  d({
    id: 'adductor_ball_squeeze', kind: 'isometric', use: 'prehab', zones: ['adductors'], sports: ['football'],
    minutes: 2, rpe: 4, equipment: ['ball', 'mat'], dose: { sets: 3, seconds: 10 }, perSide: false,
    ru: ['Сжатие мяча коленями', 'Лёжа на спине, колени согнуты, мяч между коленями. Сжимай 10 с, отдых 10 с.'],
    lv: ['Bumbas saspiešana ar ceļgaliem', 'Guļus uz muguras, ceļgali saliekti, bumba starp ceļgaliem. Spied 10 s, atpūta 10 s.'],
    en: ['Adductor ball squeeze', 'On your back, knees bent, ball between the knees. Squeeze 10 s, rest 10 s.'],
  }),
  d({
    id: 'copenhagen_short', kind: 'isometric', use: 'prehab', zones: ['adductors'], sports: ['football'],
    minutes: 3, rpe: 6, equipment: ['step'], dose: { sets: 2, seconds: 15 }, perSide: true,
    ru: ['Копенгагенская планка, короткий рычаг', 'Боковая планка, верхнее колено на скамье, нижняя нога под скамьёй. Держи ровную линию.'],
    lv: ['Kopenhāgenas planka, īsā svira', 'Sānu planka, augšējais ceļgals uz soliņa, apakšējā kāja zem soliņa. Noturi taisnu līniju.'],
    en: ['Short-lever Copenhagen plank', 'Side plank with the top knee on a bench, bottom leg under it. Hold a straight line.'],
  }),
  d({
    id: 'side_plank_knees', kind: 'isometric', use: 'general', zones: ['obliques'], sports: [],
    minutes: 2, rpe: 4, equipment: ['mat'], dose: { sets: 2, seconds: 20 }, perSide: true,
    ru: ['Боковая планка с колен', 'На предплечье и коленях, таз поднят, тело в одну линию.'],
    lv: ['Sānu planka no ceļgaliem', 'Uz apakšdelma un ceļgaliem, iegurnis pacelts, ķermenis vienā līnijā.'],
    en: ['Kneeling side plank', 'On your forearm and knees, hips up, body in one line.'],
  }),
  d({
    id: 'front_plank', kind: 'isometric', use: 'general', zones: ['abdominals'], sports: [],
    minutes: 2, rpe: 4, equipment: ['mat'], dose: { sets: 3, seconds: 20 }, perSide: false,
    ru: ['Планка на предплечьях', 'Тело прямое от головы до пяток, дыши ровно.'],
    lv: ['Planka uz apakšdelmiem', 'Ķermenis taisns no galvas līdz papēžiem, elpo vienmērīgi.'],
    en: ['Forearm plank', 'Body straight from head to heels; keep breathing.'],
  }),
  d({
    id: 'calf_raise_hold', kind: 'isometric', use: 'prehab', zones: ['calves'], sports: ['basketball', 'athletics', 'tennis', 'football'],
    minutes: 2, rpe: 4, equipment: ['wall'], dose: { sets: 3, seconds: 20 }, perSide: true,
    ru: ['Удержание на носке', 'Держась за стену, встань на носок одной ноги и держи высокую позицию.'],
    lv: ['Noturēšana uz purngala', 'Turoties pie sienas, pacelies uz vienas kājas purngala un noturi augsto pozu.'],
    en: ['Single-leg calf raise hold', 'Holding the wall, rise onto one foot and hold the top position.'],
  }),
  d({
    id: 'hamstring_bridge_hold', kind: 'isometric', use: 'prehab', zones: ['hamstrings'], sports: ['football', 'athletics'],
    minutes: 2, rpe: 4, equipment: ['step', 'mat'], dose: { sets: 3, seconds: 20 }, perSide: false,
    ru: ['Мостик с пятками на опоре', 'Пятки на скамье, колени чуть согнуты, подними таз и держи.'],
    lv: ['Tiltiņš ar papēžiem uz atbalsta', 'Papēži uz soliņa, ceļgali nedaudz saliekti, pacel iegurni un noturi.'],
    en: ['Heels-on-bench bridge hold', 'Heels on a bench, knees slightly bent, lift the hips and hold.'],
  }),

  d({
    id: 'standing_knee_lift_hold', kind: 'isometric', use: 'prehab', zones: ['hip_flexors'], sports: ['football', 'athletics'],
    minutes: 2, rpe: 3, equipment: ['wall'], dose: { sets: 3, seconds: 10 }, perSide: true,
    ru: ['Удержание колена вверх', 'Стоя у стены, подними колено до уровня таза и держи, корпус ровный.'],
    lv: ['Ceļgala noturēšana augšā', 'Stāvot pie sienas, pacel ceļgalu līdz iegurņa augstumam un noturi, ķermenis taisns.'],
    en: ['Standing knee-lift hold', 'Next to a wall, lift one knee to hip height and hold; stay tall.'],
  }),
  d({
    id: 'split_squat_hold', kind: 'isometric', use: 'prehab', zones: ['quadriceps', 'glutes'], sports: ['basketball', 'football', 'athletics'],
    minutes: 3, rpe: 4, equipment: ['none'], dose: { sets: 2, seconds: 20 }, perSide: true,
    ru: ['Удержание в выпаде', 'Разножка, опустись в удобную глубину и держи, колено передней ноги над стопой.'],
    lv: ['Noturēšana izklupienā', 'Soļa stāvoklī nolaidies ērtā dziļumā un noturi, priekšējās kājas ceļgals virs pēdas.'],
    en: ['Split-squat hold', 'Split stance, lower to a comfortable depth and hold, front knee over the foot.'],
  }),
  d({
    id: 'band_pallof_press', kind: 'isometric', use: 'prehab', zones: ['obliques', 'abdominals'], sports: ['tennis'],
    minutes: 3, rpe: 4, equipment: ['band'], dose: { sets: 2, seconds: 20 }, perSide: true,
    ru: ['Удержание против вращения с резинкой', 'Резинка сбоку на уровне груди, выпрями руки вперёд и не давай корпусу повернуться.'],
    lv: ['Pretrotācijas noturēšana ar gumiju', 'Gumija sānis krūšu augstumā, iztaisno rokas uz priekšu un neļauj ķermenim pagriezties.'],
    en: ['Band Pallof press hold', 'Band to your side at chest height, press your arms straight out and resist the turn.'],
  }),

  // ---- eccentric (prehab only, green days) ----------------------------------------
  d({
    id: 'nordic_hamstring_assisted', kind: 'eccentric', use: 'prehab', zones: ['hamstrings'], sports: ['football', 'athletics'],
    minutes: 4, rpe: 7, equipment: ['partner', 'mat'], dose: { sets: 2, reps: 4 }, perSide: false,
    ru: ['Скандинавские сгибания с помощью', 'На коленях, партнёр держит лодыжки. Медленно опускайся вперёд, пока контролируешь, ловись руками.'],
    lv: ['Ziemeļu saliecieni ar palīdzību', 'Uz ceļgaliem, partneris tur potītes. Lēni noliecies uz priekšu, kamēr kontrolē, noķeries ar rokām.'],
    en: ['Assisted Nordic hamstring lower', 'Kneeling, a partner holds your ankles. Lower forward slowly as far as you control, catch with your hands.'],
  }),
  d({
    id: 'calf_eccentric_lowering', kind: 'eccentric', use: 'prehab', zones: ['calves'], sports: ['basketball', 'athletics', 'football', 'tennis'],
    minutes: 3, rpe: 6, equipment: ['step'], dose: { sets: 2, reps: 10 }, perSide: true,
    ru: ['Медленное опускание на ступеньке', 'Подъём на носки на двух ногах, опускание на одной за 3 секунды.'],
    lv: ['Lēna nolaišanās uz pakāpiena', 'Pacelšanās uz purngaliem ar abām kājām, nolaišanās uz vienas 3 sekundēs.'],
    en: ['Slow calf lowering on a step', 'Rise on both feet, lower on one over 3 seconds.'],
  }),

  // ---- bodyweight strength (general) -----------------------------------------------
  d({
    id: 'bodyweight_squat', kind: 'bodyweight_strength', use: 'general', zones: ['quadriceps', 'glutes'], sports: [],
    minutes: 3, rpe: 5, equipment: ['none'], dose: { sets: 3, reps: 12 }, perSide: false,
    ru: ['Приседания', 'Стопы на ширине плеч, колени по линии носков, спина ровная.'],
    lv: ['Pietupieni', 'Pēdas plecu platumā, ceļgali purngalu virzienā, mugura taisna.'],
    en: ['Bodyweight squat', 'Feet shoulder-width, knees in line with toes, back straight.'],
  }),
  d({
    id: 'reverse_lunge', kind: 'bodyweight_strength', use: 'general', zones: ['quadriceps', 'glutes'], sports: [],
    minutes: 3, rpe: 5, equipment: ['none'], dose: { sets: 2, reps: 8 }, perSide: true,
    ru: ['Выпады назад', 'Шаг назад, колено задней ноги почти касается пола, корпус ровный.'],
    lv: ['Izklupieni atpakaļ', 'Solis atpakaļ, aizmugurējās kājas ceļgals gandrīz pieskaras grīdai, ķermenis taisns.'],
    en: ['Reverse lunge', 'Step back until the back knee nearly touches the floor; torso upright.'],
  }),
  d({
    id: 'single_leg_rdl', kind: 'bodyweight_strength', use: 'general', zones: ['hamstrings', 'glutes'], sports: [],
    minutes: 3, rpe: 4, equipment: ['none'], dose: { sets: 2, reps: 8 }, perSide: true,
    ru: ['Наклон на одной ноге', 'Стоя на одной ноге, наклоняйся вперёд с прямой спиной, свободная нога назад.'],
    lv: ['Noliekšanās uz vienas kājas', 'Stāvot uz vienas kājas, noliecies uz priekšu ar taisnu muguru, brīvā kāja atpakaļ.'],
    en: ['Single-leg Romanian deadlift', 'On one leg, hinge forward with a flat back, free leg reaching back.'],
  }),
  d({
    id: 'step_up', kind: 'bodyweight_strength', use: 'general', zones: ['quadriceps', 'glutes'], sports: [],
    minutes: 3, rpe: 5, equipment: ['step'], dose: { sets: 2, reps: 10 }, perSide: true,
    ru: ['Зашагивания на ступеньку', 'Ступенька до колена, вставай за счёт передней ноги, опускайся медленно.'],
    lv: ['Uzkāpšana uz pakāpiena', 'Pakāpiens līdz ceļgalam, celies ar priekšējo kāju, nolaidies lēni.'],
    en: ['Step-up', 'Knee-high step, drive up through the front leg, lower slowly.'],
  }),
  d({
    id: 'push_up', kind: 'bodyweight_strength', use: 'general', zones: ['chest', 'triceps', 'shoulder_front'], sports: [],
    minutes: 3, rpe: 6, equipment: ['mat'], dose: { sets: 3, reps: 8 }, perSide: false,
    ru: ['Отжимания', 'Тело прямое; если тяжело — с колен. Опускайся медленно.'],
    lv: ['Atspiešanās', 'Ķermenis taisns; ja grūti — no ceļgaliem. Nolaidies lēni.'],
    en: ['Push-up', 'Body straight; from the knees if needed. Lower slowly.'],
  }),

  // ---- aerobic base (general) ------------------------------------------------------
  d({
    id: 'easy_run', kind: 'aerobic_base', use: 'general', zones: [], sports: [],
    minutes: 20, rpe: 4, equipment: ['none'], dose: { minutes: 20 }, perSide: false,
    ru: ['Лёгкий бег', 'Темп, в котором можно разговаривать полными фразами.'],
    lv: ['Viegls skrējiens', 'Temps, kurā vari runāt pilniem teikumiem.'],
    en: ['Easy run', 'A pace at which you can talk in full sentences.'],
  }),
  d({
    id: 'easy_bike', kind: 'aerobic_base', use: 'general', zones: [], sports: [],
    minutes: 20, rpe: 3, equipment: ['bike'], dose: { minutes: 20 }, perSide: false,
    ru: ['Лёгкий велосипед', 'Ровный спокойный темп, дыхание не сбивается.'],
    lv: ['Viegls velosipēds', 'Vienmērīgs mierīgs temps, elpošana neaizraujas.'],
    en: ['Easy cycling', 'Steady, relaxed pace; breathing stays easy.'],
  }),
  d({
    id: 'easy_swim', kind: 'aerobic_base', use: 'general', zones: [], sports: ['swimming'],
    minutes: 20, rpe: 4, equipment: ['pool'], dose: { minutes: 20 }, perSide: false,
    ru: ['Лёгкое плавание', 'Спокойный темп любым стилем, с паузами по желанию.'],
    lv: ['Viegla peldēšana', 'Mierīgs temps jebkurā stilā, ar pauzēm pēc vajadzības.'],
    en: ['Easy swim', 'Relaxed pace in any stroke, pauses as you like.'],
  }),
  d({
    id: 'brisk_walk', kind: 'aerobic_base', use: 'general', zones: [], sports: [],
    minutes: 15, rpe: 2, equipment: ['none'], dose: { minutes: 15 }, perSide: false,
    ru: ['Быстрая ходьба', 'Бодрый шаг на свежем воздухе.'],
    lv: ['Ātra iešana', 'Možs solis svaigā gaisā.'],
    en: ['Brisk walk', 'A brisk walk outdoors.'],
  }),
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const DRILL_BY_ID: ReadonlyMap<string, Drill> = new Map(DRILLS.map((x) => [x.id, x]));

export function getDrill(id: string): Drill | null {
  return DRILL_BY_ID.get(id) ?? null;
}

/** Whether a drill may appear under a ceiling at all (kind allowed, effort within). */
export function fitsCeiling(drill: Drill, rule: CeilingRule): boolean {
  return rule.allowedKinds.includes(drill.kind) && drill.rpe <= rule.maxRpe;
}

function bySportThenEasiest(sport: SportType | null) {
  return (a: Drill, b: Drill): number => {
    const sa = sport && a.sports.includes(sport) ? 0 : 1;
    const sb = sport && b.sports.includes(sport) ? 0 : 1;
    return sa - sb || a.rpe - b.rpe || a.minutes - b.minutes || a.id.localeCompare(b.id);
  };
}

/** Gentle drills for a zone that feels tight or tired today. */
export function reliefDrillsFor(zone: BodyZone, sport: SportType | null = null): Drill[] {
  return DRILLS.filter((x) => x.use === 'relief' && x.zones.includes(zone)).sort(bySportThenEasiest(sport));
}

/**
 * Prehab for the sport's usual load areas — skipping every drill that touches
 * a zone which is sore today (those zones get relief work only).
 */
export function prehabDrillsFor(sport: SportType, soreZones: readonly BodyZone[] = []): Drill[] {
  const focus = SPORT_FOCUS_ZONES[sport];
  return DRILLS.filter(
    (x) =>
      x.use === 'prehab' &&
      x.zones.some((z) => focus.includes(z)) &&
      !x.zones.some((z) => soreZones.includes(z)) &&
      (x.sports.length === 0 || x.sports.includes(sport))
  ).sort(bySportThenEasiest(sport));
}

/** General session content of one kind, easiest first, sport-relevant first. */
export function generalDrills(kind: BlockKind, sport: SportType | null = null, soreZones: readonly BodyZone[] = []): Drill[] {
  return DRILLS.filter(
    (x) =>
      x.use === 'general' &&
      x.kind === kind &&
      !x.zones.some((z) => soreZones.includes(z)) &&
      (x.sports.length === 0 || (sport !== null && x.sports.includes(sport)))
  ).sort(bySportThenEasiest(sport));
}

/** Every zone must have relief work; used by tests and at startup checks. */
export function zonesWithoutRelief(): BodyZone[] {
  return BODY_ZONES.filter((z) => reliefDrillsFor(z).length === 0);
}
