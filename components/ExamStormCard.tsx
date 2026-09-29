'use client';

import { CloudLightning, SoccerBall } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { HUB } from '@/components/PerformancePanel';
import { displayCount, examStorm, type StormAthlete } from '@/lib/exam-storm';

// ---------------------------------------------------------------------------
// "Exam storm" on /coach (lib/exam-storm.ts): the next 14 days as counts —
// how many athletes are in their exam window each day (the engine already
// lowers their readiness), where the storms are and whether a match falls
// inside one. No names; 1–2 is shown as "<3", and bars for 1 and 2 have the
// same height, so the picture does not leak the number either.
// ---------------------------------------------------------------------------

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function ExamStormCard({ athletes, today }: { athletes: readonly StormAthlete[]; today: string }) {
  const { t, lang } = useLanguage();
  const s = t.storm;
  const storm = examStorm(athletes, today);
  const anyExam = storm.days.some((d) => d.inWindow > 0);

  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { ...opts, timeZone: 'UTC' });
  const day = (iso: string) => fmt(iso, { day: 'numeric', month: 'long' });
  const range = (from: string, to: string) => (from === to ? day(from) : `${day(from)} – ${day(to)}`);
  const label = (n: number) => {
    const c = displayCount(n);
    return 'exact' in c ? String(c.exact) : s.fewer;
  };

  return (
    <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <CloudLightning size={18} weight="fill" style={{ color: storm.storms.length > 0 ? HUB.amber : '#A1A1AA' }} />
        {s.title}
      </h2>
      <p className="mt-0.5 text-xs text-zinc-400">{s.subtitle}</p>

      {!anyExam ? (
        <div className="mt-4 text-sm text-zinc-300">
          <p>{s.none}</p>
          <p className="mt-1 text-xs text-zinc-500">{s.noneHint}</p>
        </div>
      ) : (
        <>
          {/* 14-day strip */}
          <div className="mt-4 grid grid-cols-7 gap-1 sm:grid-cols-14" role="list" aria-label={s.title}>
            {storm.days.map((d) => {
              const c = displayCount(d.inWindow);
              const height = 'exact' in c ? (storm.teamSize > 0 ? c.exact / storm.teamSize : 0) : 0.15;
              const isToday = d.date === today;
              return (
                <div
                  key={d.date}
                  role="listitem"
                  aria-label={s.dayAria(day(d.date), label(d.inWindow), d.matches > 0)}
                  className={`flex flex-col items-center rounded-xl px-0.5 py-1.5 ${isToday ? 'ring-1 ring-inset ring-white/20' : ''}`}
                  style={d.storm ? { backgroundColor: `${HUB.amber}1A` } : undefined}
                >
                  <span className="text-[10px] uppercase text-zinc-500">{fmt(d.date, { weekday: 'narrow' })}</span>
                  <span className="text-[11px] tabular-nums text-zinc-300">{fmt(d.date, { day: 'numeric' })}</span>
                  <div className="mt-1 flex h-12 w-3 items-end overflow-hidden rounded-full" style={{ backgroundColor: HUB.track }}>
                    {height > 0 && (
                      <div
                        className="w-full rounded-full"
                        style={{ height: `${Math.max(height, 0.15) * 100}%`, backgroundColor: d.storm ? HUB.amber : '#71717A' }}
                      />
                    )}
                  </div>
                  <span className="mt-1 font-mono text-[11px] tabular-nums" style={{ color: d.storm ? HUB.amber : '#A1A1AA' }}>
                    {d.inWindow > 0 ? label(d.inWindow) : '·'}
                  </span>
                  {d.matches > 0 ? (
                    <SoccerBall size={11} weight="fill" className="mt-0.5 text-zinc-300" aria-hidden />
                  ) : (
                    <span className="mt-0.5 h-[11px]" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: HUB.amber }} />
              {s.legendStorm(storm.threshold)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <SoccerBall size={11} weight="fill" className="text-zinc-300" />
              {s.legendMatch}
            </span>
          </p>

          <div className="mt-4 space-y-1.5 text-sm text-zinc-200">
            {storm.storms.length === 0 ? (
              <p>{s.calm}</p>
            ) : (
              storm.storms.map((r) => <p key={r.from}>{s.stormLine(range(r.from, r.to), label(r.peak), storm.teamSize)}</p>)
            )}
            {storm.matchesInStorm.length > 0 && (
              <p className="font-medium" style={{ color: HUB.amber }}>
                {s.matchInStorm(storm.matchesInStorm.map(day).join(', '))}
              </p>
            )}
            {storm.storms.length > 0 && <p className="text-xs text-zinc-400">{s.engineNote}</p>}
          </div>
        </>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{s.privacy}</p>
    </section>
  );
}
