import { supabase } from '@/lib/supabase';
import type { GuardianStatus } from '@/lib/guardian-rules';

export * from '@/lib/guardian-rules';

export async function readGuardianStatus(): Promise<GuardianStatus | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('age, guardian_consent_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    // Column missing: read the age alone, and do not gate.
    const plain = await supabase.from('profiles').select('age').eq('id', userId).maybeSingle();
    return { age: (plain.data as { age?: number | null } | null)?.age ?? null, consentAt: null, supported: false };
  }
  const row = data as { age?: number | null; guardian_consent_at?: string | null } | null;
  return { age: row?.age ?? null, consentAt: row?.guardian_consent_at ?? null, supported: true };
}

/** Stores the confirmation on the signed-in athlete's own profile row. */
export async function recordGuardianConfirmation(): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ guardian_consent_at: new Date().toISOString() })
    .eq('id', userId);
  return !error;
}

