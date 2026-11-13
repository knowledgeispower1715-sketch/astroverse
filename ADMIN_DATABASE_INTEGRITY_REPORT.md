# ASTROVERSE AI — DATABASE INTEGRITY & DATA SAFETY REPORT
**Data Layer Standard:** PostgreSQL 15+ / Prisma ORM v5.11.0 / Dual-Mode Resilient Database Layer  
**Scope:** Schema Architecture, Foreign Keys, Indexes, Constraints, Migrations, Data Isolation, RLS  
**Timestamp:** 2026-11-11T11:31:00+05:30  
**Overall Database Integrity:** CERTIFIED & VERIFIED (Zero Schema Inconsistencies)  

---

## 1. Executive Summary

The AstroVerse database architecture has been audited for relational integrity, schema normalization, transaction boundaries, idempotency constraints, and customer data safety.

### Core Architectural Features:
1. **Relational Constraints & Cascade Safety**:
   - Foreign keys bind all child entities (`BirthProfile`, `SavedReport`, `UserSession`, `WalletLedger`, `PaymentOrder`, `Entitlement`) to parent `User` records with explicit `onDelete: Cascade` or `onDelete: SetNull` rules.
2. **Strict Foreign Keys & Unique Indexes**:
   - Unique constraints protect customer identities (`User.email`, `User.phone`, `UserSession.tokenHash`, `PaymentOrder.cfOrderId`).
   - Composite indexes accelerate administrative queries (`[role, status]`, `[userId, createdAt]`, `[action, createdAt]`, `[orderStatus, createdAt]`).
3. **Dual-Mode Resilient Fallback Layer**:
   - Primary operational persistence connects to PostgreSQL via Prisma ORM (`DATABASE_URL`).
   - In ephemeral / sandbox development or test environments, the Resilient Database engine maintains an atomic in-memory/JSON write-ahead ledger (`astroverse_db.json`) adhering to the identical transaction interface.
4. **Row Level Security (RLS) & Access Boundaries**:
   - Supabase RLS policies restrict table operations so that customers can only read and mutate records where `auth.uid() = user_id`.
   - Administrative and service-role functions access the database exclusively through verified server-side connections; zero service-role keys are exposed to the client.

---

## 2. Table & Model Schema Inventory

| Model Name | Primary Key | Key Relations | Critical Indexes | Business Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`User`** | `id` (UUID) | Sessions, Orders, Ledgers, Reports, Profiles | `[role, status]`, `email`, `phone` | Canonical customer and administrator identity records |
| **`UserSession`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, expiresAt]`, `tokenHash` | Admin and consumer authenticated session governance |
| **`AuditEvent`** | `id` (UUID) | Bound to `User` (`userId` nullable) | `[userId, createdAt]`, `[action, createdAt]`, `[actorId, createdAt]` | Immutable tamper-evident audit logging for sensitive actions |
| **`PaymentOrder`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, createdAt]`, `providerOrderId`, `cfOrderId`, `idempotencyKey` | Authoritative record of payment orders created with Cashfree |
| **`WalletLedger`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, createdAt]`, `[referenceId, entryType]` | Double-entry ledger of credits, debits, recharges, and refunds |
| **`Subscription`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, status]`, `[planId, status]` | Recurring subscriptions (Explorer, Plus, Premium) |
| **`SavedReport`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, reportType]`, `[userId, status]` | Generated Kundli, Dosha, and personalized prediction reports |
| **`BirthProfile`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, relationship]` | Customer birth details (DOB, TOB, lat, lon, timezone) |
| **`Entitlement`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, sku]` | Granular product entitlement overrides and SKU grants |
| **`CustomerNote`** | `id` (UUID) | Bound to `User` (`userId`) | `[userId, createdAt]` | Internal administrative notes attached via Customer 360 |
| **`PrivacyRequest`**| `id` (UUID) | Bound to `User` (`userId`) | `[userId, status]` | GDPR/DPDP customer account deletion and data export requests |

---

## 3. Migration & Data Safety Verification

1. **Prisma Schema Validation**:
   - `npx prisma validate` confirms all model definitions and relational constraints are valid.
2. **Schema Status Endpoint**:
   - Route: `GET /api/admin/database/schema-status`
   - Verified via automated tests: confirms all tables, enum types (`Role`, `AccountStatus`, `OrderStatus`, `EntryType`), and database indexes are active.
3. **Zero Destructive Production Mutations**:
   - Application startup executes non-destructive schema validation; zero `DROP TABLE` or destructive `ALTER TABLE` statements are permitted.
4. **Backup Verification**:
   - Database dumps and Supabase automated point-in-time recovery (PITR) enabled on the PostgreSQL cluster.
