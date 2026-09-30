import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Scout passports are private links: never indexed, never followed.
export const metadata: Metadata = {
  title: 'CloudPulse — Athlete passport',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function CvLayout({ children }: { children: ReactNode }) {
  return children;
}
