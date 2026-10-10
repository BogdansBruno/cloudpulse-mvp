'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, CheckCircle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { addDays, computeCheckinStreak, recentDays, todayUtc } from '@/lib/checkin-streak';
import type { CheckinStreak } from '@/lib/checkin-streak';
import { SYNCED_EVENT } from '@/lib/offline-queue';
import { cardClass, CARD_THEME } from '@/components/np/cardTheme';
import { InfoButton } from '@/components/np/InfoSheet';

const ACC = CARD_THEME.sleep.accent;

// ---------------------------------------------------------------------------
// Athlete's check-in streak: shown on /progress and on the check-in result
// screen. Counts days with a check-in, never the score (see
// lib/checkin-streak.ts for why). Reads only the athlete's own dates, which
// the existing "own checkins" RLS policy already allows.
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

type Loaded = { streak: CheckinStreak; days: { date: string; done: boolean }[] };

export default function CheckinStreakCard({
  showCta = true,
  className = '',
}: {
  showCta?: boolean;
  className?: string;
}) {
  const { t, lang } = useLanguage();
  const s = t.streak;
  const [data, setData] = useState<Loaded | null>(null);
  const [hidden, setHidden] = useState(false);
  // Bumped when OfflineSync has sent queued check-ins, so the streak catches up.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const bump = () => setReloadKey((k) => k + 1);
    window.addEventListener(SYNCED_EVENT, bump);
    return () => window.removeEventListener(SYNCED_EVENT, bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        if (!cancelled) setHidden(true);
        return;
      }
      const today = todayUtc();
      const { data: rows, error } = await supabase
        .from('checkins')
        .select('date')
        .eq('user_id', uid)
        .gte('date', addDays(today, -400))
        .lte('date', today);
      if (cancelled) return;
      if (error) {
        setHidden(true);
        return;
      }
      const dates = ((rows ?? []) as { date: string }[]).map((r) => r.date);
      setData({ streak: computeCheckinStreak(dates, today), days: recentDays(dates, today, 14) });
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (hidden) return null;

  const card = `${cardClass('sleep')} p-5 ${className}`;

  if (!data) {
    return <div className={`${card} h-[172px] animate-pulse`} aria-busy />;
  }

  const { current, best, doneToday } = data.streak;
  const lit = current > 0;
  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' });

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-widest text-white/75">
          <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06]">
            <Flame size={18} weight="fill" style={{ color: lit ? ACC : 'rgb(255 255 255 / 0.3)' }} />
          </span>
          {s.title}
        </h2>
        <div className="flex items-center gap-1">
        {doneToday ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: ACC }}>
            <CheckCircle size={14} weight="fill" />
            {s.doneToday}
          </span>
        ) : (
          showCta && (
            <Link href="/checkin" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-50 underline decoration-white/30 underline-offset-4 hover:decoration-white">
              {t.hub.doCheckin}
            </Link>
          )
        )}
          <InfoButton k="streak" accent={ACC} baseline={{ now: String(current) }} />
        </div>
      </div>

      <p className="np-editorial mt-4 text-[28px] leading-tight">{s.days(current)}</p>
      <p className="mt-1 text-xs text-white/75">
        {!doneToday && <span className="text-zinc-300">{current > 0 ? s.keepGoing : s.startNew} · </span>}
        {s.best(best)}
      </p>

      <div className="mt-4">
        <p className="mb-1.5 text-[11px] text-white/75">{s.last14}</p>
        <ol className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
          {data.days.map((d, i) => {
            const isToday = i === data.days.length - 1;
            return (
              <li
                key={d.date}
                title={`${dayLabel(d.date)} · ${d.done ? s.dayDone : s.dayMissed}`}
                aria-label={`${dayLabel(d.date)}: ${d.done ? s.dayDone : s.dayMissed}`}
                className={`h-5 rounded-full ${d.done ? 'bg-[#3FE0A8]/85 shadow-[0_0_8px_rgb(82_196_165/0.45)]' : 'bg-[#9AA7B8]/10'} ${
                  isToday ? 'ring-1 ring-inset ring-white/40' : ''
                }`}
              />
            );
          })}
        </ol>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-white/75">{s.honesty}</p>
    </section>
  );
}
