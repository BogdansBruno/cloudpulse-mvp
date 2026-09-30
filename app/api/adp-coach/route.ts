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
import { fromSorenessRows, type SorenessZone, type SportType } from '@/adp/src/types/sportProfile';
import { buildCoachingPrompt } from '@/adp/src/services/AIPromptBuilder';
import { fallbackPlan } from '@/adp/src/services/planGuard';
import { buildPlanView } from '@/adp/src/services/planView';
import type { AdpLang } from '@/adp/src/components/labels';

export const runtime = 'nodejs';

// POST /api/adp-coach  { lang }
// Today's home workout for the signed-in athlete ("My workout", AI Guard).
//
// Pipeline: today's check-in → readiness engine + Safety Guard → EngineLimits
// → soreness map (14_soreness_map.sql) + sport + Return-to-Play → the ADP
// coach module (limits only ever tightened) → plan → PlanView for the screen.
//
// Step 2 of the integration: the plan is built by the engine's rules alone
// (fallbackPlan). Step 3 adds the Claude call in between; its answer will be
// shown only if it passes the same 21-rule check, otherwise this plan stays.
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

    if (!devMode && user) {
      const client = createUserScopedClient(token!);
      const since = addDays(today.date, -RTP_LOOKBACK_DAYS);
      const [profileRes, mapRes, checkinsRes, clearancesRes, followupsRes] = await Promise.all([
        client.from('profiles').select('sport').eq('id', user.id).maybeSingle(),
        client.from('soreness_maps').select('zones').eq('user_id', user.id).eq('date', today.date).maybeSingle(),
        client.from('checkins').select('user_id, date, pain_flag, pain_zone').eq('user_id', user.id).gte('date', since).lte('date', today.date),
        client.from('rtp_clearances').select('athlete_id, pain_date, cleared_at').eq('athlete_id', user.id).gte('pain_date', since),
        client
          .from('rtp_followups')
          .select('athlete_id, pain_date, day_offset, trend, saw_specialist, answered_at')
          .eq('athlete_id', user.id)
          .gte('pain_date', since),
      ]);

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
    });

    const request = buildCoachingPrompt({ lang, soreness }, engine, { sportType: sport, seasonPhase: null });
    const plan = fallbackPlan(request.context);

    return NextResponse.json({ status: 'ok', view: buildPlanView(request.context, plan, 'rules') });
  } catch (error) {
    console.error('[/api/adp-coach] error:', error);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}
