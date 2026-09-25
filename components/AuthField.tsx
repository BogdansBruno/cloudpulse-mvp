'use client';

import { useState, type ReactNode } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

type Props = {
  icon: ReactNode;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  autoComplete?: string;
};

// Fintech-style input: dark recessed field, icon inline on the left,
// lime focus ring, and — for password fields — a visibility toggle.
export default function AuthField({ icon, type, value, onChange, placeholder, label, autoComplete }: Props) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (reveal ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
      <div className="relative flex items-center rounded-xl bg-zinc-950/60 border border-white/10 transition-all duration-200 focus-within:ring-2 focus-within:ring-[#CCFF00]/40 focus-within:border-[#CCFF00]/30">
        <span className="pl-3.5 text-zinc-500">{icon}</span>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="pr-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={reveal ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {reveal ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
