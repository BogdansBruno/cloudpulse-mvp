'use client';

// "After the away trip" for the athlete (/training). Shown only inside the
// 48 h after a long trip the coach entered (lib/travel.ts). The plan below
// already follows it (POST_TRAVEL in /api/adp-coach); this card explains why
// and offers the signed note for the teacher (/api/travel-note, /note).

import { useEffect, useState } from 'react';
import { Bus, QrCode } from '@phosphor-icons/react';
import { toDataURL } from 'qrcode';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { EXTRA } from '@/lib/i18n/extra';
import { HUB } from '@/components/PerformancePanel';
import { addDays, todayUtc } from '@/lib/checkin-streak';
import { activeTravel, parseTrips, type ActiveTravel } from '@/lib/travel';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function TravelRecoveryCard({ className = '' }: { className?: string }) {
  const { lang } = useLanguage();
  const t = EXTRA[lang].travel;
  const [active, setActive] = useState<ActiveTravel | null>(null);
  const [note, setNote] = useState<{ qr: string; id: string } | 'loading' | 'unavailable' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = todayUtc();
    supabase
      .from('team_trips')
      .select('id, title, match_date, return_date, travel_hours')
      .gte('return_date', addDays(today, -3))
      .then(({ data, error }) => {
        if (!cancelled && !error) setActive(activeTravel(parseTrips(data as unknown[]), today));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!active) return null;
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' });

  async function getNote() {
    setNote('loading');
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch('/api/travel-note', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = (await res.json()) as { status?: string; token?: string; id?: string };
      if (body.status !== 'ok' || !body.token || !body.id) {
        setNote('unavailable');
        return;
      }
      const url = `${window.location.origin}/note?t=${encodeURIComponent(body.token)}`;
      const qr = await toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: 'M', color: { dark: '#07080A', light: '#FFFFFF' } });
      setNote({ qr, id: body.id });
    } catch {
      setNote('unavailable');
    }
  }

  return (
    <section className={`rounded-3xl bg-[#FFB020]/[0.07] p-5 ring-1 ring-inset ring-[#FFB020]/30 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-zinc-50">
          <Bus size={18} weight="fill" style={{ color: HUB.amber }} />
          {t.athleteTitle}
        </h2>
        <span className="rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">{t.athleteDay(active.day)}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-200">{t.athleteBody(active.trip.travelHours, day(active.until))}</p>

      {note === null && (
        <button
          type="button"
          onClick={getNote}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-zinc-50 hover:bg-white/15"
        >
          <QrCode size={16} />
          {t.noteButton}
        </button>
      )}
      {note === 'loading' && <p className="mt-4 text-sm text-zinc-400">{t.noteLoading}</p>}
      {note === 'unavailable' && <p className="mt-4 text-sm text-zinc-400">{t.noteUnavailable}</p>}
      {note && typeof note === 'object' && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-black/30 p-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={note.qr} alt="QR" width={160} height={160} className="rounded-xl bg-white" />
          <div className="text-sm leading-relaxed text-zinc-300">
            <p>{t.noteShow}</p>
            <p className="mt-2 font-mono text-xs text-zinc-500">#{note.id}</p>
            <p className="mt-2 text-xs text-zinc-500">{t.noteHint}</p>
          </div>
        </div>
      )}
    </section>
  );
}
