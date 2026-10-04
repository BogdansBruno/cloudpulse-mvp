'use client';

// /chat — the athlete's AI coach, v3 "Night Performance".
// A readiness sidebar (desktop) + a full-height glass chat: pulsing AI orb with a live status,
// gradient-bordered coach bubbles with Markdown, quick prompt chips, a glass input bar with the
// ONE lime action (send). The logic (engine numbers, chat API, questions, plans, voice) is unchanged;
// every number on screen comes from the engine history, the chat never invents one.

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUp, Microphone, Paperclip, CalendarBlank, Moon, ForkKnife, ChartLineUp, Sparkle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { parseScheduleFromAI, getTextBeforeSchedule, getTextAfterSchedule } from '@/lib/schedule-parser';
import { parseQuestionsFromAI, getTextBeforeQuestions } from '@/lib/questions-parser';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { loadIndex, usualDailyLoad } from '@/lib/load-index';
import QuickReplyQuestions from '@/components/QuickReplyQuestions';
import WorkoutPlan from '@/components/WorkoutPlan';
import PlanCard from '@/components/np/PlanCard';
import ScoreDial from '@/components/np/ScoreDial';
import Md from '@/components/np/Md';
import { ZONE } from '@/components/np/ui';
import { NP } from '@/components/np/copy';
import { APP } from '@/components/np/appCopy';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type CoachMode = 'recovery' | 'strength' | 'cardio';

// Minimal typing for the Web Speech API (Chrome/Edge/Safari expose it with a
// webkit prefix; Firefox does not, and then the mic button is hidden).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SPEECH_LANG = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-US' } as const;
const CHIP_ICONS = [CalendarBlank, Moon, ForkKnife, ChartLineUp];
const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const;

// ACWR bands of the engine (0.8 / 1.3 / 1.5) as pill tones; the number itself is always shown.
function acwrPill(acwr: number): string {
  if (acwr < 0.8) return 'np-pill-strain';
  if (acwr <= 1.3) return 'np-pill-good';
  if (acwr <= 1.5) return 'np-pill-warn';
  return 'np-pill-danger';
}

function AiOrb({ state, size = 36 }: { state: 'idle' | 'thinking' | 'listening'; size?: number }) {
  return (
    <span
      aria-hidden
      className={`np-ai-orb np-logo-pulse relative inline-block shrink-0 ${state === 'thinking' ? 'scale-110' : ''}`}
      style={{
        width: size,
        height: size,
        transition: 'transform 300ms',
        animationDuration: state === 'idle' ? '2.8s' : '1.1s',
        ['--np-glow' as string]: state === 'listening' ? 'rgb(0 229 255 / 0.6)' : 'rgb(124 77 255 / 0.55)',
      }}
    />
  );
}

export default function ChatPage() {
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const np = NP[lang];
  const app = APP[lang].chat;
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.chat.welcome }]);
  const [seeded, setSeeded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [history, setHistory] = useState<ReadinessHistoryPoint[] | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Re-seed the welcome message when the language changes, but only before
  // the user has actually started chatting — never rewrite real history.
  useEffect(() => {
    if (!seeded && messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', content: t.chat.welcome }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, loading, reduce]);

  // Same readiness history the Progress page uses, computed by the
  // deterministic engine server-side. The chat never invents these numbers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch('/api/checkin?days=14', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('history');
        const data = await res.json();
        if (!cancelled) setHistory(data.history ?? []);
      } catch {
        if (!cancelled) setHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setVoiceSupported(getSpeechCtor() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  // Grow the message box with its content (like every chat app), up to a cap,
  // then let it scroll. Runs on every change, including voice and "insert
  // metrics", which update the text without a keystroke.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // empty box: one line (a long placeholder must not make it taller)
    if (input) el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const today = history && history.length > 0 ? history[history.length - 1] : null;
  const hasScore = Boolean(today && today.hasCheckin);
  const todayIndex = today ? loadIndex(today.dailyLoad ?? null, usualDailyLoad(today.chronicLoad)) : null;

  // overrideText lets the question cards and prompt chips send a message the
  // same way a typed one would, without touching the input box.
  const handleSend = async (overrideText?: string) => {
    const messageText = (overrideText ?? input).trim();
    if (!messageText || loading) return;
    setSeeded(true);

    const userMessage = messageText;
    const historyForApi = messages; // conversation so far, before this turn
    if (!overrideText) setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMessage, history: historyForApi, lang, mode: mode ?? undefined }),
      });

      const data = await res.json().catch(() => ({}));
      const botReply = data.content || t.chat.genericError;
      setMessages((prev) => [...prev, { role: 'assistant', content: botReply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: t.chat.connectionError }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[lang];
    rec.interimResults = true;
    rec.continuous = false;
    const base = input ? `${input.trimEnd()} ` : '';
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setInput(base + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const insertMetrics = () => {
    if (!today) return;
    const snippet = t.hub.metricsSnippet(
      today.hasCheckin ? today.score : null,
      today.acwr,
      today.hasCheckin ? today.sleepQuality : null
    );
    setInput((prev) => (prev ? `${prev.trimEnd()} ${snippet}` : snippet));
    inputRef.current?.focus();
  };

  const modes: { key: CoachMode; label: string }[] = [
    { key: 'recovery', label: t.hub.modeRecovery },
    { key: 'strength', label: t.hub.modeStrength },
    { key: 'cardio', label: t.hub.modeCardio },
  ];
  const chips = [...t.chat.promptChips, app.chipYesterday];

  const showWelcome = !seeded && messages.length === 1;
  const orb: 'idle' | 'thinking' | 'listening' = loading ? 'thinking' : listening ? 'listening' : 'idle';
  const status = loading ? app.statusThinking : listening ? app.statusListening : today && hasScore ? app.statusSees(today.score, today.acwr !== null ? today.acwr.toFixed(2) : null) : app.statusIdle;

  const dial = (size: number) => (
    <ScoreDial
      score={hasScore && today ? today.score : null}
      zone={hasScore && today ? today.zone : null}
      size={size}
      label={hasScore && today ? `${np.readiness}: ${today.score} / 100, ${np.zone[today.zone]}` : np.noScore}
    />
  );

  return (
    <div className="mx-auto grid h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-72px-env(safe-area-inset-bottom))] max-w-7xl gap-4 p-3 md:h-dvh md:p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* readiness sidebar (desktop) */}
      <aside className="hidden min-h-0 space-y-3 overflow-y-auto lg:block" style={{ scrollbarWidth: 'none' }}>
        <section className="np-card p-5" aria-labelledby="chat-today">
          <h2 id="chat-today" className="np-overline" style={{ fontFamily: 'inherit' }}>
            {app.sidebarTitle}
          </h2>
          <div className="mt-4 flex items-center gap-4">
            {dial(96)}
            <div className="min-w-0 space-y-2">
              {hasScore && today ? (
                <>
                  <p className={`np-pill ${ZONE[today.zone].pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ZONE[today.zone].dot}`} aria-hidden />
                    {np.zone[today.zone]}
                  </p>
                  {today.acwr !== null && (
                    <p>
                      <span className={`np-pill ${acwrPill(today.acwr)}`}>ACWR {today.acwr.toFixed(2)}</span>
                    </p>
                  )}
                  <p>
                    <span className={`np-pill ${today.trainingStreak > 6 ? 'np-pill-warn' : ''}`}>
                      {today.trainingStreak} {t.hub.streak.toLowerCase()}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm leading-snug text-np-text-2">{app.sidebarEmpty}</p>
              )}
            </div>
          </div>
          {todayIndex !== null && (
            <p className="mt-4 text-xs text-np-text-2">
              <span className="np-pill np-pill-strain mr-2">{np.load.title}</span>
              {todayIndex} / 100
            </p>
          )}
          {!hasScore && (
            <Link href="/checkin" className="np-btn-glass mt-4 flex h-11 w-full items-center justify-center rounded-np-ctrl text-sm font-medium">
              {t.hub.doCheckin}
            </Link>
          )}
        </section>
        <PlanCard />
      </aside>

      {/* coach column */}
      <section className="np-card np-glass flex min-h-0 flex-col overflow-hidden" aria-label={t.chat.title}>
        <header className="flex flex-wrap items-center gap-3 border-b border-np-line px-4 py-3 md:px-5">
          <AiOrb state={orb} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-np-text">{t.chat.title}</p>
            <p className="mt-0.5 truncate text-xs text-np-text-2" aria-live="polite">
              {status}
            </p>
          </div>
          <span className="np-pill np-pill-ai ml-auto hidden sm:inline-flex">
            <Sparkle size={12} weight="fill" aria-hidden />
            {app.online}
          </span>
        </header>

        {/* compact today strip (phone and tablet, where the sidebar is hidden) */}
        <div className={`space-y-2 px-3 pt-3 lg:hidden ${showWelcome ? '' : 'hidden'}`}>
          {hasScore && today && (
            <div className="np-card flex items-center gap-3 px-3 py-2">
              {dial(40)}
              <span className={`np-pill ${ZONE[today.zone].pill}`}>{np.zone[today.zone]}</span>
              {today.acwr !== null && <span className={`np-pill ${acwrPill(today.acwr)}`}>ACWR {today.acwr.toFixed(2)}</span>}
            </div>
          )}
          <PlanCard compact />
        </div>

        {/* messages */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {showWelcome && (
              <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="pt-2 md:pt-8">
                <p className="np-overline">{t.chat.heroTag}</p>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-np-text md:text-4xl" style={{ fontFamily: 'inherit' }}>
                  {t.chat.subtitle}
                </h1>
                <div className="np-ai-bubble mt-5 max-w-[60ch] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-np-text-2">
                  <p className="whitespace-pre-wrap">{t.chat.welcome}</p>
                </div>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {chips.map((chip, i) => {
                    const Ico = CHIP_ICONS[i] ?? Sparkle;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSend(chip)}
                        disabled={loading}
                        className="np-btn-glass group flex items-start gap-3 rounded-np-card p-4 text-left disabled:opacity-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-np-text-2 group-hover:text-np-text">
                          <Ico size={16} aria-hidden />
                        </span>
                        <span className="min-w-0 pt-1 text-sm leading-snug text-np-text">{chip}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {!showWelcome &&
              messages.map((msg, idx) => {
                const isAssistant = msg.role === 'assistant';
                const parsedQuestions = isAssistant ? parseQuestionsFromAI(msg.content) : { questions: [], hasQuestions: false };
                const schedule = isAssistant && !parsedQuestions.hasQuestions ? parseScheduleFromAI(msg.content) : null;
                const displayText = isAssistant
                  ? parsedQuestions.hasQuestions
                    ? getTextBeforeQuestions(msg.content)
                    : getTextBeforeSchedule(msg.content)
                  : msg.content;
                const afterText = schedule?.hasSchedule ? getTextAfterSchedule(msg.content) : '';
                // Only the latest assistant message renders live question
                // cards; older ones in history stay as plain text.
                const isLiveQuestions = parsedQuestions.hasQuestions && idx === messages.length - 1 && !loading;

                return (
                  <motion.div
                    key={idx}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING}
                    className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && <AiOrb state="idle" size={28} />}
                    <div
                      className={
                        isAssistant
                          ? 'np-ai-bubble min-w-0 max-w-[92%] rounded-2xl rounded-tl-md px-4 py-3'
                          : 'max-w-[80%] rounded-2xl rounded-br-md border border-np-line-strong bg-np-surface-3 px-4 py-2.5 text-np-text'
                      }
                    >
                      {displayText &&
                        (isAssistant ? (
                          <Md text={displayText} copyLabel={app.codeCopy} />
                        ) : (
                          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{displayText}</div>
                        ))}
                      {isLiveQuestions && <QuickReplyQuestions questions={parsedQuestions.questions} lang={lang} onComplete={(summary) => handleSend(summary)} />}
                      {schedule?.hasSchedule && (
                        <WorkoutPlan events={schedule.events} lang={lang} title={t.hub.planTitle} minLabel={t.hub.min} exportLabel={t.chat.addToCalendar} />
                      )}
                      {afterText && (
                        <div className="mt-3">
                          <Md text={afterText} copyLabel={app.codeCopy} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

            <AnimatePresence>
              {loading && (
                <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                  <AiOrb state="thinking" size={28} />
                  <div className="np-ai-bubble flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3" role="status" aria-label={t.common.loading}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="np-typing-dot h-1.5 w-1.5 rounded-full bg-np-text" />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* command bar */}
        <div className="border-t border-np-line bg-np-bg/40 p-3 md:p-4">
          <div className="mx-auto max-w-2xl space-y-2.5">
            {!showWelcome && (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" aria-label={t.chat.title}>
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSend(chip)}
                    disabled={loading}
                    className="np-btn-glass shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={app.focusLabel}>
              {modes.map((m) => {
                const active = mode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(active ? null : m.key)}
                    className={`np-pill h-8 border px-3.5 text-xs transition-colors ${
                      active ? 'np-pill-ai border-np-violet/60' : 'border-np-line text-np-text-2 hover:text-np-text'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-end gap-1 rounded-[26px] border border-np-line-strong bg-np-surface/80 p-1.5 backdrop-blur-md transition-colors focus-within:border-np-text-3">
              <button
                type="button"
                onClick={insertMetrics}
                disabled={!today}
                title={t.hub.attach}
                aria-label={t.hub.attach}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-np-text-2 transition-colors hover:bg-white/5 hover:text-np-text disabled:opacity-30"
              >
                <Paperclip size={18} aria-hidden />
              </button>
              <div className="relative min-w-0 flex-1">
                {!input && (
                  <span aria-hidden className="pointer-events-none absolute inset-x-1 top-[11px] truncate text-[15px] leading-[22px] text-np-text-3">
                    {listening ? t.hub.listening : t.chat.placeholder}
                  </span>
                )}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends, Shift+Enter adds a new line. Skip while an
                    // IME is composing so it doesn't send half a word.
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  aria-label={t.chat.placeholder}
                  disabled={loading}
                  className="block max-h-[160px] w-full resize-none overflow-y-auto bg-transparent px-1 py-[11px] text-[15px] leading-[22px] text-np-text disabled:opacity-50"
                />
              </div>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  title={t.hub.voice}
                  aria-label={t.hub.voice}
                  aria-pressed={listening}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                    listening ? 'bg-np-sleep/15 text-np-sleep' : 'text-np-text-2 hover:bg-white/5 hover:text-np-text'
                  }`}
                >
                  <Microphone size={18} weight={listening ? 'fill' : 'regular'} aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                aria-label={t.chat.send}
                className="np-btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
              >
                <ArrowUp size={18} weight="bold" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
