'use client';

// Night Feed — the whole direction in one phone: three tabs (Today / Body /
// Pass) and a Today feed that re-orders itself by the time of day. The
// cards read the same demo athlete and the same live plan as the studio.
//
// Dark Editorial Mobile: #0B0C10 with ambient glows (indigo = rest, amber =
// caution, mint = normal), a greeting + serif status in the header, a thin
// arc for the score, one Safety Guard capsule (engineering details behind
// the (i)), vitals as a list of cards with thin "you are here" sliders, and
// a floating pill bar with a separate round "+".

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { COACH_LABELS, type AdpLang } from '../../components/labels';
import type { SorenessMap } from '../../components/sorenessMap';
import type { PlanView } from '../../services/planView';
import { DX } from '../copy';
import { acwrState, usualDailyLoad, type DemoReadiness } from '../demoData';
import LoadWeekChart from './LoadWeekChart';
import { THEMES } from '../themeStyles';
import AICoachPlanWidget from './AICoachPlanWidget';
import ReadinessHeroCard from './ReadinessHeroCard';
import SafetyPassBadge from './SafetyPassBadge';
import SorenessSilhouetteWidget from './SorenessSilhouetteWidget';
import { FEED, daypartOf, type Daypart } from './copy';
import { VERDICT_STYLE } from '../../components/ui/typography';
import { AmbientGlow, CARD_TITLE, Caps, Chevron, FeedCard, METRIC, PillButton, RangeScale, StatusTag, readinessGradient, textSafe } from './ui';

const t = THEMES.feed;
type TabId = 'today' | 'body' | 'pass';
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

function Icon({ id, on }: { id: TabId; on: boolean }): ReactElement {
  const s = on ? '#FFFFFF' : t.colors.textMuted;
  const common = { fill: 'none', stroke: s, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      {id === 'today' && (
        <>
          <circle cx="12" cy="12" r="4" {...common} />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" {...common} />
        </>
      )}
      {id === 'body' && (
        <>
          <circle cx="12" cy="4.5" r="2" {...common} />
          <path d="M6 9h12M12 9v5M12 14l-3 7M12 14l3 7" {...common} />
        </>
      )}
      {id === 'pass' && (
        <>
          <path d="M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6l-7-3Z" {...common} />
          <path d="m9 12 2 2 4-4" {...common} />
        </>
      )}
    </svg>
  );
}

function SmallCard({
  caps,
  capsColor,
  title,
  children,
  glow,
  onOpen,
  tag,
}: {
  caps: string;
  capsColor?: string;
  title: string;
  children?: ReactNode;
  glow?: string;
  onOpen?: () => void;
  /** Oval status tag on the right of the header. */
  tag?: { text: string; color: string };
}): ReactElement {
  return (
    <FeedCard glow={glow} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Caps color={capsColor}>{caps}</Caps>
          <h4 className="mt-1.5" style={CARD_TITLE}>
            {title}
          </h4>
        </div>
        {tag ? <StatusTag text={tag.text} color={tag.color} onClick={onOpen} /> : onOpen && (
          <button type="button" onClick={onOpen} aria-label={title} className="p-1">
            <Chevron />
          </button>
        )}
      </div>
      {children}
    </FeedCard>
  );
}

/**
 * One vital as a card: caps label + status tag, the value in a large light
 * sans, and a thin slider — the tinted band is the athlete's norm, the white
 * knob is today. The knob always sits at the real value, even outside the norm.
 */
function VitalCard({
  caps,
  color,
  valueText,
  unit,
  min,
  max,
  value,
  normFrom,
  normTo,
  normText,
  tags,
}: {
  caps: string;
  color: string;
  valueText: string;
  unit?: string;
  min: number;
  max: number;
  value: number;
  normFrom: number;
  normTo: number;
  normText: string;
  tags: { inNorm: string; belowNorm: string; aboveNorm: string };
}): ReactElement {
  const pos = (v: number) => `${(Math.max(0, Math.min(1, (v - min) / (max - min))) * 100).toFixed(1)}%`;
  const state = value < normFrom ? 'below' : value > normTo ? 'above' : 'in';
  const tagColor = state === 'in' ? t.colors.good : color;
  return (
    <FeedCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <Caps>{caps}</Caps>
        <StatusTag text={state === 'in' ? tags.inNorm : state === 'below' ? tags.belowNorm : tags.aboveNorm} color={tagColor} />
      </div>
      <p className="mt-3 leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-[40px] font-light tracking-[-0.03em]">{valueText}</span>
        {unit && (
          <span className="ml-1.5 text-[15px] font-light" style={{ color: t.colors.textFaint }}>
            {unit}
          </span>
        )}
      </p>
      <div className="relative mt-5" aria-hidden>
        <div className="h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute top-0 h-[3px] rounded-full" style={{ left: pos(normFrom), width: `calc(${pos(normTo)} - ${pos(normFrom)})`, background: `${color}A6` }} />
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: pos(value), background: '#FFFFFF', boxShadow: `0 0 0 3px #0B0C10, 0 0 14px ${color}` }}
        />
      </div>
      <p className="mt-2.5 text-right text-[11px]" style={{ color: t.colors.textFaint, fontVariantNumeric: 'tabular-nums' }}>
        {normText}
      </p>
    </FeedCard>
  );
}

export default function FeedPhone({
  lang,
  origin,
  data,
  soreness,
  setSoreness,
  plan,
}: {
  lang: AdpLang;
  origin: string;
  data: DemoReadiness;
  soreness: SorenessMap;
  setSoreness: (m: SorenessMap) => void;
  plan: PlanView;
}): ReactElement {
  const f = FEED[lang];
  const c = DX[lang];
  const [tab, setTab] = useState<TabId>('today');
  const [part, setPart] = useState<Daypart>('morning');
  const [planOpen, setPlanOpen] = useState(false);
  const [marked, setMarked] = useState(false);
  const [guardInfo, setGuardInfo] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Start on the real time of day; the switch above the phone is for the demo.
  useEffect(() => {
    setPart(daypartOf(new Date().getHours()));
  }, []);

  const go = (next: TabId) => {
    setTab(next);
    scroller.current?.scrollTo({ top: 0 });
  };

  const rawDate = new Date().toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' });
  const date = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const acwr = acwrState(data.acwr);
  const exam = data.penalties.find((p) => p.code === 'EXAM_SOON');
  const planPreview = (
    <SmallCard caps={COACH_LABELS[lang].modes[plan.mode]} capsColor={readinessGradient(data.zone)[0]} title={f.plan.title} glow={METRIC.good[0]}>
      <p className="mt-1 text-[14px]" style={{ color: t.colors.textMuted }}>
        {f.plan.blocks(plan.blocks.length, plan.totalMinutes)}
      </p>
      {!planOpen && (
        <div className="mt-4 flex flex-wrap gap-2">
          <PillButton onClick={() => setPlanOpen(true)}>
            {f.actions.start}
          </PillButton>
          <PillButton onClick={() => setPlanOpen(true)}>{f.actions.details}</PillButton>
        </div>
      )}
    </SmallCard>
  );

  const L = COACH_LABELS[lang];
  const g = readinessGradient(data.zone);
  const main = [...data.penalties].sort((x, y) => y.points - x.points)[0];

  // Safety Guard: a capsule with a coloured dot and 1–2 sentences. Rules,
  // ceiling and the penalty list open only behind the (i).
  const guardCard = (
    <FeedCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${t.colors.border}`, color: t.colors.text }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: g[0], boxShadow: `0 0 8px ${g[0]}` }} />
          {L.guardTitle}
        </span>
        <button
          type="button"
          onClick={() => setGuardInfo((v) => !v)}
          aria-expanded={guardInfo}
          aria-label={guardInfo ? f.guard.hide : f.guard.info}
          title={guardInfo ? f.guard.hide : f.guard.info}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
          style={{ border: `1px solid ${guardInfo ? 'rgba(255,255,255,0.35)' : t.colors.border}`, color: guardInfo ? '#FFFFFF' : t.colors.textFaint }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 11v6M12 7.5v.01" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="mt-4 text-[15px] leading-snug" style={{ color: t.colors.text }}>
        {f.guard.line[data.zone]}
      </p>
      {main && (
        <p className="mt-1 text-[14px] leading-snug" style={{ color: t.colors.textMuted }}>
          {f.guard.main(c.readiness.penalties[main.code])}
        </p>
      )}
      {guardInfo && (
        <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: t.colors.border }}>
          <p className="text-[13px] leading-relaxed" style={{ color: t.colors.textMuted }}>
            {L.guardBody(plan.rulesChecked, L.ceiling[plan.engine.ceiling])}
          </p>
          {data.penalties.length > 0 && (
            <div>
              <Caps>{f.guard.reasons}</Caps>
              <ul className="mt-2 space-y-1.5">
                {data.penalties.map((p) => (
                  <li key={p.code} className="flex items-baseline justify-between gap-3 text-[13px]" style={{ color: t.colors.textMuted }}>
                    <span>{c.readiness.penalties[p.code]}</span>
                    <span className="shrink-0" style={{ color: t.colors.bad, fontVariantNumeric: 'tabular-nums' }}>
                      −{p.points}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[12px]" style={{ color: t.colors.textFaint }}>
            {c.readiness.byCode}
          </p>
        </div>
      )}
    </FeedCard>
  );

  const tags = { inNorm: f.tags.inNorm, belowNorm: f.tags.belowNorm, aboveNorm: f.tags.aboveNorm };
  const vitals = (
    <div className="space-y-3">
      <VitalCard caps={f.mini.sleep} color={textSafe(METRIC.sleep[0])} valueText={String(data.sleep)} unit="/ 7" min={1} max={7} value={data.sleep} normFrom={5} normTo={7} normText={f.norm('5–7')} tags={tags} />
      <VitalCard caps={f.mini.readiness} color={g[0]} valueText={String(data.score)} unit="/ 100" min={0} max={100} value={data.score} normFrom={75} normTo={100} normText={f.norm('75–100')} tags={tags} />
      <VitalCard caps={`${f.mini.load} · ACWR`} color={METRIC.load[0]} valueText={data.acwr.toFixed(2)} min={0} max={2} value={data.acwr} normFrom={0.8} normTo={1.3} normText={f.norm('0.8–1.3')} tags={tags} />
    </div>
  );

  const loadCard = (
    <SmallCard caps={f.mini.load} capsColor={METRIC.load[0]} title={f.chart.title} tag={{ text: c.readiness.acwrState[acwr], color: acwr === 'ok' ? t.colors.good : acwr === 'spike' ? t.colors.bad : t.colors.warn }}>
      <div className="mt-4">
        <LoadWeekChart lang={lang} loads={data.weekLoad} usual={usualDailyLoad(data)} />
      </div>
    </SmallCard>
  );
  const examCard = exam && (
    <SmallCard caps={c.readiness.penalties.EXAM_SOON} capsColor={t.colors.warn} title={f.exam.title} glow={t.colors.warn} tag={{ text: f.tags.soon, color: t.colors.warn }}>
      <p className="mt-3 text-[13px] font-semibold" style={{ color: t.colors.bad, fontVariantNumeric: 'tabular-nums' }}>
        −{exam.points}
      </p>
    </SmallCard>
  );
  const passMini = (
    <SmallCard caps={c.pass.title} capsColor={t.colors.bad} title={f.passMini.title} glow={t.colors.bad} tag={{ text: f.tags.limited, color: t.colors.bad }} onOpen={() => go('pass')}>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
        {f.passMini.body}
      </p>
      <div className="mt-4">
        <PillButton variant="cta" onClick={() => go('pass')}>
          {f.actions.showPass}
        </PillButton>
      </div>
    </SmallCard>
  );
  const windDown = (
    <SmallCard caps={f.daypart.evening} capsColor={METRIC.sleep[0]} title={f.windDown.title} glow={METRIC.sleep[0]}>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
        {marked ? f.actions.markedToday : f.windDown.body}
      </p>
      {!marked && (
        <div className="mt-4 flex flex-wrap gap-2">
          <PillButton onClick={() => setMarked(true)}>{f.actions.markedAll}</PillButton>
          <PillButton onClick={() => go('body')}>{f.actions.editMap}</PillButton>
        </div>
      )}
    </SmallCard>
  );
  const outOfNorm = [
    data.acwr < 0.8 || data.acwr > 1.3,
    data.hooper > data.hooperBaseline,
    data.sleep < 5,
    data.stress < 5,
    data.fatigue < 5,
    data.soreness < 5,
  ].filter(Boolean).length;
  const factors = (
    <SmallCard
      caps={f.mini.readiness}
      capsColor={readinessGradient(data.zone)[0]}
      title={f.scales.title}
      tag={outOfNorm === 0 ? { text: f.tags.inNorm, color: t.colors.good } : { text: f.tags.outOfNorm(outOfNorm, 6), color: t.colors.warn }}
    >
      <p className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: t.colors.textFaint }}>
        <span className="inline-block h-2 w-5 rounded-full" style={{ background: `${METRIC.load[0]}66` }} />
        {f.scales.legend}
      </p>
      <div className="mt-4 space-y-5">
        <RangeScale label={c.readiness.acwr} valueText={data.acwr.toFixed(2)} min={0} max={2} value={data.acwr} normFrom={0.8} normTo={1.3} color={METRIC.load[0]} hereLabel={f.scales.here} note={c.readiness.acwrState[acwr]} />
        <RangeScale label={c.readiness.hooper} valueText={`${data.hooper} / 28`} min={4} max={28} value={data.hooper} normFrom={4} normTo={data.hooperBaseline} color={METRIC.load[0]} note={f.scales.hooperNorm(data.hooperBaseline)} />
        <RangeScale label={c.readiness.sleep} valueText={c.readiness.scale7(data.sleep)} min={1} max={7} value={data.sleep} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
        <RangeScale label={c.readiness.stress} valueText={c.readiness.scale7(data.stress)} min={1} max={7} value={data.stress} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
        <RangeScale label={c.readiness.fatigue} valueText={c.readiness.scale7(data.fatigue)} min={1} max={7} value={data.fatigue} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
        <RangeScale label={c.readiness.soreness} valueText={c.readiness.scale7(data.soreness)} min={1} max={7} value={data.soreness} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
      </div>
    </SmallCard>
  );
  const fullPlan = planOpen && <AICoachPlanWidget lang={lang} plan={plan} />;

  const hero = <ReadinessHeroCard key="h" lang={lang} data={data} withVerdict={false} />;
  const feed: Record<Daypart, ReactNode[]> = {
    morning: [hero, <div key="g">{guardCard}</div>, <div key="v">{vitals}</div>, <div key="p">{planPreview}</div>, <div key="pp">{fullPlan}</div>],
    day: [hero, <div key="g">{guardCard}</div>, <div key="e">{examCard}</div>, <div key="p">{planPreview}</div>, <div key="pp">{fullPlan}</div>, <div key="m">{passMini}</div>],
    evening: [<div key="w">{windDown}</div>, <SorenessSilhouetteWidget key="so" lang={lang} value={soreness} onChange={setSoreness} />, <div key="m">{passMini}</div>, <div key="p">{planPreview}</div>, <div key="pp">{fullPlan}</div>],
  };

  const title = tab === 'today' ? f.tabs.today : tab === 'body' ? f.tabs.body : f.tabs.pass;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium uppercase tracking-widest" style={{ color: t.colors.textFaint }}>
          {f.demoTime}
        </span>
        <div className="flex gap-1 rounded-full p-1" style={{ background: t.colors.surface, border: `1px solid ${t.colors.border}` }} role="radiogroup" aria-label={f.demoTime}>
          {(['morning', 'day', 'evening'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={part === p}
              onClick={() => {
                setPart(p);
                go('today');
              }}
              className="rounded-full px-3 py-1 text-[13px] font-semibold"
              style={{ background: part === p ? '#FFFFFF' : 'transparent', color: part === p ? '#0A0B0E' : t.colors.textMuted }}
            >
              {f.daypart[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Phone */}
      <div
        className="relative w-full max-w-[400px] overflow-hidden"
        style={{ height: 820, background: t.gradients.page, borderRadius: 48, isolation: 'isolate', border: `1px solid ${t.colors.border}`, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.9), 0 0 0 8px #050608', fontFamily: t.font.body, color: t.colors.text }}
      >
        <AmbientGlow zone={data.zone} />
        <div ref={scroller} className="dx-scroll relative h-full overflow-y-auto px-4 pb-32 pt-7" style={{ scrollbarWidth: 'none', zIndex: 1 }}>
          <header className="mb-5 px-1">
            <Caps>{date}</Caps>
            {tab === 'today' ? (
              <>
                <p className="mt-3 text-[15px]" style={{ color: t.colors.textMuted }}>
                  {f.greeting[part]}
                </p>
                <h2 className="mt-1" style={{ ...VERDICT_STYLE, fontSize: 34, lineHeight: 1.08 }}>
                  {f.verdict[data.zone]}
                </h2>
              </>
            ) : (
              <h2 className="mt-2" style={{ ...VERDICT_STYLE, fontSize: 34, lineHeight: 1.08 }}>
                {title}
              </h2>
            )}
          </header>
          <div className="space-y-3">
            {tab === 'today' && feed[part]}
            {tab === 'body' && (
              <>
                <SorenessSilhouetteWidget lang={lang} value={soreness} onChange={setSoreness} />
                {factors}
                {loadCard}
              </>
            )}
            {tab === 'pass' && <SafetyPassBadge lang={lang} origin={origin} />}
          </div>
        </div>

        {/* Floating frosted pill (three tabs) + a separate round "+" (log how you feel) */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
          <nav
            className="flex items-center gap-7 rounded-full px-6 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(28px) saturate(140%)',
              WebkitBackdropFilter: 'blur(28px) saturate(140%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 40px -14px rgba(0,0,0,0.85)',
            }}
            aria-label={title}
          >
            {(['today', 'body', 'pass'] as const).map((id) => {
              const on = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  aria-current={on ? 'page' : undefined}
                  className="flex flex-col items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors"
                  style={{ color: on ? '#FFFFFF' : t.colors.textFaint }}
                >
                  <Icon id={id} on={on} />
                  {id === 'today' ? f.tabs.today : id === 'body' ? f.tabs.body : f.tabs.pass}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => go('body')}
            aria-label={f.actions.quickAdd}
            title={f.actions.quickAdd}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-200 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.16)',
              backdropFilter: 'blur(28px) saturate(140%)',
              WebkitBackdropFilter: 'blur(28px) saturate(140%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px -14px rgba(0,0,0,0.85)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
