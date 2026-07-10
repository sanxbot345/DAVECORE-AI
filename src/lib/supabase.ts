import { createClient } from '@supabase/supabase-js';

// Get environment variables
const env = (import.meta as any).env || {};
const supabaseUrlRaw = env.VITE_SUPABASE_URL || '';
const supabaseAnonKeyRaw = env.VITE_SUPABASE_ANON_KEY || '';

// Verify that the URL is a valid URL starting with http:// or https:// and not a simple placeholder
const checkIsValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export const isSupabaseConfigured = !!(
  supabaseUrlRaw && 
  supabaseAnonKeyRaw && 
  checkIsValidUrl(supabaseUrlRaw)
);

// Lazy initialization of supabase client to prevent crashing on startup
let supabaseClientInstance: any = null;

export function getSupabase() {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(supabaseUrlRaw, supabaseAnonKeyRaw);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseClientInstance;
}

