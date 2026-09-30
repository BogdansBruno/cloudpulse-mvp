'use client';

// /training — "My workout for today" (ADP safe AI coach, AI Guard), in the
// Liquid Glass style: glass cards over a slow moving light mesh, spring-press
// buttons, a timer on the current block.
// The screen itself lives in adp/src/screens/AICoachScreen.tsx; this page
// only loads today's plan and keeps it fresh (lib/use-today-plan.ts).

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTodayPlan } from '@/lib/use-today-plan';
import AICoachScreen from '@/adp/src/screens/AICoachScreen';
import AmbientMesh, { MESH_BASE } from '@/adp/src/components/ui/AmbientMesh';
import TravelRecoveryCard from '@/components/TravelRecoveryCard';

export default function TrainingPage() {
  const { lang } = useLanguage();
  const { state, reload } = useTodayPlan(lang);
  // Amber light when today is not a green day (the words on the cards say why).
  const storm = state.kind === 'ok' && state.view.engine.ceiling !== 'green';

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip px-4 py-8 md:py-12" style={{ background: MESH_BASE.liquid }}>
      <AmbientMesh palette="liquid" storm={storm} fixed />
      <div className="relative mx-auto max-w-lg" style={{ zIndex: 1 }}>
        <AICoachScreen state={state} lang={lang} onRetry={reload} />
        <TravelRecoveryCard className="mt-3" />
      </div>
    </div>
  );
}
