import { NextResponse } from 'next/server';
import { getUserFromToken, createUserScopedClient } from '@/lib/supabase-server';
import { getTodayReadiness } from '@/lib/get-today-readiness';
import { addDays } from '@/lib/checkin-streak';
import {
  RTP_LOOKBACK_DAYS,
  parseClearances,
  parseFollowups,
  parseRtpCheckins,
  returnToPlayStatus,
  type RtpStatus,
} from '@/lib/return-to-play';
import { adpSportFromProfile, engineLimitsFromCloudPulse } from '@/lib/adp-coach';
import { activeTravel, parseTrips } from '@/lib/travel';
import { fromSorenessRows, type SorenessZone, type SportType } from '@/adp/src/types/sportProfile';
import { buildCoachingPrompt } from '@/adp/src/services/AIPromptBuilder';
import { safePlanFromRequest, type SafePlanResult } from '@/adp/src/services/claudeCoachService';
import type { AdpLang } from '@/adp/src/components/labels';
import { adpModelCall } from '@/lib/adp-claude';
import { PlanCache, planKey } from '@/lib/adp-coach-cache';

export const runtime = 'nodejs';
// The model may take several seconds; the rules plan is the answer if it takes too long.
export const maxDuration = 30;

const cache = new PlanCache<SafePlanResult>();

// POST /api/adp-coach  { lang }
// Today's home workout for the signed-in athlete ("My workout", AI Guard).
//
// Pipeline: today's check-in → readiness engine + Safety Guard → EngineLimits
// → soreness map (14_soreness_map.sql) + sport + Return-to-Play → the ADP
// coach module (limits only ever tightened) → plan → PlanView for the screen.
//
// Claude writes the plan inside the frozen context (lib/adp-claude.ts); its
// answer is shown only if it passes all 21 rules. No key, rate limit, timeout,
// API error or any broken rule → the engine's rules-only plan, silently.
// One model call per athlete + exact inputs (lib/adp-coach-cache.ts).
//
// Every optional source degrades quietly: no soreness table yet → no map;
// RTP tables missing → no RTP; no sport in the profile → no sport focus.
// Without today's check-in there is no plan at all (no made-up numbers).
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = await getUserFromToken(token);
    const devMode = process.env.NODE_ENV === 'development' && !token;
    if (!user && !devMode) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const lang: AdpLang = body?.lang === 'lv' || body?.lang === 'en' ? body.lang : 'ru';

    const today = await getTodayReadiness({ devMode, token, userId: user?.id ?? 'dev-test-user' });
    if (!today.hasCheckin) {
      return NextResponse.json({ status: 'no_checkin', date: today.date });
    }

    let sport: SportType | null = null;
    let soreness: SorenessZone[] = [];
    let rtp: RtpStatus = { state: 'none' };
    let travelRecovery = false;

    if (!devMode && user) {
      const client = createUserScopedClient(token!);
      const since = addDays(today.date, -RTP_LOOKBACK_DAYS);
      const [profileRes, mapRes, checkinsRes, clearancesRes, followupsRes, tripsRes] = await Promise.all([
        client.from('profiles').select('sport').eq('id', user.id).maybeSingle(),
        client.from('soreness_maps').select('zones').eq('user_id', user.id).eq('date', today.date).maybeSingle(),
        client.from('checkins').select('user_id, date, pain_flag, pain_zone').eq('user_id', user.id).gte('date', since).lte('date', today.date),
        client.from('rtp_clearances').select('athlete_id, pain_date, cleared_at').eq('athlete_id', user.id).gte('pain_date', since),
        client
          .from('rtp_followups')
          .select('athlete_id, pain_date, day_offset, trend, saw_specialist, answered_at')
          .eq('athlete_id', user.id)
          .gte('pain_date', since),
        // Trips of the athlete's coaches (RLS: team_trips_athlete_select, SQL 15).
        client.from('team_trips').select('id, title, match_date, return_date, travel_hours').gte('return_date', addDays(today.date, -3)),
      ]);

      // Table missing (SQL 15 not run yet) → no travel rule, nothing breaks.
      if (!tripsRes.error) travelRecovery = activeTravel(parseTrips(tripsRes.data), today.date) !== null;

      if (!profileRes.error) sport = adpSportFromProfile(profileRes.data?.sport ?? null);

      if (mapRes.error) {
        console.error('[/api/adp-coach] soreness map not read:', mapRes.error.message);
      } else if (mapRes.data) {
        const parsed = fromSorenessRows(mapRes.data.zones);
        if (parsed.ok) soreness = parsed.value;
      }

      if (!checkinsRes.error && !clearancesRes.error && !followupsRes.error) {
        rtp = returnToPlayStatus(
          parseRtpCheckins(checkinsRes.data),
          parseClearances(clearancesRes.data),
          parseFollowups(followupsRes.data),
          today.date
        );
      }
    }

    const engine = engineLimitsFromCloudPulse({
      date: today.date,
      readiness: today.readiness,
      safetyViolations: today.safetyViolations,
      rtp,
      travelRecovery,
    });

    const request = buildCoachingPrompt({ lang, soreness }, engine, { sportType: sport, seasonPhase: null });
    const who = user?.id ?? 'dev-test-user';
    const key = planKey(who, request.context);

    const cached = cache.get(key);
    const result =
      cached ??
      (await cache.once(key, async () => {
        const callModel = request.context.limits.mode !== 'none' && cache.takeAiCall(who) ? adpModelCall() : null;
        const r = await safePlanFromRequest(request, callModel);
        // Cache real outcomes only; after an error or the rate limit, try the AI again next time.
        if (r.ai.status === 'used' || r.ai.status === 'rejected' || request.context.limits.mode === 'none') cache.set(key, r);
        if (r.ai.status === 'rejected' || r.ai.status === 'error') {
          // Codes only — no names, no answers, nothing personal.
          console.warn('[/api/adp-coach] AI plan not used:', r.ai.status, r.ai.violations.join(','));
        }
        return r;
      }));

    return NextResponse.json({ status: 'ok', view: result.view, isFallback: result.isFallback, ai: result.ai.status });
  } catch (error) {
    console.error('[/api/adp-coach] error:', error);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}
