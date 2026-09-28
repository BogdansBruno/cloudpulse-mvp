'use client';

import { useState } from 'react';
import { WarningOctagon, Warning, Question, CheckCircle, Copy, Check } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { HUB } from '@/components/PerformancePanel';
import {
  ROSTER_GROUPS,
  buildMatchRoster,
  nextTeamMatch,
  rosterShareText,
  type RosterCheckin,
  type RosterGroup,
  type RosterPlayer,
  type RosterReason,
} from '@/lib/match-roster';

// ---------------------------------------------------------------------------
// "Match squad" on /coach: the whole team in four groups (lib/match-roster.ts),
// problems first. Built from the numbers the engine already stored on today's
// check-ins — no new data from athletes. The card suggests; the coach picks.
// Tapping a name opens that athlete's full readiness below.
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

const GROUP_STYLE: Record<RosterGroup, { Icon: Icon; color: string }> = {
  out: { Icon: WarningOctagon, color: HUB.red },
  limited: { Icon: Warning, color: HUB.amber },
  unknown: { Icon: Question, color: '#A1A1AA' },
  available: { Icon: CheckCircle, color: HUB.lime },
};

export default function MatchRosterCard({
  players,
  checkins,
  matchDates,
  today,
  onSelect,
}: {
  players: readonly RosterPlayer[];
  checkins: ReadonlyMap<string, RosterCheckin>;
  /** Every match date on the athletes' calendars; the card picks the next one. */
  matchDates: readonly string[];
  today: string;
  onSelect: (athleteId: string) => void;
}) {
  const { t, lang } = useLanguage();
  const r = t.roster;
  const [copied, setCopied] = useState(false);

  const roster = buildMatchRoster(players, checkins);
  const next = nextTeamMatch(matchDates, today);
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  const reasonText = (reason: RosterReason): string => {
    switch (reason.code) {
      case 'PAIN':
        return r.reasonPain(reason.zone);
      case 'LOW_READINESS':
        return r.reasonLowReadiness(reason.score);
      case 'LOAD_SPIKE':
        return r.reasonLoadSpike(reason.acwr.toFixed(2));
      case 'NO_CHECKIN':
        return r.reasonNoCheckin;
      case 'NOT_COMPUTED':
        return r.reasonNotComputed;
      case 'OK':
        return r.reasonOk(reason.score);
    }
  };

  async function copy() {
    const text = rosterShareText(roster, {
      header: r.shareHeader(day(next?.date ?? today)),
      groups: r.shareGroups,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (old browser / no permission): nothing to show.
    }
  }

  return (
    <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.01em] text-zinc-50">{r.title}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {next ? r.nextMatch(day(next.date), next.inDays) : r.noMatch}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-inset ring-white/[0.1] hover:bg-white/[0.07]"
        >
          {copied ? <Check size={13} weight="bold" className="text-[#CCFF00]" /> : <Copy size={13} />}
          {copied ? r.copied : r.copy}
        </button>
      </div>

      {/* Counts at a glance */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROSTER_GROUPS.map((g) => {
          const { Icon: GroupIcon, color } = GROUP_STYLE[g];
          return (
            <div key={g} className="rounded-2xl bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/[0.06]">
              <p className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                <GroupIcon size={13} weight="fill" style={{ color }} />
                {r.groups[g]}
              </p>
              <p className="mt-1 font-mono text-xl tabular-nums text-zinc-50">{roster.groups[g].length}</p>
            </div>
          );
        })}
      </div>

      {/* Groups, problems first */}
      <div className="mt-4 space-y-4">
        {ROSTER_GROUPS.map((g) => {
          const rows = roster.groups[g];
          if (rows.length === 0) return null;
          const { Icon: GroupIcon, color } = GROUP_STYLE[g];
          return (
            <div key={g}>
              <h3 className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
                <GroupIcon size={14} weight="fill" />
                {r.groups[g]} · {rows.length}
              </h3>
              <ul className="divide-y divide-white/[0.05] rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.05]">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-white/[0.03]"
                    >
                      <span className="text-sm font-medium text-zinc-100">{row.label}</span>
                      <span className="text-xs text-zinc-400">{row.reasons.map(reasonText).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{r.basis}</p>
    </section>
  );
}
