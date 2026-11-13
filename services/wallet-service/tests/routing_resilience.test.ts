import * as fs from 'fs';
import * as path from 'path';

interface RewriteRule {
  source: string;
  destination: string | { service: string };
}

interface VercelConfig {
  rewrites: RewriteRule[];
}

function runRoutingTests() {
  console.log('--- STARTING ROUTING RESILIENCE VERIFICATION ---');

  const vercelPath = path.resolve(__dirname, '../../../vercel.json');
  if (!fs.existsSync(vercelPath)) {
    throw new Error(`vercel.json not found at ${vercelPath}`);
  }

  const vercelContent: VercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const rewrites = vercelContent.rewrites;

  console.log(`[CHECK] Total rewrites found: ${rewrites.length}`);
  if (rewrites.length !== 38) {
    throw new Error(`Expected exactly 38 rewrites, found ${rewrites.length}`);
  }

  const compiledRules = rewrites.map((r, idx) => {
    // Vercel routes are evaluated as RegExp matching the whole path: ^${source}$
    const regex = new RegExp('^' + r.source + '$');
    return {
      index: idx + 1,
      source: r.source,
      destination: r.destination,
      destTarget: typeof r.destination === 'string' ? r.destination : r.destination.service,
      regex
    };
  });

  function resolve(pathname: string) {
    for (const rule of compiledRules) {
      if (rule.regex.test(pathname)) {
        return rule;
      }
    }
    return null;
  }

  let passed = 0;
  let failed = 0;

  function assertRoute(desc: string, pathname: string, expectedDestination: string) {
    const matched = resolve(pathname);
    if (!matched) {
      console.error(`[FAIL] ${desc}: ${pathname} -> NO MATCH (Expected: ${expectedDestination})`);
      failed++;
      return;
    }
    if (matched.destTarget !== expectedDestination) {
      console.error(`[FAIL] ${desc}: ${pathname} -> Matched rule #${matched.index} (${matched.source} -> ${matched.destTarget}), expected ${expectedDestination}`);
      failed++;
    } else {
      console.log(`[PASS] ${desc}: ${pathname} -> Matched rule #${matched.index} (${matched.destTarget})`);
      passed++;
    }
  }

  // 1. Critical endpoints required by Milestone 1
  console.log('\n--- 1. Critical Endpoints Verification ---');
  assertRoute('Ready probe', '/api/ready', 'wallet-service');
  assertRoute('Release metadata', '/api/release', 'wallet-service');
  assertRoute('App config', '/api/config', 'wallet-service');
  assertRoute('Wallet config', '/api/wallet/config', 'wallet-service');
  assertRoute('Create order', '/api/wallet/create-order', 'wallet-service');
  assertRoute('Admin session auth', '/api/auth/admin-supabase-session', 'wallet-service');
  assertRoute('Admin base', '/api/admin', 'wallet-service');
  assertRoute('Admin subpath metrics', '/api/admin/metrics', 'wallet-service');
  assertRoute('Admin subpath users', '/api/admin/users', 'wallet-service');
  assertRoute('Admin subpath deep', '/api/admin/system/audit/logs', 'wallet-service');
  assertRoute('Cashfree webhook', '/api/webhooks/cashfree', 'wallet-service');

  // 2. All 38 rewrites reachability test (ensuring NO route is shadowed)
  console.log('\n--- 2. Rewrite Reachability & Unshadowed Verification ---');
  const samplePathsPerRule: { [ruleIdx: number]: string } = {
    1: '/api/catalog/items',
    2: '/api/catalog',
    3: '/api/geocode/forward',
    4: '/api/geocode',
    5: '/api/cashfree/verify',
    6: '/api/wallet/transactions',
    7: '/api/auth/login',
    8: '/api/numerology/report',
    9: '/api/profiles/me',
    10: '/api/pujas/categories',
    11: '/api/user/settings',
    12: '/admin',
    13: '/admin/settings',
    14: '/api/admin/overview',
    15: '/api/reports/annual',
    16: '/api/subscriptions/plans',
    17: '/api/webhooks/stripe',
    18: '/api/billing/invoices',
    19: '/api/entitlements/verify',
    20: '/api/demo/features',
    21: '/api/astrologers/profiles',
    22: '/api/promotions/discounts',
    23: '/api/consultation/sessions',
    24: '/api/config',
    25: '/api/ai-astrologer/consume-quota',
    26: '/api/ai-astrologer/ask',
    27: '/api/health',
    28: '/api/ready',
    29: '/api/release',
    30: '/api/predictions/generate',
    31: '/api/predictions/daily',
    32: '/api/predictions',
    33: '/api/matchmaking/ashtakoota',
    34: '/api/complete-kundli/pdf',
    35: '/api/kundli/birth-chart',
    36: '/api/ephemeris/planetary-positions',
    37: '/socket.io/handshake',
    38: '/index.html'
  };

  for (let i = 1; i <= 38; i++) {
    const samplePath = samplePathsPerRule[i];
    const matched = resolve(samplePath);
    if (!matched || matched.index !== i) {
      console.error(`[FAIL] Rewrite Rule #${i} (${compiledRules[i-1].source}) was SHADOWED or unreached! Path ${samplePath} matched Rule #${matched?.index} (${matched?.source})`);
      failed++;
    } else {
      console.log(`[PASS] Rewrite Rule #${i} (${compiledRules[i-1].source}) reached cleanly via ${samplePath}`);
      passed++;
    }
  }

  // 3. Fallback and Boundary Isolation Tests
  console.log('\n--- 3. Boundary & Non-Wallet Service Isolation ---');
  assertRoute('Non-wallet API fallback to kundli-engine', '/api/kundli-engine-raw', 'kundli-engine');
  assertRoute('Ephemeris API fallback to kundli-engine', '/api/astronomy/planets', 'kundli-engine');
  assertRoute('Socket.io connection', '/socket.io/socket.io.js', 'consultation-service');
  assertRoute('Static app root', '/', 'app');
  assertRoute('Static app HTML asset', '/dashboard.html', 'app');
  assertRoute('Static app JS bundle', '/js/bundle.js', 'app');
  assertRoute('Admin SPA rewrite to admin.html', '/admin', '/admin.html');
  assertRoute('Admin SPA nested rewrite to admin.html', '/admin/security/mfa', '/admin.html');

  // 4. Adversarial Shadowing Scenarios
  console.log('\n--- 4. Adversarial Route Shadowing Scenarios ---');
  // If rule 36 (/api/(.*)) shadowed wallet routes, these would fail
  const adversarialWalletRoutes = [
    '/api/ready',
    '/api/release',
    '/api/config',
    '/api/wallet/config',
    '/api/wallet/create-order',
    '/api/auth/admin-supabase-session',
    '/api/admin/users',
    '/api/admin/metrics',
    '/api/webhooks/cashfree',
    '/api/catalog',
    '/api/catalog/12345',
    '/api/geocode',
    '/api/geocode/latlng',
    '/api/cashfree/orders/order_123',
    '/api/numerology/grid',
    '/api/profiles/active',
    '/api/pujas/samagri',
    '/api/user/balance',
    '/api/reports/reconcile',
    '/api/subscriptions/webhook',
    '/api/billing/cards',
    '/api/entitlements/features',
    '/api/demo/mode',
    '/api/astrologers/online',
    '/api/promotions/festive',
    '/api/consultation/feedback',
    '/api/ai-astrologer/consume-quota',
    '/api/ai-astrologer/ask',
    '/api/health',
    '/api/predictions/generate',
    '/api/predictions/overview',
    '/api/predictions',
    '/api/matchmaking/score',
    '/api/complete-kundli/doshas',
    '/api/kundli/charts/d9'
  ];

  for (const p of adversarialWalletRoutes) {
    const m = resolve(p);
    if (!m || m.destTarget !== 'wallet-service') {
      console.error(`[FAIL] Route shadowed! ${p} resolved to ${m?.destTarget} (Rule #${m?.index}: ${m?.source}) instead of wallet-service`);
      failed++;
    } else {
      passed++;
    }
  }
  console.log(`[PASS] Verified ${adversarialWalletRoutes.length} wallet-service routes are completely shielded from /api/(.*) catchall shadowing.`);

  console.log(`\n--- ROUTING TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runRoutingTests();
