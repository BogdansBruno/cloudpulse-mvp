'use client';

// lib/use-war-room.ts — loads the coach's roster for the War Room: team_members -> profiles (exam dates) -> today's
// computed check-ins (score, zone, ACWR, pain block). Same tables and RLS as /coach; only computed outputs are read, not
// the raw answers. Stays live through useTeamLive (Realtime, polling as the fallback).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { todayUtc } from './checkin-streak';
import { useTeamLive } from './use-team-live';
import type { RosterCheckin, RosterZone } from './match-roster';
import { buildWarRoom, type WarCard, type WarPlayer } from './war-room';

type MemberRow = { athlete_id: string; team_name: string | null; athlete_label: string | null };
type ProfileRow = { id: string; exam_dates: string[] | null };
type CheckinRow = {
  user_id: string;
  readiness_score: number | null;
  zone: RosterZone | null;
  acwr: number | string | null;
  is_pain_blocked: boolean;
  pain_zone: string | null;
};

export type WarRoomState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ok'; cards: WarCard[]; today: string };

export function useWarRoom(fallbackLabel: (shortId: string) => string): WarRoomState {
  const [state, setState] = useState<WarRoomState>({ kind: 'loading' });
  const [ids, setIds] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user?.id;
        if (!userId) throw new Error('not signed in');
        const { data: links, error: e1 } = await supabase
          .from('team_members')
          .select('athlete_id, team_name, athlete_label')
          .eq('coach_id', userId)
          .order('created_at');
        if (e1) throw e1;
        const members = (links ?? []) as MemberRow[];
        const athleteIds = members.map((m) => m.athlete_id);
        if (cancelled) return;
        setIds((cur) => (cur.join(',') === athleteIds.join(',') ? cur : athleteIds));
        const today = todayUtc();
        if (athleteIds.length === 0) {
          setState({ kind: 'ok', cards: [], today });
          return;
        }
        const [prof, chk] = await Promise.all([
          supabase.from('profiles').select('id, exam_dates').in('id', athleteIds),
          supabase
            .from('checkins')
            .select('user_id, readiness_score, zone, acwr, is_pain_blocked, pain_zone')
            .in('user_id', athleteIds)
            .eq('date', today),
        ]);
        if (prof.error) throw prof.error;
        if (chk.error) throw chk.error;
        const examById = new Map(((prof.data ?? []) as ProfileRow[]).map((p) => [p.id, p.exam_dates ?? []]));
        const players: WarPlayer[] = members.map((m) => ({
          id: m.athlete_id,
          label: m.athlete_label?.trim() || m.team_name?.trim() || fallbackLabel(m.athlete_id.slice(0, 8)),
          examDates: examById.get(m.athlete_id) ?? [],
        }));
        const map = new Map<string, RosterCheckin>();
        for (const r of (chk.data ?? []) as CheckinRow[]) {
          map.set(r.user_id, {
            score: r.readiness_score,
            zone: r.zone,
            acwr: r.acwr === null ? null : Number(r.acwr),
            painBlocked: r.is_pain_blocked,
            painZone: r.pain_zone,
          });
        }
        if (!cancelled) setState({ kind: 'ok', cards: buildWarRoom(players, map, today), today });
      } catch {
        if (!cancelled) setState((s) => (s.kind === 'ok' ? s : { kind: 'error' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, fallbackLabel]);

  const onChange = useCallback(() => setTick((k) => k + 1), []);
  const stableIds = useMemo(() => ids, [ids]);
  useTeamLive(stableIds, onChange);
  return state;
}
