/**
 * ASTROVERSE SUPABASE AUTHENTICATION, DATABASE & RLS AUTOMATED VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Supabase public config endpoint and secret redaction invariants.
 * 2. Token verification and sync endpoint (POST /api/auth/supabase/sync).
 * 3. Session restoration and unified authentication middleware.
 * 4. User profile creation and idempotency.
 * 5. Strict multi-tenant cross-account isolation (User A vs User B).
 * 6. SQL migration files and RLS policy invariants.
 */

process.env.NODE_ENV = 'test';

import http from 'http';
import fs from 'fs';
import path from 'path';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import { getPublicSupabaseConfig, verifySupabaseToken } from '../src/supabase';

let server: http.Server;
let port: number;
let baseUrl: string;

function makeRequest(
  method: string,
  urlPath: string,
  body: any = null,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      `${baseUrl}${urlPath}`,
      { method, headers: reqHeaders },
      (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch (_) {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

async function runSupabaseAuthTestSuite() {
  console.log('\n===============================================================');
  console.log('ASTROVERSE SUPABASE AUTHENTICATION & DATABASE VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Start ephemeral server
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      port = addr.port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // 1. PUBLIC SUPABASE CONFIG & SECRET LEAK PREVENTION
    // -------------------------------------------------------------------------
    console.log('--- 1. SUPABASE CONFIG & CREDENTIAL REDACTION INVARIANTS ---');
    const configRes = await makeRequest('GET', '/api/auth/supabase/config');
    assert(configRes.status === 200, 'GET /api/auth/supabase/config returns HTTP 200');
    assert(typeof configRes.body.configured === 'boolean', 'Config response has boolean configured property');
    assert(!('supabaseServiceKey' in configRes.body), 'SECURITY INVARIANT: service role key is NEVER exposed');
    assert(!('serviceRole' in configRes.body), 'SECURITY INVARIANT: serviceRole is never exposed');
    assert(!('DATABASE_URL' in configRes.body), 'SECURITY INVARIANT: DATABASE_URL is never exposed');

    // -------------------------------------------------------------------------
    // 2. SUPABASE TOKEN VERIFICATION & SYNC (POST /api/auth/supabase/sync)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. SUPABASE TOKEN VERIFICATION & SESSION SYNC ---');
    const noTokenRes = await makeRequest('POST', '/api/auth/supabase/sync', {});
    assert(noTokenRes.status === 401, 'POST /api/auth/supabase/sync rejects missing token with HTTP 401');

    const invalidTokenRes = await makeRequest('POST', '/api/auth/supabase/sync', { accessToken: 'invalid_forged_token' });
    assert(invalidTokenRes.status === 401, 'POST /api/auth/supabase/sync rejects invalid token with HTTP 401');

    // Authentic token in test mode: Account A
    const supaTokenA = 'test_supabase_token_verified_usera@astroverse.app_aaaa0001-0000-0000-0000-000000000001';
    const syncResA = await makeRequest('POST', '/api/auth/supabase/sync', { accessToken: supaTokenA });
    assert(syncResA.status === 200, 'POST /api/auth/supabase/sync succeeds with verified Supabase token');
    assert(syncResA.body.status === 'AUTHENTICATED', 'Sync response status is AUTHENTICATED');
    assert(syncResA.body.user.email === 'usera@astroverse.app', 'User email correctly synchronized');
    assert(syncResA.body.user.id.startsWith('supa-usr-'), 'User ID derived from Supabase identity');
    const userAId = syncResA.body.user.id;

    // Idempotency: syncing same user again returns existing user record
    const syncResA2 = await makeRequest('POST', '/api/auth/supabase/sync', { accessToken: supaTokenA });
    assert(syncResA2.status === 200, 'Repeated sync is idempotent');
    assert(syncResA2.body.user.id === userAId, 'Repeated sync maintains same persistent user ID');

    // -------------------------------------------------------------------------
    // 3. AUTHENTICATE MIDDLEWARE WITH SUPABASE TOKEN
    // -------------------------------------------------------------------------
    console.log('\n--- 3. UNIFIED AUTHENTICATION MIDDLEWARE WITH SUPABASE JWT ---');
    const meRes = await makeRequest('GET', '/api/user/me', null, {
      'Authorization': `Bearer ${supaTokenA}`
    });
    assert(meRes.status === 200, 'GET /api/user/me accepts Supabase token and returns user details');
    assert(meRes.body.email === 'usera@astroverse.app', 'Authenticated user identity verified');

    // -------------------------------------------------------------------------
    // 4. BIRTH PROFILE CREATION & RETRIEVAL (USER A)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. BIRTH PROFILE PERSISTENCE (USER A) ---');
    const createProfileRes = await makeRequest('POST', '/api/profiles', {
      profileName: 'Aarav Personal Chart',
      relationship: 'Self',
      dateOfBirth: '1995-10-15',
      timeOfBirth: '07:30',
      birthTimeKnown: true,
      birthplaceName: 'Varanasi, India',
      latitude: 25.3176,
      longitude: 82.9739,
      resolvedTimezone: 'Asia/Kolkata'
    }, {
      'Authorization': `Bearer ${supaTokenA}`
    });
    assert(createProfileRes.status === 200, 'POST /api/profiles creates birth profile for Supabase user');
    const profileAId = createProfileRes.body.id;
    assert(profileAId != null, 'Created profile has valid ID');
    assert(createProfileRes.body.userId === userAId, 'Created profile is correctly owned by User A');

    const getProfilesResA = await makeRequest('GET', `/api/profiles/${userAId}`, null, {
      'Authorization': `Bearer ${supaTokenA}`
    });
    assert(getProfilesResA.status === 200, 'User A can retrieve their own birth profiles');
    assert(Array.isArray(getProfilesResA.body) && getProfilesResA.body.length >= 1, 'Profile list contains saved profile');

    // -------------------------------------------------------------------------
    // 5. MULTI-TENANT ISOLATION: USER B CANNOT ACCESS USER A (RLS ENFORCEMENT)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. CROSS-ACCOUNT SECURITY & TENANT ISOLATION ---');
    const supaTokenB = 'test_supabase_token_verified_userb@astroverse.app_bbbb0002-0000-0000-0000-000000000002';
    const syncResB = await makeRequest('POST', '/api/auth/supabase/sync', { accessToken: supaTokenB });
    assert(syncResB.status === 200, 'User B authenticates with independent Supabase identity');
    const userBId = syncResB.body.user.id;
    assert(userBId !== userAId, 'User A and User B have strictly independent IDs');

    // Attack 1: User B attempts to read User A's birth profiles
    const crossReadRes = await makeRequest('GET', `/api/profiles/${userAId}`, null, {
      'Authorization': `Bearer ${supaTokenB}`
    });
    assert(crossReadRes.status === 403, 'User B CANNOT read User A birth profiles (HTTP 403 Forbidden)');

    // Attack 2: User B attempts to delete User A's birth profile
    const crossDeleteRes = await makeRequest('DELETE', `/api/profiles/${profileAId}`, null, {
      'Authorization': `Bearer ${supaTokenB}`
    });
    assert(crossDeleteRes.status === 403, 'User B CANNOT delete User A birth profile (HTTP 403 Forbidden)');

    // Attack 3: User B attempts to read User A's wallet
    const crossWalletRes = await makeRequest('GET', `/api/wallet/${userAId}`, null, {
      'Authorization': `Bearer ${supaTokenB}`
    });
    assert(crossWalletRes.status === 403, 'User B CANNOT inspect User A wallet balance (HTTP 403 Forbidden)');

    // -------------------------------------------------------------------------
    // 6. SQL MIGRATION FILES & INVARIANT CHECK
    // -------------------------------------------------------------------------
    console.log('\n--- 6. SQL MIGRATION SCRIPTS & RLS SPECIFICATION INVARIANTS ---');
    const migrationsDir = path.resolve(__dirname, '..', '..', '..', 'supabase', 'migrations');
    assert(fs.existsSync(migrationsDir), 'supabase/migrations directory exists');

    const masterSqlPath = path.join(migrationsDir, '00_master_astroverse_setup.sql');
    assert(fs.existsSync(masterSqlPath), '00_master_astroverse_setup.sql exists');

    const masterSqlContent = fs.readFileSync(masterSqlPath, 'utf8');
    assert(masterSqlContent.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Migration defines public.profiles table');
    assert(masterSqlContent.includes('REFERENCES auth.users(id) ON DELETE CASCADE'), 'Profile references auth.users(id) with CASCADE');
    assert(masterSqlContent.includes('CREATE TABLE IF NOT EXISTS public.birth_profiles'), 'Migration defines birth_profiles table');
    assert(masterSqlContent.includes('CREATE TABLE IF NOT EXISTS public.prediction_reports'), 'Migration defines prediction_reports table');
    assert(masterSqlContent.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on profiles');
    assert(masterSqlContent.includes('ALTER TABLE public.birth_profiles ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on birth_profiles');
    assert(masterSqlContent.includes('auth.uid() = user_id'), 'RLS policies enforce auth.uid() = user_id');
    assert(masterSqlContent.includes('CREATE TRIGGER on_auth_user_created'), 'Automatic profile trigger attached to auth.users');

    console.log('\n===============================================================');
    console.log('ALL SUPABASE AUTHENTICATION & DATABASE TESTS PASSED (100%)');
    console.log('===============================================================\n');

  } finally {
    server.close();
  }
}

runSupabaseAuthTestSuite().catch(err => {
  console.error('\n[FATAL] Test suite failed:', err);
  process.exit(1);
});
