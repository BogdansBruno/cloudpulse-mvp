'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Envelope, LockSimple, ArrowRight, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { signInWithEmail, supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import AuthShell from '@/components/AuthShell';
import AuthField from '@/components/AuthField';
import { GoogleMark, AppleMark } from '@/components/BrandIcons';

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetNotice, setResetNotice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await signInWithEmail(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      window.location.href = '/onboarding';
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetNotice('');
    if (!email.trim()) {
      setError(t.auth.enterEmailFirst);
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetNotice(t.auth.resetSent);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/chat` },
    });
  };

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold text-white mb-1">{t.auth.signInTitle}</h1>
      <p className="text-sm text-zinc-500 mb-6">{t.auth.signInSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label={t.auth.email}
          icon={<Envelope size={16} />}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <div>
          <AuthField
            label={t.auth.password}
            icon={<LockSimple size={16} />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={handleForgotPassword}
            className="mt-1.5 text-xs text-zinc-500 hover:text-[#CCFF00] transition-colors"
          >
            {t.auth.forgotPassword}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-[#FF4D5E]/10 border border-[#FF4D5E]/20 px-3 py-2.5 text-xs text-[#FF4D5E]">
            <WarningCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {resetNotice && (
          <div className="flex items-start gap-2 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-3 py-2.5 text-xs text-[#CCFF00]">
            <CheckCircle size={14} className="shrink-0 mt-0.5" />
            <span>{resetNotice}</span>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black disabled:opacity-60 shadow-[0_0_24px_rgba(204,255,0,0.25)]"
          style={{ background: 'linear-gradient(135deg, #CCFF00 0%, #00F0FF 100%)' }}
        >
          {loading ? t.auth.signingIn : t.auth.signIn}
          {!loading && <ArrowRight size={16} weight="bold" />}
        </motion.button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-wide text-zinc-600">{t.auth.orContinueWith}</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleOAuth('google')}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-zinc-300 hover:bg-white/[0.06] transition-colors"
        >
          <GoogleMark size={15} />
          {t.auth.continueGoogle}
        </button>
        <button
          onClick={() => handleOAuth('apple')}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-zinc-300 hover:bg-white/[0.06] transition-colors"
        >
          <AppleMark size={15} />
          {t.auth.continueApple}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {t.auth.noAccount}{' '}
        <Link href="/signup" className="text-[#CCFF00] hover:brightness-110 font-medium">
          {t.auth.signUp}
        </Link>
      </p>
    </AuthShell>
  );
}
