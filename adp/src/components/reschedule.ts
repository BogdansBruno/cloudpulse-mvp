// adp/src/components/reschedule.ts
//
// Pure view logic behind TeacherRescheduleCard (unit-tested without a DOM).
// It decides what a teacher may see and do with one request.

import type { IsoDate, RescheduleReason, RescheduleRequest, RescheduleStatus } from '../types/adp';

/** The fields the teacher's card needs — nothing about health, grades or readiness. */
export type TeacherRequestView = Pick<
  RescheduleRequest,
  'id' | 'subject' | 'eventDate' | 'reason' | 'reasonNote' | 'proposedDates' | 'status' | 'approvedDate'
>;

/** A decision the card made itself, shown until the parent re-renders with fresh data. */
export type LocalDecision = { status: 'approved'; date: IsoDate } | { status: 'rejected' };

export type CardModel = {
  state: RescheduleStatus;
  reason: RescheduleReason;
  /** Free-text note to show, or null. Always null for a medical reason. */
  note: string | null;
  /** Dates offered as one-tap approve buttons (unique, sorted, only while pending). */
  dateChoices: readonly IsoDate[];
  approvedDate: IsoDate | null;
  canAct: boolean;
};

export const REJECT_NOTE_MAX = 280;

export function cardModel(request: TeacherRequestView, local: LocalDecision | null = null): CardModel {
  const state: RescheduleStatus = local?.status ?? request.status;
  const approvedDate =
    local?.status === 'approved' ? local.date : state === 'approved' ? request.approvedDate : null;
  const pending = state === 'pending';

  return {
    state,
    reason: request.reason,
    // Defence in depth: the database already refuses a note with a medical
    // reason; the card would not show one even if it arrived.
    note: request.reason === 'medical' ? null : request.reasonNote?.trim() || null,
    dateChoices: pending
      ? [...new Set(request.proposedDates)].filter((d) => d !== request.eventDate).sort()
      : [],
    approvedDate,
    canAct: pending,
  };
}

/** Trimmed decline note or null; over-long notes are cut to the database limit. */
export function cleanRejectNote(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, ' ');
  return s ? s.slice(0, REJECT_NOTE_MAX) : null;
}
