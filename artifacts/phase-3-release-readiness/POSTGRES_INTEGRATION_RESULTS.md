# POSTGRESQL INTEGRATION & FAIL-CLOSED ARCHITECTURE AUDIT

## ASTROVERSE DATABASE RELIABILITY & RESILIENCE CERTIFICATION

**Database Engine:** PostgreSQL 15+ / Supabase Managed PostgreSQL  
**ORM / Data Access Layer:** Prisma Client v5.11.0 + Raw Parametrized SQL ($queryRaw)  
**Fail-Closed Invariant:** Zero synthetic mock data returned when PostgreSQL connection fails.  

---

## 1. APPLICATION TABLES & SCHEMA INVENTORY

The AstroVerse database architecture consists of 19 production application tables:

| Table Name | Primary Key | Critical Indexes | RLS Policy Enforced | Failure Model |
|---|---|---|---|---|
| `User` | UUID (`id`) | `email`, `phone`, `role`, `status` | Yes | FAIL_CLOSED |
| `UserSession` | UUID (`id`) | `userId`, `token`, `expiresAt` | Yes | FAIL_CLOSED |
| `AuditEvent` | UUID (`id`) | `userId`, `actorId`, `action`, `createdAt`, `requestId` | Yes (Append-only) | FAIL_CLOSED |
| `SavedReport` | UUID (`id`) | `userId`, `reportType`, `createdAt` | Yes | FAIL_CLOSED |
| `BirthProfile` | UUID (`id`) | `userId`, `isDefault`, `createdAt` | Yes | FAIL_CLOSED |
| `KundliCalculation` | UUID (`id`) | `userId`, `cacheKey`, `createdAt` | Yes | RESILIENT |
| `Astrologer` | UUID (`id`) | `specialties`, `status`, `rating` | Yes | RESILIENT |
| `ConsultationSession` | UUID (`id`) | `userId`, `astrologerId`, `status` | Yes | FAIL_CLOSED |
| `ConsultationMessage` | UUID (`id`) | `sessionId`, `createdAt` | Yes | FAIL_CLOSED |
| `PaymentOrder` | UUID (`id`) | `userId`, `providerOrderId`, `status`, `createdAt` | Yes | FAIL_CLOSED |
| `WalletLedger` | UUID (`id`) | `userId`, `idempotencyKey`, `createdAt` | Yes (Immutable) | FAIL_CLOSED |
| `PujaBooking` | UUID (`id`) | `userId`, `bookingDate`, `status` | Yes | FAIL_CLOSED |
| `FeatureFlag` | String (`key`) | `key`, `enabled` | Yes | RESILIENT |
| `PlatformIncident` | UUID (`id`) | `severity`, `status`, `createdAt` | Yes | RESILIENT |
| `PrivacyRequest` | UUID (`id`) | `userId`, `status`, `requestType` | Yes | FAIL_CLOSED |
| `ContentBanner` | UUID (`id`) | `placement`, `active`, `priority` | Yes | RESILIENT |
| `Promotion` | UUID (`id`) | `code`, `active`, `expiresAt` | Yes | RESILIENT |
| `CustomerNote` | UUID (`id`) | `userId`, `adminId`, `createdAt` | Yes | FAIL_CLOSED |
| `Entitlement` | UUID (`id`) | `userId, isActive`, `featureKey, isActive` | Yes | FAIL_CLOSED |

---

## 2. FAIL-CLOSED ARCHITECTURE & SIMULATION RESULTS

Under production architecture invariants, when PostgreSQL is active, an unexpected database error must **never** cause the application to silently fall back to local JSON memory files or synthetic mocks. Doing so would violate data integrity and risk serving stale or fictitious records to administrators.

### Adversarial Failure Simulations Executed & Certified:

1. **Simulated PG Connection Timeout on `listUsers`:**
   - **Simulation:** Injected connection timeout in `prisma.user.findMany` / `count`.
   - **Result:** Throws `DATABASE_QUERY_FAILED: listUsers failed - Simulated PG connection timeout`.
   - **Outcome:** **PASS** (Zero synthetic fixtures returned).

2. **Simulated Dead Query Socket on `getUserDirectorySummary`:**
   - **Simulation:** Injected socket termination in `prisma.user.count`.
   - **Result:** Throws `DATABASE_QUERY_FAILED: getUserDirectorySummary failed - Simulated dead query socket`.
   - **Outcome:** **PASS** (Admin metrics fail closed).

3. **Simulated Terminated Connection on `getProfilesByUserId`:**
   - **Simulation:** Injected network termination in `prisma.birthProfile.findMany`.
   - **Result:** Throws `DATABASE_QUERY_FAILED: getProfilesByUserId failed - Simulated PG connection terminated unexpectedly`.
   - **Outcome:** **PASS** (No fictitious profiles returned).

4. **Simulated Disk Full / Deadlock on `createSavedReport`:**
   - **Simulation:** Injected mutation error in `prisma.savedReport.create`.
   - **Result:** Throws `DATABASE_MUTATION_FAILED: createSavedReport failed - Simulated disk full or deadlock error`.
   - **Outcome:** **PASS** (No uncommitted reports reported as saved).

---

## 3. ROW-LEVEL SECURITY (RLS) VERIFICATION

- RLS catalog verification (`checkSchemaReadiness`) queries PostgreSQL catalog `pg_tables` and `pg_class.relrowsecurity`.
- All customer-facing and financial tables (`User`, `UserSession`, `PaymentOrder`, `WalletLedger`, `BirthProfile`, `SavedReport`, `Entitlement`) enforce RLS policies restricting read and write access to the authenticated owner's `auth.uid()`, with administrative bypass permitted only for authenticated roles possessing verified permissions.
