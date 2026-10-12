'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { LotusMark } from '@/components/np/Lotus';
import DeleteDataPanel from '@/components/DeleteDataPanel';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PRIVACY } from '@/lib/privacy-copy';
import type { Lang } from '@/lib/i18n/translations';

// Public page: no sign-in needed, available in all three languages whatever
// the app language is locked to. The reader picks the language here.
const LANGS: { key: Lang; label: string }[] = [
  { key: 'en', label: 'EN' },
  { key: 'lv', label: 'LV' },
  { key: 'ru', label: 'RU' },
];

// Contact address is set per deployment, never hard-coded in the text.
const CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT ?? '';

export default function PrivacyPage() {
  const { lang: appLang } = useLanguage();
  const [lang, setLang] = useState<Lang>(appLang);
  const c = PRIVACY[lang];

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[#0B0D11] px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] text-zinc-100">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#B8F23C]/[0.05] blur-[140px]" />

      <div className="relative mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/[0.05] px-3.5 text-sm text-zinc-300 ring-1 ring-inset ring-white/10 hover:bg-white/[0.09]"
          >
            <ArrowLeft size={16} />
            {c.back}
          </Link>
          <div role="group" aria-label={c.langLabel} className="flex gap-1 rounded-2xl bg-white/[0.05] p-1 ring-1 ring-inset ring-white/10">
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={lang === l.key}
                onClick={() => setLang(l.key)}
                className={`h-9 min-w-11 rounded-xl px-3 text-sm font-medium transition-colors ${
                  lang === l.key ? 'bg-[#B8F23C] text-zinc-950' : 'text-zinc-300 hover:bg-white/[0.08]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <LotusMark size={28} />
          <span className="text-base font-semibold tracking-tight text-white">Lotus</span>
        </div>
        <h1 className="mb-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-zinc-50 break-words">{c.pageTitle}</h1>
        <p className="mb-1 text-xs text-zinc-500">{c.updated}</p>
        <p className="mb-6 text-[15px] leading-relaxed text-zinc-300">{c.lead}</p>

        <div className="space-y-3">
          {c.sections.map((s) => (
            <section key={s.h} className="np-card p-5">
              <h2 className="mb-3 text-base font-semibold tracking-[-0.01em] text-zinc-50">{s.h}</h2>
              {s.ul && (
                <ul className="space-y-2.5 text-sm leading-relaxed text-zinc-300">
                  {s.ul.map((li) => (
                    <li key={li} className="flex gap-2.5">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8F23C]" />
                      <span className="min-w-0 break-words">{li}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.p?.map((para) => (
                <p key={para} className="mt-3 break-words text-sm leading-relaxed text-zinc-400 first:mt-0">
                  {para}
                </p>
              ))}
            </section>
          ))}

          <DeleteDataPanel langOverride={lang} />

          {CONTACT && (
            <p className="px-1 text-sm text-zinc-400">
              {c.contactLabel}:{' '}
              <a href={`mailto:${CONTACT}`} className="text-zinc-200 underline decoration-white/20 underline-offset-2">
                {CONTACT}
              </a>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
