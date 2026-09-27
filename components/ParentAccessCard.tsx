'use client';

import { useEffect, useState } from 'react';
import { UsersThree, WarningOctagon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Athlete-side consent switch for parent access (GDPR). Shown only when the
// athlete has a linked parent. The database lets the athlete change nothing
// but this flag (column-level grant in 06_parent_access.sql) and stamps the
// time of every change. Off by default.
// ---------------------------------------------------------------------------

type FamilyLink = {
  id: string;
  parent_label: string | null;
  parent_notifications_enabled: boolean;
  consent_changed_at: string | null;
};

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function ParentAccessCard() {
  const { t, lang } = useLanguage();
  const c = t.consent;
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from('family_links')
        .select('id, parent_label, parent_notifications_enabled, consent_changed_at')
        .eq('athlete_id', userId)
        .order('created_at');
      if (!cancelled && !error) setLinks((data as FamilyLink[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(link: FamilyLink) {
    const next = !link.parent_notifications_enabled;
    setSavingId(link.id);
    setErrorId(null);
    const { data, error } = await supabase
      .from('family_links')
      .update({ parent_notifications_enabled: next })
      .eq('id', link.id)
      .select('consent_changed_at')
      .single();
    setSavingId(null);
    if (error) {
      setErrorId(link.id);
      return;
    }
    setLinks((cur) =>
      cur.map((l) =>
        l.id === link.id
          ? { ...l, parent_notifications_enabled: next, consent_changed_at: (data as { consent_changed_at: string | null }).consent_changed_at }
          : l
      )
    );
  }

  if (links.length === 0) return null;

  const formatChanged = (iso: string) =>
    new Date(iso).toLocaleString(LOCALE[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <section className="mt-3 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <UsersThree size={18} weight="fill" className="text-zinc-400" />
        {c.title}
      </h2>

      <ul className="space-y-4">
        {links.map((link) => {
          const on = link.parent_notifications_enabled;
          const name = link.parent_label || c.parentFallback;
          return (
            <li key={link.id} className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-zinc-100">{name}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{c.body(name)}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  <span style={{ color: on ? '#CCFF00' : undefined }}>{on ? c.on : c.off}</span>
                  {link.consent_changed_at && <> · {c.changed(formatChanged(link.consent_changed_at))}</>}
                </p>
                {errorId === link.id && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-200">
                    <WarningOctagon size={14} weight="fill" className="text-[#FF4D5E]" />
                    {c.errSave}
                  </p>
                )}
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${c.title}: ${name}`}
                disabled={savingId === link.id}
                onClick={() => toggle(link)}
                className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${
                  on ? 'bg-[#CCFF00]' : 'bg-white/[0.12]'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full shadow transition-transform duration-200 ${
                    on ? 'translate-x-5 bg-zinc-950' : 'translate-x-0 bg-zinc-300'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
