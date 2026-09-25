import type { ReactNode } from 'react';
import Nav from '@/components/Nav';
import AccessGate from '@/components/AccessGate';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      <Nav />
      {children}
    </AccessGate>
  );
}
