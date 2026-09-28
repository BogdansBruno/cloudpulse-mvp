import type { ReactNode } from 'react';
import Nav from '@/components/Nav';
import AccessGate from '@/components/AccessGate';
import DemoBanner from '@/components/DemoBanner';
import OfflineSync from '@/components/OfflineSync';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      <Nav />
      <DemoBanner />
      <OfflineSync />
      {children}
    </AccessGate>
  );
}
