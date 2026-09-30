'use client';

// /training — "My workout for today" (ADP safe AI coach, AI Guard).
// The screen itself lives in adp/src/screens/AICoachScreen.tsx; this page
// only loads today's plan and keeps it fresh (lib/use-today-plan.ts).

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTodayPlan } from '@/lib/use-today-plan';
import AICoachScreen from '@/adp/src/screens/AICoachScreen';

export default function TrainingPage() {
  const { lang } = useLanguage();
  const { state, reload } = useTodayPlan(lang);

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />
      <div className="relative mx-auto max-w-lg">
        <AICoachScreen state={state} lang={lang} onRetry={reload} />
      </div>
    </div>
  );
}
