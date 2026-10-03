// components/np/icons.tsx — the v3 outline icon set: 24px grid, stroke 1.75,
// currentColor. Sizes by the grid: 16 (micro), 20 (standard), 24 (navigation).

import type { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'sparkle'
  | 'moon'
  | 'bolt'
  | 'pulse'
  | 'heart'
  | 'drop'
  | 'thermo'
  | 'wind'
  | 'up'
  | 'down'
  | 'flat'
  | 'chevL'
  | 'chevR'
  | 'arrowR'
  | 'grid'
  | 'trend'
  | 'calendar'
  | 'chat'
  | 'watch';

const PATHS: Record<IconName, ReactElement> = {
  sparkle: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />,
  pulse: <path d="M3 12h4l2-5 3.5 10 2.5-7 1.5 2H21" />,
  heart: (
    <>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
      <path d="M7.5 12h2.5l1.2-2 1.8 4 1.2-2h2.3" />
    </>
  ),
  drop: (
    <>
      <path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  thermo: (
    <>
      <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a3.5 3.5 0 1 1-4 0Z" />
      <path d="M12 9v7" />
    </>
  ),
  wind: (
    <>
      <path d="M3 9h11a3 3 0 1 0-3-3" />
      <path d="M3 15h15a3 3 0 1 1-3 3" />
      <path d="M3 12h7" />
    </>
  ),
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  flat: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevL: <path d="M15 6 9 12l6 6" />,
  chevR: <path d="m9 6 6 6-6 6" />,
  arrowR: <path d="M5 12h13M13 6l6 6-6 6" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  trend: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7.5 14 3.5-4 3 2.5 4.5-6" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  chat: <path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5L5 18.5Z" />,
  watch: (
    <>
      <rect x="7" y="6.5" width="10" height="11" rx="3" />
      <path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5l.5 3.5h5l.5-3.5M12 10v2.2l1.4 1" />
    </>
  ),
};

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: 16 | 20 | 24 | 14 | 12 } & Omit<SVGProps<SVGSVGElement>, 'name'>): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
