# AstroVerse Admin Control Centre — End-to-End Test Infrastructure Specification

**Document Version:** 1.0.0  
**Effective Baseline Commit:** `9a17d704806033a1982648e1dfddee661932f25e`  
**Test Suite Path:** `e:\rea\tests\e2e\admin\`  
**Configuration Path:** `e:\rea\tests\e2e\playwright.config.ts`  
**Target Environments:** Local Dev Server (`http://127.0.0.1:8094`), Vercel Preview & Production (`https://astroverse-eta.vercel.app`)

---

## 1. Test Philosophy & Engineering Principles

The AstroVerse Admin Control Centre end-to-end (E2E) testing framework is constructed upon three non-negotiable architectural tenets:

1. **Opaque-Box Requirement-Driven Verification**:
   The test runner exercises the deployed application purely through realistic browser automation, network request flows, and standard DOM locators. Tests never rely on implementation-private state or internal compiler artifacts; assertions mirror the exact user-perceptible outcomes and security boundaries declared in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and system contracts.

2. **Strict Cryptographic and Storage Boundary Isolation**:
   Every test rigorously validates storage partition invariants:
   - Administrative session tokens (`astro_admin_session_token`, `astro_admin_user`, `astro_admin_assurance`) must be isolated strictly to `sessionStorage` and destroyed upon browser tab closure or explicit signout.
   - Zero administrative state is permitted to leak into `localStorage` (which is reserved exclusively for unprivileged consumer interactions).
   - Sensitive mutation requests require valid HMAC-SHA256 assurance tokens (`x-admin-assurance-token`), failing closed with HTTP 428 `MFA_ASSURANCE_REQUIRED` when absent.

3. **Deterministic Hermetic Execution & Dual-Mode Flexibility**:
   The suite is engineered to run in two distinct operational modes without changing test code:
   - **Local Isolated Harness Mode**: A high-speed, zero-dependency Node test server (`tests/e2e/admin/fixtures/test_server.mjs`) automatically spins up on port 8094 to serve the byte-identical `admin.html` SPA and mock server endpoints (`/api/admin/*`, `/api/auth/*`), allowing instantaneous local validation without external network or database dependencies.
   - **Preview / Production Live Mode**: Setting `BASE_URL=https://astroverse-eta.vercel.app` (or any Vercel preview deployment URL) directs Playwright to execute the identical test suites against live cloud endpoints.

---

## 2. 4-Tier Testing Methodology

The test suite is structured into four progressive tiers of increasing complexity and integration:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Tier 4: Real-World Scenarios & Viewports                 │
│       (Multi-device responsive checks, mobile drawer, DOM hygiene)     │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 3: Cross-Feature Integration Flows                  │
│       (Full auth lifecycle, reload persistence, multi-tab invalidation)│
├────────────────────────────────────────────────────────────────────────┤
│               Tier 2: Boundary & Corner Cases                          │
│       (Invalid credentials, empty TOTP, session cap, storage hygiene)  │
├────────────────────────────────────────────────────────────────────────┤
│               Tier 1: Feature Coverage (Happy Path)                    │
│       (Login render, MFA challenge, Dashboard KPIs, User Directory)    │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (Happy Path & Completeness)
Covers individual module functional contracts in isolation:
- Unauthenticated landing page mounting `#view-admin-login`.
- Email/password form controls and visual toggle state.
- Dedicated 2FA challenge view rendering with 6-digit pattern enforcement.
- First-time MFA setup view with QR container, manual secret copy, and activation.
- Global header rendering authenticated owner identity and role pill.
- Ground truth KPI metric cards populating authoritative row counts and financial values.
- User Directory table rendering, role/status filter dropdowns, and sorting.
- Gateway status and session policy public endpoints.

### Tier 2: Boundary & Corner Cases
Probes edge conditions, input limits, and failure handling:
- Malformed email strings and missing required form values (HTML5 constraint validation).
- Invalid 6-digit TOTP format rejection and user-friendly error banners.
- Absolute session lifetime limits (60m cap) and inactivity timeouts (10m idle).
- LocalStorage anti-tampering: injection of spoofed admin tokens is immediately detected and purged.
- Pagination zero-state handling and special-character search queries.

### Tier 3: Cross-Feature Integration Flows
Exercises multi-step end-to-end user journeys:
- Complete authentication handoff: Login -> 2FA Challenge -> AAL2 Elevation -> Session Issuance -> Dashboard Mount -> User Inspection -> Explicit Sign Out.
- Reload session retention: Valid `sessionStorage` preserves authenticated dashboard state across hard page refreshes without re-prompting for credentials.
- Pinned navigation workflows: Seamless switching between Overview, Users, Roles, Payments, and Database modules.

### Tier 4: Real-World Scenarios & Resiliency
Simulates production client conditions:
- **Responsive Viewport Matrix**:
  - Desktop (1920x1080): High-resolution command center with expanded sidebar.
  - Tablet (768x1024): Adaptive 1-column layout with horizontal scroll containment.
  - Mobile (375x812): Collapsed mobile sidebar toggle button (`#btn-admin-sidebar-toggle`) and backdrop dismissal.
- **DOM Hygiene & Overlay Integrity**:
  - Verification that `#view-admin-mfa-challenge` and `#view-admin-mfa-enrollment` are strictly hidden when the dashboard is active.

---

## 3. Test Architecture & Runner Instructions

### Test Suite Directory Layout

```
e:\rea\tests\e2e\
├── playwright.config.ts                      # Playwright test runner configuration
├── package.json                              # Isolated dependencies (@playwright/test)
├── admin\
│   ├── fixtures\
│   │   ├── admin_auth_helpers.ts             # Reusable session injection & storage helpers
│   │   ├── admin_mock_data.ts                # Authoritative user & KPI fixtures
│   │   └── test_server.mjs                   # Standalone HTTP test server fixture
│   ├── 01_admin_login_rendering.spec.ts      # 7 test cases (Login form, inputs, notices)
│   ├── 02_mfa_challenge_and_credential_handling.spec.ts # 5 test cases (TOTP inputs, cancel, enroll)
│   ├── 03_session_persistence_and_reloads.spec.ts       # 5 test cases (Storage, reload, auto-lock)
│   ├── 04_overview_dashboard_kpis.spec.ts               # 5 test cases (Header, KPIs, command center)
│   ├── 05_user_directory_search_pagination.spec.ts     # 6 test cases (Filters, table, search, pages)
│   ├── 06_gateway_status_and_session_policies.spec.ts   # 5 test cases (Gateway API, policy, drawer)
│   ├── 07_session_logout_and_revocation.spec.ts         # 4 test cases (Sign out, clear storage, back guard)
│   └── 08_cross_feature_and_viewports.spec.ts           # 5 test cases (E2E lifecycle, viewports, DOM hygiene)
```

### Execution Commands

#### 1. Run Complete Admin E2E Test Suite (Local Mode)
Executes all 42 test cases using the automated background test server:
```powershell
npx --prefix tests/e2e playwright test -c tests/e2e/playwright.config.ts
```

#### 2. Run Tests Against Vercel Preview or Production
```powershell
$env:BASE_URL="https://astroverse-eta.vercel.app"
npx --prefix tests/e2e playwright test -c tests/e2e/playwright.config.ts
Remove-Item env:BASE_URL
```

#### 3. Run Specific Focused Test Suites
```powershell
# Run Authentication & Login tests only
npx --prefix tests/e2e playwright test -c tests/e2e/playwright.config.ts admin/01_admin_login_rendering.spec.ts

# Run Session Persistence tests only
npx --prefix tests/e2e playwright test -c tests/e2e/playwright.config.ts admin/03_session_persistence_and_reloads.spec.ts

# Run Cross-Feature & Viewport tests only
npx --prefix tests/e2e playwright test -c tests/e2e/playwright.config.ts admin/08_cross_feature_and_viewports.spec.ts
```

#### 4. Run in Headed Mode for Visual Debugging
```powershell
npx --prefix tests/e2e playwright test -c tests/e2e/playwright.config.ts --headed
```

---

## 4. Feature Inventory Coverage Mapping

| Test Spec File | Feature Domain | Test Cases | Acceptance Criteria Mapped | Status |
|----------------|----------------|------------|----------------------------|--------|
| `01_admin_login_rendering.spec.ts` | Authentication Ingress | TC-E2E-LOGIN-001 to 007 (7 tests) | R1: Login page rendering, form inputs, branding, security notice | **PASS** |
| `02_mfa_challenge_and_credential_handling.spec.ts` | 2FA / MFA Security | TC-E2E-MFA-001 to 005 (5 tests) | R1: TOTP challenge, 6-digit input, error display, enrollment | **PASS** |
| `03_session_persistence_and_reloads.spec.ts` | Session Lifecycle | TC-E2E-SESS-001 to 005 (5 tests) | R1: sessionStorage isolation, anti-leakage, reload persistence | **PASS** |
| `04_overview_dashboard_kpis.spec.ts` | Dashboard & Analytics | TC-E2E-OVER-001 to 005 (5 tests) | R3: Overview KPIs, live provenance badges, command center | **PASS** |
| `05_user_directory_search_pagination.spec.ts` | User Governance | TC-E2E-USER-001 to 006 (6 tests) | R3: User table, search filter, role/status dropdowns, paging | **PASS** |
| `06_gateway_status_and_session_policies.spec.ts` | Gateway & Policies | TC-E2E-GATEWAY-001 to 005 (5 tests) | R1, R3: Gateway status, origin protection, session policy | **PASS** |
| `07_session_logout_and_revocation.spec.ts` | Session Invalidation | TC-E2E-LOGOUT-001 to 004 (4 tests) | R1: Explicit signout, storage destruction, back-button guard | **PASS** |
| `08_cross_feature_and_viewports.spec.ts` | Viewports & DOM Hygiene | TC-E2E-CROSS-001, VIEW-001 to 003, DOM-001 (5 tests) | R3, R4: E2E lifecycle, responsive viewports, DOM hygiene fix | **PASS** |
| **TOTAL** | **Full Admin Control Centre** | **42 Test Cases** | **100% of Mandated R1-R4 E2E Requirements** | **42 / 42 PASS (100%)** |
