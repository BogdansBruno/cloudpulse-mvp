// components/np/icons.tsx — the v3 icon set: 24px grid, one stroke weight (1.6 by default,
// 1.5–1.75 allowed), round caps and joins, currentColor. Every icon is two layers:
//   `fill` — the closed body of the shape; drawn at 20 % of the current colour when `active`
//   `line` — the outline and details; always drawn
// so an active nav item reads as "lit" without switching to a heavy filled glyph.

import type { ReactElement, SVGProps } from 'react';

export type IconName =
  // metrics
  | 'sparkle'
  | 'moon'
  | 'bolt'
  | 'pulse'
  | 'heart'
  | 'drop'
  | 'thermo'
  | 'wind'
  // arrows
  | 'up'
  | 'down'
  | 'flat'
  | 'chevL'
  | 'chevR'
  | 'arrowR'
  | 'chevD'
  // navigation
  | 'grid'
  | 'trend'
  | 'calendar'
  | 'chat'
  | 'watch'
  | 'sunrise'
  | 'dumbbell'
  | 'heartbeat'
  | 'gauge'
  | 'users'
  | 'shield'
  | 'signout'
  | 'settings'
  | 'menu'
  | 'sun'
  | 'leaf'
  | 'lotus'
  | 'share'
  | 'gear'
  | 'sprout'
  | 'tree'
  // live workout
  | 'bluetooth'
  | 'timer'
  | 'play'
  | 'pause'
  | 'stop'
  | 'close'
  | 'check'
  | 'plus'
  | 'minus'
  | 'reset'
  | 'exam'
  | 'trophy'
  | 'qr'
  | 'mic'
  | 'clip'
  | 'food'
  | 'send'
  | 'info';

type Glyph = { fill?: ReactElement; line: ReactElement };

const G: Record<IconName, Glyph> = {
  sparkle: {
    fill: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z" />,
    line: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z" />,
  },
  moon: {
    fill: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
    line: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  },
  bolt: { fill: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />, line: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" /> },
  pulse: { line: <path d="M3 12h4l2-5 3.5 10 2.5-7 1.5 2H21" /> },
  heart: {
    fill: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
    line: (
      <>
        <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
        <path d="M7.5 12h2.5l1.2-2 1.8 4 1.2-2h2.3" />
      </>
    ),
  },
  drop: {
    fill: <path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" />,
    line: (
      <>
        <path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" />
        <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
      </>
    ),
  },
  thermo: {
    line: (
      <>
        <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a3.5 3.5 0 1 1-4 0Z" />
        <path d="M12 9v7" />
      </>
    ),
  },
  wind: {
    line: (
      <>
        <path d="M3 9h11a3 3 0 1 0-3-3" />
        <path d="M3 15h15a3 3 0 1 1-3 3" />
        <path d="M3 12h7" />
      </>
    ),
  },
  up: { line: <path d="M12 19V5M6 11l6-6 6 6" /> },
  down: { line: <path d="M12 5v14M6 13l6 6 6-6" /> },
  flat: { line: <path d="M5 12h14M13 6l6 6-6 6" /> },
  chevL: { line: <path d="M15 6 9 12l6 6" /> },
  chevR: { line: <path d="m9 6 6 6-6 6" /> },
  arrowR: { line: <path d="M5 12h13M13 6l6 6-6 6" /> },
  chevD: { line: <path d="m6 9 6 6 6-6" /> },
  lotus: {
    fill: <path d="M12 4c2 2.2 2.8 4.6 2.8 7S13.6 15.6 12 17c-1.6-1.4-2.8-3.6-2.8-6S10 6.2 12 4Z" />,
    line: (
      <>
        <path d="M12 4c2 2.2 2.8 4.6 2.8 7S13.6 15.6 12 17c-1.6-1.4-2.8-3.6-2.8-6S10 6.2 12 4Z" />
        <path d="M12 17c-2.6-.3-5-1.6-6.4-4.2 1.4-.6 2.9-.8 4.2-.5M12 17c2.6-.3 5-1.6 6.4-4.2-1.4-.6-2.9-.8-4.2-.5" />
        <path d="M5.6 12.8c-1.3.2-2.5.8-3.1 1.7C4.5 16.5 8 17.3 12 17c4 .3 7.5-.5 9.5-2.5-.6-.9-1.8-1.5-3.1-1.7M8.5 20h7" />
      </>
    ),
  },
  sprout: {
    fill: (
      <>
        <path d="M12 13.5C12 10 9.8 7.5 5.5 7.5c0 3.6 2.4 6 6.5 6Z" />
        <path d="M12 11c0-3.6 2.5-6.5 6.5-6.5 0 4-2.8 6.5-6.5 6.5Z" />
      </>
    ),
    line: (
      <>
        <path d="M12 20.5V11" />
        <path d="M12 13.5C12 10 9.8 7.5 5.5 7.5c0 3.6 2.4 6 6.5 6Z" />
        <path d="M12 11c0-3.6 2.5-6.5 6.5-6.5 0 4-2.8 6.5-6.5 6.5Z" />
        <path d="M8 20.5h8" />
      </>
    ),
  },
  tree: {
    fill: <path d="M12 3.5c-2.6 0-4.5 2-4.5 4.3C6 8.4 5 9.8 5 11.5c0 2.3 1.9 4 4.3 4h5.4c2.4 0 4.3-1.7 4.3-4 0-1.7-1-3.1-2.5-3.7 0-2.3-1.9-4.3-4.5-4.3Z" />,
    line: (
      <>
        <path d="M12 3.5c-2.6 0-4.5 2-4.5 4.3C6 8.4 5 9.8 5 11.5c0 2.3 1.9 4 4.3 4h5.4c2.4 0 4.3-1.7 4.3-4 0-1.7-1-3.1-2.5-3.7 0-2.3-1.9-4.3-4.5-4.3Z" />
        <path d="M12 11v9.5M12 15.5l-2.2-1.8M12 14l2.2-1.8M9 20.5h6" />
      </>
    ),
  },
  gear: {
    fill: <circle cx="12" cy="12" r="3" />,
    line: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M10.3 3.5h3.4l.5 2.3 1.6.9 2.2-.8 1.7 2.9-1.7 1.6v1.9l1.7 1.6-1.7 2.9-2.2-.8-1.6.9-.5 2.3h-3.4l-.5-2.3-1.6-.9-2.2.8-1.7-2.9 1.7-1.6v-1.9L4.1 8.8l1.7-2.9 2.2.8 1.6-.9.5-2.3Z" />
      </>
    ),
  },
  share: {
    line: (
      <>
        <path d="M12 3.5v11M8 7.5l4-4 4 4" />
        <path d="M8.5 10.5H7a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5a2 2 0 0 0-2-2h-1.5" />
      </>
    ),
  },
  menu: { line: <path d="M4 7h16M4 12h16M4 17h10" /> },
  sun: {
    fill: <circle cx="12" cy="12" r="4" />,
    line: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
      </>
    ),
  },
  leaf: {
    fill: <path d="M12 20c-4.5-1.5-7-5-7-9.5C5 7 7 4.5 12 3.5c5 1 7 3.5 7 7 0 4.5-2.5 8-7 9.5Z" />,
    line: (
      <>
        <path d="M12 20c-4.5-1.5-7-5-7-9.5C5 7 7 4.5 12 3.5c5 1 7 3.5 7 7 0 4.5-2.5 8-7 9.5Z" />
        <path d="M12 20V9M12 13.5l-3-2.5M12 11l2.6-2" />
      </>
    ),
  },
  grid: {
    fill: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
    line: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  trend: {
    fill: <path d="M4 16.5 8.5 11.5l3.5 3 6.5-7.5V20H4Z" />,
    line: (
      <>
        <path d="M3.5 20h17" />
        <path d="M4 16.5 8.5 11.5l3.5 3 6.5-7.5" />
        <path d="M15 7h3.5v3.5" />
      </>
    ),
  },
  calendar: {
    fill: <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />,
    line: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
        <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
        <path d="M8.5 14h.01M12 14h.01M15.5 14h.01" strokeWidth={2.4} />
      </>
    ),
  },
  chat: {
    fill: <path d="M4.5 18.5V7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v6.5A2.5 2.5 0 0 1 17 16H8.5l-4 2.5Z" />,
    line: (
      <>
        <path d="M4.5 18.5V7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v6.5A2.5 2.5 0 0 1 17 16H8.5l-4 2.5Z" />
        <path d="M8.5 10.3h.01M12 10.3h.01M15.5 10.3h.01" strokeWidth={2.4} />
      </>
    ),
  },
  watch: {
    fill: <rect x="7" y="6.5" width="10" height="11" rx="3" />,
    line: (
      <>
        <rect x="7" y="6.5" width="10" height="11" rx="3" />
        <path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5l.5 3.5h5l.5-3.5M12 10v2.2l1.4 1" />
      </>
    ),
  },
  sunrise: {
    fill: <path d="M6.5 16a5.5 5.5 0 0 1 11 0Z" />,
    line: (
      <>
        <path d="M6.5 16a5.5 5.5 0 0 1 11 0" />
        <path d="M3 16h18M8 19.5h8" />
        <path d="M12 4v3M4.6 8.6l1.8 1.8M19.4 8.6l-1.8 1.8" />
      </>
    ),
  },
  dumbbell: {
    fill: (
      <>
        <rect x="5" y="7" width="3" height="10" rx="1.2" />
        <rect x="16" y="7" width="3" height="10" rx="1.2" />
      </>
    ),
    line: (
      <>
        <rect x="5" y="7" width="3" height="10" rx="1.2" />
        <rect x="16" y="7" width="3" height="10" rx="1.2" />
        <path d="M8 12h8M2.75 10v4M21.25 10v4" />
      </>
    ),
  },
  heartbeat: {
    fill: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
    line: (
      <>
        <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
        <path d="M2.5 12.5h5l1.5-2.5 2 4.5 1.5-2h9" />
      </>
    ),
  },
  gauge: {
    fill: <path d="M4 16a8 8 0 0 1 16 0Z" />,
    line: (
      <>
        <path d="M4 16a8 8 0 0 1 16 0" />
        <path d="M12 16l3.6-4.4" />
        <path d="M3.5 19.5h17" />
      </>
    ),
  },
  users: {
    fill: (
      <>
        <circle cx="9" cy="8.2" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0Z" />
      </>
    ),
    line: (
      <>
        <circle cx="9" cy="8.2" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M15.5 5.2a3 3 0 0 1 0 6M17 13.8a5.5 5.5 0 0 1 3.5 5.2" />
      </>
    ),
  },
  shield: {
    fill: <path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-2.5Z" />,
    line: (
      <>
        <path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-2.5Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  signout: {
    line: (
      <>
        <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
        <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
      </>
    ),
  },
  bluetooth: { line: <path d="m7 7.5 10 9-5 4v-17l5 4-10 9" /> },
  timer: {
    fill: <circle cx="12" cy="13.5" r="7.5" />,
    line: (
      <>
        <circle cx="12" cy="13.5" r="7.5" />
        <path d="M12 13.5V10M9.5 2.75h5M18.5 6.5l1.3-1.3" />
      </>
    ),
  },
  play: { fill: <path d="M8 5.5v13l10-6.5-10-6.5Z" />, line: <path d="M8 5.5v13l10-6.5-10-6.5Z" /> },
  pause: {
    fill: (
      <>
        <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
        <rect x="14" y="5" width="3.5" height="14" rx="1" />
      </>
    ),
    line: (
      <>
        <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
        <rect x="14" y="5" width="3.5" height="14" rx="1" />
      </>
    ),
  },
  stop: { fill: <rect x="6" y="6" width="12" height="12" rx="2" />, line: <rect x="6" y="6" width="12" height="12" rx="2" /> },
  close: { line: <path d="M6 6l12 12M18 6 6 18" /> },
  check: { line: <path d="m5 12.5 4.5 4.5L19 7.5" /> },
  plus: { line: <path d="M12 5v14M5 12h14" /> },
  minus: { line: <path d="M5 12h14" /> },
  reset: { line: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" /> },
  exam: {
    fill: <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />,
    line: (
      <>
        <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
        <path d="M7 11.5V16c1.4 1.3 3 2 5 2s3.6-.7 5-2v-4.5M21 9.5V14" />
      </>
    ),
  },
  trophy: {
    fill: <path d="M7.5 4.5h9V10a4.5 4.5 0 0 1-9 0V4.5Z" />,
    line: (
      <>
        <path d="M7.5 4.5h9V10a4.5 4.5 0 0 1-9 0V4.5Z" />
        <path d="M7.5 6.5H5a2.5 2.5 0 0 0 2.6 3.5M16.5 6.5H19a2.5 2.5 0 0 1-2.6 3.5M12 14.5v3M8.5 20h7" />
      </>
    ),
  },
  qr: {
    fill: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.2" />
        <rect x="14" y="4" width="6" height="6" rx="1.2" />
        <rect x="4" y="14" width="6" height="6" rx="1.2" />
      </>
    ),
    line: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.2" />
        <rect x="14" y="4" width="6" height="6" rx="1.2" />
        <rect x="4" y="14" width="6" height="6" rx="1.2" />
        <path d="M14 14h2.5v2.5M20 14v.01M14 20h.01M17.5 20H20v-3" />
      </>
    ),
  },
  mic: {
    fill: <rect x="9" y="3.5" width="6" height="11" rx="3" />,
    line: (
      <>
        <rect x="9" y="3.5" width="6" height="11" rx="3" />
        <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
      </>
    ),
  },
  clip: { line: <path d="m19 11.5-6.6 6.6a4.5 4.5 0 0 1-6.4-6.4l7.1-7.1a3 3 0 0 1 4.2 4.2l-7 7a1.5 1.5 0 0 1-2.1-2.1l6.4-6.4" /> },
  food: {
    line: (
      <>
        <path d="M7 3.5v17M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5" />
        <path d="M17 20.5v-17c-2.2 1.3-3.5 3.9-3.5 7.5 0 1.6.9 2.5 2 2.5H17" />
      </>
    ),
  },
  send: { line: <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" /> },
  settings: {
    fill: <circle cx="12" cy="12" r="3.2" />,
    line: (
      <>
        <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </>
    ),
  },
  info: {
    fill: <circle cx="12" cy="12" r="8.5" />,
    line: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5M12 8h.01" strokeWidth={2} />
      </>
    ),
  },
};

export function Icon({
  name,
  size = 20,
  active = false,
  stroke = 1.5,
  ...rest
}: {
  name: IconName;
  size?: number;
  /** Fills the body of the shape at 20 % of the current colour. */
  active?: boolean;
  /** Stroke weight on the 24px grid: 1.5–1.75. */
  stroke?: 1.5 | 1.6 | 1.75;
} & Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke'>): ReactElement {
  const g = G[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {active && g.fill && (
        <g fill="currentColor" fillOpacity={0.2} stroke="none">
          {g.fill}
        </g>
      )}
      {g.line}
    </svg>
  );
}
