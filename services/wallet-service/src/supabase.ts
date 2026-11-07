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
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  const supabaseServiceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
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

export interface VerifiedSupabaseAuthResult {
  user: any | null;
  aal?: 'aal1' | 'aal2';
  amr?: Array<{ method: string; timestamp: number }>;
  claims?: any;
  error: string | null;
}

export function decodeSupabaseJwtClaims(token: string): { aal?: 'aal1' | 'aal2'; amr?: Array<{ method: string; timestamp: number }>; exp?: number; sub?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return {
      aal: payload.aal,
      amr: payload.amr,
      exp: payload.exp,
      sub: payload.sub,
      email: payload.email
    };
  } catch {
    return null;
  }
}

/**
 * Lists all MFA factors for a user using Supabase Admin API.
 */
export async function getUserMfaFactors(userId: string): Promise<{ factors: any[]; error: string | null }> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { factors: [], error: 'SUPABASE_NOT_CONFIGURED' };
  }
  try {
    const { data, error } = await client.auth.admin.mfa.listFactors({ userId });
    if (error) {
      return { factors: [], error: error.message };
    }
    return { factors: data.factors || [], error: null };
  } catch (err: any) {
    return { factors: [], error: err.message || 'FAILED_TO_LIST_MFA_FACTORS' };
  }
}

/**
 * Deletes an MFA factor for a user using Supabase Admin API.
 */
export async function deleteUserMfaFactor(userId: string, factorId: string): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { success: false, error: 'SUPABASE_NOT_CONFIGURED' };
  }
  try {
    const { data, error } = await client.auth.admin.mfa.deleteFactor({ userId, id: factorId });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'FAILED_TO_DELETE_MFA_FACTOR' };
  }
}

/**
 * Cryptographically verifies a Supabase access token (JWT) and retrieves user details & AAL claims.
 */
export async function verifySupabaseToken(token: string): Promise<VerifiedSupabaseAuthResult> {
  if (!token || typeof token !== 'string') {
    return { user: null, error: 'TOKEN_REQUIRED' };
  }

  // If running in synthetic test mode with mock test tokens
  if (process.env.NODE_ENV === 'test' && token.startsWith('test_supabase_token_')) {
    const parts = token.split('_');
    const email = parts[4] || 'supabase.user@example.com';
    const uid = parts[5] || '12345678-0000-0000-0000-000000000001';
    const aal = token.includes('_aal2') ? 'aal2' : 'aal1';
    return {
      user: {
        id: 'supa-usr-' + uid,
        email,
        user_metadata: {
          displayName: 'Supabase Verified User'
        }
      },
      aal,
      amr: aal === 'aal2' ? [{ method: 'password', timestamp: Date.now() }, { method: 'totp', timestamp: Date.now() }] : [{ method: 'password', timestamp: Date.now() }],
      error: null
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return { user: null, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data || !data.user) {
      return { user: null, error: error?.message || 'INVALID_SUPABASE_TOKEN' };
    }
    const claims = decodeSupabaseJwtClaims(token);
    return {
      user: data.user,
      aal: claims?.aal || 'aal1',
      amr: claims?.amr || [],
      claims,
      error: null
    };
  } catch (err: any) {
    return { user: null, error: err?.message || 'SUPABASE_VERIFICATION_FAILED' };
  }
}
