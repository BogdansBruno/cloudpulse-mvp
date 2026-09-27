'use client';

import { useEffect, useState } from 'react';
import { UsersThree, WarningOctagon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// ---------------------------------------------------------------------------
// Athlete side of team membership (on /progress): which team(s) the athlete
// is in, the name the coach sees, and a way to leave. Leaving deletes the
// team_members row, which immediately ends the coach's access to this
// athlete's check-ins (RLS in 02/08 is keyed on that row). GDPR: consent can
// be withdrawn as easily as it was given.
// ---------------------------------------------------------------------------

type Membership = {
  id: string;
  team_name: string | null;
  athlete_label: string | null;
};

export default function TeamMembershipCard() {
  const { t } = useLanguage();
  const inv = t.invite;
  const [rows, setRows] = useState<Membership[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      // Only athletes belong to teams; coaches/parents browsing here see nothing.
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
      if (profile?.role && profile.role !== 'athlete') return;
      const { data, error } = await supabase
        .from('team_members')
        .select('id, team_name, athlete_label')
        .eq('athlete_id', uid)
        .order('created_at');
      if (!cancelled && !error) setRows((data as Membership[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function leave(id: string) {
    setBusyId(id);
    setErrorId(null);
    const { data, error } = await supabase.from('team_members').delete().eq('id', id).select('id');
    setBusyId(null);
    setConfirmId(null);
    if (error || !data || data.length === 0) {
      setErrorId(id);
      return;
    }
    setRows((cur) => cur?.filter((r) => r.id !== id) ?? cur);
  }

  if (rows === null) return null;

  return (
    <section className="mt-3 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <UsersThree size={18} weight="fill" className="text-zinc-400" />
        {inv.cardTitle}
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm leading-relaxed text-zinc-400">{inv.cardNone}</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => {
            const team = m.team_name || inv.teamLabel;
            return (
              <li key={m.id}>
                <p className="text-[15px] font-medium text-zinc-100">{team}</p>
                {m.athlete_label && <p className="mt-0.5 text-xs text-zinc-500">{inv.cardLabel(m.athlete_label)}</p>}
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{inv.cardCoachSees}</p>

                {confirmId === m.id ? (
                  <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-sm leading-relaxed text-zinc-200 ring-1 ring-inset ring-white/10">
                    {inv.leaveConfirm(team)}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => leave(m.id)}
                        disabled={busyId === m.id}
                        className="rounded-full bg-[#FF4D5E] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {inv.leave}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="px-2 text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        {inv.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(m.id)}
                    className="mt-2 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                  >
                    {inv.leave}
                  </button>
                )}

                {errorId === m.id && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-200">
                    <WarningOctagon size={14} weight="fill" className="text-[#FF4D5E]" />
                    {inv.errLeave}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
