// lib/scout-cv.ts
//
// "Athlete passport for scouts": a one-off link to a read-only summary.
//
// Rules (enforced in the database, supabase/sql/15; mirrored here for the UI):
//   - the athlete creates the link, a linked parent switches it on;
//   - it lives at most 30 days, can be revoked by either of them at any time;
//   - only a hash of the link is stored — nobody can recover it later;
//   - the scout sees regularity (check-ins, logged sessions), readiness
//     colours by month, and — only if the athlete ticked it — how many pain
//     reports there were in 12 months. Never answers, pain locations, notes.
//   - no school grades: there is no school-confirmed source yet, and the
//     passport shows only data CloudPulse can stand behind.
// Pure functions; unit-tested in scout-cv.test.ts.

export const SCOUT_MAX_DAYS = 30;
export const SCOUT_DAY_OPTIONS = [7, 14, 30] as const;
export const SCOUT_MAX_ACTIVE = 3;

export type ShareStatus = 'pending' | 'active' | 'expired' | 'revoked';

export type ScoutShare = {
  id: string;
  displayName: string;
  recipient: string;
  showReadiness: boolean;
  showHealth: boolean;
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  /** Parent view only. */
  athleteLabel?: string | null;
};

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function parseShares(rows: readonly unknown[] | null | undefined): ScoutShare[] {
  const out: ScoutShare[] = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const id = str(r.id);
    const expiresAt = str(r.expires_at);
    const createdAt = str(r.created_at);
    if (!id || !expiresAt || !createdAt) continue;
    out.push({
      id,
      displayName: str(r.display_name) ?? '',
      recipient: str(r.recipient) ?? '',
      showReadiness: r.show_readiness !== false,
      showHealth: r.show_health === true,
      createdAt,
      expiresAt,
      approvedAt: str(r.approved_at),
      revokedAt: str(r.revoked_at),
      viewCount: Number(r.view_count) || 0,
      lastViewedAt: str(r.last_viewed_at),
      athleteLabel: str(r.athlete_label),
    });
  }
  return out;
}

export function shareStatus(s: Pick<ScoutShare, 'approvedAt' | 'revokedAt' | 'expiresAt'>, now: Date = new Date()): ShareStatus {
  if (s.revokedAt) return 'revoked';
  if (Date.parse(s.expiresAt) <= now.getTime()) return 'expired';
  return s.approvedAt ? 'active' : 'pending';
}

export function scoutUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/cv/${token}`;
}

export function isScoutToken(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
}

// --- what the scout sees -----------------------------------------------------

export type CvMonth = { month: string; days: number; green: number; yellow: number; red: number; avgScore: number | null };

export type ScoutCv = {
  ref: string;
  displayName: string;
  recipient: string;
  sport: string | null;
  generatedAt: string;
  expiresAt: string;
  period: { from: string; to: string };
  discipline: {
    checkinDays: number;
    periodDays: number;
    activeWeeks: number;
    totalWeeks: number;
    longestStreak: number;
    sessionsLogged: number;
  };
  readiness: CvMonth[] | null;
  health: { painReports12m: number; returnsConfirmed12m: number } | null;
};

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function parseCv(raw: unknown): ScoutCv | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.status !== 'ok') return null;
  const d = (r.discipline ?? {}) as Record<string, unknown>;
  const p = (r.period ?? {}) as Record<string, unknown>;
  const h = r.health && typeof r.health === 'object' ? (r.health as Record<string, unknown>) : null;
  return {
    ref: str(r.ref) ?? '',
    displayName: str(r.display_name) ?? '',
    recipient: str(r.recipient) ?? '',
    sport: str(r.sport),
    generatedAt: str(r.generated_at) ?? '',
    expiresAt: str(r.expires_at) ?? '',
    period: { from: str(p.from) ?? '', to: str(p.to) ?? '' },
    discipline: {
      checkinDays: num(d.checkin_days),
      periodDays: Math.max(1, num(d.period_days)),
      activeWeeks: num(d.active_weeks),
      totalWeeks: Math.max(1, num(d.total_weeks)),
      longestStreak: num(d.longest_streak),
      sessionsLogged: num(d.sessions_logged),
    },
    readiness: Array.isArray(r.readiness)
      ? r.readiness.flatMap((m): CvMonth[] => {
          if (!m || typeof m !== 'object') return [];
          const o = m as Record<string, unknown>;
          const month = str(o.month);
          if (!month || !/^\d{4}-\d{2}$/.test(month)) return [];
          return [
            {
              month,
              days: num(o.days),
              green: num(o.green),
              yellow: num(o.yellow),
              red: num(o.red),
              avgScore: o.avg_score === null || o.avg_score === undefined ? null : num(o.avg_score),
            },
          ];
        })
      : null,
    health: h ? { painReports12m: num(h.pain_reports_12m), returnsConfirmed12m: num(h.returns_confirmed_12m) } : null,
  };
}

/** Week-level regularity is fairer than day-level for a passport: "active N of M weeks". */
export function regularity(cv: ScoutCv): { weeks: number; of: number } {
  return { weeks: Math.min(cv.discipline.activeWeeks, cv.discipline.totalWeeks), of: cv.discipline.totalWeeks };
}
