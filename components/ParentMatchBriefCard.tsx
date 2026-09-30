'use client';

// "Before the match" on /parent (lib/match-brief.ts, supabase/sql/15
// parent_match_brief()). The same verdict the coach sees in the match squad,
// for this parent's child only — no scores, no numbers, no pain location.

import { SoccerBall, CheckCircle, Warning, WarningOctagon, Question, Handshake } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { EXTRA } from '@/lib/i18n/extra';
import { HUB } from '@/components/PerformancePanel';
import { briefVerdict, daysUntil, type MatchBrief } from '@/lib/match-brief';
import type { RosterGroup, RosterReason } from '@/lib/match-roster';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };
const STYLE: Record<RosterGroup, { Icon: Icon; color: string }> = {
  available: { Icon: CheckCircle, color: HUB.lime },
  limited: { Icon: Warning, color: HUB.amber },
  out: { Icon: WarningOctagon, color: HUB.red },
  unknown: { Icon: Question, color: '#A1A1AA' },
};

export default function ParentMatchBriefCard({ brief, today }: { brief: MatchBrief; today: string }) {
  const { lang } = useLanguage();
  const t = EXTRA[lang].brief;
  const verdict = briefVerdict(brief);
  const { Icon: GroupIcon, color } = STYLE[verdict.group];
  const day = new Date(`${brief.matchDate}T12:00:00Z`).toLocaleDateString(LOCALE[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  const reasonText = (r: RosterReason): string => {
    switch (r.code) {
      case 'RTP_RESTRICTED':
        return t.reasons.RTP_RESTRICTED(r.cleanDays, r.required);
      default:
        return t.reasons[r.code];
    }
  };

  return (
    <section
      className="rounded-3xl p-5 ring-1 ring-inset backdrop-blur-2xl"
      style={{ backgroundColor: `${color}0F`, boxShadow: `inset 0 0 0 1px ${color}40` }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <SoccerBall size={16} weight="fill" className="text-zinc-300" />
          {t.title}
        </h3>
        <span className="text-xs text-zinc-400">{t.when(day, daysUntil(brief.matchDate, today))}</span>
      </div>

      <p className="mt-3 flex items-center gap-2.5 text-lg font-semibold" style={{ color }}>
        <GroupIcon size={24} weight="fill" />
        {t.groups[verdict.group]}
      </p>
      <ul className="mt-2 space-y-1">
        {verdict.reasons.map((r, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {reasonText(r)}
          </li>
        ))}
      </ul>

      <p className="mt-4 flex gap-2 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-zinc-400">
        <Handshake size={16} weight="fill" className="mt-px shrink-0 text-[#CCFF00]" />
        <span>
          {t.sameAsCoach} {t.coachDecides}
        </span>
      </p>
    </section>
  );
}
