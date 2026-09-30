'use client';

// lib/use-today-plan.ts
//
// Loads today's home workout (/api/adp-coach) for the "Workout" page and the
// home widget, and keeps it fresh without polling:
//   - on mount and when the language changes;
//   - right after a check-in is sent (CHECKIN_EVENT from CheckinForm) or an
//     offline check-in is synced (SYNCED_EVENT);
//   - when the tab comes back to the foreground.
// Two components asking at the same moment share one request.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { SYNCED_EVENT } from './offline-queue';
import type { AdpLang } from '@/adp/src/components/labels';
import type { AICoachScreenState } from '@/adp/src/screens/AICoachScreen';
import type { PlanView } from '@/adp/src/services/planView';

/** Fired on window by CheckinForm after a check-in reached the server. */
export const CHECKIN_EVENT = 'cloudpulse:checkin-submitted';

type Result = { status: 'ok'; view: PlanView } | { status: 'no_checkin' };

const SHARE_MS = 3_000;
let inflight: { lang: AdpLang; at: number; promise: Promise<Result> } | null = null;

async function request(lang: AdpLang): Promise<Result> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch('/api/adp-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ lang }),
  });
  if (!res.ok) throw new Error(`adp-coach ${res.status}`);
  const body = (await res.json()) as Partial<Result> & { view?: PlanView };
  if (body.status === 'no_checkin') return { status: 'no_checkin' };
  if (body.status === 'ok' && body.view) return { status: 'ok', view: body.view };
  throw new Error('adp-coach: unexpected response');
}

export function fetchTodayPlan(lang: AdpLang, force = false): Promise<Result> {
  const now = Date.now();
  if (!force && inflight && inflight.lang === lang && now - inflight.at < SHARE_MS) return inflight.promise;
  const promise = request(lang);
  inflight = { lang, at: now, promise };
  return promise;
}

export function useTodayPlan(lang: AdpLang): { state: AICoachScreenState; reload: () => void } {
  const [state, setState] = useState<AICoachScreenState>({ kind: 'loading' });

  const load = useCallback(
    (force: boolean) => {
      let cancelled = false;
      fetchTodayPlan(lang, force)
        .then((r) => {
          if (cancelled) return;
          setState(r.status === 'ok' ? { kind: 'ok', view: r.view } : { kind: 'no_checkin' });
        })
        .catch(() => {
          // Keep a plan already on screen if a background refresh fails.
          if (!cancelled) setState((s) => (s.kind === 'ok' ? s : { kind: 'error' }));
        });
      return () => {
        cancelled = true;
      };
    },
    [lang]
  );

  useEffect(() => {
    const cancel = load(false);
    const refresh = () => load(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(false);
    };
    window.addEventListener(CHECKIN_EVENT, refresh);
    window.addEventListener(SYNCED_EVENT, refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancel();
      window.removeEventListener(CHECKIN_EVENT, refresh);
      window.removeEventListener(SYNCED_EVENT, refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const reload = useCallback(() => {
    setState({ kind: 'loading' });
    load(true);
  }, [load]);

  return { state, reload };
}
