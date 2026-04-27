import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ibryfvmtwtrvvnvtrtzx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0MUMtROcbIoBrz-tSAF2ow_bYuTh63D';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing in env. Using default project credentials.");
}

const validUrl = (url: string | undefined): string => {
  if (!url) return 'https://ibryfvmtwtrvvnvtrtzx.supabase.co';
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
    return 'https://ibryfvmtwtrvvnvtrtzx.supabase.co';
  }
};

export const isSupabaseConfigured = true; // Forcing true since we have fallbacks now

export const supabase = createClient(
  validUrl(supabaseUrl),
  supabaseAnonKey || 'placeholder'
);
