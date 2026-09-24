/**
 * Schedule Parser
 * Extracts structured workout schedules from AI responses
 */

import type { WorkoutEvent } from './ics-generator';

export interface ParsedSchedule {
  events: WorkoutEvent[];
  rawText: string;
  hasSchedule: boolean;
}

/**
 * Parses a schedule block from AI response
 * Expected format:
 * <schedule>
 * Понедельник, DD.MM.YYYY, HH:MM, NN минут
 * - Упражнение 1 (подходы x повторения)
 * - Упражнение 2
 * ...
 * </schedule>
 */
export function parseScheduleFromAI(response: string): ParsedSchedule {
  const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
  const match = response.match(scheduleRegex);

  if (!match) {
    return {
      events: [],
      rawText: response,
      hasSchedule: false,
    };
  }

  const scheduleText = match[1];
  const events: WorkoutEvent[] = [];

  // Split by day blocks (each starts with day name and date/time)
  // Includes Latvian diacritics (Trešdiena, Svētdiena, ...) alongside plain
  // Latin (English) and Cyrillic (Russian) day names, so the parser doesn't
  // silently drop a day block when the chat language switches to Latvian.
  const dayPattern =
    /([A-Za-zА-Яа-яĀāČčĒēĢģĪīĶķĻļŅņŠšŪūŽž]+),\s*(\d{1,2})\.(\d{1,2})\.(\d{4}),\s*(\d{1,2}):(\d{2}),\s*(\d+)\s*(?:минут|min(?:ūtes)?)/g;

  let dayMatch;
  let previousMatchEnd = 0;

  while ((dayMatch = dayPattern.exec(scheduleText)) !== null) {
    const [fullMatch, dayName, day, month, year, hour, minute, duration] = dayMatch;
    const position = dayMatch.index;

    // Extract exercises until the next day block or end of schedule
    const remainingText = scheduleText.substring(position + fullMatch.length);
    const nextDayRegex =
      /([A-Za-zА-Яа-яĀāČčĒēĢģĪīĶķĻļŅņŠšŪūŽž]+),\s*(\d{1,2})\.(\d{1,2})\.(\d{4}),\s*(\d{1,2}):(\d{2}),\s*(\d+)\s*(?:минут|min(?:ūtes)?)/;
    const nextDayMatch = nextDayRegex.exec(remainingText);

    const endPosition = nextDayMatch && nextDayMatch.index !== undefined
      ? position + fullMatch.length + nextDayMatch.index
      : scheduleText.length;

    const dayContent = scheduleText.substring(position + fullMatch.length, endPosition);
    const exerciseLines = dayContent
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim());

    // Create date object
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const yearNum = parseInt(year, 10);
    const hourNum = parseInt(hour, 10);
    const minNum = parseInt(minute, 10);

    const eventDate = new Date(yearNum, monthNum - 1, dayNum, hourNum, minNum, 0);

    if (!isNaN(eventDate.getTime())) {
      events.push({
        title: dayName,
        date: eventDate,
        duration: parseInt(duration, 10),
        exercises: exerciseLines,
      });
    }
  }

  return {
    events,
    rawText: response,
    hasSchedule: events.length > 0,
  };
}

/**
 * Extract just the text before the schedule block
 */
export function getTextBeforeSchedule(response: string): string {
  const scheduleIndex = response.indexOf('<schedule>');
  if (scheduleIndex === -1) {
    return response;
  }
  return response.substring(0, scheduleIndex).trim();
}

/**
 * Extract just the text after the schedule block
 */
export function getTextAfterSchedule(response: string): string {
  const scheduleMatch = /<schedule>[\s\S]*?<\/schedule>/.exec(response);
  if (!scheduleMatch) {
    return '';
  }
  return response.substring(scheduleMatch.index + scheduleMatch[0].length).trim();
}
