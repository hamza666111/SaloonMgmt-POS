import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function isPlaceholder(value: string) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return lower.includes('your-project-url-here') || lower.includes('your-anon-key-here');
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !isPlaceholder(supabaseUrl) &&
  !isPlaceholder(supabaseAnonKey),
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function handleSupabaseError(error?: unknown, fallbackMessage = 'Unexpected error') {
  if (!error) {
    return { message: fallbackMessage };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof Error) {
    return { message: error.message || fallbackMessage };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return { message: String((error as { message?: unknown }).message || fallbackMessage) };
  }

  return { message: fallbackMessage };
}
