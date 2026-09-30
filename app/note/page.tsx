'use client';

// /note?t=… — public check of an away-trip note for a teacher (no account).
// Shows only what is inside the signed token: return date, hours on the road,
// validity and the note number. No name, no health data.

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lightning, SealCheck, SealWarning, Bus } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS, type Lang } from '@/lib/i18n/translations';
import { EXTRA } from '@/lib/i18n/extra';
import { HUB } from '@/components/PerformancePanel';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

type Verify =
  | { valid: false }
  | { valid: true; expired: boolean; returnDate: string; until: string; hours: number; id: string };

function NoteCheck() {
  const { lang, setLang } = useLanguage();
  const t = EXTRA[lang].note;
  const token = useSearchParams().get('t') ?? '';
  const [r, setR] = useState<Verify | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/travel-note?t=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((body: Verify) => !cancelled && setR(body))
      .catch(() => !cancelled && setR({ valid: false }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const day = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <main className="flex min-h-dvh flex-col items-center bg-[#07080A] px-4 py-8">
      <div className="w-full max-w-md">
        <header className="mb-6 flex items-center justify-between">
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

        <h1 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-zinc-50">{t.title}</h1>
        {!r && <p className="text-sm text-zinc-400">{t.checking}</p>}

        {r && !r.valid && (
          <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.1]">
            <p className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
              <SealWarning size={24} weight="fill" className="text-zinc-400" />
              {t.invalid}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t.invalidBody}</p>
          </section>
        )}

        {r && r.valid && (
          <section className="overflow-hidden rounded-3xl" style={{ backgroundColor: `${HUB.amber}14`, boxShadow: `inset 0 0 0 1px ${HUB.amber}55` }}>
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3 text-sm text-zinc-200">
              <SealCheck size={20} weight="fill" style={{ color: HUB.lime }} />
              {t.valid}
            </div>
            <div className="space-y-3 p-5">
              <p className="flex gap-2.5 text-[15px] leading-relaxed text-zinc-100">
                <Bus size={20} weight="fill" className="mt-0.5 shrink-0" style={{ color: HUB.amber }} />
                {t.body(day(r.returnDate), r.hours)}
              </p>
              {r.expired ? (
                <p className="text-sm text-zinc-400">{t.expired(day(r.until))}</p>
              ) : (
                <>
                  <p className="text-[15px] leading-relaxed text-zinc-200">{t.request}</p>
                  <p className="text-sm font-semibold text-zinc-100">{t.teacherDecides}</p>
                </>
              )}
              <dl className="border-t border-white/[0.06] pt-3 text-sm">
                <dt className="text-xs text-zinc-500">{t.id}</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-zinc-200">{r.id}</dd>
              </dl>
            </div>
          </section>
        )}

        <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t.footer}</p>
      </div>
    </main>
  );
}

export default function NotePage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#07080A]" />}>
      <NoteCheck />
    </Suspense>
  );
}
