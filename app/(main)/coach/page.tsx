'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { WarningOctagon, Info, Flame, Users } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ReadinessRing, zoneMeta, loadStatus, HUB } from '@/components/PerformancePanel';
import type { Penalty, SafetyViolation, InconsistencyFlag } from '@/lib/readiness-engine';
import { translatePenalty, translateViolation, translateInconsistency } from '@/lib/engine-i18n';

// ---------------------------------------------------------------------------
// Coach view — the one screen in the app that actually uses the new
// `get-readiness` Edge Function. Everything an athlete sees about their own
// readiness already flows through /api/checkin (Next.js route + the same
// TS engine). What that route CANNOT do is answer "how is a DIFFERENT
// athlete doing" — that cross-athlete read, gated by the team_members
// table, is the one thing get-readiness adds. So this page is: load the
// coach's roster from team_members (RLS-protected), then for whichever
// athlete is selected, call get-readiness?athlete_id=<id> to get their
// live score, ACWR, Hooper index, monotony, streak and safety flags.
//
// NOTE: profiles has no name/email column yet — athletes are labelled by
// team_name (set when the coach<->athlete link is created) or, failing
// that, a short id fragment. Adding a friendly display name is a natural
// next step but is out of scope here.
// ---------------------------------------------------------------------------

const EDGE_FUNCTION_URL = 'https://pgfhvvetujsvigesueib.supabase.co/functions/v1/get-readiness';

type DbTeamMemberRow = { athlete_id: string; team_name: string | null };
type DbProfileRow = { id: string; sport: string | null; age: number | null };

type RosterEntry = {
  athleteId: string;
  teamName: string | null;
  sport: string | null;
  age: number | null;
};

type ReadinessPayload = {
  hasCheckin: boolean;
  readiness: {
    score: number;
    zone: 'green' | 'yellow' | 'red';
    acwr: number | null;
    monotony: number | null;
    hooperScore: number;
    trainingStreak: number;
    penalties: Penalty[];
    inconsistencyFlags: InconsistencyFlag[];
    isPainBlocked: boolean;
  };
  safetyViolations: SafetyViolation[];
};

function loadColor(status: ReturnType<typeof loadStatus> | null) {
  if (status === 'ok') return HUB.lime;
  if (status === 'spike') return HUB.red;
  if (status === null) return undefined;
  return HUB.amber;
}

function athleteLabel(a: RosterEntry, fallback: (id: string) => string) {
  if (a.teamName) return a.teamName;
  if (a.sport) return `${a.sport} · ${a.athleteId.slice(0, 8)}`;
  return fallback(a.athleteId.slice(0, 8));
}

export default function CoachPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [data, setData] = useState<ReadinessPayload | null>(null);
  const [loadingAthlete, setLoadingAthlete] = useState(false);
  const [athleteError, setAthleteError] = useState<string | null>(null);

  // Load the coach's roster: team_members -> profiles, both RLS-scoped to
  // rows where the signed-in user is the coach.
  useEffect(() => {
    let cancelled = false;

    async function loadRoster() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId) throw new Error('Not signed in');

        const { data: links, error: linksError } = await supabase
          .from('team_members')
          .select('athlete_id, team_name')
          .eq('coach_id', userId);
        if (linksError) throw linksError;

        const teamMembers = (links ?? []) as DbTeamMemberRow[];
        const athleteIds = teamMembers.map((l) => l.athlete_id);
        if (athleteIds.length === 0) {
          if (!cancelled) setRoster([]);
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, sport, age')
          .in('id', athleteIds);
        if (profilesError) throw profilesError;

        const profiles = (profilesData ?? []) as DbProfileRow[];
        const profileById = new Map(profiles.map((p) => [p.id, p]));
        const merged: RosterEntry[] = teamMembers.map((l) => ({
          athleteId: l.athlete_id,
          teamName: l.team_name ?? null,
          sport: profileById.get(l.athlete_id)?.sport ?? null,
          age: profileById.get(l.athlete_id)?.age ?? null,
        }));

        if (!cancelled) {
          setRoster(merged);
          setSelectedId(merged[0]?.athleteId ?? null);
        }
      } catch (err) {
        if (!cancelled) setRosterError(err instanceof Error ? err.message : 'Something went wrong');
      }
    }

    loadRoster();
    return () => {
      cancelled = true;
    };
  }, []);

  // Call the Edge Function for whichever athlete is selected.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function loadReadiness() {
      setLoadingAthlete(true);
      setAthleteError(null);
      setData(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Not signed in');

        const res = await fetch(`${EDGE_FUNCTION_URL}?athlete_id=${selectedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 403) throw new Error(t.coach.forbidden);
        if (!res.ok) throw new Error(t.coach.errorReadiness);

        const payload = (await res.json()) as ReadinessPayload;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setAthleteError(err instanceof Error ? err.message : t.coach.errorReadiness);
      } finally {
        if (!cancelled) setLoadingAthlete(false);
      }
    }

    loadReadiness();
    return () => {
      cancelled = true;
    };
  }, [selectedId, t.coach.errorReadiness, t.coach.forbidden]);

  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';
  const zoneLabel = (z: 'green' | 'yellow' | 'red') =>
    z === 'green' ? t.progress.zoneGreen : z === 'yellow' ? t.progress.zoneYellow : t.progress.zoneRed;

  const acwrStatus = data?.readiness.acwr != null ? loadStatus(data.readiness.acwr) : null;

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-4xl">
              {t.coach.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{t.coach.subtitle}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-zinc-400 ring-1 ring-inset ring-white/[0.08]">
            <Users size={13} />
            {t.coach.navLabel}
          </span>
        </header>

        {rosterError && (
          <div className="mb-6 flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
            <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
            <span>{t.coach.errorRoster}</span>
          </div>
        )}

        {!roster && !rosterError && (
          <div className="space-y-3" aria-busy>
            <p className="mb-3 text-sm text-zinc-500">{t.coach.loadingRoster}</p>
            <div className="h-16 animate-pulse rounded-3xl bg-white/[0.03]" />
          </div>
        )}

        {roster && roster.length === 0 && (
          <div className={`${card} text-center`}>
            <p className="text-sm font-medium text-zinc-100">{t.coach.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-400">{t.coach.emptyBody}</p>
          </div>
        )}

        {roster && roster.length > 0 && (
          <div className="space-y-4">
            {/* Roster picker */}
            <div>
              <p className="mb-2 text-xs text-zinc-500">{t.coach.pickAthlete}</p>
              <div className="flex flex-wrap gap-2">
                {roster.map((a) => {
                  const active = a.athleteId === selectedId;
                  return (
                    <button
                      key={a.athleteId}
                      onClick={() => setSelectedId(a.athleteId)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#CCFF00] text-zinc-950'
                          : 'bg-white/[0.04] text-zinc-300 ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.07]'
                      }`}
                    >
                      {athleteLabel(a, t.coach.athleteFallback)}
                    </button>
                  );
                })}
              </div>
            </div>

            {athleteError && (
              <div className="flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
                <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
                <span>{athleteError}</span>
              </div>
            )}

            {loadingAthlete && !athleteError && (
              <div className="space-y-3" aria-busy>
                <p className="text-sm text-zinc-500">{t.coach.loadingReadiness}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/[0.03]" />
                  ))}
                </div>
              </div>
            )}

            {data && !loadingAthlete && !athleteError && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                className="space-y-3"
              >
                <p className="text-xs text-zinc-500">
                  {data.hasCheckin ? t.coach.hasCheckinToday : t.coach.noCheckinToday}
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Readiness ring */}
                  <div className={card}>
                    <p className="text-xs text-zinc-400">{t.coach.scoreLabel}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <ReadinessRing score={data.readiness.score} zone={data.readiness.zone} size={60} />
                      <div>
                        <p className="font-mono text-4xl font-light leading-none tabular-nums tracking-[-0.04em] text-zinc-50">
                          {data.readiness.score}
                        </p>
                        <p
                          className="mt-1.5 inline-flex items-center gap-1 text-xs"
                          style={{ color: zoneMeta(data.readiness.zone).color }}
                        >
                          {zoneLabel(data.readiness.zone)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Load */}
                  <div className={card}>
                    <p className="text-xs text-zinc-400">{t.coach.loadLabel}</p>
                    <p
                      className="mt-3 font-mono text-4xl font-light leading-none tabular-nums tracking-[-0.04em]"
                      style={{ color: loadColor(acwrStatus) ?? '#FAFAFA' }}
                    >
                      {data.readiness.acwr != null ? data.readiness.acwr.toFixed(2) : '--'}
                    </p>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {data.readiness.acwr != null ? '' : t.hub.notEnoughData}
                    </p>
                  </div>

                  {/* Streak */}
                  <div className={card}>
                    <p className="text-xs text-zinc-400">{t.coach.streakLabel}</p>
                    <p className="mt-3 inline-flex items-baseline gap-1.5 font-mono text-4xl font-light leading-none tabular-nums tracking-[-0.04em] text-zinc-50">
                      <Flame size={22} weight="fill" className="text-[#CCFF00]" />
                      {data.readiness.trainingStreak}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={card}>
                    <p className="text-xs text-zinc-400">{t.coach.hooperLabel}</p>
                    <p className="mt-2 font-mono text-2xl tabular-nums text-zinc-50">
                      {data.readiness.hooperScore}
                      <span className="text-sm text-zinc-600">/28</span>
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">{t.coach.hooperHint}</p>
                  </div>
                  <div className={card}>
                    <p className="text-xs text-zinc-400">{t.coach.monotonyLabel}</p>
                    <p className="mt-2 font-mono text-2xl tabular-nums text-zinc-50">
                      {data.readiness.monotony != null ? data.readiness.monotony.toFixed(2) : '--'}
                    </p>
                    {data.readiness.monotony == null && (
                      <p className="mt-1 text-[11px] text-zinc-500">{t.hub.notEnoughData}</p>
                    )}
                  </div>
                </div>

                {/* Safety Guard */}
                <section className={card}>
                  <h2 className="mb-3 text-base font-semibold tracking-[-0.01em] text-zinc-50">
                    {t.coach.safetyTitle}
                  </h2>
                  {data.safetyViolations.length === 0 ? (
                    <p className="text-sm text-zinc-400">{t.coach.noSafety}</p>
                  ) : (
                    <div className="space-y-2">
                      {data.safetyViolations.map((v) => (
                        <div
                          key={v.code}
                          className="flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-3 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30"
                        >
                          <WarningOctagon size={16} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
                          <span>{translateViolation(t, v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Penalty breakdown */}
                <section className={card}>
                  <h2 className="mb-3 text-base font-semibold tracking-[-0.01em] text-zinc-50">
                    {t.coach.penaltiesTitle}
                  </h2>
                  {data.readiness.penalties.length === 0 ? (
                    <p className="text-sm text-zinc-400">{t.coach.noPenalties}</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm text-zinc-300">
                      {data.readiness.penalties.map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-3">
                          <span>{translatePenalty(t, p)}</span>
                          <span className="shrink-0 font-mono tabular-nums text-zinc-500">-{p.points}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Inconsistency flags */}
                {data.readiness.inconsistencyFlags.length > 0 && (
                  <div className="flex gap-3 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08]">
                    <Info size={20} weight="fill" className="mt-0.5 shrink-0 text-zinc-400" />
                    <div>
                      <h2 className="text-base font-semibold text-zinc-50">{t.coach.inconsistencyTitle}</h2>
                      <ul className="mt-1 space-y-1 text-sm leading-relaxed text-zinc-300">
                        {data.readiness.inconsistencyFlags.map((f, i) => (
                          <li key={i}>{translateInconsistency(t, f)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
