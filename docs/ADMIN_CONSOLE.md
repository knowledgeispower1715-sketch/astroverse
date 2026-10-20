# Astroverse Administrative Management Console Operations Manual

**Project**: Astroverse Vedic Astrology Platform  
**Target Audience**: Platform Operators, Security Leads, Support Personnel, and Super Admins  
**Console Route**: `#/admin`  
**API Prefix**: `/api/admin/*`  

---

## 1. Overview & Operational Scope

The Astroverse Administrative Management Console provides an operational dashboard for platform monitoring, user lifecycle moderation, role assignment, and security audit inspection.

Access is restricted to users holding one of the four administrative roles:
1. `SUPER_ADMIN`
2. `SUPPORT`
3. `OPERATIONS`
4. `ANALYST`

Unauthenticated users or users with role `USER` attempting to navigate to `#/admin` are presented with an access-denied gate requiring authorized administrative credentials.

---

## 2. Platform KPI Metrics

The console renders real-time telemetry aggregated by `GET /api/admin/metrics`:

| Metric Tile | Definition & Source | Actionable Thresholds |
| :--- | :--- | :--- |
| **Total Users** | Count of all registered accounts in the database. | Growth monitoring. |
| **Active Accounts** | Accounts in `AccountStatus.ACTIVE`. | Baseline user activity. |
| **Suspended Accounts** | Accounts in `AccountStatus.SUSPENDED`. | Moderation volume tracking. |
| **Wallet Recharges** | Cumulative gross volume of verified wallet top-ups (₹). | Financial reconciliation vs. Razorpay. |
| **Saved Profiles** | Total birth charts saved across all user accounts. | Astrological computation volume. |

---

## 3. User Lifecycle Management & Moderation

### 3.1 Searching and Filtering Users
Operators can query users via three controls:
* **Search Field**: Real-time query matching against `displayName`, `email`, `phone`, or `id` (UUID).
* **Role Dropdown**: Filter by `ALL`, `USER`, `SUPER_ADMIN`, `SUPPORT`, `OPERATIONS`, or `ANALYST`.
* **Status Dropdown**: Filter by `ALL`, `ACTIVE`, `SUSPENDED`, or `DEACTIVATED`.

### 3.2 Account Status Moderation
* **Suspending an Account**: Click `Suspend` on any active user row.
  - Changes status to `AccountStatus.SUSPENDED`.
  - **Immediate Session Invalidation**: Automatically deletes all active session tokens for this user ID, terminating active browser connections.
  - Records an `ADMIN_STATUS_CHANGE` audit log.
* **Reactivating an Account**: Click `Activate` on any suspended user row.
  - Restores status to `AccountStatus.ACTIVE`.
  - The user can now log in normally.

### 3.3 Role Assignment (Super Admin Only)
* Super Admins can promote or demote user roles using the role dropdown in the users table.
* Role changes invoke `PUT /api/admin/users/:id/role`.
* Non-super-admins cannot alter account roles or modify Super Admin accounts.

---

## 4. Security Audit Trail Explorer

The Security & Moderation Audit Trail displays an immutable chronological log of system actions fetched via `GET /api/admin/audit-logs`:

| Column | Information Captured |
| :--- | :--- |
| **Timestamp** | Exact UTC date and time of the event. |
| **Action** | Action key (e.g. `AUTH_REGISTER`, `AUTH_LOGIN`, `IDENTITY_LINKED`, `ADMIN_STATUS_CHANGE`, `WALLET_RECHARGE`). |
| **Target Type / ID** | Entity affected (`USER`, `PROFILE`, `WALLET`, `ORDER`). |
| **Actor ID** | User ID of the operator or user initiating the action. |
| **IP Address** | Remote client IPv4/IPv6 address. |
| **Details** | JSON metadata detailing old vs. new values or transaction identifiers. |

---

## 5. API Reference Summary

### `GET /api/admin/metrics`
* **Authorization**: Bearer token (`SUPER_ADMIN`, `SUPPORT`, `OPERATIONS`, `ANALYST`)
* **Response**:
  ```json
  {
    "totalUsers": 12,
    "activeUsers": 11,
    "suspendedUsers": 1,
    "totalWalletDeposits": 15000.00,
    "totalConsultationSpent": 3200.00,
    "totalProfiles": 24,
    "activeSessions": 5,
    "astrologerCount": 3
  }
  ```

### `GET /api/admin/users`
* **Query Parameters**: `search`, `role`, `status`, `page`, `limit`
* **Response**: Paginated user objects with contact details, verification flags, and balances.

### `PUT /api/admin/users/:id/status`
* **Payload**: `{ "status": "SUSPENDED" | "ACTIVE" | "DEACTIVATED" }`
* **Response**: Updated user record.

### `PUT /api/admin/users/:id/role`
* **Authorization**: Restricted strictly to `SUPER_ADMIN`.
* **Payload**: `{ "role": "SUPPORT" | "OPERATIONS" | "ANALYST" | "USER" | "SUPER_ADMIN" }`
* **Response**: Updated user record.

### `GET /api/admin/audit-logs`
* **Query Parameters**: `userId`, `action`, `page`, `limit`
* **Response**: List of chronological audit events.
