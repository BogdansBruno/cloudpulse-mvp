'use client';

// /training — "My workout for today" (ADP safe AI coach, AI Guard), in the Lotus look:
// the midnight canvas with its calm aura (an amber one on a non-green day), tinted cards,
// a serif title, spring-press capsule buttons, a timer on the block.
// The screen itself lives in adp/src/screens/AICoachScreen.tsx; this page
// only loads today's plan and keeps it fresh (lib/use-today-plan.ts).

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTodayPlan } from '@/lib/use-today-plan';
import AICoachScreen from '@/adp/src/screens/AICoachScreen';
import Aura from '@/components/np/Aura';
import TravelRecoveryCard from '@/components/TravelRecoveryCard';
import Link from 'next/link';
import { APP } from '@/components/np/appCopy';
import { Icon } from '@/components/np/icons';

export default function TrainingPage() {
  const { lang } = useLanguage();
  const { state, reload } = useTodayPlan(lang);
  // Amber light when today is not a green day (the words on the cards say why).
  const storm = state.kind === 'ok' && state.view.engine.ceiling !== 'green';

  return (
    <div className="relative shrink-0 overflow-x-clip px-3 pb-8 pt-4 md:py-12">
      {storm && <Aura mode="strain" />}
      <div className="relative mx-auto max-w-lg">
        {/* Live workout: the beacon screen for the gym floor (/workout). A glass link, not the primary action. */}
        <Link
          href="/workout"
          className="lt-card-activity mb-5 flex items-center gap-3 px-4 py-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-[#FFC53D]">
            <Icon name="heartbeat" size={22} active />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-zinc-50">{APP[lang].workout.startLink}</span>
            <span className="block truncate text-xs text-zinc-400">{APP[lang].workout.startLinkSub}</span>
          </span>
          <Icon name="arrowR" size={18} className="shrink-0 text-zinc-400" />
        </Link>
        <AICoachScreen state={state} lang={lang} onRetry={reload} />
        <TravelRecoveryCard className="mt-3" />
      </div>
    </div>
  );
}
