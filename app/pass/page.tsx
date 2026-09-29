'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SealCheck, SealWarning, ShieldWarning, Lightning } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import { HUB } from '@/components/PerformancePanel';
import { formatPassDate, formatPassId } from '@/components/SafetyShield';

// ---------------------------------------------------------------------------
// Public Safety Pass check. A teacher or coach scans the QR on the athlete's
// phone and lands here — no account needed. The server verifies the
// signature; this page shows only what's inside the signed token (date,
// level, restriction type). No name, no health details (GDPR Art. 9).
// ---------------------------------------------------------------------------

type PassCode =
  | 'PAIN_REPORTED'
  | 'MATCH_DAY'
  | 'PRE_MATCH'
  | 'POST_MATCH'
  | 'LOAD_SPIKE'
  | 'RTP_RESTRICTED'
  | 'RTP_AWAITING_CLEARANCE';

type VerifyResponse =
  | { valid: false }
  | { valid: true; expired: boolean; date: string; status: 'block' | 'caution'; codes: PassCode[]; passId: string };

function PassCheck() {
  const { t, lang, setLang } = useLanguage();
  const token = useSearchParams().get('t') ?? '';
  const [result, setResult] = useState<VerifyResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pass?t=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((body: VerifyResponse) => !cancelled && setResult(body))
      .catch(() => !cancelled && setResult({ valid: false }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const restriction = (code: PassCode) =>
    ({
      PAIN_REPORTED: t.shield.rPain,
      MATCH_DAY: t.shield.rMatchDay,
      PRE_MATCH: t.shield.rPreMatch,
      POST_MATCH: t.shield.rPostMatch,
      LOAD_SPIKE: t.shield.rLoad,
      RTP_RESTRICTED: t.shield.rRtp,
      RTP_AWAITING_CLEARANCE: t.shield.rRtpAwaiting,
    })[code];

  const live = result?.valid === true && !result.expired;
  const color = !result
    ? '#A1A1AA'
    : live
      ? result.status === 'block'
        ? HUB.red
        : HUB.amber
      : '#A1A1AA';

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
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  lang === l.code ? 'bg-[#CCFF00] text-zinc-950' : 'text-zinc-400'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </header>

        <h1 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-zinc-50">{t.shield.verifyTitle}</h1>

        {!result && <p className="text-sm text-zinc-400">{t.shield.verifyChecking}</p>}

        {result && !result.valid && (
          <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.1]">
            <p className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
              <SealWarning size={24} weight="fill" className="text-zinc-400" />
              {t.shield.verifyInvalid}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t.shield.verifyInvalidBody}</p>
          </section>
        )}

        {result && result.valid && (
          <section
            className="overflow-hidden rounded-3xl"
            style={{ backgroundColor: `${color}14`, boxShadow: `inset 0 0 0 1px ${color}55` }}
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3 text-sm text-zinc-200">
              <SealCheck size={20} weight="fill" style={{ color: HUB.lime }} />
              {t.shield.verifyValid}
            </div>

            {result.expired ? (
              <p className="p-5 text-[15px] leading-relaxed text-zinc-300">
                {t.shield.verifyExpired(formatPassDate(result.date, lang))}
              </p>
            ) : (
              <div className="space-y-4 p-5">
                <p className="flex items-center gap-2.5 text-xl font-semibold" style={{ color }}>
                  <ShieldWarning size={28} weight="fill" />
                  {result.status === 'block' ? t.shield.verifyStatusBlock : t.shield.verifyStatusCaution}
                </p>
                <ul className="space-y-2">
                  {result.codes.map((c) => (
                    <li key={c} className="flex gap-2.5 text-[15px] leading-relaxed text-zinc-100">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      {restriction(c)}
                    </li>
                  ))}
                </ul>
                <dl className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-zinc-500">{t.shield.verifyDate}</dt>
                    <dd className="mt-0.5 text-zinc-200">{formatPassDate(result.date, lang)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">{t.shield.passId}</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-zinc-200">{formatPassId(result.passId)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        )}

        <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t.shield.verifyNote}</p>
      </div>
    </main>
  );
}

export default function PassPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#07080A]" />}>
      <PassCheck />
    </Suspense>
  );
}
