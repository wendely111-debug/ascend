import { CONFIG } from '../config.js';
import { createLocalStore } from './local.js';

export const isOnlineConfigured = () => Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

export async function createStore() {
  // Atalho de desenvolvimento/testes: localStorage 'ascend:modo-solo' = '1' força o modo offline neste navegador.
  let forceLocal = false;
  try { forceLocal = localStorage.getItem('ascend:modo-solo') === '1'; } catch { /* sem storage */ }
  if (!isOnlineConfigured() || forceLocal) return createLocalStore();
  const { createSupabaseStore } = await import('./supabase.js');
  return createSupabaseStore({ url: CONFIG.SUPABASE_URL, key: CONFIG.SUPABASE_ANON_KEY });
}
