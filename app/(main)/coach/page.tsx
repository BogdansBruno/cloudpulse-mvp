'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { WarningOctagon, Info, Flame, Users, Barbell, CheckCircle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ReadinessRing, zoneMeta, loadStatus, noRestColor, HUB } from '@/components/PerformancePanel';
import type { Penalty, SafetyViolation, InconsistencyFlag } from '@/lib/readiness-engine';
import { translatePenalty, translateViolation, translateInconsistency } from '@/lib/engine-i18n';
import TeamInvitePanel from '@/components/TeamInvitePanel';
import MatchRosterCard from '@/components/MatchRosterCard';
import CoachAlertsCard from '@/components/CoachAlertsCard';
import RtpCoachCard, { type RtpCoachEntry } from '@/components/RtpCoachCard';
import ExamStormCard from '@/components/ExamStormCard';
import TeamPulseCard from '@/components/TeamPulseCard';
import TeamTripsCard from '@/components/TeamTripsCard';
import { examStorm, type StormAthlete } from '@/lib/exam-storm';
import { useTeamLive } from '@/lib/use-team-live';
import {
  RTP_LOOKBACK_DAYS,
  openRtp,
  parseClearances,
  parseFollowups,
  parseRtpCheckins,
  rtpByAthlete,
  type OpenRtp,
} from '@/lib/return-to-play';
import type { RosterCheckin, RosterZone } from '@/lib/match-roster';
import { addDays, computeCheckinStreak, datesByAthlete, teamCheckinSummary, todayUtc } from '@/lib/checkin-streak';

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
// Athletes are labelled by the name they chose when joining via the coach's
// QR code (team_members.athlete_label, 08_team_invites.sql). Older links
// (demo seed) fall back to team_name, then to a short id fragment. Names are
// never stored on profiles — only the coach link carries one.
// ---------------------------------------------------------------------------

const EDGE_FUNCTION_URL = 'https://pgfhvvetujsvigesueib.supabase.co/functions/v1/get-readiness';

type DbTeamMemberRow = { athlete_id: string; team_name: string | null; athlete_label: string | null };
type DbProfileRow = {
  id: string;
  sport: string | null;
  age: number | null;
  match_dates: string[] | null;
  exam_dates: string[] | null;
};
// Today's check-in with the numbers the readiness trigger already computed.
type DbTodayCheckinRow = {
  user_id: string;
  readiness_score: number | null;
  zone: RosterZone | null;
  acwr: number | null;
  is_pain_blocked: boolean;
  pain_zone: string | null;
};
// pain_flag / pain_zone feed Return-to-Play (lib/return-to-play.ts).
type DbCheckinDateRow = { user_id: string; date: string; pain_flag: boolean | null; pain_zone: string | null };

type RosterEntry = {
  athleteId: string;
  label: string | null;
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
  if (a.label) return a.label;
  if (a.teamName) return a.teamName;
  if (a.sport) return `${a.sport} · ${a.athleteId.slice(0, 8)}`;
  return fallback(a.athleteId.slice(0, 8));
}

export default function CoachPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  // Only (athlete, date) pairs — enough for "X of Y today" and streaks.
  // null = not loaded or failed; the summary card then simply stays hidden.
  const [checkinRows, setCheckinRows] = useState<DbCheckinDateRow[] | null>(null);
  // Match squad: today's computed check-ins + the team's match dates.
  const [todayCheckins, setTodayCheckins] = useState<Map<string, RosterCheckin> | null>(null);
  const [matchDates, setMatchDates] = useState<string[]>([]);
  // Exam storm: each athlete's exam and match dates (counts only on screen).
  const [stormAthletes, setStormAthletes] = useState<StormAthlete[] | null>(null);
  // Return-to-Play rows (SQL 11). null = not loaded / tables not there yet.
  const [rtpRows, setRtpRows] = useState<{ clearances: unknown[]; followups: unknown[] } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [data, setData] = useState<ReadinessPayload | null>(null);
  const [loadingAthlete, setLoadingAthlete] = useState(false);
  const [athleteError, setAthleteError] = useState<string | null>(null);
  // Bumped when a live alert arrives: today's numbers and the open athlete
  // card are fetched again, so the whole screen agrees with the alert.
  const [refreshKey, setRefreshKey] = useState(0);
  // Live updates from the team (lib/use-team-live.ts): liveKey reloads the
  // lists; readinessKey reloads the open athlete only if it was that athlete.
  const [liveKey, setLiveKey] = useState(0);
  const [readinessKey, setReadinessKey] = useState(0);

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
          .select('athlete_id, team_name, athlete_label')
          .eq('coach_id', userId)
          .order('created_at');
        if (linksError) throw linksError;

        const teamMembers = (links ?? []) as DbTeamMemberRow[];
        const athleteIds = teamMembers.map((l) => l.athlete_id);
        if (athleteIds.length === 0) {
          if (!cancelled) setRoster([]);
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, sport, age, match_dates, exam_dates')
          .in('id', athleteIds);
        if (profilesError) throw profilesError;

        const profiles = (profilesData ?? []) as DbProfileRow[];
        const profileById = new Map(profiles.map((p) => [p.id, p]));
        const merged: RosterEntry[] = teamMembers.map((l) => ({
          athleteId: l.athlete_id,
          label: l.athlete_label ?? null,
          teamName: l.team_name ?? null,
          sport: profileById.get(l.athlete_id)?.sport ?? null,
          age: profileById.get(l.athlete_id)?.age ?? null,
        }));

        if (!cancelled) {
          setRoster(merged);
          setSelectedId((cur) => cur ?? merged[0]?.athleteId ?? null);
        }

        if (!cancelled) {
          setMatchDates(profiles.flatMap((p) => p.match_dates ?? []));
          setStormAthletes(profiles.map((p) => ({ examDates: p.exam_dates ?? [], matchDates: p.match_dates ?? [] })));
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

  // Today's check-ins for the roster — on load and again after each live alert.
  const athleteKey = roster ? roster.map((a) => a.athleteId).join(',') : '';
  useEffect(() => {
    if (!athleteKey) return;
    const athleteIds = athleteKey.split(',');
    let cancelled = false;

    async function loadCheckins() {
      // Calendar dates can change any time (the athlete edits /calendar):
      // re-read them with every refresh — exam storm and next match follow.
      const { data: dateProfiles, error: dateProfilesError } = await supabase
        .from('profiles')
        .select('id, match_dates, exam_dates')
        .in('id', athleteIds);
      if (!cancelled && !dateProfilesError) {
        const rows = (dateProfiles ?? []) as Pick<DbProfileRow, 'id' | 'match_dates' | 'exam_dates'>[];
        setMatchDates(rows.flatMap((p) => p.match_dates ?? []));
        setStormAthletes(rows.map((p) => ({ examDates: p.exam_dates ?? [], matchDates: p.match_dates ?? [] })));
      }

      // Check-in dates for the whole roster (RLS: checkins_coach_view_team).
      // 60 days is plenty for a current streak and keeps the query small.
      const today = todayUtc();
      const { data: dateRows, error: datesError } = await supabase
        .from('checkins')
        .select('user_id, date, pain_flag, pain_zone')
        .in('user_id', athleteIds)
        .gte('date', addDays(today, -60))
        .lte('date', today);
      if (!cancelled && !datesError) setCheckinRows((dateRows ?? []) as DbCheckinDateRow[]);

      // Return-to-Play: coach confirmations and follow-up answers (RLS: own team).
      const rtpSince = addDays(today, -RTP_LOOKBACK_DAYS);
      const [clearRes, followRes] = await Promise.all([
        supabase.from('rtp_clearances').select('athlete_id, pain_date, cleared_at').in('athlete_id', athleteIds).gte('pain_date', rtpSince),
        supabase
          .from('rtp_followups')
          .select('athlete_id, pain_date, day_offset, trend, saw_specialist, answered_at')
          .in('athlete_id', athleteIds)
          .gte('pain_date', rtpSince),
      ]);
      if (!cancelled) {
        setRtpRows(
          clearRes.error || followRes.error ? null : { clearances: clearRes.data ?? [], followups: followRes.data ?? [] }
        );
      }

      // Match squad (RLS: checkins_coach_view_team). Only computed outputs
      // are read here — score, zone, ACWR, pain block — not the raw answers.
      const { data: todayRows, error: todayError } = await supabase
        .from('checkins')
        .select('user_id, readiness_score, zone, acwr, is_pain_blocked, pain_zone')
        .in('user_id', athleteIds)
        .eq('date', today);
      if (!cancelled && !todayError) {
        const map = new Map<string, RosterCheckin>();
        for (const row of (todayRows ?? []) as DbTodayCheckinRow[]) {
          map.set(row.user_id, {
            score: row.readiness_score,
            zone: row.zone,
            acwr: row.acwr === null ? null : Number(row.acwr),
            painBlocked: row.is_pain_blocked,
            painZone: row.pain_zone,
          });
        }
        setTodayCheckins(map);
      }
    }

    loadCheckins();
    return () => {
      cancelled = true;
    };
  }, [athleteKey, refreshKey, liveKey]);

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
  }, [selectedId, refreshKey, readinessKey, t.coach.errorReadiness, t.coach.forbidden]);

  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';
  const zoneLabel = (z: 'green' | 'yellow' | 'red') =>
    z === 'green' ? t.progress.zoneGreen : z === 'yellow' ? t.progress.zoneYellow : t.progress.zoneRed;

  const acwrStatus = data?.readiness.acwr != null ? loadStatus(data.readiness.acwr) : null;

  const today = todayUtc();
  const summary =
    roster && roster.length > 0 && checkinRows
      ? teamCheckinSummary(roster.map((a) => a.athleteId), checkinRows, today)
      : null;
  const datesMap = checkinRows ? datesByAthlete(checkinRows) : null;
  const doneToday = (id: string) => (summary ? !summary.missing.includes(id) : null);
  const selectedCheckinStreak =
    selectedId && datesMap ? computeCheckinStreak(datesMap.get(selectedId) ?? [], today).current : null;
  const rosterIds = useMemo(() => (athleteKey ? athleteKey.split(',') : []), [athleteKey]);
  const onTeamChange = useCallback(
    (changed: ReadonlySet<string> | 'all') => {
      setLiveKey((k) => k + 1);
      // 'all' (tab back in front / fallback poll) refreshes the lists only —
      // reloading the open athlete card every time would make it flicker.
      if (changed !== 'all' && selectedId && changed.has(selectedId)) setReadinessKey((k) => k + 1);
    },
    [selectedId]
  );
  useTeamLive(rosterIds, onTeamChange);
  // Return-to-Play status per athlete; empty until the RTP tables answer.
  const rtpStatus = useMemo(
    () =>
      checkinRows && rtpRows
        ? rtpByAthlete(
            rosterIds,
            parseRtpCheckins(checkinRows),
            parseClearances(rtpRows.clearances),
            parseFollowups(rtpRows.followups),
            today
          )
        : null,
    [checkinRows, rtpRows, rosterIds, today]
  );
  const openRtpMap = useMemo(() => {
    const m = new Map<string, OpenRtp>();
    for (const [id, st] of rtpStatus ?? []) {
      const o = openRtp(st);
      if (o) m.set(id, o);
    }
    return m;
  }, [rtpStatus]);
  const labelFor = (id: string) => {
    const a = roster?.find((r) => r.athleteId === id);
    return a ? athleteLabel(a, t.coach.athleteFallback) : id.slice(0, 8);
  };

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

        <TeamInvitePanel />

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
            {/* Live alerts: pain / red zone, one-tap answer */}
            <CoachAlertsCard
              athleteIds={rosterIds}
              labelFor={labelFor}
              onSelect={setSelectedId}
              onNewAlert={() => setRefreshKey((k) => k + 1)}
            />

            {/* Return-to-Play: after pain, full load only with the coach's OK */}
            {rtpStatus && (
              <RtpCoachCard
                entries={roster.flatMap((a): RtpCoachEntry[] => {
                  const st = rtpStatus.get(a.athleteId);
                  return st && st.state !== 'none'
                    ? [{ athleteId: a.athleteId, label: athleteLabel(a, t.coach.athleteFallback), status: st }]
                    : [];
                })}
                onSelect={setSelectedId}
                onCleared={() => setRefreshKey((k) => k + 1)}
              />
            )}

            {/* Who has checked in today */}
            {summary && (
              <section className={card}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm text-zinc-400">{t.streak.teamTitle}</h2>
                  <p className="font-mono text-2xl tabular-nums text-zinc-50">
                    {t.streak.teamCount(summary.done, summary.total)}
                  </p>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full"
                  style={{ backgroundColor: HUB.track }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={summary.total}
                  aria-valuenow={summary.done}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(summary.done / summary.total) * 100}%`, backgroundColor: HUB.lime }}
                  />
                </div>
                {summary.missing.length === 0 ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-zinc-200">
                    <CheckCircle size={16} weight="fill" className="text-[#CCFF00]" />
                    {t.streak.teamAllDone}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="mr-1 text-zinc-400">{t.streak.teamMissing}</span>
                    {summary.missing.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs text-zinc-300 ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.07]"
                      >
                        {labelFor(id)}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[11px] text-zinc-500">{t.streak.teamHint}</p>
              </section>
            )}

            {todayCheckins && (
              <MatchRosterCard
                players={roster.map((a) => ({ id: a.athleteId, label: athleteLabel(a, t.coach.athleteFallback) }))}
                checkins={todayCheckins}
                matchDates={matchDates}
                today={today}
                rtp={openRtpMap}
                onSelect={setSelectedId}
              />
            )}

            {/* Team pulse: stress / sleep / fatigue / soreness totals, no names */}
            <TeamPulseCard
              today={today}
              refreshKey={refreshKey + liveKey}
              examWindowToday={stormAthletes ? (examStorm(stormAthletes, today, 1).days[0]?.inWindow ?? 0) : 0}
            />

            {/* Exam storm: next 14 days, counts only */}
            {stormAthletes && <ExamStormCard athletes={stormAthletes} today={today} />}

            {/* Away trips: 48 h recovery after long journeys */}
            <TeamTripsCard today={today} />

            {/* Roster picker */}
            <div>
              <p className="mb-2 text-xs text-zinc-500">{t.coach.pickAthlete}</p>
              <div className="flex flex-wrap gap-2">
                {roster.map((a) => {
                  const active = a.athleteId === selectedId;
                  const done = doneToday(a.athleteId);
                  return (
                    <button
                      key={a.athleteId}
                      onClick={() => setSelectedId(a.athleteId)}
                      title={done === null ? undefined : done ? t.streak.dayDone : t.streak.dayMissed}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#CCFF00] text-zinc-950'
                          : 'bg-white/[0.04] text-zinc-300 ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.07]'
                      }`}
                    >
                      {done !== null && (
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: done
                              ? active ? '#09090B' : HUB.lime
                              : active ? 'rgba(9,9,11,0.25)' : 'rgba(255,255,255,0.2)',
                          }}
                        />
                      )}
                      {athleteLabel(a, t.coach.athleteFallback)}
                      {done !== null && <span className="sr-only">({done ? t.streak.dayDone : t.streak.dayMissed})</span>}
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
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span>{data.hasCheckin ? t.coach.hasCheckinToday : t.coach.noCheckinToday}</span>
                  {selectedCheckinStreak !== null && (
                    <span className="inline-flex items-center gap-1 text-zinc-300">
                      <Flame
                        size={13}
                        weight="fill"
                        className={selectedCheckinStreak > 0 ? 'text-[#CCFF00]' : 'text-zinc-600'}
                      />
                      {t.streak.athleteStreak(selectedCheckinStreak)}
                    </span>
                  )}
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
                    <p
                      className="mt-3 inline-flex items-baseline gap-1.5 font-mono text-4xl font-light leading-none tabular-nums tracking-[-0.04em]"
                      style={{ color: data.readiness.trainingStreak > 6 ? HUB.amber : '#FAFAFA' }}
                    >
                      <Barbell size={22} weight="fill" style={{ color: noRestColor(data.readiness.trainingStreak) }} />
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
