# 06. API ROUTE & DATABASE SCHEMA ARCHITECTURE MAPPING

**Target Application:** AstroVerse AI  
**Release Target:** Phase 5 — Exhaustive Admin Control Centre Audit & Remediation  
**Database Architecture:** Managed PostgreSQL 15+ (Supabase Managed Cloud) / Local Resilient Data Layer  
**Service Layer:** Express 4.x / TypeScript 5.x / Prisma Client  

---

## 1. Database Model & Endpoint Provenance Matrix

Every administrative API endpoint is mapped to its underlying database entity, query isolation boundary, statement timeout, and canonical provenance classification:

| Module | Route / Endpoint | HTTP | Database Entity / Tables | Isolation & Timeout Policy | Provenance Classification |
|:---|:---|:---:|:---|:---|:---:|
| **01. Overview** | `/api/admin/overview` | `GET` | `User`, `BirthProfile`, `UserSession`, `WalletLedger`, `PlatformIncident` | Independent tx (`statement_timeout = '4000'`) + Auxiliary queries (`timeout = '2000'`) | **LIVE / DERIVED / STALE** |
| **01. Overview** | `/api/admin/metrics` | `GET` | Aggregated platform statistics | Read-only aggregate | **LIVE / DERIVED** |
| **02. Users** | `/api/admin/users` | `GET` | `User`, `Subscription` | Indexed lookup, 50-limit pagination | **LIVE** |
| **02. Users** | `/api/admin/users/:id/status` | `PUT` | `User`, `UserSession` (session eviction), `AuditEvent` | Atomic tx, MFA step-up required | **LIVE** |
| **02. Users** | `/api/admin/users/:id/export` | `GET` | `User`, `BirthProfile`, `WalletLedger`, `SavedReport` | Read-only privileged export (India DPDP Act / GDPR) | **LIVE** |
| **03. Roles** | `/api/admin/roles` | `GET` | `CANONICAL_ADMIN_ROLES`, `ROLE_PERMISSIONS` | In-memory authoritative registry | **LIVE** |
| **03. Roles** | `/api/admin/roles/matrix` | `GET` | `ROLE_PERMISSIONS`, `ADMIN_MODULE_REGISTRY` | In-memory authoritative registry | **LIVE** |
| **03. Roles** | `/api/admin/roles/admins` | `GET` | `User` (where `isAnyAdmin = true`), `UserSession` | Indexed query on `role` | **LIVE** |
| **03. Roles** | `/api/admin/users/:id/role` | `PUT` | `User`, `AuditEvent` | Atomic tx, Last-Owner demotion lock, MFA step-up | **LIVE** |
| **04. Security** | `/api/admin/security/events` | `GET` | `AuditEvent` | Indexed on `action`, `createdAt DESC`, bounded 50/page | **LIVE** |
| **04. Security** | `/api/admin/security/mfa/reset` | `POST` | `User` (`mfaSecret = null`), `AuditEvent` | MFA step-up required, session eviction | **LIVE** |
| **04. Security** | `/api/admin/session/policy` | `GET` | Runtime session policy | In-memory config (10m idle prod / 60m preview) | **LIVE** |
| **05. Astrology**| `/api/admin/astrology/health` | `GET` | Kundli Engine microservice probe | Live HTTP probe (`timeout = '1200'`) | **LIVE** |
| **05. Astrology**| `/api/admin/astrology/verify-calculation`| `POST` | Swiss Ephemeris golden benchmark | Isolated calculation comparator | **LIVE** |
| **06. Reports** | `/api/admin/reports/diagnostics` | `GET` | `SavedReport` | Indexed on `status`, `createdAt DESC` | **LIVE** |
| **06. Reports** | `/api/admin/reports/:id/retry` | `POST` | `SavedReport` | Re-triggers async document pipeline | **LIVE** |
| **07. AI Quotas**| `/api/admin/ai/quotas` | `GET` | `AIQuotaConfig` (persisted JSON / DB) | In-memory + persisted storage | **LIVE** |
| **07. AI Quotas**| `/api/admin/ai/quotas` | `PUT` | `AIQuotaConfig`, `AuditEvent` | MFA step-up required, validated bounds | **LIVE** |
| **08. Payments**| `/api/admin/payments/ledger` | `GET` | `WalletLedger` | Indexed on `userId`, `createdAt DESC`, exact string money | **LIVE / DERIVED** |
| **08. Payments**| `/api/admin/payments/reconcile` | `POST` | `PaymentOrder`, `WalletLedger`, `AuditEvent` | Cashfree API v6 verification, idempotency lock | **LIVE** |
| **09. Subscriptions**| `/api/admin/subscriptions` | `GET` | `Subscription`, `User` | Indexed on `status`, `expiresAt` | **LIVE** |
| **09. Subscriptions**| `/api/admin/subscriptions/assign`| `POST` | `Subscription`, `User`, `AuditEvent` | Atomic tx, entitlement update | **LIVE** |
| **09. Subscriptions**| `/api/admin/subscriptions/extend`| `POST` | `Subscription`, `AuditEvent` | Atomic tx, expiration prolongation | **LIVE** |
| **09. Subscriptions**| `/api/admin/subscriptions/cancel`| `POST` | `Subscription`, `User`, `AuditEvent` | Atomic tx, entitlement deactivation | **LIVE** |
| **10. Content** | `/api/admin/pricing/catalog` | `GET` | `ProductCatalog` | In-memory canonical catalog (10 SKUs) | **LIVE** |
| **10. Content** | `/api/admin/pricing/:sku` | `PUT` | `ProductCatalog`, `AuditEvent` | MFA step-up required, pricing lock | **LIVE** |
| **10. Content** | `/api/admin/content/banners` | `GET` | `ContentBanner` | Filtered on `active`, sorted by priority | **LIVE** |
| **10. Content** | `/api/admin/content/banners` | `POST` | `ContentBanner`, `AuditEvent` | Sanitized markup, role restricted | **LIVE** |
| **11. Settings**| `/api/admin/settings` | `GET` | `PlatformSetting`, `FeatureFlag` | Zero plaintext secrets exposed | **LIVE** |
| **11. Settings**| `/api/admin/settings/flags` | `PUT` | `FeatureFlag`, `AuditEvent` | MFA step-up required | **LIVE** |
| **12. Privacy** | `/api/admin/privacy/requests` | `GET` | `PrivacyRequest` | Indexed on `status`, `createdAt DESC` | **LIVE** |
| **12. Privacy** | `/api/admin/privacy/requests/:id/fulfill`| `PUT` | `PrivacyRequest`, `User`, `AuditEvent` | Atomic tx, MFA step-up required | **LIVE** |
| **13. Audit** | `/api/admin/audit/search` | `GET` | `AuditEvent` | Indexed multi-field query, bounded pagination | **LIVE** |
| **14. Integrations**| `/api/admin/integrations/health`| `GET` | External service probes | Concurrent HTTP probes with bounded timeouts | **LIVE** |
| **15. Incidents**| `/api/admin/incidents` | `GET` | `PlatformIncident` | Indexed on `status`, `severity` | **LIVE** |
| **15. Incidents**| `/api/admin/incidents` | `POST` | `PlatformIncident`, `AuditEvent` | MFA step-up required, broadcast notice | **LIVE** |
| **16. QA Workbenches**| `/api/demo/*` | `POST` | `User` (demo columns only) | Fail-closed guard: BLOCKED in production | **DEMO / SYNTHETIC** |
| **17. Database**| `/api/admin/database/status` | `GET` | `pg_stat_activity`, `pg_stat_user_tables` | Read-only connection diagnostics | **LIVE** |
| **17. Database**| `/api/admin/database/schema-status`| `GET` | `information_schema.tables`, `pg_class` | Read-only catalog, RLS status audit | **LIVE** |
| **18. Analytics**| `/api/admin/analytics/business` | `GET` | `PaymentOrder`, `Subscription`, `SavedReport` | Indexed aggregations | **DERIVED / LIVE** |
| **19. Customer 360**| `/api/admin/customers/:id/360`| `GET` | `User`, `BirthProfile`, `WalletLedger`, `CustomerNote` | Privileged multi-model dossier | **LIVE** |
| **19. Customer 360**| `/api/admin/customers/:id/notes`| `POST` | `CustomerNote`, `AuditEvent` | Staff interaction logging | **LIVE** |
| **20. Entitlements**| `/api/admin/entitlements` | `GET` | `Entitlement` | Indexed on `userId`, `status` | **LIVE** |
| **20. Entitlements**| `/api/admin/entitlements/grant`| `POST` | `Entitlement`, `AuditEvent` | Atomic tx, MFA step-up required | **LIVE** |
| **20. Entitlements**| `/api/admin/entitlements/:id` | `DELETE`| `Entitlement`, `AuditEvent` | Atomic revocation, MFA step-up required | **LIVE** |
| **21. Promotions**| `/api/admin/promotions` | `GET` | `Promotion` | Indexed on `code`, `active` | **LIVE** |
| **21. Promotions**| `/api/admin/promotions` | `POST` | `Promotion`, `AuditEvent` | Unique code constraint, MFA step-up | **LIVE** |
| **21. Promotions**| `/api/admin/promotions/:id/toggle`| `PUT`| `Promotion`, `AuditEvent` | State toggle, MFA step-up | **LIVE** |
| **22. Consultations**| `/api/admin/astrologers` | `GET` | `Astrologer` | Indexed on `status`, `rating DESC` | **LIVE** |
| **22. Consultations**| `/api/admin/consultations/sessions`| `GET`| `ConsultationSession` | Indexed on `status`, `startedAt DESC` | **LIVE** |
| **22. Consultations**| `/api/admin/astrologers/:id` | `PUT` | `Astrologer`, `AuditEvent` | MFA step-up required | **LIVE** |

---

## 2. PostgreSQL Transaction Recovery & Invariant Proofs

1. **Aborted Transaction Recovery (`25P02`):**
   - In interactive PostgreSQL transactions, a statement error poisons all subsequent statements until `ROLLBACK`.
   - `ResilientDatabase` implements `runSavepointProtectedQuery`:
     ```typescript
     await tx.$executeRawUnsafe(`SAVEPOINT ${spName}`);
     try {
       return await queryFn();
     } catch (err) {
       await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${spName}`);
       return fallback;
     }
     ```
   - All optional auxiliary queries execute in separate bounded transactions, preventing single-query failure from aborting sibling operations.

2. **Exact Monetary Precision:**
   - Financial aggregations execute PostgreSQL `to_char(COALESCE(sum("amount"), 0), 'FM999999999990.00')`.
   - Preserves arbitrary precision `NUMERIC(12, 2)` across JSON serialization without binary IEEE 754 floating-point conversion.

3. **Data Protection & Secret Redaction:**
   - Database connection URLs, passwords, Supabase pooler hostnames (`aws-0-ap-south-1.pooler.supabase.com`), and SQL query strings are strictly redacted from client HTTP payloads.
   - All client error responses return generic messages and stable error codes (`DATABASE_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`) with unique correlation IDs (`cid_...`).
