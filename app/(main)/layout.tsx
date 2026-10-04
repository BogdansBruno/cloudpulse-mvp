import type { ReactNode } from 'react';
import AppShell from '@/components/np/AppShell';
import AccessGate from '@/components/AccessGate';
import DemoBanner from '@/components/DemoBanner';
import OfflineSync from '@/components/OfflineSync';

// v3 shell: sidebar (desktop) + glass tab bar (mobile), active item from the URL.
// Pages that are not redrawn yet keep the old `.adp-ed` skin tweaks; AppShell adds that class only for them.
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      <AppShell>
        <DemoBanner />
        <OfflineSync />
        {children}
      </AppShell>
    </AccessGate>
  );
}
