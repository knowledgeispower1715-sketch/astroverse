import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

const PORT = parseInt(process.env.TEST_PORT || '8094', 10);

export const mockUsers = [
  {
    id: 'b204eff9-1a9b-4805-8c07-c35d3a9de3ee',
    email: 'tiwariji0028@gmail.com',
    displayName: 'Platform Owner',
    phone: '+919876543210',
    role: 'OWNER',
    status: 'ACTIVE',
    emailVerified: true,
    subscriptionTier: 'PREMIUM',
    walletBalance: 99999.00,
    profilesCount: 12,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: '2026-11-14T10:00:00.000Z'
  },
  {
    id: 'c315f00a-2b0c-4916-9d18-d46e4b0ef4ff',
    email: 'security.admin@astroverse.ai',
    displayName: 'Security Lead',
    phone: '+919876543211',
    role: 'SECURITY_ADMIN',
    status: 'ACTIVE',
    emailVerified: true,
    subscriptionTier: 'PLUS',
    walletBalance: 2500.00,
    profilesCount: 3,
    createdAt: '2026-02-15T12:00:00.000Z',
    lastActiveAt: '2026-11-14T09:30:00.000Z'
  },
  {
    id: 'd426a11b-3c1d-4a27-ae29-e57f5c1f05aa',
    email: 'suspended.user@example.com',
    displayName: 'Suspended Account',
    phone: '+919876543212',
    role: 'USER',
    status: 'SUSPENDED',
    emailVerified: false,
    subscriptionTier: 'FREE',
    walletBalance: 0.00,
    profilesCount: 1,
    createdAt: '2026-05-10T08:00:00.000Z',
    lastActiveAt: '2026-08-01T15:00:00.000Z'
  }
];

export function createTestServer() {
  const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = url.pathname;

    // Health / Ready check
    if (pathname === '/api/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'READY', environment: 'TEST_E2E' }));
    }

    // Gateway status
    if (pathname === '/api/admin/gateway-status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'ONLINE',
        cloudflareAccess: {
          enforced: false,
          teamName: 'astroverse-test',
          audConfigured: false,
          certsUrl: 'not_configured'
        },
        originProtection: 'APPLICATION_LAYER_ONLY'
      }));
    }

    // Session policy
    if (pathname === '/api/admin/session/policy') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        idleTimeoutMinutes: 10,
        absoluteCapMinutes: 60,
        idleTimeoutSeconds: 600,
        absoluteCapSeconds: 3600,
        mfaRequired: true,
        environment: 'development'
      }));
    }

    // Supabase auth config
    if (pathname === '/api/auth/supabase/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        configured: true,
        supabaseUrl: 'https://test-supabase-project.supabase.co',
        supabaseAnonKey: 'mock-anon-key-astroverse-test-suite'
      }));
    }

    // Admin session bridge
    if (pathname === '/api/auth/admin-supabase-session' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(body); } catch (_) {}
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : parsed.accessToken;

        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Supabase access token required.' }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          status: 'AUTHENTICATED',
          sessionToken: 'mock_session_token_256_hash_test_' + Date.now(),
          assuranceToken: 'mock_assurance_token_hmac_sha256_' + Date.now(),
          aal: 'aal2',
          user: {
            id: 'b204eff9-1a9b-4805-8c07-c35d3a9de3ee',
            email: 'tiwariji0028@gmail.com',
            displayName: 'Platform Owner',
            role: 'OWNER',
            status: 'ACTIVE',
            mfaEnabled: true
          },
          sessionPolicy: {
            idleTimeoutMinutes: 10,
            absoluteCapMinutes: 60,
            idleTimeoutSeconds: 600,
            absoluteCapSeconds: 3600,
            mfaRequired: true
          }
        }));
      });
      return;
    }

    // Admin logout
    if (pathname === '/api/auth/admin-logout' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'LOGGED_OUT', message: 'Administrator session terminated.' }));
    }

    // Admin Overview
    if (pathname === '/api/admin/overview') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        provenance: 'LIVE',
        metrics: {
          totalUsers: 1420,
          activeUsers: 1388,
          suspendedUsers: 12,
          totalDeposits: '482500.00',
          consultationDebits: '124900.00',
          totalProfiles: 3410,
          activeSubscriptions: 864,
          activeSessions: 42
        },
        queues: {
          pendingRefunds: 0,
          failedReports: 0,
          expiredSubs: 5,
          suspendedUsers: 12
        }
      }));
    }

    // Admin Users Directory
    if (pathname === '/api/admin/users') {
      const q = (url.searchParams.get('q') || '').toLowerCase().trim();
      const role = url.searchParams.get('role') || 'ALL';
      const status = url.searchParams.get('status') || 'ALL';
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '25', 10);

      let filtered = mockUsers.slice();

      if (q) {
        filtered = filtered.filter(u =>
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.phone.includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      }

      if (role !== 'ALL') {
        filtered = filtered.filter(u => u.role === role);
      }

      if (status !== 'ALL') {
        filtered = filtered.filter(u => u.status === status);
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        total,
        page,
        limit,
        totalPages,
        summary: {
          totalUsers: 1420,
          activeUsers: 1388,
          suspendedUsers: 12,
          unverifiedEmailUsers: 45,
          adminUsers: 7,
          payingUsers: 890,
          paidSubscribers: 864,
          complimentaryUsers: 15,
          usersAwaitingReview: 3,
          expiredSubscribers: 8
        },
        users: paginatedUsers
      }));
    }

    // Consultations endpoint (defect remediation check)
    if (pathname === '/api/admin/consultations') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        consultations: [
          {
            id: 'cons_mock_001',
            userId: 'b204eff9-1a9b-4805-8c07-c35d3a9de3ee',
            status: 'COMPLETED',
            durationSeconds: 1800,
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            endedAt: new Date().toISOString()
          }
        ]
      }));
    }

    // Customer 360 endpoint
    if (pathname.startsWith('/api/admin/customers/') && pathname.endsWith('/360')) {
      const customerId = pathname.replace('/api/admin/customers/', '').replace('/360', '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        customerId,
        profile: mockUsers.find(u => u.id === customerId) || mockUsers[0],
        consultations: [],
        orders: [],
        walletTransactions: []
      }));
    }

    // Static HTML serving for Admin Portal
    let filePath = path.join(rootDir, 'admin.html');
    if (pathname === '/' || pathname === '/index.html') {
      filePath = path.join(rootDir, 'admin.html');
    }

    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(filePath).pipe(res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not Found');
  });

  return server;
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createTestServer();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[E2E Test Server] Running at http://127.0.0.1:${PORT}`);
  });
}
