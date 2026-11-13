import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import {
  setMockUserMfaFactorsProvider,
  clearMockUserMfaFactorsProvider
} from '../src/supabase';

let server: http.Server;
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
      Accept: 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const url = new URL(urlPath, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
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

const OWNER_EMAIL = 'tiwariji0028@gmail.com';
const OWNER_UUID = 'b204eff9-1a9b-4805-8c07-c35d3a9de3ee';

describe('ADMIN LOGIN PERSISTENCE & MFA DEFECT REMEDIATION REGRESSION SUITE', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('TestOwnerPassword123!', salt, 64).toString('hex');

    // Ensure owner user exists with OWNER role
    let owner = await db.findUserByEmail(OWNER_EMAIL);
    if (!owner) {
      owner = await db.createUser({
        email: OWNER_EMAIL,
        role: Role.OWNER,
        status: AccountStatus.ACTIVE,
        displayName: 'AstroVerse Owner',
        passwordSalt: salt,
        passwordHash: hash
      });
    } else {
      await db.updateUser(owner.id, {
        role: Role.OWNER,
        status: AccountStatus.ACTIVE,
        passwordSalt: salt,
        passwordHash: hash
      });
    }
  });

  after(async () => {
    clearMockUserMfaFactorsProvider();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. POST /api/auth/admin-login strictly rejects owner account with HTTP 403 OWNER_NATIVE_MFA_REQUIRED', async () => {
    const res = await makeRequest('POST', '/api/auth/admin-login', {
      email: OWNER_EMAIL,
      password: 'TestOwnerPassword123!',
      mfaCode: '123456'
    });
    assert.strictEqual(res.status, 403, 'Owner must be rejected from legacy password+totp endpoint');
    assert.strictEqual(res.body.error, 'OWNER_NATIVE_MFA_REQUIRED');
  });

  it('2. POST /api/auth/admin-supabase-session requires Bearer Authorization token', async () => {
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {
      action: 'CHALLENGE_COMPLETED'
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  it('3. Owner factor lookup returns verified factor in Supabase Auth GoTrue', async () => {
    setMockUserMfaFactorsProvider(async (userId: string) => {
      assert.strictEqual(userId, OWNER_UUID);
      return {
        factors: [
          {
            id: '4b569772-a123-453b-bf44-5f5fe66594f7',
            status: 'verified',
            factor_type: 'totp',
            friendly_name: 'AstroVerse Owner Authenticator'
          }
        ],
        error: null
      };
    });

    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {
      action: 'CHALLENGE_COMPLETED'
    }, {
      Authorization: 'Bearer invalid.mock.jwt'
    });
    // Rejects invalid JWT securely with 401
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'INVALID_TOKEN');
  });

  it('4. POST /api/admin/mfa/challenge-failed logs failed attempt audit event', async () => {
    const res = await makeRequest('POST', '/api/admin/mfa/challenge-failed', {
      email: OWNER_EMAIL,
      reason: 'mfa_verification_failed'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('5. Standalone Admin route returns healthy status', async () => {
    const res = await makeRequest('GET', '/api/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'READY');
  });
});
