# 02 — PRODUCTION BASELINE & READ-ONLY VERIFICATION

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**
**Environment:** Production (`https://astroverse-eta.vercel.app/` & Supabase `nzeutydhfxhjufacqren`)  
**Mode:** STRICTLY READ-ONLY (Zero Mutations / Zero DDL / Zero Customer State Alterations)  
**Evaluation Date:** 2026-11-05T13:25:00Z  

---

## 1. Production Endpoint Diagnostics [PRODUCTION_READ_ONLY]

Direct HTTP probe executed against live production origin `https://astroverse-eta.vercel.app/`:

### A. Health Endpoint (`GET /api/health`)
```json
{
  "status": "ONLINE",
  "service": "astroverse-wallet-auth-gateway",
  "version": "2.5.0",
  "persistence": {
    "durable": true,
    "isDurable": true,
    "mode": "POSTGRES_PRISMA",
    "databaseConfigured": true,
    "connected": true,
    "isProduction": true,
    "isPreview": false,
    "supabaseConnected": true
  },
  "guestModeAvailable": true,
  "timestamp": "2026-11-05T07:54:37.510Z"
}
```
- **Durability Strategy:** PostgreSQL via Prisma connection pooler (`POSTGRES_PRISMA`).
- **Connection Health:** `connected: true`, `supabaseConnected: true`.
- **Runtime Environment:** `isProduction: true`, `isPreview: false`.

### B. Release Identity (`GET /api/release`)
```json
{
  "application": "astroverse-ai",
  "version": "2.5.0",
  "gitCommitSha": "296b759fcbcaad33713e32df17d94a7f8664c1e0",
  "buildTimestamp": "2026-11-04T18:50:00Z",
  "environmentLabel": "production",
  "schemaVersion": "20261104_07"
}
```
- **Deployed Commit:** `296b759fcbcaad33713e32df17d94a7f8664c1e0` (Vercel deployment `FnCztNEanKtvjpVJGBbftCR7YCzR`).
- **Active Schema:** `20261104_07` (Migration 07 hardened).

### C. Supabase Configuration (`GET /api/auth/supabase/config`)
```json
{
  "supabaseUrl": "https://nzeutydhfxhjufacqren.supabase.co",
  "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56ZXV0eWRoZnhoanVmYWNxcmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMDU1MDksImV4cCI6MjEwODY4MTUwOX0.Axi-SSu3rOUzRpAQcLZq0MPpgdJC97BCckMPQpA0dys",
  "configured": true
}
```
- **Credential Hygiene:** Zero service role keys, zero database credentials, zero JWT signing secrets leaked.
- **Reference ID:** Matches production Supabase tenant `nzeutydhfxhjufacqren`.

### D. Server Readiness (`GET /api/ready`)
```json
{
  "status": "READY",
  "persistence": "POSTGRES_PRISMA",
  "guestModeAvailable": true,
  "supabaseConnected": true
}
```

### E. Client Security Config (`GET /api/config`)
```json
{
  "status": "CONFIG_READY",
  "paymentsConfigured": false,
  "readinessState": "ENVIRONMENT_MISMATCH",
  "readinessMessage": "Online payment gateway configuration mismatch. Please contact support.",
  "currency": "INR",
  "gateway": "CASHFREE",
  "isLiveGateway": false,
  "cashfreeAppIdMasked": "1496...6941",
  "cashfreeEnv": "sandbox"
}
```
- **Fail-Closed Protection:** Because the client configuration detects sandbox credentials in production environment, `paymentsConfigured` safely reports `false`, preventing unverified production customer transactions.

---

## 2. Production Database Inventory & Row Count Baseline [PRODUCTION_READ_ONLY]

Empirical census performed via authenticated service role query against Supabase PostgreSQL:

| Table / View Name | Classification | Row Count | Primary Key | RLS Status | Verified Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`User`** | Core Identity | **13** | `id (VARCHAR)` | **ENABLED** | Multi-auth identities, roles, wallet balances |
| **`UserSession`** | Session Security | **57** | `id (VARCHAR)` | **ENABLED** | 256-bit SHA-256 session tokens with TTL |
| **`BirthProfile`** | Sensitive Astrology | **4** | `id (VARCHAR)` | **ENABLED** | Encrypted birth coordinates, UTC timestamps |
| **`SavedReport`** | Customer Artifacts | **0** | `id (VARCHAR)` | **ENABLED** | Multi-horizon Jyotish prediction reports |
| **`PaymentOrder`** | Financial Ledger | **21** | `id (VARCHAR)` | **ENABLED** | Cashfree PG orders, idempotency tracking |
| **`WalletLedger`** | Financial Accounting | **3** | `id (VARCHAR)` | **ENABLED** | Integer-paise double-entry append-only transactions |
| **`AuditEvent`** | Security Governance | **256** | `id (VARCHAR)` | **ENABLED** | Non-repudiation administrative & auth audit log |
| **`PlatformIncident`**| Reliability Logs | **0** | `id (VARCHAR)` | **ENABLED** | Production incidents and outage forensics |
| **`FeatureFlag`** | Dynamic Routing | **0** | `key (VARCHAR)`| **ENABLED** | Monetization & feature entitlement flags |
| **`PrivacyRequest`** | DPDP Act / Compliance | **0** | `id (VARCHAR)`| **ENABLED** | Data erasure, export & rectification tracking |
| **`KundliCalculation`**| Ephemeris Cache | **0** | `id (VARCHAR)`| **ENABLED** | Ephemeris calculations & Planetary longitudes |
| **`Astrologer`** | Marketplace / Staff | **0** | `id (VARCHAR)` | **ENABLED** | Astrologer credentials, ratings, per-minute rates |
| **`ConsultationSession`**| Telephony / Realtime | **0** | `id (VARCHAR)` | **ENABLED** | Billing durations, room IDs, recording refs |
| **`PujaBooking`** | Commercial Services | **0** | `id (VARCHAR)` | **ENABLED** | Puja reservations, gotra & priest assignments |
| **`Promotion`** | Marketing Engine | **0** | `id (VARCHAR)` | **ENABLED** | Discount promo codes, validity & usage limits |
| **`CustomerNote`** | CRM / Administration | **0** | `id (VARCHAR)` | **ENABLED** | Staff notes and customer support correspondence |
| **`Entitlement`** | Access Control | **0** | `id (VARCHAR)` | **ENABLED** | Subscription tiers, report tokens, grants |
| **`CustomerProfileView`**| Aggregated View | **13 (Protected)**| N/A | **REVOKED** | Hardened view: Anonymous access returns `HTTP 401` |

---

## 3. Storage Security & Bucket Isolation Baseline [PRODUCTION_READ_ONLY]

Supabase Storage API probe confirmed 3 buckets configured with owner-isolated policies:

1. **`kundli-reports`**:
   - Accessibility: **PRIVATE**
   - File Size Limit: **15 MB**
   - Allowed MIME: `application/pdf`, `image/png`
   - Authorization: RLS enforced; anonymous listing returns empty `[]`.
2. **`customer-documents`**:
   - Accessibility: **PRIVATE**
   - File Size Limit: **10 MB**
   - Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`
   - Authorization: Strict owner isolation via `auth.uid() = (storage.foldername(name))[1]`.
3. **`avatars`**:
   - Accessibility: **PUBLIC**
   - File Size Limit: **2 MB**
   - Allowed MIME: `image/*`
   - Authorization: Public read; write restricted to authenticated profile owners.

---

## 4. Production Read-Only Invariant Certification

- **Zero Mutations Performed:** No DDL or DML statements were executed against production database tables.
- **Zero Customer State Alteration:** The 13 production users, 57 sessions, 21 payment orders, and 3 ledger entries remain untouched and identical to pre-audit state.
- **Zero Financial Disruption:** No live payments or live refunds were processed against production payment gateways.
