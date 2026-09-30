'use client';

// "Away trips" on /coach (lib/travel.ts, supabase/sql/15 team_trips).
// The coach enters the trip and the hours on the road; from 4 h the 48 hours
// after returning become recovery days for the whole team.

import { useCallback, useEffect, useState } from 'react';
import { Bus, Trash, Moon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { EXTRA } from '@/lib/i18n/extra';
import { HUB } from '@/components/PerformancePanel';
import { addDays } from '@/lib/checkin-streak';
import {
  TRAVEL_MIN_HOURS,
  activeTravel,
  isLongTrip,
  parseTrips,
  recoveryUntil,
  validateTrip,
  type Trip,
  type TripError,
} from '@/lib/travel';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function TeamTripsCard({ today }: { today: string }) {
  const { lang } = useLanguage();
  const t = EXTRA[lang].travel;
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [title, setTitle] = useState('');
  const [matchDate, setMatchDate] = useState(today);
  const [returnDate, setReturnDate] = useState(today);
  const [hours, setHours] = useState(6);
  const [errors, setErrors] = useState<(TripError | 'GENERIC')[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from('team_trips')
      .select('id, title, match_date, return_date, travel_hours')
      .eq('coach_id', uid)
      .gte('return_date', addDays(today, -7))
      .order('match_date');
    if (error) {
      setAvailable(false);
      return;
    }
    setTrips(parseTrips(data as unknown[]));
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  if (!available) return null;
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const active = trips ? activeTravel(trips, today) : null;

  async function add() {
    const input = { title, matchDate, returnDate, travelHours: hours };
    const errs = validateTrip(input);
    setErrors(errs);
    if (errs.length > 0) return;
    setBusy(true);
    const { data: s } = await supabase.auth.getSession();
    const { error } = await supabase.from('team_trips').insert({
      coach_id: s.session?.user?.id,
      title: title.trim(),
      match_date: matchDate,
      return_date: returnDate,
      travel_hours: hours,
    });
    setBusy(false);
    if (error) {
      setErrors(['GENERIC']);
      return;
    }
    setTitle('');
    load();
  }

  async function remove(id: string) {
    await supabase.from('team_trips').delete().eq('id', id);
    load();
  }

  const field =
    'w-full rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-[#CCFF00]/50 [color-scheme:dark]';

  return (
    <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <Bus size={18} weight="fill" className="text-zinc-300" />
        {t.coachTitle}
      </h2>
      <p className="mt-0.5 text-xs text-zinc-400">{t.coachSubtitle}</p>

      {active && (
        <div className="mt-4 flex gap-3 rounded-2xl bg-[#FFB020]/[0.08] p-3 ring-1 ring-inset ring-[#FFB020]/30">
          <Moon size={18} weight="fill" className="mt-0.5 shrink-0" style={{ color: HUB.amber }} />
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              {active.trip.title} · {t.recoveryUntil(day(active.until))}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">{t.coachReminder}</p>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-zinc-400">{t.tripTitle}</span>
          <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={t.tripTitlePlaceholder} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">{t.matchDate}</span>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => {
              setMatchDate(e.target.value);
              if (returnDate < e.target.value) setReturnDate(e.target.value);
            }}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">{t.returnDate}</span>
          <input type="date" value={returnDate} min={matchDate} onChange={(e) => setReturnDate(e.target.value)} className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-zinc-400">{t.hours}</span>
          <input
            type="number"
            min={1}
            max={48}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className={`${field} max-w-[120px] font-mono tabular-nums`}
          />
          <span className="mt-1 block text-[11px] text-zinc-500">{t.hoursHint(TRAVEL_MIN_HOURS)}</span>
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-[#FF4D5E]/[0.08] p-3 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
          {errors.map((e) => (
            <li key={e}>{t.errors[e]}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="mt-3 inline-flex h-10 items-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-zinc-50 hover:bg-white/15 disabled:opacity-50"
      >
        {busy ? t.adding : t.add}
      </button>

      <ul className="mt-4 space-y-2">
        {trips && trips.length === 0 && <li className="text-sm text-zinc-500">{t.empty}</li>}
        {trips?.map((trip) => (
          <li key={trip.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.02] px-3 py-2.5 ring-1 ring-inset ring-white/[0.06]">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm text-zinc-100">{t.tripLine(trip.title, day(trip.matchDate), trip.travelHours)}</span>
              <span className="block text-xs" style={{ color: isLongTrip(trip) ? HUB.amber : '#71717A' }}>
                {isLongTrip(trip) ? t.recoveryUntil(day(recoveryUntil(trip))) : t.shortTrip}
              </span>
            </span>
            <button
              type="button"
              onClick={() => remove(trip.id)}
              aria-label={t.remove}
              className="rounded-full p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
            >
              <Trash size={15} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
