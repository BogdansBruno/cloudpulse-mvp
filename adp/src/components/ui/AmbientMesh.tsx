'use client';

// adp/src/components/ui/AmbientMesh.tsx
//
// Soft moving colour that lives BEHIND glass cards: big blurred blobs that
// drift slowly (CSS transform only) and, when the mesh is fixed to the page,
// move a little slower than the scroll — so the colour seen through each
// card keeps changing as you scroll. Stops for reduced motion.
//
// Two palettes:
//   liquid — indigo / cyan / pink / emerald: the Liquid Glass flagship;
//   dune   — warm sand and bronze over near-black: the ADP "biohacking" look.
// The amber "storm" blob lights up when the day is not green or an exam is
// close; otherwise it stays dim. Colour never carries information alone —
// every state is also written in words on the cards.

import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';

export const AMBIENT_CSS = `
@keyframes adp-drift-a { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(8%,6%,0) scale(1.12); } }
@keyframes adp-drift-b { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 50% { transform: translate3d(-10%,4%,0) scale(0.92); } }
@keyframes adp-drift-c { 0%,100% { transform: translate3d(0,0,0) scale(0.95); } 50% { transform: translate3d(6%,-8%,0) scale(1.1); } }
.adp-blob { position: absolute; border-radius: 9999px; filter: blur(70px); will-change: transform; }
.adp-drift-a { animation: adp-drift-a 22s ease-in-out infinite; }
.adp-drift-b { animation: adp-drift-b 28s ease-in-out infinite; }
.adp-drift-c { animation: adp-drift-c 34s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .adp-drift-a, .adp-drift-b, .adp-drift-c { animation: none !important; }
}
`;

export type MeshPalette = 'liquid' | 'dune';

type Blob = { w: string; pos: CSSProperties; color: string; drift: 'a' | 'b' | 'c'; storm?: boolean };

const rg = (c: string) => `radial-gradient(circle, ${c}, transparent 70%)`;

const PALETTES: Record<MeshPalette, Blob[]> = {
  liquid: [
    { w: '46vmax', pos: { left: '-12vmax', top: '-10vmax' }, color: 'rgba(99,102,241,0.72)', drift: 'a' },
    { w: '40vmax', pos: { right: '-10vmax', top: '6%' }, color: 'rgba(34,211,238,0.55)', drift: 'b' },
    { w: '38vmax', pos: { left: '6%', top: '38%' }, color: 'rgba(236,72,153,0.38)', drift: 'c' },
    { w: '40vmax', pos: { left: '-6vmax', bottom: '-8vmax' }, color: 'rgba(52,211,153,0.50)', drift: 'b' },
    { w: '34vmax', pos: { right: '2%', bottom: '12%' }, color: 'rgba(251,191,36,0.50)', drift: 'a', storm: true },
  ],
  dune: [
    { w: '52vmax', pos: { left: '-14vmax', top: '-16vmax' }, color: 'rgba(82,54,43,0.95)', drift: 'a' },
    { w: '44vmax', pos: { right: '-12vmax', top: '4%' }, color: 'rgba(138,94,66,0.55)', drift: 'b' },
    { w: '46vmax', pos: { left: '4%', top: '40%' }, color: 'rgba(42,29,26,0.95)', drift: 'c' },
    { w: '36vmax', pos: { left: '-8vmax', bottom: '-6vmax' }, color: 'rgba(40,52,84,0.55)', drift: 'b' },
    { w: '34vmax', pos: { right: '0%', bottom: '10%' }, color: 'rgba(214,150,84,0.45)', drift: 'a', storm: true },
  ],
};

export const MESH_BASE: Record<MeshPalette, string> = {
  liquid: 'radial-gradient(120% 80% at 50% 0%, #1B2350 0%, #0A0F24 55%, #060913 100%)',
  dune: 'linear-gradient(180deg, #2A1D1A 0%, #1A1416 38%, #12131A 70%, #0C0D12 100%)',
};

export default function AmbientMesh({
  palette = 'liquid',
  storm,
  fixed = false,
}: {
  palette?: MeshPalette;
  storm: boolean;
  /** Fixed to the viewport (whole page) or absolute inside its parent. */
  fixed?: boolean;
}): ReactElement {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fixed || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (layer.current) layer.current.style.transform = `translate3d(0, ${(-window.scrollY * 0.18).toFixed(1)}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [fixed]);

  return (
    <div aria-hidden style={{ position: fixed ? 'fixed' : 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <style>{AMBIENT_CSS}</style>
      <div ref={layer} style={{ position: 'absolute', inset: fixed ? '0 0 -60% 0' : 0, willChange: 'transform' }}>
        {PALETTES[palette].map((b, i) => (
          <div
            key={i}
            className={`adp-blob adp-drift-${b.drift}`}
            style={{
              ...b.pos,
              width: b.w,
              height: b.w,
              background: rg(b.color),
              opacity: b.storm ? (storm ? 1 : 0.25) : 1,
              transition: b.storm ? 'opacity 1.2s ease' : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}
