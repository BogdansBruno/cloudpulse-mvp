import { NextResponse } from 'next/server';
import { callClaudeAgent, type ChatTurn, type CoachMode, type ReadinessContext } from '@/lib/claude-agent';
import { getUserFromToken } from '@/lib/supabase-server';
import { getTodayReadiness } from '@/lib/get-today-readiness';

export const runtime = 'nodejs';

// --- Simple per-user rate limit -------------------------------------------
// This lives in memory, so it resets whenever Vercel spins up a new instance.
// It is NOT bulletproof, but it stops one person from sending 500 messages
// in a row and burning the team's API credits. Good enough for the MVP;
// swap for a Supabase table or Upstash Redis if you ever need it to be real.
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; resetAt: number }>();

type RateResult = { ok: true } | { ok: false; retryAfterMin: number };

function rateLimit(userId: string): RateResult {
  const now = Date.now();
  const entry = hits.get(userId);
  if (!entry || now > entry.resetAt) {
    hits.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfterMin: Math.ceil((entry.resetAt - now) / 60000) };
  }
  entry.count += 1;
  return { ok: true };
}
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // 1. Who is calling? No valid Supabase session -> no Claude call.
    //    Without this check anyone who finds the URL can spend your API money.
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    const user = await getUserFromToken(token);

    // DEV MODE: Allow unauthenticated access for local testing of calendar feature
    // Remove this before production deployment!
    const devMode = process.env.NODE_ENV === 'development' && !token;
    const mockUser = devMode ? { id: 'dev-test-user', email: 'test@dev.local' } : null;

    // Declared before the check so TypeScript can narrow it to non-null.
    const currentUser = user ?? mockUser;
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not signed in', content: 'Please sign in to chat with your coach.' },
        { status: 401 }
      );
    }

    // 2. Rate limit per user.
    const limit = rateLimit(currentUser.id);
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: 'Rate limit',
          content: `You've hit the message limit. Try again in about ${limit.retryAfterMin} minutes.`,
        },
        { status: 429 }
      );
    }

    // 3. Validate input.
    const body = await req.json().catch(() => ({}));
    const message: unknown = body?.message;
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Empty message', content: 'Say something first!' },
        { status: 400 }
      );
    }
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Too long', content: 'That message is too long — keep it under 2000 characters.' },
        { status: 400 }
      );
    }

    const lang: 'ru' | 'lv' | 'en' = body?.lang === 'lv' || body?.lang === 'en' ? body.lang : 'ru';
    const mode: CoachMode | undefined =
      body?.mode === 'recovery' || body?.mode === 'strength' || body?.mode === 'cardio' ? body.mode : undefined;

    const history: ChatTurn[] = Array.isArray(body?.history)
      ? body.history
          .filter(
            (m: ChatTurn) =>
              (m?.role === 'user' || m?.role === 'assistant') &&
              typeof m?.content === 'string'
          )
          .map((m: ChatTurn) => ({ role: m.role, content: m.content.slice(0, 2000) }))
      : [];

    // 4. Ground the model in reality: pull today's Readiness Score + Safety
    //    Guard state from the deterministic engine BEFORE calling Claude.
    //    The engine decides, Claude only explains — this is what makes that
    //    principle real instead of just a slide in the pitch deck. Never
    //    let a readiness-fetch failure take down the whole chat: if it
    //    throws (e.g. no profile yet), fall back to "no data" and keep going.
    let readiness: ReadinessContext | undefined;
    try {
      const today = await getTodayReadiness({ devMode, token, userId: currentUser.id });
      readiness = {
        hasCheckin: today.hasCheckin,
        score: today.hasCheckin ? today.readiness.score : null,
        zone: today.hasCheckin ? today.readiness.zone : null,
        acwr: today.readiness.acwr,
        trainingStreak: today.readiness.trainingStreak,
        penalties: today.readiness.penalties,
        safetyViolations: today.safetyViolations,
      };
    } catch (readinessError) {
      console.error('[/api/chat] readiness lookup failed, continuing without it:', readinessError);
      readiness = undefined;
    }

    // 5. Real Claude call.
    const content = await callClaudeAgent(message.trim(), history, readiness, lang, mode);

    return NextResponse.json({ role: 'assistant', content });
  } catch (error) {
    console.error('[/api/chat] error:', error);
    return NextResponse.json(
      {
        error: 'Upstream error',
        content: 'The coach is offline for a second. Try again?',
      },
      { status: 502 }
    );
  }
}
