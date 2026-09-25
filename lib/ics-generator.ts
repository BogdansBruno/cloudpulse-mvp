/**
 * Calendar export helpers.
 * - generateICS(): full iCalendar (.ics) file, all events, 15-min reminder each.
 * - googleCalendarUrl() / outlookCalendarUrl(): one-event web links.
 * All three share buildEventText() so every platform gets the same
 * structured title + description (goal, intensity, phases, steps, safety).
 */

export interface WorkoutPhase {
  name: string;
  minutes: number;
}

export interface WorkoutEvent {
  title: string; // weekday name from the plan
  date: Date;
  duration: number; // in minutes
  description?: string;
  exercises?: string[];
  sessionTitle?: string;
  goal?: string;
  rpe?: string; // e.g. "2-3"
  zone?: string; // e.g. "1" or "1-2"
  phases?: WorkoutPhase[];
  tempo?: string;
  breathing?: string;
  heartRate?: string;
  safety?: string;
}

export type IcsLang = 'ru' | 'lv' | 'en';
export type Intensity = 'light' | 'moderate' | 'hard';

/** RPE 1-3 light, 4-6 moderate, 7-10 hard — judged by the top of the range. */
export function intensityLevel(rpe?: string): Intensity | null {
  if (!rpe) return null;
  const nums = rpe.match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  const top = Math.max(...nums);
  if (top <= 3) return 'light';
  if (top <= 6) return 'moderate';
  return 'hard';
}

const ICS_LABELS: Record<
  IcsLang,
  {
    workout: string;
    goal: string;
    intensity: string;
    zone: string;
    phases: string;
    steps: string;
    tempo: string;
    breathing: string;
    heartRate: string;
    safety: string;
    duration: string;
    min: string;
    level: Record<Intensity, string>;
    footer: string;
    reminder: string;
  }
> = {
  ru: {
    workout: 'Тренировка',
    goal: 'Цель',
    intensity: 'Интенсивность',
    zone: 'Зона',
    phases: 'Фазы',
    steps: 'Пошаговый план',
    tempo: 'Темп',
    breathing: 'Дыхание',
    heartRate: 'Пульс',
    safety: 'Безопасность',
    duration: 'Длительность',
    min: 'мин',
    level: { light: 'лёгкая', moderate: 'средняя', hard: 'высокая' },
    footer: 'План от CloudPulse AI-коуча, построен по твоему Readiness Score.',
    reminder: 'через 15 минут',
  },
  lv: {
    workout: 'Treniņš',
    goal: 'Mērķis',
    intensity: 'Intensitāte',
    zone: 'Zona',
    phases: 'Fāzes',
    steps: 'Soli pa solim',
    tempo: 'Temps',
    breathing: 'Elpošana',
    heartRate: 'Pulss',
    safety: 'Drošība',
    duration: 'Ilgums',
    min: 'min',
    level: { light: 'viegla', moderate: 'vidēja', hard: 'augsta' },
    footer: 'Plāns no CloudPulse AI trenera, veidots pēc tava Readiness Score.',
    reminder: 'pēc 15 minūtēm',
  },
  en: {
    workout: 'Workout',
    goal: 'Goal',
    intensity: 'Intensity',
    zone: 'Zone',
    phases: 'Phases',
    steps: 'Step by step',
    tempo: 'Tempo',
    breathing: 'Breathing',
    heartRate: 'Heart rate',
    safety: 'Safety',
    duration: 'Duration',
    min: 'min',
    level: { light: 'light', moderate: 'moderate', hard: 'hard' },
    footer: 'Plan from your CloudPulse AI coach, built from your Readiness Score.',
    reminder: 'in 15 minutes',
  },
};

/** Structured title + plain-text description shared by every export target. */
export function buildEventText(event: WorkoutEvent, lang: IcsLang = 'ru'): { title: string; description: string } {
  const L = ICS_LABELS[lang];
  const title = `[CloudPulse] ${event.sessionTitle || `${L.workout} · ${event.title}`}`;

  const lines: string[] = [];
  if (event.goal) lines.push(`${L.goal}: ${event.goal}`);

  const level = intensityLevel(event.rpe);
  const intensityParts = [
    event.rpe ? `RPE ${event.rpe}` : '',
    level ? L.level[level] : '',
    event.zone ? `${L.zone} ${event.zone}` : '',
  ].filter(Boolean);
  if (intensityParts.length) lines.push(`${L.intensity}: ${intensityParts.join(' · ')}`);
  lines.push(`${L.duration}: ${event.duration} ${L.min}`);

  if (event.phases?.length) {
    lines.push('', `${L.phases}:`);
    event.phases.forEach((p) => lines.push(`- ${p.name}: ${p.minutes} ${L.min}`));
  }

  if (event.exercises?.length) {
    lines.push('', `${L.steps}:`);
    event.exercises.forEach((ex, i) => lines.push(`${i + 1}. ${ex}`));
  } else if (event.description) {
    lines.push('', event.description);
  }

  const protocol = [
    event.tempo ? `${L.tempo}: ${event.tempo}` : '',
    event.breathing ? `${L.breathing}: ${event.breathing}` : '',
    event.heartRate ? `${L.heartRate}: ${event.heartRate}` : '',
  ].filter(Boolean);
  if (protocol.length) lines.push('', ...protocol);

  if (event.safety) lines.push('', `${L.safety}: ${event.safety}`);

  lines.push('', L.footer);
  return { title, description: lines.join('\n') };
}

/** iCalendar UTC timestamp. Uses UTC getters so the trailing "Z" is honest —
 *  the old version wrote local time with a Z, shifting every workout by the
 *  athlete's timezone offset (3 hours in Latvia in summer). */
function formatICSDate(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function endOf(event: WorkoutEvent) {
  return new Date(event.date.getTime() + event.duration * 60000);
}

export function generateICS(events: WorkoutEvent[], lang: IcsLang = 'ru'): string {
  const now = new Date();
  const L = ICS_LABELS[lang];

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CloudPulse//Workout Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:CloudPulse Workouts',
    '',
  ].join('\r\n');

  events.forEach((event, index) => {
    const { title, description } = buildEventText(event, lang);
    ics += [
      'BEGIN:VEVENT',
      `UID:event-${index}-${now.getTime()}@cloudpulse.app`,
      `DTSTAMP:${formatICSDate(now)}`,
      `DTSTART:${formatICSDate(event.date)}`,
      `DTEND:${formatICSDate(endOf(event))}`,
      `SUMMARY:${escapeICSText(title)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
      'SEQUENCE:0',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICSText(title)} ${L.reminder}`,
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
      '',
    ].join('\r\n');
  });

  return ics + 'END:VCALENDAR';
}

export function downloadICS(icsContent: string, filename: string = 'workouts.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Google Calendar "create event" link for a single workout. Google's URL
 *  API has no reminder parameter, so the calendar's default reminder applies. */
export function googleCalendarUrl(event: WorkoutEvent, lang: IcsLang = 'ru'): string {
  const { title, description } = buildEventText(event, lang);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatICSDate(event.date)}/${formatICSDate(endOf(event))}`,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook.com compose link for a single workout (no reminder parameter either). */
export function outlookCalendarUrl(event: WorkoutEvent, lang: IcsLang = 'ru'): string {
  const { title, description } = buildEventText(event, lang);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: event.date.toISOString(),
    enddt: endOf(event).toISOString(),
    body: description,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
