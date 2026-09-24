'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { parseScheduleFromAI, getTextBeforeSchedule, getTextAfterSchedule } from '@/lib/schedule-parser';
import { generateICS, downloadICS } from '@/lib/ics-generator';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function CalendarButton({
  messageContent,
  label,
  lang,
}: {
  messageContent: string;
  label: string;
  lang: 'ru' | 'lv' | 'en';
}) {
  const parsed = parseScheduleFromAI(messageContent);

  if (!parsed.hasSchedule) {
    return null;
  }

  const handleDownload = () => {
    const icsContent = generateICS(parsed.events, lang);
    const filename = `cloudpulse-workouts-${new Date().toISOString().split('T')[0]}.ics`;
    downloadICS(icsContent, filename);
  };

  return (
    <button
      onClick={handleDownload}
      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
      title="Export workout schedule to your calendar"
    >
      <span>📅</span>
      <span>{label}</span>
    </button>
  );
}

export default function ChatPage() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.chat.welcome }]);
  const [seeded, setSeeded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Re-seed the welcome message when the language changes, but only before
  // the user has actually started chatting — never rewrite real history.
  useEffect(() => {
    if (!seeded && messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', content: t.chat.welcome }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSeeded(true);

    const userMessage = input;
    const history = messages; // conversation so far, before this turn
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Attach the Supabase session so the API knows who is calling.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMessage, history, lang }),
      });

      const data = await res.json().catch(() => ({}));
      // The API always returns a `content` string, on success and on error.
      const botReply = data.content || t.chat.genericError;

      setMessages((prev) => [...prev, { role: 'assistant', content: botReply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: t.chat.connectionError }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl px-5 py-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-gray-100 border border-slate-700 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">
                  {msg.role === 'assistant' ? getTextBeforeSchedule(msg.content) : msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <CalendarButton messageContent={msg.content} label={t.chat.addToCalendar} lang={lang} />
                )}
                {msg.role === 'assistant' && getTextAfterSchedule(msg.content) && (
                  <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-gray-400 whitespace-pre-wrap">
                    {getTextAfterSchedule(msg.content)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-gray-100 px-5 py-4 rounded-2xl rounded-bl-none border border-slate-700">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" />
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 p-4 md:p-6 bg-slate-900/80 backdrop-blur">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={t.chat.placeholder}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 bg-slate-800 text-white placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 min-w-fit"
          >
            <span>{t.chat.send}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
