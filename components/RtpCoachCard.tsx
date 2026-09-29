'use client';

import { useState } from 'react';
import { ArrowCounterClockwise, CheckCircle, Hourglass, ShieldCheck } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { HUB } from '@/components/PerformancePanel';
import { todayUtc } from '@/lib/checkin-streak';
import { RTP_CLEAN_DAYS_REQUIRED, type RtpStatus } from '@/lib/return-to-play';

// ---------------------------------------------------------------------------
// Coach side of Return-to-Play (lib/return-to-play.ts, SQL 11). Lists the
// athletes after a recent pain: how many days without pain, what they
// answered on the day +1 / +3 follow-up, and — only once there are 2 check-in
// days without pain — the button that allows full load again. The database
// re-checks the 2 days (clear_return_to_play), so a stale screen or an edited
// request cannot clear anyone early. Confirming takes two taps on purpose.
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export type RtpCoachEntry = { athleteId: string; label: string; status: Exclude<RtpStatus, { state: 'none' }> };

export default function RtpCoachCard({
  entries,
  onSelect,
  onCleared,
}: {
  entries: readonly RtpCoachEntry[];
  onSelect: (athleteId: string) => void;
  onCleared: () => void;
}) {
  const { t, lang } = useLanguage();
  const r = t.rtp;
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<string | null>(null);

  const today = todayUtc();
  // Open episodes, plus confirmations made today (so the coach sees the result).
  const shown = entries
    .filter((e) => e.status.state !== 'cleared' || (e.status.clearedAt && todayUtc(new Date(e.status.clearedAt)) === today))
    .sort((a, b) => order(a.status.state) - order(b.status.state) || a.label.localeCompare(b.label));
  if (shown.length === 0) return null;

  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const time = (iso: string) => new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' });

  async function clear(e: RtpCoachEntry) {
    setBusy(e.athleteId);
    setErrorFor(null);
    const { error } = await supabase.rpc('clear_return_to_play', {
      p_athlete_id: e.athleteId,
      p_pain_date: e.status.painDate,
    });
    setBusy(null);
    setConfirming(null);
    if (error) setErrorFor(e.athleteId);
    onCleared(); // reload either way: on error the screen was probably stale
  }

  return (
    <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <ArrowCounterClockwise size={17} weight="bold" className="text-zinc-300" />
        {r.coachTitle}
      </h2>
      <p className="mt-0.5 text-xs text-zinc-400">{r.coachHint}</p>

      <ul className="mt-4 space-y-2">
        {shown.map((e) => {
          const s = e.status;
          const color = s.state === 'cleared' ? HUB.lime : s.state === 'ready' ? HUB.amber : HUB.red;
          const StateIcon = s.state === 'cleared' ? CheckCircle : s.state === 'ready' ? ShieldCheck : Hourglass;
          return (
            <li key={e.athleteId} className="rounded-2xl bg-white/[0.02] p-3 ring-1 ring-inset ring-white/[0.06]">
              <div className="flex items-start gap-2.5">
                <StateIcon size={18} weight="fill" className="mt-0.5 shrink-0" style={{ color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <button
                      type="button"
                      onClick={() => onSelect(e.athleteId)}
                      className="font-semibold text-zinc-50 underline-offset-2 hover:underline"
                    >
                      {e.label}
                    </button>
                    <span className="text-zinc-500"> · {r.painOn(day(s.painDate), s.painZone)}</span>
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color }}>
                    {s.state === 'cleared' && s.clearedAt
                      ? r.coachCleared(time(s.clearedAt))
                      : s.state === 'ready'
                        ? r.coachReady
                        : r.coachRestricted(s.cleanDays, RTP_CLEAN_DAYS_REQUIRED)}
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-400">
                    {s.followups.length === 0 ? (
                      <li>{r.noAnswers}</li>
                    ) : (
                      s.followups.map((f) => (
                        <li key={f.dayOffset}>{r.answerLine(f.dayOffset, r.trend[f.trend], f.sawSpecialist)}</li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              {s.state === 'ready' && confirming !== e.athleteId && (
                <button
                  type="button"
                  onClick={() => setConfirming(e.athleteId)}
                  className="mt-3 w-full rounded-xl bg-[#CCFF00] px-3 py-2 text-sm font-semibold text-zinc-950"
                >
                  {r.clearButton}
                </button>
              )}

              {s.state === 'ready' && confirming === e.athleteId && (
                <div className="mt-3 rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/[0.1]">
                  <p className="text-xs leading-relaxed text-zinc-300">{r.clearConfirm}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm text-zinc-200 ring-1 ring-inset ring-white/[0.1]"
                    >
                      {r.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={busy === e.athleteId}
                      onClick={() => clear(e)}
                      className="rounded-xl bg-[#CCFF00] px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                    >
                      {r.clearYes}
                    </button>
                  </div>
                </div>
              )}

              {errorFor === e.athleteId && <p className="mt-2 text-xs text-[#FF4D5E]">{r.clearError}</p>}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
        {r.coachBasis} {r.disclaimer}
      </p>
    </section>
  );
}

function order(state: RtpStatus['state']): number {
  return state === 'ready' ? 0 : state === 'restricted' ? 1 : 2;
}
