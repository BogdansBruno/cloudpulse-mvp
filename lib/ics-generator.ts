/**
 * ICS Calendar File Generator
 * Converts workout events into iCalendar format (.ics)
 * Compatible with Google Calendar, Apple Calendar, Outlook
 */

export interface WorkoutEvent {
  title: string;
  date: Date;
  duration: number; // in minutes
  description?: string;
  exercises?: string[];
}

type IcsLang = 'ru' | 'lv' | 'en';

const ICS_LABELS: Record<IcsLang, { workout: string; exercises: string; duration: string; footer: string; reminder: string }> = {
  ru: {
    workout: 'Тренировка',
    exercises: 'Упражнения',
    duration: 'Длительность',
    footer: 'План от CloudPulse AI-коуча — построен на основе твоего Readiness Score.',
    reminder: 'через 15 минут',
  },
  lv: {
    workout: 'Treniņš',
    exercises: 'Vingrinājumi',
    duration: 'Ilgums',
    footer: 'Plāns no CloudPulse AI trenera — veidots pēc tava Readiness Score.',
    reminder: 'pēc 15 minūtēm',
  },
  en: {
    workout: 'Workout',
    exercises: 'Exercises',
    duration: 'Duration',
    footer: "Plan from your CloudPulse AI coach — built from your Readiness Score.",
    reminder: 'in 15 minutes',
  },
};

/**
 * Formats a date into iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escapes special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Generates a complete ICS calendar file content
 */
export function generateICS(events: WorkoutEvent[], lang: IcsLang = 'ru'): string {
  const now = new Date();
  const labels = ICS_LABELS[lang];

  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CloudPulse//Workout Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:CloudPulse Workouts
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Training schedule from CloudPulse AI Coach
`;

  events.forEach((event, index) => {
    const eventID = `event-${index}-${now.getTime()}@cloudpulse.app`;
    const startTime = formatICSDate(event.date);
    const endDate = new Date(event.date.getTime() + event.duration * 60000);
    const endTime = formatICSDate(endDate);

    const summary = `${labels.workout} · ${event.title}`;

    const exerciseBlock =
      event.exercises && event.exercises.length
        ? `${labels.exercises}:\n${event.exercises.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}`
        : event.description || '';

    const description = [
      exerciseBlock,
      `${labels.duration}: ${event.duration} min`,
      '',
      labels.footer,
    ]
      .filter(Boolean)
      .join('\n');

    icsContent += `BEGIN:VEVENT
UID:${eventID}
DTSTAMP:${formatICSDate(now)}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${escapeICSText(summary)}
DESCRIPTION:${escapeICSText(description)}
LOCATION:Home or Gym
SEQUENCE:0
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${escapeICSText(summary)} ${labels.reminder}
TRIGGER:-PT15M
END:VALARM
END:VEVENT
`;
  });

  icsContent += 'END:VCALENDAR';
  return icsContent;
}

/**
 * Triggers browser download of ICS file
 */
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
