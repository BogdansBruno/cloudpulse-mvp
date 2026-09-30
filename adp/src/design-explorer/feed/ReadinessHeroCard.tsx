'use client';

// Night Feed — status hero: three mini-rings in a row (readiness, sleep,
// load), one large thin ring with the score, a short verdict and the main
// reason behind today's number. The verdict is set in the editorial serif.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import type { DemoReadiness } from '../demoData';
import { THEMES } from '../themeStyles';
import { FEED } from './copy';
import { Caps, FeedCard, GlowRing, METRIC, Verdict, readinessGradient } from './ui';

const t = THEMES.feed;

function Mini({ label, value, p, gradient }: { label: string; value: string; p: number; gradient: [string, string] }): ReactElement {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <GlowRing value={Math.round(p * 100)} size={58} stroke={4} gradient={gradient}>
        <span className="text-[15px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
      </GlowRing>
      <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: t.colors.textMuted }}>
        {label}
      </span>
    </div>
  );
}

export default function ReadinessHeroCard({ lang, data, greeting }: { lang: AdpLang; data: DemoReadiness; greeting?: string }): ReactElement {
  const c = DX[lang].readiness;
  const f = FEED[lang];
  const g = readinessGradient(data.zone);
  const main = [...data.penalties].sort((a, b) => b.points - a.points)[0];

  return (
    <FeedCard glow={g[0]} className="px-5 pb-6 pt-5" style={{ background: `radial-gradient(90% 55% at 50% 38%, ${g[0]}24 0%, transparent 70%), ${t.gradients.hero}` }}>
      {greeting && <p className="text-[15px] font-medium">{greeting}</p>}

      <div className={`${greeting ? 'mt-4' : ''} grid grid-cols-3 gap-2`}>
        <Mini label={f.mini.readiness} value={String(data.score)} p={data.score / 100} gradient={g} />
        <Mini label={f.mini.sleep} value={`${data.sleep}/7`} p={data.sleep / 7} gradient={METRIC.sleep} />
        <Mini label={f.mini.load} value={data.acwr.toFixed(2)} p={Math.min(data.acwr, 2) / 2} gradient={METRIC.load} />
      </div>

      <div className="mt-7 flex flex-col items-center text-center">
        <GlowRing value={data.score} size={t.ring.size} stroke={t.ring.stroke} gradient={g}>
          <span className="text-[64px] font-semibold leading-none tracking-[-0.04em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {data.score}
          </span>
          <span className="mt-1 text-[13px]" style={{ color: t.colors.textFaint, fontVariantNumeric: 'tabular-nums' }}>
            / 100
          </span>
        </GlowRing>
        <Caps className="mt-4" color={g[0]}>
          {c.zone[data.zone]}
        </Caps>
        <Verdict className="mt-2">{f.verdict[data.zone]}</Verdict>
        <p className="mt-1.5 text-[14px]" style={{ color: t.colors.textMuted }}>
          {c.zoneHint[data.zone]}
        </p>
      </div>

      {main && (
        <div className="mt-6 flex items-center justify-between gap-3 px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.colors.border}`, borderRadius: t.radius.inner }}>
          <div className="min-w-0">
            <Caps>{f.mainReason}</Caps>
            <p className="mt-1 text-[14px] font-medium leading-snug">{c.penalties[main.code]}</p>
          </div>
          <span className="shrink-0 text-[17px] font-semibold" style={{ color: t.colors.bad, fontVariantNumeric: 'tabular-nums' }}>
            −{main.points}
          </span>
        </div>
      )}
      <p className="mt-3 text-center text-[12px]" style={{ color: t.colors.textFaint }}>
        {c.byCode}
      </p>
    </FeedCard>
  );
}
