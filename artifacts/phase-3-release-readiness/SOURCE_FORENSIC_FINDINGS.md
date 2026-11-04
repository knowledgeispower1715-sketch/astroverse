# SOURCE FORENSIC FINDINGS & DEFECT REMEDIATION REPORT

## ASTROVERSE OWNER CONTROL CENTRE INTEGRITY AUDIT

**Target:** `services/wallet-service/src/db.ts`, `services/wallet-service/src/server.ts`, `services/wallet-service/src/security/permissions.ts`  
**Branch:** `fix/enterprise-security-and-hardening`  
**Classification:** Forensics / Application Security / Database Concurrency / Financial Systems  

---

## 1. EXECUTIVE SUMMARY OF DEFECTS IDENTIFIED & REMEDIATED

During comprehensive line-by-line static and dynamic source forensics of the AstroVerse Admin Control Centre, seven high-severity structural defects were uncovered in database transactions, role authorization, concurrency controls, secret handling, and financial provenance. All seven defects have been remediated, hardened fail-closed, and certified through automated test suites.

---

## 2. DETAILED DEFECT CATALOGUE

### Defect 1: Unsafe Catch-Fallback in `assignUserRoleAtomic`
- **Location:** `services/wallet-service/src/db.ts` (lines 1428–1451)
- **Vulnerability / Root Cause:**
  When demoting an existing Administrator or Owner (`isTargetOwner && !isNewRoleOwner`), the code attempted to acquire a row lock on active owners with `tx.$queryRaw`. However, a `catch` block caught any query error (e.g. database deadlocks, lock contention timeouts, syntax variances) and fell back to `tx.user.count(...)`. Because `tx.user.count` does NOT acquire an exclusive row lock (`FOR UPDATE`), concurrent demotion transactions could execute simultaneously, each reading `activeOwnersCount = 2`, and demote both owners at the same time, leaving the platform with **zero** active owners.
- **Remediation:**
  Removed the `catch` fallback. A lock acquisition failure inside the PostgreSQL transaction now aborts immediately and fails closed with `DATABASE_MUTATION_FAILED`. Additionally, active owners are explicitly filtered (`lockedOwners.filter(o => o.id !== targetUserId)`), and if the remaining count is less than 1, `LAST_OWNER_PROTECTION` is thrown before any update occurs.
- **Verification:** Tested in `owner_enterprise_hardening_adversarial.test.ts` (Test 26: `assignUserRoleAtomic fails closed when lock query fails during owner demotion`).

---

### Defect 2: Actor Impersonation Gap in Privileged Role Assignment
- **Location:** `services/wallet-service/src/db.ts` (lines 1396–1402)
- **Vulnerability / Root Cause:**
  `assignUserRoleAtomic` relied on the caller-supplied `params.actorRole` to determine whether the actor was authorized as `OWNER`. If an administrator had their role revoked or demoted in the database, but presented a cached or manipulated session parameter, the transaction proceeded without re-verifying the actor's current database state.
- **Remediation:**
  Inside the database transaction (`tx`), the actor account is re-queried directly from PostgreSQL (`const actor = await tx.user.findUnique({ where: { id: actorId } })`). The method verifies that the actor exists, has `status === AccountStatus.ACTIVE`, and that their canonical database role is strictly `Role.OWNER`. If not, it fails closed with `FORBIDDEN`.
- **Verification:** Tested in `owner_enterprise_hardening_adversarial.test.ts` (Tests 2, 3, and 25).

---

### Defect 3: Non-Canonical Role Assignment
- **Location:** `services/wallet-service/src/db.ts` (lines 1404–1409) & `services/wallet-service/src/security/permissions.ts`
- **Vulnerability / Root Cause:**
  Role validation allowed any value present in the broad `Role` enum, including deprecated legacy aliases (`ADMIN`, `SUPER_ADMIN`). Assigning legacy aliases created database inconsistencies where permission checks expecting canonical roles failed or behaved unpredictably.
- **Remediation:**
  Defined `CANONICAL_ASSIGNABLE_ROLES: Role[] = [Role.USER, Role.OWNER, Role.SECURITY_ADMIN, Role.SUPPORT_ADMIN, Role.CONTENT_EDITOR, Role.FINANCE_ADMIN, Role.ASTROLOGY_OPS_ADMIN, Role.READONLY_ANALYST]`. Enforced that `newRole` must strictly belong to `CANONICAL_ASSIGNABLE_ROLES`, rejecting all aliases with `INVALID_ROLE`.
- **Verification:** Tested in `owner_enterprise_hardening_adversarial.test.ts` (Test 25).

---

### Defect 4: Race Condition & Unbounded Duration in `extendSubscription`
- **Location:** `services/wallet-service/src/db.ts` (lines 6555–6640)
- **Vulnerability / Root Cause:**
  1. `extendSubscription` read the user record with `tx.user.findUnique` without row-level locking. Under high concurrent load, two requests extending the same subscription could calculate the new expiry from the same base timestamp, resulting in lost days.
  2. Input parameters lacked upper bounds and negative checks: `additionalDays` could be 0, negative, or integer overflow.
  3. No justification reason validation (allowed empty string).
  4. Missing idempotency handling: repeated retries from network timeouts would add additional days repeatedly.
- **Remediation:**
  1. Enforced row-level lock on user via `SELECT ... FOR UPDATE` inside PostgreSQL transaction.
  2. Enforced `Number.isInteger(additionalDays) && additionalDays >= 1 && additionalDays <= 365`, rejecting invalid durations with `INVALID_DURATION`.
  3. Enforced business justification reason `length >= 5`, rejecting with `REASON_REQUIRED`.
  4. Added `requestId` check against `tx.auditEvent` for idempotent request replay.
  5. Synchronized active tier entitlements to match the exact newly calculated expiry date, while preserving non-tier report entitlements.
- **Verification:** Tested in `owner_enterprise_hardening_adversarial.test.ts` (Tests 8, 23, 27, 28).

---

### Defect 5: Plaintext Cashfree Gateway Secret Leak via Feature Flags
- **Location:** `services/wallet-service/src/db.ts` (lines 2497–2565) & `services/wallet-service/src/server.ts` (lines 6187–6194)
- **Vulnerability / Root Cause:**
  When configuring Cashfree credentials via `POST /api/admin/gateway-credentials`, the entire payload including `secretKey` was serialized into `FeatureFlag.description` and saved to the database. Subsequently, `GET /api/admin/settings/flags` fetched all feature flags from the database and returned them to any administrator with `VIEW_SETTINGS` permission, exposing the Cashfree API secret in plaintext.
- **Remediation:**
  1. `saveCashfreeGatewayConfig` in `db.ts` was refactored to NEVER persist `secretKey` to the database. It stores only sanitized masked metadata: `{ isConfigured: true, appIdMasked, env, updatedAt }`.
  2. `listFeatureFlags` in `db.ts` explicitly filters out `CASHFREE_GATEWAY_CONFIG`.
  3. `GET /api/admin/settings/flags` in `server.ts` filters out `CASHFREE_GATEWAY_CONFIG` and performs token redacting on all description strings.
  4. Runtime secrets are stored strictly in memory via `setRuntimeCashfreeSecretKey()` and environment variables (`process.env.CASHFREE_SECRET_KEY`).
- **Verification:** Tested in `owner_enterprise_hardening_adversarial.test.ts` (Test 29: `GET /api/admin/settings/flags never leaks CASHFREE_GATEWAY_CONFIG or credentials`).

---

### Defect 6: Subscription Provenance Misattribution
- **Location:** `services/wallet-service/src/server.ts` (lines 3219, 6068, 6939, 7238, 7368)
- **Vulnerability / Root Cause:**
  When a paying customer purchased a subscription through Cashfree or when an order was reconciled, the server called `db.updateSubscription()`, which internally created entitlements with `source: 'ADMIN_GRANT'`. This corrupted administrative audit trails by making customer paid purchases appear as complimentary gifts from system administrators.
- **Remediation:**
  Implemented dedicated method `fulfillPaidSubscriptionOrder` in `db.ts`. When a paid subscription is settled:
  1. It acquires a row-level lock on the customer account.
  2. It marks the payment order as `PAID`.
  3. It creates an entitlement with `source: 'PAID_PURCHASE'`, `grantedBy: 'CASHFREE'`, and stores complete financial metadata (`orderId`, `paymentId`, `amount`, `currency`, `billingPeriod`, `durationDays`).
  4. All five fulfillment call-sites in `server.ts` now call `db.fulfillPaidSubscriptionOrder`.
- **Verification:** Tested in `owner_enterprise_hardening_adversarial.test.ts` (Test 30: `fulfillPaidSubscriptionOrder records entitlement with source PAID_PURCHASE and order metadata`).

---

### Defect 7: Missing Wallet Subscription Entitlement Synchronization
- **Location:** `services/wallet-service/src/db.ts` (lines 4353–4445)
- **Vulnerability / Root Cause:**
  `purchaseSubscription` (when user buys subscription using wallet balance) updated the user's `subscriptionTier` and created a `walletLedger` entry, but failed to create an active record in the `Entitlement` table.
- **Remediation:**
  `purchaseSubscription` now deactivates superseded tier entitlements and creates an active entitlement with `source: 'PAID_PURCHASE'`, `grantedBy: 'wallet'`, and records transaction metadata.
- **Verification:** Tested in `monetization.test.ts` and `owner_enterprise_hardening_adversarial.test.ts`.
