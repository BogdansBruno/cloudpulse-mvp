'use client';

// /cv/<token> — what a scout sees (lib/scout-cv.ts, supabase/sql/15 scout_cv()).
// No account needed. The link works only after a parent switched it on, only
// until it expires, and stops the moment the athlete or parent revokes it.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Lightning, SealCheck, SealWarning, Printer } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS, type Lang } from '@/lib/i18n/translations';
import { EXTRA } from '@/lib/i18n/extra';
import { HUB } from '@/components/PerformancePanel';
import { isScoutToken, parseCv, regularity, type ScoutCv } from '@/lib/scout-cv';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function ScoutCvPage() {
  const { lang, setLang } = useLanguage();
  const t = EXTRA[lang].cv;
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : '';
  const [cv, setCv] = useState<ScoutCv | null | 'invalid'>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isScoutToken(token)) {
      setCv('invalid');
      return;
    }
    supabase.rpc('scout_cv', { p_token: token }).then(({ data, error }) => {
      if (cancelled) return;
      setCv(error ? 'invalid' : (parseCv(data) ?? 'invalid'));
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const date = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const month = (ym: string) =>
    `${new Date(`${ym}-15T12:00:00Z`).toLocaleDateString(LOCALE[lang], { month: 'short', timeZone: 'UTC' })} ’${ym.slice(2, 4)}`;
  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] print:bg-white print:ring-zinc-300';

  return (
    <main className="flex min-h-dvh flex-col items-center bg-[#07080A] px-4 py-8 print:bg-white">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between print:hidden">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#CCFF00] text-zinc-950">
              <Lightning size={15} weight="fill" />
            </span>
            CloudPulse
          </span>
          <div className="flex gap-0.5 rounded-full border border-white/5 bg-black/20 p-1 text-xs">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-full px-2.5 py-1 font-semibold ${lang === l.code ? 'bg-[#CCFF00] text-zinc-950' : 'text-zinc-400'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </header>

        {cv === null && <p className="text-sm text-zinc-400">{t.loading}</p>}

        {cv === 'invalid' && (
          <section className={card}>
            <p className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
              <SealWarning size={24} weight="fill" className="text-zinc-400" />
              {t.invalidTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t.invalidBody}</p>
          </section>
        )}

        {cv && cv !== 'invalid' && (
          <div className="space-y-3 print:text-black">
            <section className={card}>
              <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">{t.title}</p>
              <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-zinc-50 print:text-black">{cv.displayName}</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {cv.sport ? `${t.sport}: ${cv.sport} · ` : ''}
                {t.forRecipient(cv.recipient)}
              </p>
              <p className="mt-1 text-sm text-zinc-400">{t.period(date(cv.period.from), date(cv.period.to))}</p>
              <p className="mt-3 flex gap-2 rounded-2xl bg-[#CCFF00]/[0.06] p-3 text-xs leading-relaxed text-zinc-300 ring-1 ring-inset ring-[#CCFF00]/25 print:text-black">
                <SealCheck size={16} weight="fill" className="mt-px shrink-0" style={{ color: HUB.lime }} />
                {t.verified}
              </p>
            </section>

            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-100 print:text-black">{t.disciplineTitle}</h2>
              <p className="mt-2 font-mono text-3xl font-light tabular-nums text-zinc-50 print:text-black">
                {regularity(cv).weeks}
                <span className="text-lg text-zinc-500">/{regularity(cv).of}</span>
              </p>
              <p className="text-sm text-zinc-300">{t.weeks(regularity(cv).weeks, regularity(cv).of)}</p>
              <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                <li>{t.checkinDays(cv.discipline.checkinDays, cv.discipline.periodDays)}</li>
                <li>{t.longestStreak(cv.discipline.longestStreak)}</li>
                <li>{t.sessions(cv.discipline.sessionsLogged)}</li>
              </ul>
            </section>

            {cv.readiness && cv.readiness.length > 0 && (
              <section className={card}>
                <h2 className="text-sm font-semibold text-zinc-100 print:text-black">{t.readinessTitle}</h2>
                <ul className="mt-3 space-y-2">
                  {cv.readiness.map((m) => (
                    <li key={m.month} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 text-sm">
                      <span className="whitespace-nowrap text-zinc-400">{month(m.month)}</span>
                      <span className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]" aria-label={`${m.green} ${t.green}, ${m.yellow} ${t.yellow}, ${m.red} ${t.red}`}>
                        <span style={{ width: `${(m.green / Math.max(1, m.days)) * 100}%`, backgroundColor: HUB.lime }} />
                        <span style={{ width: `${(m.yellow / Math.max(1, m.days)) * 100}%`, backgroundColor: HUB.amber }} />
                        <span style={{ width: `${(m.red / Math.max(1, m.days)) * 100}%`, backgroundColor: HUB.red }} />
                      </span>
                      <span className="font-mono text-xs tabular-nums text-zinc-400">
                        {m.avgScore !== null ? `${t.avg} ${m.avgScore}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t.readinessHint}</p>
              </section>
            )}

            {cv.health && (
              <section className={card}>
                <h2 className="text-sm font-semibold text-zinc-100 print:text-black">{t.healthTitle}</h2>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  <li>{t.painReports(cv.health.painReports12m)}</li>
                  <li>{t.returnsConfirmed(cv.health.returnsConfirmed12m)}</li>
                </ul>
                <p className="mt-2 text-xs text-zinc-500">{t.healthNote}</p>
              </section>
            )}

            <section className={card}>
              <h2 className="text-sm font-semibold text-zinc-100 print:text-black">{t.gradesTitle}</h2>
              <p className="mt-1 text-sm text-zinc-400">{t.gradesBody}</p>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2">
              <p className="text-xs text-zinc-500">
                {t.ref(cv.ref, date(cv.expiresAt))}
                <br />
                {t.source}
              </p>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-inset ring-white/10 print:hidden"
              >
                <Printer size={14} />
                {t.print}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
