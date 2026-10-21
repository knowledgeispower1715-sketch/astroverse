# AstroVerse Authentication & User Management Implementation Specification

## 1. Executive Architecture Overview

AstroVerse implements a production-grade, hardened authentication and user management system designed to eliminate mock credentials, enforce strict tenant isolation, and protect sensitive astrological birth records.

The authentication subsystem is hosted in `services/wallet-service` (Express/TypeScript) with persistent storage managed in `src/db.ts` and route guards enforced in `src/server.ts`.

### Security Guarantees
1. **Zero Mock Credentials**: Hardcoded passwords and mock OTPs are eliminated.
2. **Production OTP Isolation**: Raw verification codes (`devPreviewOtp`) are never transmitted in production API payloads (`NODE_ENV === 'production'`). They are strictly restricted to isolated test environments (`NODE_ENV === 'test'`).
3. **Cryptographic Password Hashing**: Passwords are saved with individualized 16-byte random salts using Node.js native `crypto.scrypt` (N=16384, r=8, p=1, keylen=64) and evaluated via `crypto.timingSafeEqual` to prevent side-channel timing attacks.
4. **Tenant Isolation (BOLA / IDOR Defense)**: Every user birth profile, consultation session, and saved prediction report is strictly partitioned by `userId`. Unprivileged cross-user access attempts result in an immediate `HTTP 403 Forbidden` response.
5. **Session Invalidation on Password Reset**: When an account password is reset, all existing active session tokens for that account are instantaneously purged from the database, preventing session hijacking from stale devices.

---

## 2. Cryptographic Password Hashing & Storage Architecture

### Algorithm Parameters
- **Primitive**: `crypto.scryptSync(password, salt, 64)`
- **Salt**: 16 cryptographically random bytes (`crypto.randomBytes(16).toString('hex')`)
- **Key Length**: 64 bytes (512 bits)
- **Comparison**: `crypto.timingSafeEqual(bufferA, bufferB)`

### Database Schema Extension (`UserRecord` in `src/db.ts`)
```typescript
export interface UserRecord {
  id: string;
  email?: string;
  phone?: string;
  passwordHash?: string;       // scrypt 64-byte hex digest
  passwordSalt?: string;       // 16-byte random hex salt
  resetTokenHash?: string;     // SHA-256 digest of 6-digit recovery code
  resetTokenExpiresAt?: string;// ISO timestamp (15-minute expiration)
  emailVerified: boolean;
  phoneVerified: boolean;
  displayName: string;
  role: Role;
  status: UserStatus;
  walletBalance: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Endpoints Specification

### 3.1 POST `/api/auth/register-password`
Registers a new user account with verified password criteria.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "name": "Arjun Sharma",
    "phone": "+919876543210"
  }
  ```
- **Validation Rules**:
  - Minimum 8 characters
  - At least 1 uppercase letter (`[A-Z]`)
  - At least 1 lowercase letter (`[a-z]`)
  - At least 1 digit (`[0-9]`)
  - At least 1 special character (`[@$!%*?&]`)
- **Response**: `HTTP 200 OK` with user record and 256-bit session token.

### 3.2 POST `/api/auth/login-password`
Authenticates a user using email or phone with their encrypted password.
- **Request Body**:
  ```json
  {
    "identifier": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Security Check**: Verifies account status (`ACTIVE` vs `SUSPENDED`). Suspended accounts are immediately rejected with `HTTP 403 Forbidden`.
- **Response**: `HTTP 200 OK` with refreshed session token and role claims.

### 3.3 POST `/api/auth/forgot-password`
Dispatches a single-use 6-digit recovery code with a 15-minute expiration.
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Hashing**: The reset code is hashed via SHA-256 before storage in the database to prevent recovery token exposure in raw memory/backups.

### 3.4 POST `/api/auth/reset-password`
Verifies the recovery code and updates the account password.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "resetToken": "123456",
    "newPassword": "NewStrongPassword456!"
  }
  ```
- **Active Session Eviction**: Calls `db.deleteUserSessions(user.id)` to immediately terminate all active sessions across web and mobile clients.

---

## 4. Tenant Isolation & BOLA Defense

To defend against Broken Object Level Authorization (OWASP API Security Top 10):
1. Profile Access:
   - `GET /api/profiles/:userId`: Checks `req.user.role === Role.SUPER_ADMIN || req.user.id === userId`. Unauthorized calls return `HTTP 403 Forbidden`.
   - `PUT /api/profiles/:id` & `DELETE /api/profiles/:id`: Checks ownership of the underlying profile ID. Foreign callers receive `HTTP 403 Forbidden`.
2. Report Access:
   - `GET /api/reports/:userId`: Validates `req.user.id === userId`.
   - `GET /api/reports/detail/:id`: Checks `report.userId === req.user.id`. Foreign callers receive `HTTP 403 Forbidden`.
   - `DELETE /api/reports/:id`: Ensures only the owning user or Super Admin can delete a saved prediction report.

---

## 5. Frontend Dedicated Application Views

The AstroVerse frontend eliminates brittle popup sign-in modals in favor of responsive, dedicated application views powered by hash routing:

| Route | Subview | Purpose |
| :--- | :--- | :--- |
| `#/login` | `auth-panel-login` | Unified login with password/OTP tabs and "Forgot Password" entry |
| `#/signup` | `auth-panel-signup` | Account registration with real-time password strength meter |
| `#/verify` | `auth-panel-verify` | 6-digit OTP verification with 60s cooldown timer |
| `#/forgot-password` | `auth-panel-forgot-password` | Password recovery code dispatch |
| `#/reset-password` | `auth-panel-reset-password` | Reset code verification and new password submission |
| `#/complete-profile` | `auth-panel-complete-profile` | Onboarding birth profile collection with location autocomplete |
| `#/settings/security` | `view-settings` | Session management, password updates, and account deactivation |

Header Sign In Action:
- Guest users clicking "Sign In" are navigated directly to `#/login`.
- Authenticated users clicking their profile chip are navigated to `#/dashboard`.
