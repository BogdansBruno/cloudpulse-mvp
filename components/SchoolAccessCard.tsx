'use client';

// "School" card on /progress — the pupil's side of the School role (supabase/sql/16_school_role.sql).
// The pupil joins with the school nurse's code and decides, with two separate switches that are OFF by
// default, what the school may see: (1) the safety traffic light, (2) test days as a total per day.
// The database lets the pupil change nothing but these two flags (column-level grants), stamps the time
// of every change, and leaving the school is one tap. If SQL 16 has not been run the card hides itself.

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, WarningOctagon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { SCHOOL } from '@/lib/school-copy';
import { cleanAthleteLabel, isValidInviteCode, normalizeInviteCode } from '@/lib/invite';

type Member = {
  id: string;
  school: string;
  label: string;
  safety: boolean;
  calendar: boolean;
  changedAt: string | null;
};

type Flag = 'consent_safety' | 'consent_calendar';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

function parseMember(r: Record<string, unknown>): Member | null {
  if (typeof r.member_id !== 'string') return null;
  return {
    id: r.member_id,
    school: String(r.school_name ?? ''),
    label: String(r.athlete_label ?? ''),
    safety: r.consent_safety === true,
    calendar: r.consent_calendar === true,
    changedAt: typeof r.consent_changed_at === 'string' ? r.consent_changed_at : null,
  };
}

export default function SchoolAccessCard() {
  const { lang } = useLanguage();
  const c = SCHOOL[lang].card;
  const [available, setAvailable] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [joining, setJoining] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_schools');
    if (error) {
      setAvailable(false); // SQL 16 not run (or offline): hide the card, nothing breaks
      return;
    }
    setAvailable(true);
    setMembers(((data as Record<string, unknown>[] | null) ?? []).flatMap((r) => parseMember(r) ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function join() {
    const clean = cleanAthleteLabel(label);
    if (!isValidInviteCode(code)) {
      setMessage({ tone: 'err', text: c.errors.INVALID_CODE });
      return;
    }
    if (!clean) {
      setMessage({ tone: 'err', text: c.errors.BAD_LABEL });
      return;
    }
    setJoining(true);
    setMessage(null);
    const { data, error } = await supabase.rpc('join_school', { p_code: normalizeInviteCode(code), p_label: clean });
    setJoining(false);
    if (error) {
      const known = (['INVALID_CODE', 'BAD_LABEL', 'NOT_ATHLETE', 'DEMO_MISMATCH'] as const).find((k) => error.message?.includes(k));
      setMessage({ tone: 'err', text: c.errors[known ?? 'UNKNOWN'] });
      return;
    }
    const joined = ((data as Record<string, unknown>[] | null) ?? [])[0];
    setCode('');
    setLabel('');
    setMessage({ tone: 'ok', text: c.joined(String(joined?.school_name ?? '')) });
    load();
  }

  async function toggle(m: Member, flag: Flag) {
    const key = `${m.id}:${flag}`;
    const next = flag === 'consent_safety' ? !m.safety : !m.calendar;
    setSaving(key);
    setMessage(null);
    const { data, error } = await supabase.from('school_members').update({ [flag]: next }).eq('id', m.id).select('consent_changed_at').single();
    setSaving(null);
    if (error) {
      setMessage({ tone: 'err', text: c.errors.SAVE });
      return;
    }
    const stamp = (data as { consent_changed_at?: string } | null)?.consent_changed_at ?? null;
    setMembers((cur) =>
      cur.map((x) => (x.id === m.id ? { ...x, safety: flag === 'consent_safety' ? next : x.safety, calendar: flag === 'consent_calendar' ? next : x.calendar, changedAt: stamp } : x)),
    );
  }

  async function leave(m: Member) {
    setSaving(`${m.id}:leave`);
    const { error } = await supabase.from('school_members').delete().eq('id', m.id);
    setSaving(null);
    if (error) {
      setMessage({ tone: 'err', text: c.errors.SAVE });
      return;
    }
    setMembers((cur) => cur.filter((x) => x.id !== m.id));
  }

  if (!available) return null;

  const when = (iso: string) => new Date(iso).toLocaleString(LOCALE[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const row = (m: Member, flag: Flag, title: string, body: string) => {
    const on = flag === 'consent_safety' ? m.safety : m.calendar;
    const key = `${m.id}:${flag}`;
    return (
      <div key={flag} className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p>
          <p className="mt-2 text-xs text-zinc-500">
            <span style={{ color: on ? '#B8F23C' : undefined }}>{on ? c.on : c.off}</span>
            {m.changedAt && <> · {c.changed(when(m.changedAt))}</>}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${title}: ${m.school}`}
          disabled={saving === key}
          onClick={() => toggle(m, flag)}
          className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${on ? 'bg-[#B8F23C]' : 'bg-white/[0.12]'}`}
        >
          <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-5 bg-zinc-950' : 'translate-x-0 bg-zinc-300'}`} />
        </button>
      </div>
    );
  };

  return (
    <section className="mt-3 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl" aria-labelledby="school-card">
      <h2 id="school-card" className="mb-2 flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <GraduationCap size={18} weight="fill" className="text-zinc-400" />
        {c.title}
      </h2>

      {members.length === 0 && <p className="mb-4 text-sm leading-relaxed text-zinc-400">{c.intro}</p>}

      {members.length > 0 && (
        <ul className="mb-5 space-y-5">
          {members.map((m) => (
            <li key={m.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="truncate text-[15px] font-medium text-zinc-100">{m.school}</p>
                <button
                  type="button"
                  onClick={() => leave(m)}
                  disabled={saving === `${m.id}:leave`}
                  className="shrink-0 text-xs font-medium text-zinc-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                >
                  {c.leave}
                </button>
              </div>
              <div className="space-y-4">
                {row(m, 'consent_safety', c.safetyTitle, c.safetyBody(m.school))}
                {row(m, 'consent_calendar', c.calendarTitle, c.calendarBody(m.school))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          join();
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={c.codePlaceholder}
          aria-label={c.codePlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
          className="h-11 min-w-0 sm:flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm uppercase tracking-widest text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-white/40 focus:border-[#B8F23C]/60 focus:outline-none"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={c.labelPlaceholder}
          aria-label={c.labelPlaceholder}
          maxLength={40}
          className="h-11 min-w-0 sm:flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/40 focus:border-[#B8F23C]/60 focus:outline-none"
        />
        <button type="submit" disabled={joining} className="np-btn-glass inline-flex h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-50">
          {joining ? c.joining : c.join}
        </button>
      </form>

      {message && (
        <p role={message.tone === 'err' ? 'alert' : 'status'} className="mt-3 flex items-start gap-1.5 text-xs text-zinc-200">
          {message.tone === 'err' && <WarningOctagon size={14} weight="fill" className="mt-px shrink-0 text-[#FF3D5A]" />}
          {message.text}
        </p>
      )}
    </section>
  );
}
