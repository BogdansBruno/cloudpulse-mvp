'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, CheckCircle, ArrowRight } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { addDays, computeCheckinStreak, recentDays, todayUtc } from '@/lib/checkin-streak';
import type { CheckinStreak } from '@/lib/checkin-streak';

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
  }, []);

  if (hidden) return null;

  const card = `rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl ${className}`;

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
        <h2 className="flex items-center gap-2 text-sm text-zinc-400">
          <Flame size={16} weight="fill" className={lit ? 'text-[#CCFF00]' : 'text-zinc-600'} />
          {s.title}
        </h2>
        {doneToday ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#CCFF00]">
            <CheckCircle size={14} weight="fill" />
            {s.doneToday}
          </span>
        ) : (
          showCta && (
            <Link href="/checkin" className="inline-flex items-center gap-1 text-xs font-semibold text-[#CCFF00]">
              {t.hub.doCheckin}
              <ArrowRight size={13} weight="bold" />
            </Link>
          )
        )}
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-zinc-50">{s.days(current)}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {!doneToday && <span className="text-zinc-300">{current > 0 ? s.keepGoing : s.startNew} · </span>}
        {s.best(best)}
      </p>

      <div className="mt-4">
        <p className="mb-1.5 text-[11px] text-zinc-500">{s.last14}</p>
        <ol className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
          {data.days.map((d, i) => {
            const isToday = i === data.days.length - 1;
            return (
              <li
                key={d.date}
                title={`${dayLabel(d.date)} · ${d.done ? s.dayDone : s.dayMissed}`}
                aria-label={`${dayLabel(d.date)}: ${d.done ? s.dayDone : s.dayMissed}`}
                className={`h-5 rounded-md ${d.done ? 'bg-[#CCFF00]' : 'bg-white/[0.07]'} ${
                  isToday ? 'ring-1 ring-inset ring-white/40' : ''
                }`}
              />
            );
          })}
        </ol>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{s.honesty}</p>
    </section>
  );
}
