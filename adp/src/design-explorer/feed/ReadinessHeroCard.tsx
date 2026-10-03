'use client';

// Night Feed — status hero (Dark Editorial Mobile): one thin semicircle arc,
// the score inside it as a big light number, and a zone badge. No closed
// rings, no explanations — the reasons live in the Safety Guard card. When
// the hero stands alone (studio grid) it also shows the serif verdict;
// inside the phone the verdict is already in the header.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import type { DemoReadiness } from '../demoData';
import { THEMES } from '../themeStyles';
import { FEED } from './copy';
import { ArcGauge, Caps, FeedCard, StatusTag, Verdict, readinessGradient } from './ui';

const t = THEMES.feed;

export default function ReadinessHeroCard({
  lang,
  data,
  greeting,
  withVerdict = true,
}: {
  lang: AdpLang;
  data: DemoReadiness;
  greeting?: string;
  /** false inside the phone: the header already carries the serif verdict. */
  withVerdict?: boolean;
}): ReactElement {
  const c = DX[lang].readiness;
  const f = FEED[lang];
  const g = readinessGradient(data.zone);

  return (
    <FeedCard className="px-5 pb-6 pt-5">
      <div className="flex items-center justify-between">
        <Caps>{greeting ?? f.mini.readiness}</Caps>
        <span className="text-[11px]" style={{ color: t.colors.textFaint, fontVariantNumeric: 'tabular-nums' }}>
          0 — 100
        </span>
      </div>

      <div className="mt-5">
        <ArcGauge value={data.score} gradient={g}>
          <span className="text-[76px] font-light leading-none tracking-[-0.04em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {data.score}
          </span>
          <div className="mt-3">
            <StatusTag text={c.zone[data.zone]} color={g[0]} />
          </div>
        </ArcGauge>
      </div>

      {withVerdict && <Verdict className="mt-5 text-center">{f.verdict[data.zone]}</Verdict>}
    </FeedCard>
  );
}
