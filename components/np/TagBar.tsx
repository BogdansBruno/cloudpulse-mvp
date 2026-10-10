'use client';

// components/np/TagBar.tsx — "What shaped today?": a horizontal bar of factor tags (late meal, caffeine, sauna …).
// Each chip is a 44 px toggle. The tags live on this device only (components/np/tags.ts); the (i) sheet shows, for the
// tags that are on, how the athlete's own next mornings differ (the "correlation engine"), never a medical claim.

import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { TAG_KEYS } from './tags';
import { UX, type TagKey } from './uxCopy';
import { InfoButton } from './InfoSheet';
import { cardClass } from './cardTheme';

export default function TagBar({
  lang,
  active,
  onToggle,
  demo,
  impact,
}: {
  lang: Lang;
  active: TagKey[];
  onToggle: (k: TagKey) => void;
  demo: boolean;
  impact: string[];
}): ReactElement {
  const u = UX[lang].tags;
  return (
    <section aria-labelledby="tagbar-t" className={`np-enter mt-4 p-5 ${cardClass('stress')}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="tagbar-t" className="np-editorial text-[22px] leading-tight text-white">
            {u.title}
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-white/60">{u.sub}</p>
        </div>
        <InfoButton k="tags" accent="#B58CFF" impact={impact} />
      </div>
      <div role="group" aria-label={u.title} className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TAG_KEYS.map((k) => {
          const on = active.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(k)}
              className={`h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium transition-colors ${
                on ? 'border-[#B58CFF]/50 bg-[#B58CFF]/20 text-[#D9CFF2]' : 'border-white/[0.1] bg-white/[0.04] text-white/75 hover:bg-white/[0.08]'
              }`}
            >
              {u.names[k]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/50">{demo ? u.demo : u.saved}</p>
    </section>
  );
}
