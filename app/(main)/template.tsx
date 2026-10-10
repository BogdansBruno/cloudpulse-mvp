'use client';

// app/(main)/template.tsx — a template (unlike a layout) remounts on every navigation, so each screen
// glides in with a soft spring (Today ↔ Vitals ↔ Coach ↔ Calendar …) instead of snapping. Only the
// entrance is animated: no exit, so a tap never waits. The workout screen is full-screen and keeps
// no wrapper transform; reduced-motion users get a plain, short fade.

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { isImmersiveRoute } from '@/components/np/nav';

export default function MainTemplate({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  if (isImmersiveRoute(pathname)) return <>{children}</>;
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
