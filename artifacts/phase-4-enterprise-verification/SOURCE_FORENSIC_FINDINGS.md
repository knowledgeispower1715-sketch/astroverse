# SOURCE FORENSIC FINDINGS AT CURRENT HEAD

**Target Commit:** `9413a0f51`  
**Audited Source Files:**
- `admin.html` & `apps/admin/index.html`
- `services/wallet-service/src/server.ts`
- `services/wallet-service/src/db.ts`
- `services/wallet-service/src/schemaBootstrap.ts`
- `services/wallet-service/src/security/`
- `services/wallet-service/src/monetization/`
- `services/wallet-service/prisma/schema.prisma`
- `supabase/migrations/`

---

## 1. Forensic Discrepancies Identified and Remediated

| Subsystem | File & Location | Prior Defect | Remediated Behavior | Status |
|---|---|---|---|---|
| **Schema Bootstrap** | `schemaBootstrap.ts:740-770` | Exception catch block fell back to creating unisolated view without `security_invoker=true`, followed by unconditional `GRANT SELECT`. | Removed fallback completely. Enforced PG15+ gate and gated `GRANT SELECT` on confirmed `reloptions @> ARRAY['security_invoker=true']`. | **REMEDIATED** |
| **SQL Migrations** | `20261104_07_fix_...sql:160` | Schema-level default privilege revocation was overridden by global default grants to `PUBLIC` for other creator roles. | Implemented role-scoped global default privilege revocations (`ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated`) across all creator roles. | **REMEDIATED** |
| **Migration Verification** | `20261104_07_fix_...sql:240` | Verification DO block used `RAISE WARNING`, allowing transaction to commit despite failing invariants. | Converted all warnings to blocking `RAISE EXCEPTION` assertions that abort transaction on violation. | **REMEDIATED** |
| **Security Trigger** | `20261104_07_fix_...sql:99` | Checked static `OLD.wallet_balance` and `OLD.account_status`; threw runtime error when attached to `"User"`. | Converted to `to_jsonb(OLD)` and `to_jsonb(NEW)` dynamic extraction. Handles both snake_case and camelCase relations seamlessly. Attached to `profiles` and `"User"`. | **REMEDIATED** |
| **Storage Security** | `20261104_07_fix_...sql:180` | `customer-documents` lacked RLS policies on `storage.objects`; missing update/delete policies for customer folders. | Configured private buckets and enforced comprehensive CRUD owner-isolated policies (`(auth.uid())::text = (storage.foldername(name))[1]`). | **REMEDIATED** |
| **Password Entropy** | `server.ts:935, 1675, 3960` | Inline regex was duplicated and did not check common weak dictionary passphrases. | Centralized validator in `passwordValidator.ts` enforcing minimum length, mixed character sets, and dictionary rejection. | **REMEDIATED** |
| **Account Inactivity Gate**| `server.ts:940-960` | In `/api/auth/register-password`, password validation occurred before checking whether the account was suspended. | Moved account status lookup before password syntax validation, immediately returning HTTP 403 `ACCOUNT_INACTIVE`. | **REMEDIATED** |
| **Admin HTML Parity** | `admin.html` vs `apps/admin/index.html` | Potential divergence between standalone and apps admin pages. | Verified 100% byte parity (`assert.equal(adminHtml, appsAdminHtml)`). | **REMEDIATED** |

---

## 2. Invariant Rules Followed

1. **Dead Code & Fallback Elimination:** Zero insecure normal views, zero silent warning passes.
2. **Deterministic Ownership:** Target relation schema mapped format-aware (`to_jsonb`).
3. **No Credential Persistence:** Sanitization helper strips secrets prior to client serialization.
