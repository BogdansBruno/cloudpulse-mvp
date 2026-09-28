// adp/src/components/radar.ts
//
// Pure geometry and rules behind PlayerRadarCard, kept out of the component
// so they are unit-tested without a browser.
//
// Values are attainment levels 0..1 produced by the engines (never typed in
// by hand). null means "no data" and is shown as such: a missing axis is not
// drawn as a zero, because a dent at 0 would claim something we don't know.

export const RADAR_AXES = ['physical', 'discipline', 'academics', 'recovery'] as const;
export type RadarAxis = (typeof RADAR_AXES)[number];

export type RadarValues = Readonly<Record<RadarAxis, number | null>>;

/**
 * 'athlete' — the athlete's own view, all four axes.
 * 'shared'  — anyone else (coach, parent, later a scout): Recovery is built
 *             on health data, so it is removed here as well as in the data
 *             layer (PRD 5: "only the athlete sees the recovery axis").
 */
export type RadarAudience = 'athlete' | 'shared';

export type Trend = 'up' | 'down' | 'same' | 'no_data';

/** Changes smaller than this (in levels) read as "no change", not as a trend. */
export const TREND_EPSILON = 0.03;

export function visibleAxes(audience: RadarAudience): readonly RadarAxis[] {
  return audience === 'athlete' ? RADAR_AXES : RADAR_AXES.filter((a) => a !== 'recovery');
}

/** Out-of-range or non-numbers become "no data" rather than being clamped into a fake value. */
export function cleanLevel(v: number | null): number | null {
  return v !== null && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null;
}

export function trendOf(current: number | null, previous: number | null, epsilon = TREND_EPSILON): Trend {
  const c = cleanLevel(current);
  const p = cleanLevel(previous);
  if (c === null || p === null) return 'no_data';
  if (c - p > epsilon) return 'up';
  if (p - c > epsilon) return 'down';
  return 'same';
}

export type Point = { x: number; y: number };

/** Axis i of n, starting at 12 o'clock and going clockwise. */
export function axisPoint(i: number, n: number, level: number, radius: number, center: Point): Point {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    x: round(center.x + Math.cos(angle) * radius * level),
    y: round(center.y + Math.sin(angle) * radius * level),
  };
}

/**
 * SVG `points` for a full polygon, or null when any visible axis has no data
 * (the component then draws only the known dots).
 */
export function polygonPoints(
  values: RadarValues,
  axes: readonly RadarAxis[],
  radius: number,
  center: Point
): string | null {
  const levels = axes.map((a) => cleanLevel(values[a]));
  if (levels.some((l) => l === null)) return null;
  return levels
    .map((l, i) => axisPoint(i, axes.length, l ?? 0, radius, center))
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
}

/** Known points only, for the "not enough data yet" state. */
export function knownPoints(
  values: RadarValues,
  axes: readonly RadarAxis[],
  radius: number,
  center: Point
): { axis: RadarAxis; point: Point }[] {
  const out: { axis: RadarAxis; point: Point }[] = [];
  axes.forEach((axis, i) => {
    const l = cleanLevel(values[axis]);
    if (l !== null) out.push({ axis, point: axisPoint(i, axes.length, l, radius, center) });
  });
  return out;
}
