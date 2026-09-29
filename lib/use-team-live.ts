'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Keeps /coach in step with the team without reloading the page.
//
// Listens (Supabase Realtime, supabase/sql/13) to the tables the coach screen
// is built from:
//   checkins       — a new or corrected check-in (summary, match squad, RTP);
//   profiles       — the athlete changed the calendar (exam storm, next match);
//   rtp_followups  — an answer to the Return-to-Play follow-up.
// RLS applies to the stream, so only the coach's own team arrives here.
//
// Changes are bundled (700 ms) so one check-in — which also rewrites the
// computed columns — causes one refresh, not three. If Realtime is not
// connected, the screen checks every 30 s instead, and always when the tab
// comes back to the front.
// ---------------------------------------------------------------------------

const TABLES = ['checkins', 'profiles', 'rtp_followups'] as const;
const DEBOUNCE_MS = 700;
const POLL_MS = 30_000;

/** The athlete a changed row belongs to, whatever the table calls it. */
export function rowAthleteId(table: string, row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const key = table === 'checkins' ? 'user_id' : table === 'profiles' ? 'id' : 'athlete_id';
  const v = row[key];
  return typeof v === 'string' ? v : null;
}

export function useTeamLive(athleteIds: readonly string[], onChange: (changed: ReadonlySet<string> | 'all') => void) {
  const idsRef = useRef(new Set(athleteIds));
  const cbRef = useRef(onChange);
  useEffect(() => {
    idsRef.current = new Set(athleteIds);
    cbRef.current = onChange;
  }, [athleteIds, onChange]);

  const hasTeam = athleteIds.length > 0;

  useEffect(() => {
    if (!hasTeam) return;
    let pending = new Set<string>();
    let timer: number | null = null;
    let live = false;

    const flush = () => {
      timer = null;
      const changed = pending;
      pending = new Set();
      if (changed.size > 0) cbRef.current(changed);
    };
    const queue = (id: string | null) => {
      if (!id || !idsRef.current.has(id)) return;
      pending.add(id);
      if (timer === null) timer = window.setTimeout(flush, DEBOUNCE_MS);
    };

    let channel = supabase.channel(`team-live-${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as
          | Record<string, unknown>
          | undefined;
        queue(rowAthleteId(table, row));
      });
    }
    channel.subscribe((status) => {
      live = status === 'SUBSCRIBED';
    });

    const poll = window.setInterval(() => {
      if (!live && document.visibilityState === 'visible') cbRef.current('all');
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') cbRef.current('all');
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [hasTeam]);
}
