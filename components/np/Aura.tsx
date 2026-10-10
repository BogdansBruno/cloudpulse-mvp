'use client';

// components/np/Aura.tsx — the ambient aura of a screen: two big, blurred radial lights behind the
// glass (blur 100 px, 20 % strength, never in the way of clicks). The canvas itself already carries
// the calm recovery aura (np-theme.css); a page adds a mode when its state calls for it:
//   recovery  sky blue + lavender   (rest, good recovery)
//   workout   rose coral + mint     (live session)
//   strain    terracotta            (low readiness / overload — "take it easy today")

import type { ReactElement } from 'react';
import { LT } from './status';

export type AuraMode = 'recovery' | 'workout' | 'strain';

const COLORS: Record<AuraMode, [string, string]> = {
  recovery: [LT.optimal, LT.relax],
  workout: [LT.engaged, LT.good],
  strain: [LT.attention, LT.attention],
};

export default function Aura({ mode }: { mode: AuraMode }): ReactElement {
  const [a, b] = COLORS[mode];
  return (
    <>
      <span aria-hidden className="np-aura -left-24 -top-24 h-[420px] w-[420px]" style={{ backgroundColor: a }} />
      <span aria-hidden className="np-aura -right-32 top-[38%] h-[380px] w-[380px]" style={{ backgroundColor: b }} />
    </>
  );
}
