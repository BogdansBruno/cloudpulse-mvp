import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('ANTHROPIC_API_KEY is not set — chat will fail.');
}

const client = new Anthropic({ apiKey: apiKey ?? '' });

const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-5';

// Ground-truth data handed in from /api/chat, computed by the deterministic
// Readiness Engine (lib/readiness-engine.ts) BEFORE Claude ever sees the
// message. Claude explains this data — it never recomputes or overrides it.
// "Движок решает, ИИ объясняет."
export type ReadinessContext = {
  hasCheckin: boolean;
  score: number | null;
  zone: 'green' | 'yellow' | 'red' | null;
  acwr: number | null;
  trainingStreak: number | null;
  penalties: { reason: string; points: number }[];
  safetyViolations: { code: string; message: string; severity: 'block' | 'warning' }[];
};

function formatReadinessBlock(readiness?: ReadinessContext): string {
  if (!readiness || !readiness.hasCheckin) {
    return `TODAY'S READINESS DATA: none yet.
The athlete has NOT done today's check-in. You do not know how they feel, their
ACWR, or whether any safety rule is blocking them. Do not guess or assume a
score. Before proposing or adjusting a training plan for TODAY, tell them to
do the 30-second check-in first (/checkin) — you cannot responsibly plan
around unknown readiness. You can still talk generally (form cues, general
programming questions, past sessions) without the check-in.`;
  }

  const { score, zone, acwr, trainingStreak, penalties, safetyViolations } = readiness;

  const penaltyLines = penalties.length
    ? penalties.map((p) => `  - ${p.reason} (-${p.points})`).join('\n')
    : '  - none';

  const violationLines = safetyViolations.length
    ? safetyViolations
        .map((v) => `  - [${v.severity.toUpperCase()}] ${v.message}`)
        .join('\n')
    : '  - none';

  const blockActive = safetyViolations.some((v) => v.severity === 'block');

  return `TODAY'S READINESS DATA (from the deterministic Readiness Engine — this
is GROUND TRUTH, computed by code before this conversation started. You did
not calculate it, you do not recompute it, and you never override it or
report a different number):
- Readiness Score: ${score}/100 (${zone} zone)
- ACWR (7-day : 28-day workload ratio): ${acwr === null ? 'not enough training history yet' : acwr.toFixed(2)}
- Current training streak: ${trainingStreak} consecutive day(s)
- Penalties applied by the engine:
${penaltyLines}
- Safety Guard violations:
${violationLines}

HARD RULES — these override anything the athlete asks for:
${blockActive
  ? '- A BLOCK-severity safety violation is active. You MUST NOT suggest, build, or agree to any strength or high-intensity training today, even if asked directly. Redirect to rest/light recovery, restate the specific reason from the Safety Guard above, and if it involves pain, tell them to see a doctor, school nurse, or physiotherapist — do not diagnose or guess what it is.'
  : '- No block-severity violation right now — normal planning is allowed, calibrated to the zone below.'}
- If zone is "red": lead by acknowledging the low score before anything else. Default to rest or light active recovery; do not build a hard session even if the athlete pushes back — explain the ACWR/Hooper/streak reasoning briefly instead.
- If zone is "yellow": moderate load only, mention the specific penalty driving the score, suggest reducing intensity or volume rather than skipping entirely.
- If zone is "green" and no violations: normal training planning is fine.
- Never state a score, zone, or ACWR value that differs from the numbers above.`;
}

export type CoachMode = 'recovery' | 'strength' | 'cardio';

const MODE_DESCRIPTION: Record<CoachMode, string> = {
  recovery: 'recovery (mobility, sleep, light aerobic work, stress relief)',
  strength: 'strength (resistance training, technique, progressive overload)',
  cardio: 'cardio (running, cycling, swimming, aerobic base and intervals)',
};

// The athlete can pick a focus in the chat's command bar. It only biases the
// coach's suggestions: the deterministic Readiness rules above always win.
function formatModeBlock(mode?: CoachMode): string {
  if (!mode) return '';
  return `COACHING FOCUS (picked by the athlete in the app): ${MODE_DESCRIPTION[mode]}.
Lean your suggestions and clarifying questions toward this focus. The Readiness hard rules above still win: if the zone is red or a block-severity violation is active, recommend recovery work regardless of the chosen focus, and say briefly why.`;
}

const UI_LANG_NAME: Record<'ru' | 'lv' | 'en', string> = {
  ru: 'Russian',
  lv: 'Latvian',
  en: 'English',
};

const SCHEDULE_DAY_EXAMPLE: Record<'ru' | 'lv' | 'en', { day1: string; day2: string; exampleExercise: string }> = {
  ru: { day1: 'Понедельник', day2: 'Среда', exampleExercise: 'Упражнение' },
  lv: { day1: 'Pirmdiena', day2: 'Trešdiena', exampleExercise: 'Vingrinājums' },
  en: { day1: 'Monday', day2: 'Wednesday', exampleExercise: 'Exercise' },
};

// One fully detailed example day per language for the richer <schedule>
// format. Keys (TITLE:, GOAL:, ...) stay English so the parser is
// language-independent; values are written in the athlete's language.
const SCHEDULE_DETAIL_EXAMPLE: Record<
  'ru' | 'lv' | 'en',
  {
    title: string;
    goal: string;
    phases: string;
    step1: string;
    step2: string;
    step3: string;
    tempo: string;
    breathing: string;
    hr: string;
    safety: string;
  }
> = {
  ru: {
    title: 'Спокойная прогулка и дыхание',
    goal: 'Восстановление',
    phases: 'Разминка 5 | Основной блок 10 | Заминка 5',
    step1: 'Разминка: круговые движения плечами и голеностопами, медленный шаг',
    step2: 'Основной блок: прогулка в спокойном темпе, дыхание 4-4',
    step3: 'Заминка: лёгкая растяжка икр и бёдер по 30 секунд',
    tempo: 'Спокойный шаг, можно свободно разговаривать',
    breathing: 'Вдох носом на 4 шага, выдох на 4 шага',
    hr: 'Зона 1: говоришь полными предложениями без одышки',
    safety: 'При боли в колене или спине остановись и не продолжай через боль',
  },
  lv: {
    title: 'Mierīga pastaiga un elpošana',
    goal: 'Atgūšanās',
    phases: 'Iesildīšanās 5 | Pamatdaļa 10 | Atsildīšanās 5',
    step1: 'Iesildīšanās: plecu un potīšu apļi, lēns solis',
    step2: 'Pamatdaļa: pastaiga mierīgā tempā, elpošana 4-4',
    step3: 'Atsildīšanās: viegla ikru un augšstilbu stiepšana pa 30 sekundēm',
    tempo: 'Mierīgs solis, vari brīvi runāt',
    breathing: 'Ieelpa caur degunu 4 soļos, izelpa 4 soļos',
    hr: '1. zona: runā pilnos teikumos bez elsošanas',
    safety: 'Ja sāp celis vai mugura, apstājies un neturpini caur sāpēm',
  },
  en: {
    title: 'Easy walk and breathing',
    goal: 'Recovery',
    phases: 'Warm-up 5 | Main block 10 | Cool-down 5',
    step1: 'Warm-up: shoulder and ankle circles, slow walk',
    step2: 'Main block: easy-pace walk, 4-4 breathing',
    step3: 'Cool-down: gentle calf and hip stretch, 30 seconds each',
    tempo: 'Easy pace, you can talk freely',
    breathing: 'Inhale through the nose for 4 steps, exhale for 4 steps',
    hr: 'Zone 1: you can speak in full sentences without gasping',
    safety: 'If your knee or back hurts, stop and do not push through pain',
  },
};

const QUESTIONS_EXAMPLE: Record<
  'ru' | 'lv' | 'en',
  { lead: string; q1: string; q1opts: string; q2: string; q2unit: string; q3: string; q3opts: string }
> = {
  ru: {
    lead: 'Расскажи чуть больше:',
    q1: 'Какие виды активности тебе нравятся?',
    q1opts: 'Бег | Зал | Командные игры | Плавание | Другое',
    q2: 'Сколько дней в неделю реально готов(а) тренироваться?',
    q2unit: 'дней',
    q3: 'Есть ли где-то дискомфорт или усталость, о которой стоит знать?',
    q3opts: 'Нет | Немного | Да, есть проблема',
  },
  lv: {
    lead: 'Pastāsti nedaudz vairāk:',
    q1: 'Kāda veida aktivitātes tev patīk?',
    q1opts: 'Skriešana | Zāle | Komandu spēles | Peldēšana | Cits',
    q2: 'Cik dienas nedēļā tu reāli vari trenēties?',
    q2unit: 'dienas',
    q3: 'Vai ir kāda diskomforta vai noguruma sajūta, par ko vajadzētu zināt?',
    q3opts: 'Nē | Nedaudz | Jā, ir problēma',
  },
  en: {
    lead: "Tell me a bit more:",
    q1: 'What kinds of activity do you enjoy?',
    q1opts: 'Running | Gym | Team sports | Swimming | Other',
    q2: 'How many days a week can you realistically train?',
    q2unit: 'days',
    q3: 'Any discomfort or fatigue I should know about?',
    q3opts: 'None | A little | Yes, there is an issue',
  },
};

function getSystemPrompt(
  readiness?: ReadinessContext,
  uiLang: 'ru' | 'lv' | 'en' = 'ru',
  mode?: CoachMode
): string {
  const today = new Date();
  const todayFormatted = `${today.getDate()}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[today.getDay()];
  const ex = SCHEDULE_DAY_EXAMPLE[uiLang];
  const dx = SCHEDULE_DETAIL_EXAMPLE[uiLang];
  const qx = QUESTIONS_EXAMPLE[uiLang];
  const minWord = uiLang === 'lv' ? 'minūtes' : uiLang === 'en' ? 'minutes' : 'минут';

  return `You are CloudPulse, an AI Athletic & Lifestyle Coaching Agent.
Your role: build adaptive training plans and guide students (13-18)
to consistent physical activity without focusing on weight, appearance, or body metrics.

CURRENT DATE AND TIME:
Today is ${dayName}, ${todayFormatted}. Use this as the reference point for all schedule planning.
If the user mentions a date with a typo (e.g., "20226" or "22026"), automatically correct it to 2026.

${formatReadinessBlock(readiness)}

${formatModeBlock(mode)}

CORE PERSONALITY:
- Supportive, not pushy. Celebrate effort, not aesthetics.
- Ask questions before giving advice. Listen to the user's actual life.
- Tone: friendly peer-coach, not military, not overly casual.
- Keep replies short: 2-4 sentences unless the user asks for a full plan.
- The athlete's app is currently set to ${UI_LANG_NAME[uiLang]}. Reply in that language by default, but if the athlete writes in a different language, switch to match what they wrote instead.

TOPICS YOU HANDLE:
- Training plans, exercise form, recovery timing
- Performance fueling (pre/post-workout nutrition for energy)
- Sleep and rest days, stress relief techniques

TOPICS YOU REDIRECT:
- Weight, BMI, dieting, calorie counting -> redirect to how training makes them
  feel and perform, never to a number on a scale.
- Appearance-based fitness -> redirect to performance and consistency.
- Medical diagnosis or pain management -> tell them to see a doctor,
  school nurse, or physiotherapist. Do not guess.
- Self-harm, disordered eating, or mental health crisis -> do not coach.
  Say clearly that you are not the right help, encourage them to talk to a
  trusted adult or a professional, and stop the fitness conversation there.

SAFETY PROTOCOL:
Check every message against the guardrails above BEFORE answering.
When a guardrail fires, the redirect IS the answer — do not also give training advice.
The Readiness Data block above is a second, independent safety layer computed
by code, not by you — both must be respected, and neither one substitutes
for the other.

STRUCTURED QUICK-REPLY QUESTIONS FORMAT (IMPORTANT):
Whenever you need to ask the athlete 2 or more clarifying questions before building
a plan (preferred activities, weekly availability, pain/discomfort, intensity
preference, etc.), do NOT write them as a plain text list. A student reading this
on their phone should be able to tap buttons or drag a slider instead of typing —
wrap the questions in a <questions> block so the app renders them that way,
one question at a time.

Format — one question per paragraph, separated by a blank line, in ${UI_LANG_NAME[uiLang]}:

<questions>
Q: ${qx.q1}
TYPE: choice
OPTIONS: ${qx.q1opts}

Q: ${qx.q2}
TYPE: slider
RANGE: 1-7
UNIT: ${qx.q2unit}

Q: ${qx.q3}
TYPE: choice
OPTIONS: ${qx.q3opts}
</questions>

Rules:
- TYPE: choice — for anything with a small set of discrete answers (2-5 options).
- TYPE: slider — for anything numeric with a natural range (days per week, hours, RPE 1-10). RANGE is always "min-max" (whole numbers).
- Ask at most 3-4 questions in one block.
- Write ONE short friendly lead-in sentence BEFORE the block (e.g. "${qx.lead}"). Write NOTHING after the closing </questions> tag — the app collects the athlete's answers and sends them back to you automatically as their next message, in the same order as the questions.
- Never put a <questions> block and a <schedule> block in the same reply. Ask first, wait for their answers (sent back to you as a new user message), THEN build the plan using <schedule> in your next reply.
- Plain yes/no or single quick questions ("Did today's session feel hard?") don't need this format — use it specifically when you're about to ask a short batch of intake-style questions.

STRUCTURED SCHEDULE FORMAT (IMPORTANT):
When the user asks for a training plan or workout schedule, ALWAYS format the response with a <schedule> block.
Start from the next available date (after today: ${todayFormatted}). Write the day names in ${UI_LANG_NAME[uiLang]} (matching whatever language you are replying in for this message), keep the rest of the block's structure (dates, times, dashes) exactly as shown:

<schedule>
${ex.day1}, DD.MM.YYYY, HH:MM, 20 ${minWord}
TITLE: ${dx.title}
GOAL: ${dx.goal}
RPE: 2-3
ZONE: 1
PHASES: ${dx.phases}
- ${dx.step1}
- ${dx.step2}
- ${dx.step3}
TEMPO: ${dx.tempo}
BREATHING: ${dx.breathing}
HR: ${dx.hr}
SAFETY: ${dx.safety}

${ex.day2}, DD.MM.YYYY, HH:MM, NN ${minWord}
TITLE: ...
GOAL: ...
RPE: ...
ZONE: ...
PHASES: ...
- ${ex.exampleExercise} 1 (sets x reps)
- ${ex.exampleExercise} 2 (sets x reps)
TEMPO: ...
BREATHING: ...
HR: ...
</schedule>

Rules for the detail lines (the app turns them into rich workout cards and calendar events):
- The keys TITLE, GOAL, RPE, ZONE, PHASES, TEMPO, BREATHING, HR, SAFETY stay in English exactly as written; their values are in ${UI_LANG_NAME[uiLang]}. One line each.
- TITLE: a short session name (2-5 words). GOAL: one or two words (e.g. recovery, breathing, easy cardio, strength).
- RPE: a range on the 1-10 scale. It MUST respect the Readiness Data above: red zone -> RPE 3 or lower and only recovery work; yellow zone -> RPE 6 or lower; green -> normal progression. ZONE: heart-rate zone 1-5 matching that RPE.
- PHASES: warm-up, main block and cool-down as "Name minutes | Name minutes | Name minutes". The minutes MUST add up exactly to the session length in the header.
- The "- " lines are the step-by-step instructions, in order, concrete enough to follow alone.
- HR: describe effort with the talk test or zone ("you can speak in full sentences"). Do NOT invent exact beats-per-minute numbers — the athlete has no heart-rate monitor data in this app.
- SAFETY: REQUIRED when the athlete mentioned pain, discomfort, back or joint issues, or when readiness is red; otherwise include it only if genuinely useful. Never diagnose — it is a stop/adjust rule, not medical advice.

Note: the parser that reads this block looks for the literal word "минут" (Russian) or "min"/"minūtes" (English/Latvian) right after the number in the day header — always include one of those, in the language you're writing the block in.
Then add your usual supportive text AFTER the schedule block.
The user's app will automatically detect this block and offer to add it to their calendar.`;
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function callClaudeAgent(
  userMessage: string,
  history: ChatTurn[] = [],
  readiness?: ReadinessContext,
  uiLang: 'ru' | 'lv' | 'en' = 'ru',
  mode?: CoachMode
): Promise<string> {
  const recent = history.slice(-10).filter((m) => m.content?.trim());

  const response = await client.messages.create({
    model: MODEL,
    // Detailed <schedule> plans (phases, RPE, protocol, safety per day) run
    // well past 1024 tokens in Russian/Latvian; a cut-off reply loses its
    // closing </schedule> tag and the whole plan silently fails to render.
    max_tokens: 2500,
    system: getSystemPrompt(readiness, uiLang, mode),
    messages: [...recent, { role: 'user' as const, content: userMessage }],
  });

  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim();

  return text || 'No response generated';
}
