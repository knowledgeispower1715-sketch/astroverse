# Database Security, Tenant Isolation & Cryptographic Verification

**Database Provider:** Supabase PostgreSQL (AWS ap-south-1 / Mumbai)  
**Database URL:** `https://nzeutydhfxhjufacqren.supabase.co`  
**ORM / Data Layer:** Prisma Client + Raw Parameterized SQL  
**Audit Standard:** CISO & Production Reliability Engineering Standards

---

## 1. Multi-Tenant Isolation & Row-Level Security (RLS)

| Table | RLS Status | Tenant Isolation Enforcement Rule | Verification Method |
|---|---|---|---|
| `public.User` | ENABLED | `auth.uid() = id` (Users may only read/modify their own record; Admins require `SUPER_ADMIN` claim) | Automated SQL test & API boundary check |
| `public.PaymentOrder` | ENABLED | `auth.uid() = user_id` (Cross-user order lookup strictly returns HTTP 403) | Tested in `cashfree_order_recovery_p0.test.ts` (PASS) |
| `public.WalletLedger` | ENABLED | `auth.uid() = user_id` (Ledger history isolated per customer; mutations restricted to system service role) | Unit & integration assertions |
| `public.FeatureFlag` | ENABLED | Restricted to `SUPER_ADMIN` and `OWNER` roles; public read only for white-listed gateway keys | Verified via REST API |
| `public.AuditLog` | ENABLED | Append-only; accessible strictly by Compliance and Security Audit roles | Parameterized insert test |

---

## 2. Cryptographic Storage & Password Hashing

- **Password Storage:**
  - Passwords are salted with 16 bytes of cryptographically secure random bytes (`crypto.randomBytes(16)`).
  - Derived using 100,000 rounds of PBKDF2 with SHA-512.
  - Zero plaintext passwords or reversible ciphers are stored in any database table.
- **Session Tokens:**
  - Standard JWT with HS256 / RS256 signature verification.
  - Revocable session IDs tracked against the database session store.
- **Sensitive Secrets Management:**
  - Production `CASHFREE_SECRET_KEY` is never returned in client API responses.
  - Masked in all admin readouts (`1496...6941`).
  - Webhook signatures verified via constant-time buffer comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

---

## 3. Database Index Hygiene & Foreign Key Constraints

1. **`User` Table:**
   - Primary Key: `id` (UUID v4)
   - Unique Index: `email` (Enforces zero duplicate accounts)
   - B-Tree Index: `role`, `status`, `createdAt`
2. **`PaymentOrder` Table:**
   - Primary Key: `id` (UUID v4)
   - Foreign Key: `userId REFERENCES User(id) ON DELETE CASCADE`
   - Unique Index: `razorpayOrderId` / `cfOrderId` (Prevents duplicate gateway references)
   - Compound Index: `(userId, idempotencyKey)` (Enforces idempotent order creation)
3. **`WalletLedger` Table:**
   - Primary Key: `id` (UUID v4)
   - Foreign Key: `userId REFERENCES User(id) ON DELETE RESTRICT` (Protects financial ledger history against accidental user cascade deletion)
   - Unique Index: `idempotencyKey` (Guarantees atomic credit fulfillment)

---

## 4. Supabase Security Advisor & Vulnerability Scan

- **Public Exposed Keys:** The `SUPABASE_ANON_KEY` has strictly bounded privileges through RLS. The `SUPABASE_SERVICE_ROLE_KEY` is maintained exclusively within backend serverless environment variables.
- **Connection Security:** Forced SSL connection (`sslmode=require`) across all PostgreSQL pools.
- **SQL Injection Defense:** 100% of queries utilize Prisma prepared statements or parameterized SQL queries; zero string concatenation on user input.
