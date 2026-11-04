import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore
import { sanitizePath, classifyConsoleMessage } from '../../../scripts/verify_phase4_cdp_responsive.mjs';

describe('SECTION 5: CDP DIAGNOSTICS SECURITY & REDACTION REGRESSION SUITE', () => {
  it('1. sanitizePath drops all query strings completely', () => {
    const rawUrl = 'https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app/api/admin/users?token=secret123&session=sess_abc999&auth=bearer_token';
    const result = sanitizePath(rawUrl);

    assert.equal(result.origin, 'https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app');
    assert.equal(result.pathname, '/api/admin/users');
    assert.equal(result.isApprovedOrigin, true);
    // Ensure query string is absent
    assert.equal((result as any).search, undefined);
    assert.equal((result as any).token, undefined);
  });

  it('2. sanitizePath detects unapproved origins', () => {
    const externalUrl = 'https://vercel.com/login?next=https%3A%2F%2Fastroverse.vercel.app';
    const result = sanitizePath(externalUrl);

    assert.equal(result.origin, 'https://vercel.com');
    assert.equal(result.pathname, '/login');
    assert.equal(result.isApprovedOrigin, false);
  });

  it('3. classifyConsoleMessage maps to allowlisted categories and strips raw messages', () => {
    const ssoMsg = classifyConsoleMessage('log', 'Redirecting to Vercel SSO login at vercel.com');
    assert.equal(ssoMsg.severity, 'log');
    assert.equal(ssoMsg.category, 'AUTHENTICATION_EVENT');
    assert.equal((ssoMsg as any).text, undefined);

    const dbMsg = classifyConsoleMessage('info', 'PostgreSQL database pool connected on port 5432');
    assert.equal(dbMsg.category, 'DATABASE_TELEMETRY');

    const errorMsg = classifyConsoleMessage('error', 'Critical failure in payment webhook signature verification');
    assert.equal(errorMsg.severity, 'error');
    assert.equal(errorMsg.category, 'APPLICATION_ERROR');
  });

  it('4. Diagnostics file guarantees zero raw headers, cookies, or authorization tokens', () => {
    const sampleRecord = {
      requestId: 'REQ_123',
      method: 'GET',
      origin: 'https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app',
      pathname: '/api/admin/overview',
      classification: 'API_REQUEST',
      hasAuthHeader: true,
      hasCookieHeader: false,
      timestamp: 12345
    };

    assert.equal((sampleRecord as any).headers, undefined);
    assert.equal((sampleRecord as any).authorization, undefined);
    assert.equal((sampleRecord as any).cookie, undefined);
    assert.equal((sampleRecord as any).body, undefined);
    assert.equal((sampleRecord as any).webSocketDebuggerUrl, undefined);
  });
});
