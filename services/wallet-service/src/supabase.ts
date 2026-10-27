import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  isConfigured: boolean;
  hasServiceRole: boolean;
}

let cachedAdminClient: SupabaseClient | null = null;
let cachedAnonClient: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim().replace(/\/+$/, '');

  const supabaseAnonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const supabaseServiceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  ).trim();

  const isConfigured = Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceKey));
  const hasServiceRole = Boolean(supabaseServiceKey);

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey: supabaseServiceKey || undefined,
    isConfigured,
    hasServiceRole
  };
}

/**
 * Returns public-facing Supabase config safe for browser client consumption.
 * SECURITY INVARIANT: NEVER exposes service role key or internal credentials.
 */
export function getPublicSupabaseConfig() {
  const config = getSupabaseConfig();
  return {
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    configured: Boolean(config.supabaseUrl && config.supabaseAnonKey)
  };
}

/**
 * Returns an administrative Supabase client using Service Role Key if available,
 * or Anon Key as fallback.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  const keyToUse = config.supabaseServiceKey || config.supabaseAnonKey;
  if (!keyToUse) return null;

  if (cachedAdminClient) return cachedAdminClient;

  cachedAdminClient = createClient(config.supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedAdminClient;
}

/**
 * Cryptographically verifies a Supabase access token (JWT) and retrieves user details.
 */
export async function verifySupabaseToken(token: string): Promise<{ user: any | null; error: string | null }> {
  if (!token || typeof token !== 'string') {
    return { user: null, error: 'TOKEN_REQUIRED' };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    // If running in synthetic test mode without live Supabase cloud
    if (process.env.NODE_ENV === 'test' && token.startsWith('test_supabase_token_')) {
      const parts = token.split('_');
      const email = parts[4] || 'supabase.user@example.com';
      const uid = parts[5] || '12345678-0000-0000-0000-000000000001';
      return {
        user: {
          id: 'supa-usr-' + uid,
          email,
          user_metadata: {
            displayName: 'Supabase Verified User'
          }
        },
        error: null
      };
    }
    return { user: null, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data || !data.user) {
      return { user: null, error: error?.message || 'INVALID_SUPABASE_TOKEN' };
    }
    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'SUPABASE_VERIFICATION_FAILED' };
  }
}
