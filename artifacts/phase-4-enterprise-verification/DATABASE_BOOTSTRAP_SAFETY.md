# DATABASE BOOTSTRAP SAFETY & PRODUCTION DDL GUARD SPECIFICATION

**Project:** AstroVerse AI  
**Component:** Database Administration & Schema Governance  
**Impacted Endpoint:** `POST /api/admin/database/bootstrap`  
**Safe Read-Only Replacements:** `GET /api/admin/database/status` & `GET /api/admin/database/schema-status`  
**Test Suite:** `services/wallet-service/tests/database_bootstrap_safety.test.ts` (8/8 PASS)  
**Security Status:** **FAIL-CLOSED & HARDENED**  

---

## 1. Context & Architectural Assessment

In early development revisions, the action inventory described `ADMIN.DATABASE.TRIGGER_BOOTSTRAP` (`POST /api/admin/database/bootstrap`) as an administrative function capable of running PostgreSQL schema bootstrap DDL directly from the web dashboard.

### Architectural Risk Analysis:
1. **Unbounded Mutation Risk:** Allowing an HTTP endpoint to execute raw DDL (`CREATE TABLE`, `CREATE TYPE`, `CREATE OR REPLACE VIEW`, `ALTER TABLE`) violates production release safety.
2. **Privilege Escalation Exposure:** If an administrator account or API key is compromised, an attacker could invoke DDL operations or alter database RLS policies.
3. **Drift from CI/CD Version Control:** Database schemas must be modified exclusively through version-controlled, reproducible migration scripts (`supabase/migrations/*.sql`) managed through pull request reviews, not ad-hoc HTTP triggers.

---

## 2. Engineering Remediation & Implementation

We enacted a four-tier defense-in-depth model in `services/wallet-service/src/server.ts`:

### A. Unconditional Production Environment Guard
An immutable, non-bypassable guard aborts any request in production environments with HTTP 403 `PRODUCTION_DDL_FORBIDDEN`:
```typescript
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.VERCEL_ENV === 'production' || 
                     process.env.ASTROVERSE_ENV === 'production';
                     
if (isProduction) {
  return res.status(403).json({
    error: 'PRODUCTION_DDL_FORBIDDEN',
    message: 'Database schema bootstrap and runtime DDL execution via HTTP API is permanently forbidden in production environments. Migrations must be applied via version-controlled CI/CD pipelines.',
    environment: 'production'
  });
}
```

### B. Strict Role-Based Access Control (Owner-Only)
Ordinary administrative roles (`Role.ADMIN`, `Role.STAFF`, `Role.SECURITY_ADMIN`, `Role.SUPPORT_ADMIN`, etc.) are unconditionally rejected with HTTP 403:
```typescript
if (!req.user || req.user.role !== Role.OWNER) {
  return res.status(403).json({
    error: 'FORBIDDEN_INSUFFICIENT_ROLE',
    message: 'Ordinary admin roles cannot trigger schema DDL. Only the platform OWNER can request staging maintenance bootstrap.',
    requiredRole: Role.OWNER,
    currentRole: req.user?.role || 'UNAUTHENTICATED'
  });
}
```

### C. Explicit Staging Maintenance Flag
Even for the platform Owner in a staging environment, the endpoint remains **disabled by default**. It requires explicit opt-in via environment configuration:
```typescript
if (process.env.ALLOW_HTTP_SCHEMA_BOOTSTRAP !== 'true') {
  return res.status(403).json({
    error: 'BOOTSTRAP_MUTATION_DISABLED',
    message: 'HTTP-triggered schema bootstrap is disabled by default. Set ALLOW_HTTP_SCHEMA_BOOTSTRAP=true in isolated staging environments to enable maintenance execution.'
  });
}
```

### D. Audit Logging
Any execution permitted in staging records an immutable audit record:
- Action: `STAGING_DATABASE_BOOTSTRAP_EXECUTED`
- Actor: Owner ID and IP address
- Outcome: Execution result and environment metadata

---

## 3. Read-Only Schema Inspection Endpoints

To satisfy operational monitoring requirements without exposing DDL execution authority, two strictly read-only endpoints were implemented:

1. **`GET /api/admin/database/status`**:
   - Permission: `requireAdmin(AdminPermission.VIEW_DATABASE)`
   - Semantics: Returns database connection status, total tables verified, RLS enforcement count, and declares `ddlExecution: 'VERSION_CONTROLLED_MIGRATIONS_ONLY'`.
2. **`GET /api/admin/database/schema-status`**:
   - Permission: `requireAdmin(AdminPermission.VIEW_DATABASE)`
   - Semantics: Returns live table names, row counts, RLS enabled flags, and confirms `migrationsManagedBy: 'CI_CD_VERSION_CONTROL'`.

---

## 4. Automated Verification Results

The dedicated suite `tests/database_bootstrap_safety.test.ts` confirms 100% compliance across all 8 assertions:

| # | Test Scenario | Target Endpoint | Expected Status | Result |
|---|---|---|---|---|
| 1 | Read-only connection health inspection | `GET /api/admin/database/status` | HTTP 200 | **PASS** |
| 2 | Read-only table and RLS catalog inspection | `GET /api/admin/database/schema-status` | HTTP 200 | **PASS** |
| 3 | Reject unauthenticated request | `POST /api/admin/database/bootstrap` | HTTP 401 | **PASS** |
| 4 | Reject ordinary customer role | `POST /api/admin/database/bootstrap` | HTTP 403 `FORBIDDEN_INSUFFICIENT_ROLE` | **PASS** |
| 5 | Reject ordinary Admin role (Owner required) | `POST /api/admin/database/bootstrap` | HTTP 403 `FORBIDDEN_INSUFFICIENT_ROLE` | **PASS** |
| 6 | Reject Owner when flag disabled | `POST /api/admin/database/bootstrap` | HTTP 403 `BOOTSTRAP_MUTATION_DISABLED` | **PASS** |
| 7 | Unconditionally reject in Production (even for Owner) | `POST /api/admin/database/bootstrap` | HTTP 403 `PRODUCTION_DDL_FORBIDDEN` | **PASS** |
| 8 | Allow in Staging when Owner & flag enabled | `POST /api/admin/database/bootstrap` | HTTP 200 `STAGING_BOOTSTRAP_EXECUTED` | **PASS** |
