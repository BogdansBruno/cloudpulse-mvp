'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import {
  ArrowUp,
  Microphone,
  Paperclip,
  Lightning,
  CalendarBlank,
  Moon,
  ForkKnife,
  Flame,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { parseScheduleFromAI, getTextBeforeSchedule, getTextAfterSchedule } from '@/lib/schedule-parser';
import { parseQuestionsFromAI, getTextBeforeQuestions } from '@/lib/questions-parser';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import QuickReplyQuestions from '@/components/QuickReplyQuestions';
import WorkoutPlan from '@/components/WorkoutPlan';
import { PerformancePanel, PerformanceStrip, zoneMeta, loadStatus, HUB } from '@/components/PerformancePanel';

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
const CHIP_ICONS = [CalendarBlank, Moon, ForkKnife];
const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const;

export default function ChatPage() {
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.chat.welcome }]);
  const [seeded, setSeeded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [history, setHistory] = useState<ReadinessHistoryPoint[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
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
      } finally {
        if (!cancelled) setHistoryLoading(false);
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
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const today = history && history.length > 0 ? history[history.length - 1] : null;

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

  const showWelcome = !seeded && messages.length === 1;

  return (
    <div className="relative h-[calc(100dvh-7rem)] overflow-hidden bg-[#07080A] text-zinc-100 sm:h-[calc(100dvh-4.25rem)] md:h-[calc(100dvh-4.5rem)]">
      {/* One quiet light source behind the readiness ring; everything else stays dark. */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#CCFF00]/[0.06] blur-[140px]" />
      <div className="bg-grid-dots pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_20%_0%,black,transparent)]" />

      <div className="relative mx-auto grid h-full max-w-7xl gap-4 px-3 pb-3 pt-3 md:px-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Performance sidebar: heavier, darker material = structure. */}
        <aside className="hidden min-h-0 overflow-y-auto rounded-[28px] bg-[#0D0F13]/85 p-5 ring-1 ring-inset ring-white/[0.07] backdrop-blur-2xl lg:block">
          <PerformancePanel history={history} loading={historyLoading} />
        </aside>

        {/* Coach column */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] bg-white/[0.02] ring-1 ring-inset ring-white/[0.07]">
          {/* Header: what the coach is grounded in right now */}
          <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3 md:px-5">
            <div className="mr-auto flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#CCFF00] text-zinc-950">
                <Lightning size={16} weight="fill" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-[-0.01em] text-zinc-50">{t.chat.title}</p>
                <p className="text-[11px] text-zinc-500">{t.hub.coachSees}</p>
              </div>
            </div>
            {today && today.hasCheckin && (
              <span
                className="hidden items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs ring-1 ring-inset ring-white/[0.08] sm:inline-flex"
                style={{ color: zoneMeta(today.zone).color }}
              >
                <span className="text-zinc-400">{t.hub.readiness}</span>
                <span className="font-mono tabular-nums">{today.score}</span>
              </span>
            )}
            {today && today.acwr !== null && (
              <span className="hidden items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs ring-1 ring-inset ring-white/[0.08] sm:inline-flex">
                <span className="text-zinc-400">ACWR</span>
                <span
                  className="font-mono tabular-nums"
                  style={{ color: loadStatus(today.acwr) === 'ok' ? HUB.lime : loadStatus(today.acwr) === 'spike' ? HUB.red : HUB.amber }}
                >
                  {today.acwr.toFixed(2)}
                </span>
              </span>
            )}
            {today && (
              <span className="hidden items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-inset ring-white/[0.08] sm:inline-flex">
                <Flame size={12} weight="fill" className="text-[#CCFF00]" />
                <span className="font-mono tabular-nums">{today.trainingStreak}</span>
              </span>
            )}
          </header>

          <div className="px-3 pt-3 sm:hidden">
            <PerformanceStrip history={history} />
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-6">
            <div className="mx-auto max-w-2xl space-y-5">
              {showWelcome && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING}
                  className="pt-4 md:pt-10"
                >
                  <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-[34px]">
                    {t.chat.subtitle}
                  </h1>
                  <p className="mt-3 max-w-[60ch] whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-400">
                    {t.chat.welcome}
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-3">
                    {t.chat.promptChips.map((chip, i) => {
                      const Icon = CHIP_ICONS[i] ?? Lightning;
                      return (
                        <motion.button
                          key={chip}
                          type="button"
                          onClick={() => handleSend(chip)}
                          disabled={loading}
                          whileTap={reduce ? undefined : { scale: 0.97 }}
                          className="group flex items-start gap-3 rounded-2xl bg-white/[0.03] p-3.5 text-left ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.06] hover:ring-[#CCFF00]/40 disabled:opacity-50"
                        >
                          <Icon size={18} className="mt-0.5 shrink-0 text-zinc-400 transition-colors group-hover:text-[#CCFF00]" />
                          <span className="text-sm leading-snug text-zinc-200">{chip}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!showWelcome &&
                messages.map((msg, idx) => {
                  const isAssistant = msg.role === 'assistant';
                  const parsedQuestions = isAssistant
                    ? parseQuestionsFromAI(msg.content)
                    : { questions: [], hasQuestions: false };
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
                      {isAssistant && (
                        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[#CCFF00] ring-1 ring-inset ring-white/10">
                          <Lightning size={14} weight="fill" />
                        </span>
                      )}
                      <div
                        className={
                          isAssistant
                            ? 'min-w-0 max-w-[92%] flex-1 text-zinc-200'
                            : 'max-w-[80%] rounded-2xl rounded-br-md bg-zinc-100 px-4 py-2.5 text-zinc-900'
                        }
                      >
                        {displayText && (
                          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{displayText}</div>
                        )}
                        {isLiveQuestions && (
                          <QuickReplyQuestions
                            questions={parsedQuestions.questions}
                            lang={lang}
                            onComplete={(summary) => handleSend(summary)}
                          />
                        )}
                        {schedule?.hasSchedule && (
                          <WorkoutPlan
                            events={schedule.events}
                            lang={lang}
                            title={t.hub.planTitle}
                            minLabel={t.hub.min}
                            exportLabel={t.chat.addToCalendar}
                          />
                        )}
                        {afterText && (
                          <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-400">{afterText}</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[#CCFF00] ring-1 ring-inset ring-white/10">
                      <Lightning size={14} weight="fill" />
                    </span>
                    <div className="flex items-center gap-1.5 pt-1" aria-label={t.common.loading}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#CCFF00]"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Command bar */}
          <div className="border-t border-white/[0.06] bg-[#0D0F13]/80 p-3 backdrop-blur-2xl md:p-4">
            <div className="mx-auto max-w-2xl">
              <LayoutGroup id="coach-mode">
                <div className="mb-2 flex gap-1" role="radiogroup" aria-label="Coaching focus">
                  {modes.map((m) => {
                    const active = mode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMode(active ? null : m.key)}
                        className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          active ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="mode-pill"
                            className="absolute inset-0 rounded-full bg-[#CCFF00]"
                            transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.35 }}
                          />
                        )}
                        <span className="relative">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>

              <div className="flex items-end gap-1 rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-inset ring-white/10 transition-shadow focus-within:ring-[#CCFF00]/50 focus-within:shadow-[0_0_0_4px_rgba(204,255,0,0.08)]">
                <button
                  type="button"
                  onClick={insertMetrics}
                  disabled={!today}
                  title={t.hub.attach}
                  aria-label={t.hub.attach}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 disabled:opacity-30"
                >
                  <Paperclip size={18} />
                </button>
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
                  placeholder={listening ? t.hub.listening : t.chat.placeholder}
                  disabled={loading}
                  className="max-h-[200px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-[7px] text-[15px] leading-[22px] text-zinc-50 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
                />
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    title={t.hub.voice}
                    aria-label={t.hub.voice}
                    aria-pressed={listening}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      listening ? 'bg-[#FF4D5E]/15 text-[#FF4D5E]' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
                    }`}
                  >
                    <Microphone size={18} weight={listening ? 'fill' : 'regular'} />
                  </button>
                )}
                <motion.button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  aria-label={t.chat.send}
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#CCFF00] text-zinc-950 transition-opacity disabled:opacity-30"
                >
                  <ArrowUp size={18} weight="bold" />
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
