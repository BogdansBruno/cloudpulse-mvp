'use client';

// components/np/useHistory.ts — the athlete's day-by-day engine results from GET /api/checkin.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';

/** History of the last `days` days (oldest first). `error` on a failed request. */
export function useHistory(days: number): { history: ReadinessHistoryPoint[] | null; error: boolean } {
  const [history, setHistory] = useState<ReadinessHistoryPoint[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch(`/api/checkin?days=${days}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) throw new Error('history');
        const body = (await res.json()) as { history?: ReadinessHistoryPoint[] };
        if (!cancelled) setHistory(body.history ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);
  return { history, error };
}
