'use client';

// adp/src/components/TeacherRescheduleCard.tsx
//
// One reschedule request on the teacher's panel (PRD 3.4).
// "The machine counts, a human decides":
//   - approving is ONE tap on one of the dates the student proposed — the tap
//     both approves and picks the new date (the database only accepts a
//     proposed date);
//   - declining takes two taps, because a decline is final and the request
//     is never sent again;
//   - after a decision the card shows the outcome and offers no more actions.
//
// What the teacher never sees here: health, readiness, grades or the reason
// behind a medical request (only that one exists). The component receives
// only TeacherRequestView, which has none of those fields.
//
// Presentational: the page passes onApprove / onReject, which call the API
// (PATCH /api/v1/academic/reschedule-request/{id}); this card never talks to
// the database itself.

import { useId, useState, type ChangeEvent, type ReactElement } from 'react';
import type { IsoDate, Uuid } from '../types/adp';
import { RESCHEDULE_LABELS, formatDay, type AdpLang } from './labels';
import { REJECT_NOTE_MAX, cardModel, cleanRejectNote, type LocalDecision, type TeacherRequestView } from './reschedule';

export type Summons = {
  eventName: string;
  startsOn: IsoDate;
  endsOn: IsoDate;
  /** Club or federation that issued the call-up. */
  issuedBy: string;
};

export type TeacherRescheduleCardProps = {
  request: TeacherRequestView;
  studentName: string;
  /** Official call-up behind a 'competition' request, when the club attached one. */
  summons?: Summons | null;
  lang?: AdpLang;
  onApprove: (requestId: Uuid, newDate: IsoDate) => Promise<void>;
  onReject: (requestId: Uuid, note: string | null) => Promise<void>;
  className?: string;
};

type Busy = { kind: 'approve'; date: IsoDate } | { kind: 'reject' } | null;

export default function TeacherRescheduleCard({
  request,
  studentName,
  summons = null,
  lang = 'lv',
  onApprove,
  onReject,
  className = '',
}: TeacherRescheduleCardProps): ReactElement {
  const t = RESCHEDULE_LABELS[lang];
  const noteId = useId();

  const [local, setLocal] = useState<LocalDecision | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [failed, setFailed] = useState(false);

  const model = cardModel(request, local);
  const day = (d: IsoDate) => formatDay(d, lang);
  const locked = busy !== null || !model.canAct;

  async function approve(date: IsoDate) {
    if (locked) return;
    setBusy({ kind: 'approve', date });
    setFailed(false);
    try {
      await onApprove(request.id, date);
      setLocal({ status: 'approved', date });
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (locked) return;
    setBusy({ kind: 'reject' });
    setFailed(false);
    try {
      await onReject(request.id, cleanRejectNote(rejectNote));
      setLocal({ status: 'rejected' });
      setConfirmingReject(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <article
      className={`rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] ${className}`}
      aria-busy={busy !== null}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.kicker}</p>
      <h3 className="mt-1 text-base font-semibold tracking-[-0.01em] text-zinc-50">{studentName}</h3>
      <p className="mt-0.5 text-sm text-zinc-300">{t.assessment(request.subject, day(request.eventDate))}</p>

      <div className="mt-3 rounded-2xl bg-white/[0.03] p-3 text-sm text-zinc-300 ring-1 ring-inset ring-white/[0.06]">
        <p className="font-medium text-zinc-100">{t.reasons[model.reason]}</p>
        {model.reason === 'medical' && <p className="mt-1 text-xs text-zinc-400">{t.medicalNote}</p>}
        {model.note && <p className="mt-1 text-xs text-zinc-400">«{model.note}»</p>}
        {summons && model.reason === 'competition' && (
          <p className="mt-1 text-xs text-zinc-400">
            {t.summons(summons.eventName, day(summons.startsOn), day(summons.endsOn), summons.issuedBy)}
          </p>
        )}
      </div>

      {model.state === 'pending' && !confirmingReject && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-zinc-400">{t.chooseDate}</p>
          <div className="flex flex-wrap gap-2">
            {model.dateChoices.map((d) => {
              const thisOne = busy?.kind === 'approve' && busy.date === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => approve(d)}
                  disabled={locked}
                  aria-busy={thisOne}
                  className="min-h-11 rounded-full bg-[#CCFF00] px-4 text-sm font-semibold text-zinc-950 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080A] disabled:opacity-50"
                >
                  {t.moveTo(day(d))}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setConfirmingReject(true)}
              disabled={locked}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-zinc-300 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:opacity-50"
            >
              {t.reject}
            </button>
          </div>
        </div>
      )}

      {model.state === 'pending' && confirmingReject && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-[#FFB020]">{t.rejectFinalHint}</p>
          <label htmlFor={noteId} className="sr-only">
            {t.rejectNotePlaceholder}
          </label>
          <textarea
            id={noteId}
            value={rejectNote}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRejectNote(e.target.value)}
            maxLength={REJECT_NOTE_MAX}
            rows={2}
            placeholder={t.rejectNotePlaceholder}
            disabled={busy !== null}
            className="w-full resize-none rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-zinc-400"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reject}
              disabled={busy !== null}
              aria-busy={busy?.kind === 'reject'}
              className="min-h-11 rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080A] disabled:opacity-50"
            >
              {t.rejectConfirm}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReject(false)}
              disabled={busy !== null}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {model.state === 'approved' && model.approvedDate && (
        <p className="mt-4 text-sm font-medium text-[#CCFF00]" role="status">
          {t.approved(day(model.approvedDate))}
        </p>
      )}
      {model.state === 'rejected' && (
        <p className="mt-4 text-sm font-medium text-zinc-300" role="status">
          {t.rejected}
        </p>
      )}

      {failed && (
        <p className="mt-3 text-xs text-[#FF4D5E]" role="alert">
          {t.error}
        </p>
      )}
      {model.state === 'pending' && <p className="mt-4 text-[11px] text-zinc-500">{t.finalNote}</p>}
    </article>
  );
}
