import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabaseConfig';
import { getAppSetting, setAppSetting } from './database';

let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;
  if (!isSupabaseConfigured()) return null;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

// ─── Auth ─────────────────────────────────────────────────────

export async function signUp(email, password) {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase not configured' };
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, user: data.user };
}

export async function signIn(email, password) {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase not configured' };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, user: data.user };
}

export async function signOut() {
  const client = getSupabase();
  if (!client) return;
  await client.auth.signOut();
  await setAppSetting('supabaseUser', '');
}

export async function getCurrentUser() {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user || null;
}

export async function restoreSession() {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  if (data?.session?.user) {
    await setAppSetting('supabaseUser', data.session.user.email || '');
    return data.session.user;
  }
  return null;
}

// ─── Sync ─────────────────────────────────────────────────────

export async function syncTransactions(localTransactions) {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase not configured' };

  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in' };

  try {
    // Push local unsynced transactions to Supabase
    const unsynced = localTransactions.filter(t => !t.sync_status);
    if (unsynced.length > 0) {
      const payload = unsynced.map(t => ({
        user_id: user.id,
        sync_id: t.sync_id,
        type: t.type,
        amount: t.amount,
        fee: t.fee,
        created_at: t.created_at,
      }));
      const { error } = await client.from('transactions').upsert(payload, { onConflict: 'sync_id' });
      if (error) console.error('Sync push error:', error);
    }

    // Pull latest from Supabase
    const { data: remote, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Sync pull error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, remote: remote || [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function pushTransactionToCloud(transaction) {
  const client = getSupabase();
  if (!client) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  try {
    const { error } = await client.from('transactions').upsert({
      user_id: user.id,
      sync_id: transaction.sync_id,
      type: transaction.type,
      amount: transaction.amount,
      fee: transaction.fee,
      created_at: transaction.created_at,
    }, { onConflict: 'sync_id' });

    if (error) console.error('Push transaction error:', error);
    return !error;
  } catch {
    return false;
  }
}
