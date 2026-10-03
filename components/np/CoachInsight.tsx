'use client';

// components/np/CoachInsight.tsx — the instant summary bubble. The sentence is
// built from the engine's own numbers and penalty codes (no model call, no
// waiting), so it can never contradict the score. For a conversation the
// button opens the real AI coach (/chat).

import Link from 'next/link';
import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { NP, type InsightInput } from './copy';
import { Icon } from './icons';

export default function CoachInsight({ lang, input, chatHref = '/chat' }: { lang: Lang; input: InsightInput | null; chatHref?: string }): ReactElement {
  const t = NP[lang].insight;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="np-ai-orb np-logo-pulse flex h-9 w-9 shrink-0 items-center justify-center" style={{ ['--np-glow' as string]: 'rgb(124 77 255 / 0.55)' }} aria-hidden>
          <Icon name="sparkle" size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'inherit' }}>
            {t.title}
          </h2>
          <p className="truncate text-[11px] text-np-text-3">{t.sub}</p>
        </div>
      </div>
      <p className="np-ai-bubble mt-3 rounded-np-card rounded-tl-md px-4 py-3 text-sm leading-6 text-np-text" aria-live="polite">
        {input ? t.text(input) : NP[lang].noScore}
      </p>
      <p className="mt-2 text-[11px] leading-4 text-np-text-3">{t.disclaimer}</p>
      <Link href={chatHref} className="np-btn-glass mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-np-ctrl text-sm font-medium">
        {t.ask}
        <Icon name="arrowR" size={16} />
      </Link>
    </div>
  );
}
