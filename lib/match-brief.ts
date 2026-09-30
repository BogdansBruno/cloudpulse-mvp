// lib/match-brief.ts
//
// "Pre-match handshake": before a match the parent sees the SAME verdict the
// coach sees in the match squad (lib/match-roster.ts) — for their own child
// only, and only when the athlete switched on both parent consents (colour of
// the day + calendar). Data from parent_match_brief() (supabase/sql/15):
// no score, no ACWR number, no pain location — only what the verdict needs.
//
// It says what the engine suggests and that the coach picks the team. No
// minutes of playing time, no percentages: the engine does not compute them.
// Pure functions; unit-tested in match-brief.test.ts.

import { classifyForMatch, type RosterReason, type RosterVerdict, type RosterZone } from './match-roster';
import type { OpenRtp } from './return-to-play';

export type MatchBrief = {
  linkId: string;
  matchDate: string;
  checkedIn: boolean;
  zone: RosterZone | null;
  painBlocked: boolean;
  loadSpike: boolean;
  rtpState: 'none' | 'restricted' | 'ready' | 'cleared';
  cleanDays: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isZone = (v: unknown): v is RosterZone => v === 'green' || v === 'yellow' || v === 'red';
const RTP = ['none', 'restricted', 'ready', 'cleared'] as const;

export function parseMatchBriefs(rows: readonly unknown[] | null | undefined): MatchBrief[] {
  const out: MatchBrief[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.link_id !== 'string' || typeof r.match_date !== 'string' || !DATE_RE.test(r.match_date)) continue;
    out.push({
      linkId: r.link_id,
      matchDate: r.match_date,
      checkedIn: r.checked_in === true,
      zone: isZone(r.zone) ? r.zone : null,
      painBlocked: r.pain_blocked === true,
      loadSpike: r.load_spike === true,
      rtpState: (RTP as readonly unknown[]).includes(r.rtp_state) ? (r.rtp_state as MatchBrief['rtpState']) : 'none',
      cleanDays: Number(r.clean_days) || 0,
    });
  }
  return out;
}

/** The coach's verdict, built from the parent's (smaller) data. */
export function briefVerdict(b: MatchBrief): RosterVerdict {
  const checkin = b.checkedIn
    ? { score: null, zone: b.zone, acwr: null, painBlocked: b.painBlocked, painZone: null, loadSpike: b.loadSpike }
    : null;
  const rtp: OpenRtp | null =
    b.rtpState === 'restricted' || b.rtpState === 'ready'
      ? { state: b.rtpState, cleanDays: b.cleanDays, painDate: b.matchDate }
      : null;
  const verdict = classifyForMatch(checkin, rtp);
  // The parent never sees a score, even inside a reason.
  const reasons = verdict.reasons.map((r): RosterReason =>
    r.code === 'OK' ? { code: 'OK', score: null } : r.code === 'LOW_READINESS' ? { code: 'LOW_READINESS', score: null } : r
  );
  return { group: verdict.group, reasons };
}

export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
