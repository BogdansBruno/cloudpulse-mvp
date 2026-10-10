'use client';

// components/np/WhyScoreCard.tsx — "Why this score" on Today (Lotus).
//
// The readiness engine starts every day at 100 and subtracts points for each risk it sees
// (ACWR spike or drop, monotony, a long streak, worse wellness than usual, an exam or a match
// coming up…). This card shows exactly those deductions for today. It runs the same engine the
// server runs (lib/readiness-engine, on GET /api/checkin?raw=1 — the same inputs the check-in's
// live preview uses) and only prints the equation when its result equals the stored score, so the
// card can never disagree with the hero ring. No check-in today → the card is not shown.

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { calculateReadiness } from '@/lib/readiness-engine';
import { translatePenalty } from '@/lib/engine-i18n';
import type { ReadinessHistoryResponse } from '@/lib/types/readiness';
import { CARDS } from './cardCopy';
import { CARD_THEME, cardClass } from './cardTheme';
import { MetricHeader } from './MetricCard';
import { LT } from './status';
import { InfoButton } from './InfoSheet';
import { useAccount } from './useAccount';
import { useMode } from './useMode';
import { PLAIN_PENALTY } from './modeCopy';

export default function WhyScoreCard({ date, score }: { date: string; score: number | null }): ReactElement | null {
  const { lang, t } = useLanguage();
  const cc = CARDS[lang].why;
  const { role } = useAccount();
  const { isPro } = useMode(role);
  const [raw, setRaw] = useState<ReadinessHistoryResponse['raw'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch('/api/checkin?days=29&raw=1', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) return;
        const body = (await res.json()) as ReadinessHistoryResponse;
        if (!cancelled && body.raw) setRaw(body.raw);
      } catch {
        // offline: the card simply stays hidden
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo(() => {
    if (!raw || !raw.checkins.some((c) => c.date === date)) return null;
    try {
      return calculateReadiness(raw.sessions, raw.checkins, date, raw.context);
    } catch {
      return null;
    }
  }, [raw, date]);

  if (!result || score === null) return null;
  const total = result.penalties.reduce((a, p) => a + p.points, 0);
  // the equation only when it is exactly what the engine stored (the score is clamped at 0)
  const same = result.score === score && 100 - total === score;
  const max = Math.max(1, ...result.penalties.map((p) => p.points));

  return (
    <section aria-label={t.checkin.whyScore} className={`np-enter mt-4 p-5 sm:p-6 ${cardClass('readiness')}`}>
      <MetricHeader theme="readiness" icon="gauge" label={t.checkin.whyScore} status={result.penalties.length ? cc.deductions(total) : cc.clean} info={<InfoButton k="why" accent={CARD_THEME.readiness.accent} baseline={{ now: String(score) }} />} />
      <p className="np-editorial mt-4 text-[26px] leading-tight">{same ? cc.equation(total, score) : cc.title}</p>
      {result.penalties.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-white/75">{cc.none}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {result.penalties.map((p, i) => (
            <li key={`${p.code}-${i}`}>
              <div className="flex items-start gap-3">
                <span className="w-10 shrink-0 font-mono text-sm font-semibold" style={{ color: LT.attention }}>
                  −{p.points}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug text-white/80">{isPro || p.code === 'EXAM_SOON' ? translatePenalty(t, p) : PLAIN_PENALTY[lang][p.code](p.code === 'NO_REST_STREAK' ? Number(p.params?.days) : undefined)}</span>
              </div>
              <span aria-hidden className="mt-1.5 ml-[52px] block h-[3px] rounded-full bg-[#9AA7B8]/10">
                <span className="block h-full rounded-full" style={{ width: `${(p.points / max) * 100}%`, backgroundColor: LT.attention, boxShadow: `0 0 6px ${LT.attention}88` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11px] leading-relaxed" style={{ color: `${CARD_THEME.readiness.accent}cc` }}>
        {cc.base}
      </p>
    </section>
  );
}
