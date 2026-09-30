// adp/src/components/sorenessMap.ts
//
// Pure logic behind the soreness silhouette (idea A). No React here, so it is
// fully unit-tested.
//
// The silhouette works with HALVES: a paired zone (quadriceps, calves, …) is
// drawn twice — the athlete's left and right — and a central zone (chest,
// lower back, …) once. The athlete taps a half and picks 1..5.
//
// What leaves the component is a SorenessMap — the exact array the check-in
// stores in adp.check_ins.soreness_zones and the coach module reads:
//   - equal left and right are merged into one 'both' entry (saves room:
//     at most SORENESS_RULES.maxZones entries per check-in);
//   - different left and right stay as two entries;
//   - order follows BODY_ZONES, so the same taps always give the same array.
// Everything returned passes parseSorenessZones.

import {
  BODY_ZONES,
  PAIRED_ZONES,
  SORENESS_RULES,
  selfCareAllowed,
  type BodyZone,
  type SilhouetteView,
  type SorenessSeverity,
  type SorenessZone,
} from '../types/sportProfile';

/** What the component returns: ready for adp.check_ins.soreness_zones. */
export type SorenessMap = readonly SorenessZone[];

/** One tappable half, in the ATHLETE's terms (not the viewer's). */
export type Half = 'left' | 'right' | 'center';

export function halvesOf(zone: BodyZone): readonly Half[] {
  return PAIRED_ZONES.has(zone) ? ['left', 'right'] : ['center'];
}

/**
 * Which of the athlete's halves a shape is, given where it is drawn.
 * Front view: the athlete faces you, so their LEFT is on your right.
 * Back view: you look at their back, so their left is on your left.
 */
export function athleteHalf(zone: BodyZone, view: SilhouetteView, drawnOnViewerRight: boolean): Half {
  if (!PAIRED_ZONES.has(zone)) return 'center';
  if (view === 'front') return drawnOnViewerRight ? 'left' : 'right';
  return drawnOnViewerRight ? 'right' : 'left';
}

type HalfKey = `${BodyZone}:${Half}`;
const key = (zone: BodyZone, half: Half): HalfKey => `${zone}:${half}`;

/** Expands a map into per-half severities ('both' → left + right). */
export function toHalves(map: SorenessMap): Map<HalfKey, SorenessSeverity> {
  const out = new Map<HalfKey, SorenessSeverity>();
  for (const z of map) {
    if (z.side === 'both') {
      out.set(key(z.zoneId, 'left'), z.severity);
      out.set(key(z.zoneId, 'right'), z.severity);
    } else {
      out.set(key(z.zoneId, z.side), z.severity);
    }
  }
  return out;
}

/** Per-half severities → the canonical map (merged, ordered). */
export function fromHalves(halves: ReadonlyMap<HalfKey, SorenessSeverity>): SorenessZone[] {
  const out: SorenessZone[] = [];
  for (const zoneId of BODY_ZONES) {
    if (PAIRED_ZONES.has(zoneId)) {
      const l = halves.get(key(zoneId, 'left'));
      const r = halves.get(key(zoneId, 'right'));
      if (l !== undefined && l === r) out.push({ zoneId, side: 'both', severity: l });
      else {
        if (l !== undefined) out.push({ zoneId, side: 'left', severity: l });
        if (r !== undefined) out.push({ zoneId, side: 'right', severity: r });
      }
    } else {
      const c = halves.get(key(zoneId, 'center'));
      if (c !== undefined) out.push({ zoneId, side: 'center', severity: c });
    }
  }
  return out;
}

export function severityAt(map: SorenessMap, zone: BodyZone, half: Half): SorenessSeverity | null {
  return toHalves(map).get(key(zone, half)) ?? null;
}

export type SetResult = { ok: true; map: SorenessZone[] } | { ok: false; reason: 'TOO_MANY_ZONES'; max: number };

/**
 * Sets (or clears, with null) the severity of some halves of one zone.
 * Refuses a change that would push the map over SORENESS_RULES.maxZones
 * entries; clearing is always allowed.
 */
export function setSeverity(
  map: SorenessMap,
  zone: BodyZone,
  halves: readonly Half[],
  severity: SorenessSeverity | null
): SetResult {
  const next = toHalves(map);
  for (const h of halves) {
    if (!halvesOf(zone).includes(h)) continue;
    if (severity === null) next.delete(key(zone, h));
    else next.set(key(zone, h), severity);
  }
  const out = fromHalves(next);
  if (severity !== null && out.length > SORENESS_RULES.maxZones && out.length > map.length) {
    return { ok: false, reason: 'TOO_MANY_ZONES', max: SORENESS_RULES.maxZones };
  }
  return { ok: true, map: out };
}

/**
 * True when the coach module will give this zone NO drills, only the line
 * "tell your coach; if it does not ease — a doctor, school nurse or physio".
 * The silhouette shows that hint the moment the athlete picks such a value.
 */
export function isReferred(zone: BodyZone, severity: SorenessSeverity): boolean {
  return !selfCareAllowed({ zoneId: zone, side: halvesOf(zone)[0] === 'center' ? 'center' : 'both', severity });
}

/** Colour per severity: lime (light) → amber → red (refer). */
export const SEVERITY_COLOR: Readonly<Record<SorenessSeverity, string>> = {
  1: '#CCFF00',
  2: '#E5E84A',
  3: '#FFB020',
  4: '#FF7A3D',
  5: '#FF4D5E',
};
