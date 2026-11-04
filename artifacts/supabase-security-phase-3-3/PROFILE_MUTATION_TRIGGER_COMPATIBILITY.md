# PROFILE MUTATION TRIGGER RELATION COMPATIBILITY

**Target Function:** `public.prevent_unauthorized_profile_mutation()`  
**Target Relations:** `public.profiles` (Supabase direct) and `public."User"` (Prisma application schema)  
**Classification:** Database-Level Privilege Escalation & Balance Tampering Prevention

---

## 1. Technical Problem Description

In AstroVerse, two distinct relations exist across historical migrations and the modern runtime:
1. `public.profiles`: Created in early migrations (`20261027_01_profiles_and_auth_trigger.sql`) using snake_case:
   - `role`
   - `wallet_balance`
   - `account_status`
   - `updated_at`
2. `public."User"`: Managed by Prisma and `schemaBootstrap.ts` using camelCase / PascalCase:
   - `"role"`
   - `"walletBalance"`
   - `"status"`
   - `"updatedAt"`

### Runtime Column Lookup Defect:
If the trigger function referenced static PL/pgSQL record fields such as `OLD.wallet_balance` or `OLD.account_status` directly, executing an `UPDATE` on `public."User"` caused PostgreSQL to throw a fatal runtime error:
```
ERROR: record "old" has no field "wallet_balance"
```
Conversely, if updated to only check `OLD."walletBalance"`, updates on `public.profiles` would fail similarly.

---

## 2. Remediated Dual-Relation Architecture

The function was rewritten to convert records dynamically to `JSONB` using `to_jsonb(OLD)` and `to_jsonb(NEW)`. This abstracts the physical column representation, gracefully extracting either snake_case or camelCase field names without throwing column lookup exceptions:

```sql
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_mutation()
RETURNS TRIGGER AS $$
DECLARE
    current_jwt_role TEXT;
    is_service_role BOOLEAN;
    old_data JSONB;
    new_data JSONB;
    old_role TEXT;
    new_role TEXT;
    old_balance TEXT;
    new_balance TEXT;
    old_status TEXT;
    new_status TEXT;
BEGIN
    current_jwt_role := COALESCE(
        current_setting('request.jwt.claim.role', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    );
    is_service_role := (current_jwt_role = 'service_role' OR current_user IN ('postgres', 'service_role'));

    IF is_service_role THEN
        RETURN NEW;
    END IF;

    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);

    -- Role Escalation Prevention
    old_role := COALESCE(old_data->>'role', old_data->>'Role');
    new_role := COALESCE(new_data->>'role', new_data->>'Role');
    IF old_role IS DISTINCT FROM new_role THEN
        RAISE EXCEPTION 'PRIVILEGE_ESCALATION_BLOCKED: Ordinary users cannot modify administrative roles directly.';
    END IF;

    -- Wallet Balance Direct Mutation Prevention
    old_balance := COALESCE(old_data->>'wallet_balance', old_data->>'walletBalance');
    new_balance := COALESCE(new_data->>'wallet_balance', new_data->>'walletBalance');
    IF old_balance IS DISTINCT FROM new_balance THEN
        RAISE EXCEPTION 'DIRECT_BALANCE_MUTATION_BLOCKED: Wallet balances may only be altered via verified server-side ledger operations.';
    END IF;

    -- Account Status Moderation Protection
    old_status := COALESCE(old_data->>'account_status', old_data->>'status');
    new_status := COALESCE(new_data->>'account_status', new_data->>'status');
    IF old_status IS DISTINCT FROM new_status THEN
        RAISE EXCEPTION 'ACCOUNT_STATUS_MUTATION_BLOCKED: Account status moderation is restricted to platform administrators.';
    END IF;

    -- Dynamic timestamp preservation
    IF TG_TABLE_NAME = 'User' THEN
        NEW."updatedAt" := NOW();
    ELSIF TG_TABLE_NAME = 'profiles' THEN
        NEW.updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;
```

---

## 3. Trigger Attachments

The trigger is now attached across both relations:
- `trg_prevent_unauthorized_profile_mutation` on `public.profiles`
- `trg_prevent_unauthorized_user_mutation` on `public."User"`

Both triggers enforce that non-service roles cannot escalate their role, alter their wallet balance directly, or modify their suspension status.

---

## 4. Verification Evidence

- `tests/supabase_security_hardening.test.ts` (Test 1.4, 2.3): **PASS**
- `tests/real_postgres_security_hardening.test.ts` (Test 5): **PASS**
- Compatibility proven across both schema models.
