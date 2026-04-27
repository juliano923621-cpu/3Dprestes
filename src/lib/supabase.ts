import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. App will use mock/local mode.");
}

const validUrl = (url: string | undefined): string => {
  if (!url) return 'https://placeholder.supabase.co';
  try {
    new URL(url);
    return url;
  } catch {
    return 'https://placeholder.supabase.co';
  }
};

export const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(
  validUrl(supabaseUrl),
  supabaseAnonKey || 'placeholder'
);
