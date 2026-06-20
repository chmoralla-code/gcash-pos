// Supabase Configuration
// Sign up at https://supabase.com → Create a project → Get these values from Settings > API

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export function isSupabaseConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY;
}
