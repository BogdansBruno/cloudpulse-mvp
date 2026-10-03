'use client';

// /demo/mobile — the Dark Minimal "Сегодня" screen with the demo athlete.
// Numbers follow the real engine (adp/src/design-explorer/demoData.ts):
// 100 − 15 − 12 − 15 = 58 → yellow; 7-day load 2 310, ACWR 1.32 → usual
// week ≈ 1 750. The Safety Pass here uses a demo id and a demo name, and its
// QR opens /pass with a demo token (it will say "not valid" — by design).
// Add ?state=none to see the "no check-in yet" state.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MobileToday, { type TodayData } from '@/components/m/MobileToday';
import SafetyPassSheet from '@/components/m/SafetyPassSheet';
import { DEMO_PASS, DEMO_READINESS } from '@/adp/src/design-explorer/demoData';

const acute = DEMO_READINESS.weekLoad.reduce((a, b) => a + b, 0);
const DEMO: TodayData = {
  score: DEMO_READINESS.score,
  zone: DEMO_READINESS.zone,
  sleep: DEMO_READINESS.sleep,
  acwr: DEMO_READINESS.acwr,
  acuteLoad: acute,
  chronicLoad: acute / DEMO_READINESS.acwr,
};

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
