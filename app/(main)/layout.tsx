import type { ReactNode } from 'react';
import Nav from '@/components/Nav';
import AccessGate from '@/components/AccessGate';
import DemoBanner from '@/components/DemoBanner';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      <Nav />
      <DemoBanner />
      {children}
    </AccessGate>
  );
}
