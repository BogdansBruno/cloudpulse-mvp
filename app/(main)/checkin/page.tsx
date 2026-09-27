'use client';

import { useState } from 'react';
import CheckinForm from '@/components/CheckinForm';
import SafetyShield from '@/components/SafetyShield';

// The Shield Safety Pass sits on top of the check-in: if today's check-in
// already carries a restriction, the athlete sees it first. After a new
// submit, CheckinForm bumps refreshKey so the pass reflects the fresh data.
export default function CheckinPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <SafetyShield refreshKey={refreshKey} />
      <CheckinForm onSubmitted={() => setRefreshKey((k) => k + 1)} />
    </>
  );
}
