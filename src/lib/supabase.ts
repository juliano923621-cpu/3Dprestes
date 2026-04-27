import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. App will use mock/local mode.");
}

const validUrl = (url: string | undefined): string => {
  if (!url) return 'https://placeholder.supabase.co';
  let formattedUrl = url.trim();
  
  // Remove suffixes like /rest/v1/ if the user pasted the direct REST URL
  formattedUrl = formattedUrl.replace(/\/rest\/v1\/?$/, '');
  
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }
  try {
    new URL(formattedUrl);
    return formattedUrl;
  } catch {
    return 'https://placeholder.supabase.co';
  }
};

export const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(
  validUrl(supabaseUrl),
  supabaseAnonKey || 'placeholder'
);
