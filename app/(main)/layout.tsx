import type { ReactNode } from 'react';
import Nav from '@/components/Nav';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
