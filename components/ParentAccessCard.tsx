'use client';

import { useEffect, useState } from 'react';
import { UsersThree, WarningOctagon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Athlete-side consent switches for parent access (GDPR). Shown only when the
// athlete has a linked parent. Two separate permissions, both off by default:
//   colour   — parent_notifications_enabled (06_parent_access.sql): colour
//              of the day for the last week, restrictions, coach's reply;
//   calendar — parent_calendar_enabled (13_family_link_live.sql): dates of
//              exams and matches, no subjects.
// The database lets the athlete change nothing but these two flags
// (column-level grants) and stamps the time of every change.
// If SQL 13 has not been run yet, only the colour switch is shown.
// ---------------------------------------------------------------------------

type FamilyLink = {
  id: string;
  parent_label: string | null;
  parent_notifications_enabled: boolean;
  consent_changed_at: string | null;
  parent_calendar_enabled?: boolean;
  calendar_consent_changed_at?: string | null;
};

type Flag = 'parent_notifications_enabled' | 'parent_calendar_enabled';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export default function ParentAccessCard() {
  const { t, lang } = useLanguage();
  const c = t.consent;
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [hasCalendar, setHasCalendar] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) return;
      const full = await supabase
        .from('family_links')
        .select('id, parent_label, parent_notifications_enabled, consent_changed_at, parent_calendar_enabled, calendar_consent_changed_at')
        .eq('athlete_id', userId)
        .order('created_at');
      if (cancelled) return;
      if (!full.error) {
        setLinks((full.data as FamilyLink[] | null) ?? []);
        setHasCalendar(true);
        return;
      }
      // Older database (SQL 13 not run): the colour switch only.
      const basic = await supabase
        .from('family_links')
        .select('id, parent_label, parent_notifications_enabled, consent_changed_at')
        .eq('athlete_id', userId)
        .order('created_at');
      if (!cancelled && !basic.error) setLinks((basic.data as FamilyLink[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(link: FamilyLink, flag: Flag) {
    const key = `${link.id}:${flag}`;
    const next = !link[flag];
    const stampCol = flag === 'parent_calendar_enabled' ? 'calendar_consent_changed_at' : 'consent_changed_at';
    setSaving(key);
    setErrorKey(null);
    const { data, error } = await supabase
      .from('family_links')
      .update({ [flag]: next })
      .eq('id', link.id)
      .select(stampCol)
      .single();
    setSaving(null);
    if (error) {
      setErrorKey(key);
      return;
    }
    const stamp = (data as Record<string, string | null>)[stampCol] ?? null;
    setLinks((cur) => cur.map((l) => (l.id === link.id ? { ...l, [flag]: next, [stampCol]: stamp } : l)));
  }

  if (links.length === 0) return null;

  const formatChanged = (iso: string) =>
    new Date(iso).toLocaleString(LOCALE[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const row = (link: FamilyLink, flag: Flag, title: string, body: string, changedAt: string | null | undefined) => {
    const on = link[flag] === true;
    const key = `${link.id}:${flag}`;
    return (
      <div key={flag} className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p>
          <p className="mt-2 text-xs text-zinc-500">
            <span style={{ color: on ? '#CCFF00' : undefined }}>{on ? c.on : c.off}</span>
            {changedAt && <> · {c.changed(formatChanged(changedAt))}</>}
          </p>
          {errorKey === key && (
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
          aria-label={`${title}: ${link.parent_label || c.parentFallback}`}
          disabled={saving === key}
          onClick={() => toggle(link, flag)}
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
      </div>
    );
  };

  return (
    <section className="mt-3 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <UsersThree size={18} weight="fill" className="text-zinc-400" />
        {c.title}
      </h2>

      <ul className="space-y-5">
        {links.map((link) => {
          const name = link.parent_label || c.parentFallback;
          return (
            <li key={link.id}>
              <p className="mb-3 text-[15px] font-medium text-zinc-100">{name}</p>
              <div className="space-y-4">
                {row(link, 'parent_notifications_enabled', c.colorTitle, c.body(name), link.consent_changed_at)}
                {hasCalendar &&
                  row(link, 'parent_calendar_enabled', c.calendarTitle, c.calendarBody(name), link.calendar_consent_changed_at)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
