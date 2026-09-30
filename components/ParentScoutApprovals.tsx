'use client';

// Parent side of the scout passport: switch a link on, or decline/revoke it.
// Nothing is visible to a scout until a parent says yes (supabase/sql/15).

import { useCallback, useEffect, useState } from 'react';
import { IdentificationCard } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { EXTRA } from '@/lib/i18n/extra';
import { parseShares, shareStatus, type ScoutShare } from '@/lib/scout-cv';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function ParentScoutApprovals({ fallbackName }: { fallbackName: string }) {
  const { lang } = useLanguage();
  const t = EXTRA[lang].scout;
  const [shares, setShares] = useState<ScoutShare[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('parent_scout_shares');
    setShares(error ? null : parseShares(data as unknown[]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!shares || shares.length === 0) return null;
  const until = (iso: string) => new Date(iso).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long' });

  async function act(fn: 'approve_scout_share' | 'revoke_scout_share', id: string) {
    setBusy(id);
    await supabase.rpc(fn, { p_id: id });
    setBusy(null);
    load();
  }

  return (
    <div className="space-y-3">
      {shares.map((s) => {
        const st = shareStatus(s);
        const child = s.athleteLabel || fallbackName;
        const includes = [t.includeDiscipline, ...(s.showReadiness ? [t.includeReadiness] : []), ...(s.showHealth ? [t.includeHealth] : [])];
        return (
          <section
            key={s.id}
            className={`rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset backdrop-blur-2xl ${st === 'active' ? 'ring-white/[0.08]' : 'ring-[#FFB020]/30'}`}
          >
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <IdentificationCard size={16} weight="fill" className="text-[#CCFF00]" />
              {st === 'active' ? t.title : t.parentTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">{t.parentBody(child, s.recipient)}</p>
            <p className="mt-2 text-xs text-zinc-400">{t.parentIncludes}</p>
            <ul className="mt-1 space-y-1">
              {includes.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-zinc-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">
              {t.until(until(s.expiresAt))} · {t.noGrades}
            </p>

            {st === 'active' ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#CCFF00]">{t.parentActive(s.viewCount)}</p>
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => act('revoke_scout_share', s.id)}
                  className="rounded-xl px-3 py-2 text-sm text-zinc-300 ring-1 ring-inset ring-white/10 hover:bg-white/5"
                >
                  {t.revoke}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => act('approve_scout_share', s.id)}
                  className="inline-flex h-10 items-center rounded-xl bg-[#CCFF00] px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                >
                  {t.approve}
                </button>
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => act('revoke_scout_share', s.id)}
                  className="inline-flex h-10 items-center rounded-xl px-4 text-sm text-zinc-300 ring-1 ring-inset ring-white/10 hover:bg-white/5"
                >
                  {t.decline}
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
