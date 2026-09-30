'use client';

// /demo/adp-ai-coach — preview of the ADP "safe AI coach" module.
//
// A thin page: all logic and UI live in adp/ (the post-competition module).
// Nothing here touches Supabase, the check-in or the main demo accounts, so
// the main CloudPulse demo cannot be affected by it. Not linked from the
// navigation — open it by URL.

import { useState } from 'react';
import { ArrowLeft, Flask, Lightning } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import AccessGate from '@/components/AccessGate';
import SorenessSilhouette from '@/adp/src/components/SorenessSilhouette';
import { ADP_PREVIEW_LABELS } from '@/adp/src/components/labels';
import type { SorenessMap } from '@/adp/src/components/sorenessMap';
import { toSorenessRows } from '@/adp/src/types/sportProfile';

function Preview() {
  const { lang, setLang } = useLanguage();
  const t = ADP_PREVIEW_LABELS[lang];
  const [map, setMap] = useState<SorenessMap>([]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-x-clip bg-[#07080A] px-4 py-8">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />

      <div className="relative w-full max-w-xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <a href="/demo" className="inline-flex items-center gap-2 text-[15px] font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#CCFF00] text-zinc-950">
              <Lightning size={15} weight="fill" />
            </span>
            CloudPulse
          </a>
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

        <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-white/10">
          <Flask size={14} weight="fill" className="text-[#CCFF00]" />
          {t.badge}
        </p>
        <h1 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] text-zinc-50">{t.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{t.subtitle}</p>

        <SorenessSilhouette value={map} onChange={setMap} lang={lang} className="mt-6" />

        <section className="mt-4 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08]">
          <h2 className="text-sm font-semibold text-zinc-50">{t.outputTitle}</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-3 text-xs leading-relaxed text-[#CCFF00]">
            {JSON.stringify(toSorenessRows(map), null, 2)}
          </pre>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t.outputNote}</p>
        </section>

        <a href="/demo" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-zinc-200">
          <ArrowLeft size={14} weight="bold" />
          {t.back}
        </a>
      </div>
    </main>
  );
}

export default function AdpAiCoachPreviewPage() {
  return (
    <AccessGate>
      <Preview />
    </AccessGate>
  );
}
