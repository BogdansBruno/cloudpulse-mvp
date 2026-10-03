'use client';

// /demo/mobile — the v3 "Night Performance" "Сегодня" screen with the demo athlete.
// Engine numbers follow the real engine (adp/src/design-explorer/demoData.ts):
// 100 − 15 − 12 − 15 = 58 → yellow; 7-day load 2 310, ACWR 1.32 → usual
// week ≈ 1 750, usual day ≈ 250 → today's 240 AU = Load Index 48, target 43–58.
// Sleep stages and biometrics are DEMO wearable values (components/np/demo.ts),
// shown with a "Demo · needs a wearable" tag. The Safety Pass here uses a demo id and a demo name, and its
// QR opens /pass with a demo token (it will say "not valid" — by design).
// Add ?state=none to see the "no check-in yet" state, ?wearable=none for the
// real-life "no wearable connected" state.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MobileToday, { type TodayData, type WearableData } from '@/components/m/MobileToday';
import SafetyPassSheet from '@/components/m/SafetyPassSheet';
import { DEMO_PASS, DEMO_READINESS } from '@/adp/src/design-explorer/demoData';
import { DEMO_BIOMETRICS, DEMO_SLEEP } from '@/components/np/demo';

const acute = DEMO_READINESS.weekLoad.reduce((a, b) => a + b, 0);
const DEMO: TodayData = {
  score: DEMO_READINESS.score,
  zone: DEMO_READINESS.zone,
  sleep: DEMO_READINESS.sleep,
  acwr: DEMO_READINESS.acwr,
  acuteLoad: acute,
  chronicLoad: acute / DEMO_READINESS.acwr,
  dailyLoad: DEMO_READINESS.weekLoad[DEMO_READINESS.weekLoad.length - 1],
  yesterdayLoad: DEMO_READINESS.weekLoad[DEMO_READINESS.weekLoad.length - 2],
  previousScores: DEMO_READINESS.week.slice(0, -1).map((d) => d.score),
  penaltyCodes: DEMO_READINESS.penalties.map((p) => p.code),
};
const WEARABLE: WearableData = { sleep: DEMO_SLEEP, biometrics: DEMO_BIOMETRICS, demo: true };

function Demo() {
  const { t, lang } = useLanguage();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get('pass') === '1');
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <MobileToday
      lang={lang}
      data={params.get('state') === 'none' ? null : DEMO}
      wearable={params.get('wearable') === 'none' ? null : WEARABLE}
      demo
      onOpenPass={() => setOpen(true)}
      overlay={
        <SafetyPassSheet
          open={open}
          onClose={() => setOpen(false)}
          lang={lang}
          status="block"
          date={today}
          passId={DEMO_PASS.id}
          restrictions={[t.shield.dirPreMatch]}
          holder={{ name: lang === 'en' ? 'Aleksandr M.' : lang === 'lv' ? 'Aleksandrs M.' : 'Александр М.', className: lang === 'ru' ? '10-Б' : '10.B' }}
          verifyUrl={origin ? `${origin}/pass?t=demo` : null}
        />
      }
    />
  );
}

export default function MobileDemoPage() {
  return (
    <Suspense>
      <Demo />
    </Suspense>
  );
}
