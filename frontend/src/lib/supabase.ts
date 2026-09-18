/**
 * Supabase Auth + browser client plug point.
 * When VITE_SUPABASE_* are empty, auth helpers no-op and the app uses anonymous student_id.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anon!)
  : null;

export async function getAccessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export async function signInAnonymously() {
  if (!supabase) return null;
  // Enable Anonymous sign-ins in Supabase Auth settings if using this path.
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}
