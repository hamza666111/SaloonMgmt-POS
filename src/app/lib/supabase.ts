import { createClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-project-url-here' &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

// Only create client if properly configured, otherwise use null
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function handleSupabaseError(error?: PostgrestError | Error | null) {
  if (!error) return;

  const message = (error as PostgrestError).message || error.toString();
  const details = (error as PostgrestError).details;
  const hint = (error as PostgrestError).hint;

  console.error('Supabase Error:', message, details, hint);

  return {
    message,
    details,
    hint
  };
}

export { isSupabaseConfigured };
