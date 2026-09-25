import { CONFIG } from '../config.js';
import { createLocalStore } from './local.js';

export const isOnlineConfigured = () => Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

export async function createStore() {
  if (!isOnlineConfigured()) return createLocalStore();
  const { createSupabaseStore } = await import('./supabase.js');
  return createSupabaseStore({ url: CONFIG.SUPABASE_URL, key: CONFIG.SUPABASE_ANON_KEY });
}
