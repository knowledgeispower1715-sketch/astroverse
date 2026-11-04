# OWNER CONTROL CENTRE SECURITY & GOVERNANCE AUDIT

**Target:** Enterprise Operational Features of AstroVerse Owner Control Centre  
**Frontend Components:** `admin.html`, Modals, Drawers, Quick Access Bar  
**Security Governance:** Multi-Factor Step-Up, Least Privilege, Inactivity Enforcement, Safe Telemetry

---

## 1. Operational Command Center Features

| Feature Component | DOM Identifier | Purpose | Security Controls | Status |
|---|---|---|---|---|
| **Six Operational Cards** | `.admin-command-card` | Pending refunds, failed reports, active incidents, privacy requests, DB status, system load | Role-filtered metrics; zero plain text credential exposure | **PASS** |
| **Global Prefix Search** | `#admin-global-search` | Entity lookup: `usr:`, `ord:`, `rep:`, `inc:`, `ast:`, `set:` | Sanitized query string; rejects SQL/script injection | **PASS** |
| **Saved Views** | `#admin-saved-views-select` | Preset filters for user, order, and audit views | Stored in client state without tampering backend filters | **PASS** |
| **Quick Access Favorites**| `#admin-quick-access-bar` | One-click navigation to frequently used admin modules | Client-side navigation routing; verifies user RBAC | **PASS** |
| **Administrative Task Queue**| `#modal-admin-task-queue` | Unified pending operations queue across all 22 modules | Server-side count aggregates; requires action authorization | **PASS** |
| **High-Risk Confirmation** | `#modal-admin-high-risk-action`| Intercepts destructive actions (suspend, role, refund, purge)| Step-up MFA, mandatory reason, scope preview, audit logging | **PASS** |
| **Admin Session Centre** | `#modal-admin-session-centre` | Session inspection and inactivity timeout management | Server-enforced expiry, token revocation, IP tracking | **PASS** |
| **Diagnostics Drawer** | `#admin-diagnostics-drawer` | Live API error and telemetry troubleshooting | Redacts auth headers, tokens, cookies, passwords, and PII | **PASS** |

---

## 2. High-Risk Action Guardrails

Every high-risk action (account suspension, role promotion/demotion, refund issuance, entitlement modification, data erasure) enforces the following 7-point gate:
1. **RBAC Authorization:** Evaluates caller's role against `ROLE_PERMISSIONS` matrix on server.
2. **Step-Up MFA Token:** Caller must submit `X-Admin-Assurance-Token` issued within the last 15 minutes.
3. **Mandatory Business Reason:** Submits `X-Admin-Reason` header (min length 10 characters).
4. **Target Identity Confirmation:** Exact target ID is presented to user and validated on server.
5. **Explicit Impact Scope:** Displays precise consequence (e.g. "Terminates active sessions and blocks purchases").
6. **Server-Side Validation:** Server rejects operation if reason is missing or assurance token is expired.
7. **Immutable Audit Event:** Logs `AuditEvent` with `actorId`, `targetId`, `action`, `reason`, and IP.

---

## 3. Administrative Session Lifecycle & Inactivity Governance

- **Inactivity Timeout Policy:**
  - Production: Strictly 10 minutes (`SESSION_INACTIVITY_LIMIT_MS = 600000`).
  - Preview: 60 minutes only when `VERCEL_ENV === 'preview'` is explicitly configured.
- **Absolute Session Maximum:** 4 hours (`ABSOLUTE_SESSION_LIMIT_MS = 14400000`).
- **MFA Assurance Token TTL:** 15 minutes (`MFA_ASSURANCE_EXPIRY_MS = 900000`).
- **Immediate Invalidation:** Calling `/api/admin/users/:id/revoke-sessions` evicts sessions immediately from PostgreSQL `UserSession` table and memory cache. Subsequent requests return HTTP 401 `UNAUTHORIZED`.
- **`pagehide` Beacon Audit:** Beacon event sends `/api/admin/session/pagehide` targeting ONLY the current browser tab's session ID. It never revokes other active administrative sessions.
- **Zero Synthetic Heartbeats:** No artificial background heartbeats are injected to keep unattended sessions alive.

---

## 4. Diagnostics & Troubleshooting Drawer Privacy

The drawer captures:
- Request ID (`req.headers['x-request-id']` or generated UUID)
- Safe endpoint path (e.g. `/api/admin/reports/diagnostics`)
- HTTP Status Code & Duration (ms)
- Error Classification (e.g. `UPSTREAM_TIMEOUT`, `INVALID_INPUT`)
- Safe remediation suggestion

The drawer strictly redacts:
- Authorization Bearer tokens
- Cookie headers
- Passwords and reset codes
- OTP verification codes
- Full payment payloads and Cashfree secrets
- Customer PII
