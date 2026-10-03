import type { ReactNode } from 'react';
import Nav from '@/components/Nav';
import AccessGate from '@/components/AccessGate';
import DemoBanner from '@/components/DemoBanner';
import OfflineSync from '@/components/OfflineSync';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      {/* .adp-ed switches on the ADP "Dark Editorial" skin (app/globals.css). */}
      <div className="adp-ed contents">
        <Nav />
        <DemoBanner />
        <OfflineSync />
        {children}
      </div>
    </AccessGate>
  );
}
