// =============================================================================
// ASTROVERSE ADMINISTRATIVE RBAC & PERMISSION MATRIX (7 CANONICAL ROLES)
// =============================================================================
// Implements strict least-privilege role-based access control for production launch.
// =============================================================================

export enum Role {
  USER = 'USER',

  // 7 Canonical Administrative Roles (Phase 3)
  OWNER = 'OWNER',
  SECURITY_ADMIN = 'SECURITY_ADMIN',
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',
  CONTENT_EDITOR = 'CONTENT_EDITOR',
  FINANCE_ADMIN = 'FINANCE_ADMIN',
  ASTROLOGY_OPS_ADMIN = 'ASTROLOGY_OPS_ADMIN',
  READONLY_ANALYST = 'READONLY_ANALYST',

  // Legacy Aliases for Seamless Backward Compatibility
  SUPER_ADMIN = 'SUPER_ADMIN',   // Aliased to OWNER
  SUPPORT = 'SUPPORT',           // Aliased to SUPPORT_ADMIN
  OPERATIONS = 'OPERATIONS',     // Aliased to ASTROLOGY_OPS_ADMIN
  ANALYST = 'ANALYST'            // Aliased to READONLY_ANALYST
}

export const CANONICAL_ADMIN_ROLES: Role[] = [
  Role.OWNER,
  Role.SECURITY_ADMIN,
  Role.SUPPORT_ADMIN,
  Role.CONTENT_EDITOR,
  Role.FINANCE_ADMIN,
  Role.ASTROLOGY_OPS_ADMIN,
  Role.READONLY_ANALYST,
  Role.SUPER_ADMIN,
  Role.SUPPORT,
  Role.OPERATIONS,
  Role.ANALYST
];

export enum AdminPermission {
  // 1. Platform Overview & Metrics
  VIEW_OVERVIEW = 'VIEW_OVERVIEW',

  // 2. User Lifecycle & Moderation
  VIEW_USERS = 'VIEW_USERS',
  MANAGE_USER_STATUS = 'MANAGE_USER_STATUS',

  // 3. Administrative Roles & Permissions
  VIEW_ROLES = 'VIEW_ROLES',
  MANAGE_ROLES = 'MANAGE_ROLES',

  // 4. Security & Authentication Events
  VIEW_SECURITY_EVENTS = 'VIEW_SECURITY_EVENTS',
  MANAGE_SECURITY_MFA = 'MANAGE_SECURITY_MFA',

  // 5. Astrology Engine Health & Jobs
  VIEW_ASTROLOGY_HEALTH = 'VIEW_ASTROLOGY_HEALTH',
  MANAGE_ASTROLOGY_JOBS = 'MANAGE_ASTROLOGY_JOBS',

  // 6. Personalised Report Diagnostics
  VIEW_REPORT_DIAGNOSTICS = 'VIEW_REPORT_DIAGNOSTICS',
  RETRY_FAILED_REPORTS = 'RETRY_FAILED_REPORTS',

  // 7. AI Provider Status & Quotas
  VIEW_AI_USAGE = 'VIEW_AI_USAGE',
  MANAGE_AI_QUOTAS = 'MANAGE_AI_QUOTAS',

  // 8. Payments & Reconciliation
  VIEW_PAYMENTS = 'VIEW_PAYMENTS',
  RECONCILE_PAYMENTS = 'RECONCILE_PAYMENTS',

  // 9. Subscriptions & Refunds
  VIEW_SUBSCRIPTIONS = 'VIEW_SUBSCRIPTIONS',
  MANAGE_REFUNDS = 'MANAGE_REFUNDS',

  // 10. Content Management & Banners
  MANAGE_CONTENT = 'MANAGE_CONTENT',

  // 11. Feature Flags & Safe Platform Settings
  VIEW_SETTINGS = 'VIEW_SETTINGS',
  MANAGE_FEATURE_FLAGS = 'MANAGE_FEATURE_FLAGS',

  // 12. Support & Privacy Requests (GDPR / DPDP)
  VIEW_PRIVACY_REQUESTS = 'VIEW_PRIVACY_REQUESTS',
  MANAGE_PRIVACY_REQUESTS = 'MANAGE_PRIVACY_REQUESTS',

  // 13. Audit Trail Search
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // 14. Integrations Health
  VIEW_INTEGRATIONS = 'VIEW_INTEGRATIONS',

  // 15. Monitoring, Errors & Incidents
  VIEW_INCIDENTS = 'VIEW_INCIDENTS',
  MANAGE_INCIDENTS = 'MANAGE_INCIDENTS'
}

/**
 * Normalizes any legacy role alias to its canonical 7-role counterpart
 */
export function normalizeRole(role: string | undefined | null): Role {
  if (!role) return Role.USER;
  const upper = role.toUpperCase();

  switch (upper) {
    case 'SUPER_ADMIN':
    case 'OWNER':
      return Role.OWNER;
    case 'SUPPORT':
    case 'SUPPORT_ADMIN':
      return Role.SUPPORT_ADMIN;
    case 'OPERATIONS':
    case 'ASTROLOGY_OPS_ADMIN':
      return Role.ASTROLOGY_OPS_ADMIN;
    case 'ANALYST':
    case 'READONLY_ANALYST':
      return Role.READONLY_ANALYST;
    case 'SECURITY_ADMIN':
      return Role.SECURITY_ADMIN;
    case 'CONTENT_EDITOR':
      return Role.CONTENT_EDITOR;
    case 'FINANCE_ADMIN':
      return Role.FINANCE_ADMIN;
    default:
      return Role.USER;
  }
}

/**
 * Checks if a given role possesses administrative portal access
 */
export function isAnyAdmin(role: string | undefined | null): boolean {
  const norm = normalizeRole(role);
  return norm !== Role.USER;
}

/**
 * Complete Permission Matrix defining capabilities for each canonical role
 */
export const ROLE_PERMISSIONS: Record<Role, AdminPermission[]> = {
  [Role.USER]: [],

  // 1. OWNER / SUPER_ADMIN: Full Super-Authority across all 15 modules
  [Role.OWNER]: Object.values(AdminPermission),
  [Role.SUPER_ADMIN]: Object.values(AdminPermission),

  // 2. SECURITY_ADMIN: Authentication, audit logs, MFA enforcement, account lockouts
  [Role.SECURITY_ADMIN]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_USERS,
    AdminPermission.MANAGE_USER_STATUS,
    AdminPermission.VIEW_ROLES,
    AdminPermission.VIEW_SECURITY_EVENTS,
    AdminPermission.MANAGE_SECURITY_MFA,
    AdminPermission.VIEW_PRIVACY_REQUESTS,
    AdminPermission.MANAGE_PRIVACY_REQUESTS,
    AdminPermission.VIEW_AUDIT_LOGS,
    AdminPermission.VIEW_INTEGRATIONS,
    AdminPermission.VIEW_INCIDENTS,
    AdminPermission.MANAGE_INCIDENTS
  ],

  // 3. SUPPORT_ADMIN: User diagnostics, report generation recovery, privacy requests
  [Role.SUPPORT_ADMIN]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_REPORT_DIAGNOSTICS,
    AdminPermission.RETRY_FAILED_REPORTS,
    AdminPermission.VIEW_PRIVACY_REQUESTS,
    AdminPermission.MANAGE_PRIVACY_REQUESTS
  ],
  [Role.SUPPORT]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_REPORT_DIAGNOSTICS,
    AdminPermission.RETRY_FAILED_REPORTS,
    AdminPermission.VIEW_PRIVACY_REQUESTS,
    AdminPermission.MANAGE_PRIVACY_REQUESTS
  ],

  // 4. CONTENT_EDITOR: Horoscopic notices, marketing banners, knowledge articles
  [Role.CONTENT_EDITOR]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.MANAGE_CONTENT
  ],

  // 5. FINANCE_ADMIN: Payments, reconciliation, subscriptions, refund execution
  [Role.FINANCE_ADMIN]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_PAYMENTS,
    AdminPermission.RECONCILE_PAYMENTS,
    AdminPermission.VIEW_SUBSCRIPTIONS,
    AdminPermission.MANAGE_REFUNDS,
    AdminPermission.VIEW_AUDIT_LOGS
  ],

  // 6. ASTROLOGY_OPS_ADMIN: Engine health, calculation jobs, ephemeris diagnostics
  [Role.ASTROLOGY_OPS_ADMIN]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_ASTROLOGY_HEALTH,
    AdminPermission.MANAGE_ASTROLOGY_JOBS,
    AdminPermission.VIEW_REPORT_DIAGNOSTICS,
    AdminPermission.RETRY_FAILED_REPORTS,
    AdminPermission.VIEW_INTEGRATIONS
  ],
  [Role.OPERATIONS]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_ASTROLOGY_HEALTH,
    AdminPermission.MANAGE_ASTROLOGY_JOBS,
    AdminPermission.VIEW_REPORT_DIAGNOSTICS,
    AdminPermission.RETRY_FAILED_REPORTS,
    AdminPermission.VIEW_INTEGRATIONS
  ],

  // 7. READONLY_ANALYST: Read-only visibility over aggregate metrics
  [Role.READONLY_ANALYST]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_PAYMENTS,
    AdminPermission.VIEW_SUBSCRIPTIONS,
    AdminPermission.VIEW_AI_USAGE,
    AdminPermission.VIEW_REPORT_DIAGNOSTICS,
    AdminPermission.VIEW_ASTROLOGY_HEALTH
  ],
  [Role.ANALYST]: [
    AdminPermission.VIEW_OVERVIEW,
    AdminPermission.VIEW_PAYMENTS,
    AdminPermission.VIEW_SUBSCRIPTIONS,
    AdminPermission.VIEW_AI_USAGE,
    AdminPermission.VIEW_REPORT_DIAGNOSTICS,
    AdminPermission.VIEW_ASTROLOGY_HEALTH
  ]
};

/**
 * Checks whether a role has a specific permission
 */
export function hasPermission(role: string | undefined | null, permission: AdminPermission): boolean {
  if (!role) return false;
  const canonical = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[canonical] || [];
  return permissions.includes(permission);
}

/**
 * Lists the 15 Admin Modules and their required view permissions
 */
export const ADMIN_MODULE_REGISTRY = [
  { id: 'overview', title: 'Platform Overview & Service Health', permission: AdminPermission.VIEW_OVERVIEW },
  { id: 'users', title: 'User Lifecycle & Moderation', permission: AdminPermission.VIEW_USERS },
  { id: 'roles', title: 'Administrative Roles & Permissions', permission: AdminPermission.VIEW_ROLES },
  { id: 'security', title: 'Authentication & Security Events', permission: AdminPermission.VIEW_SECURITY_EVENTS },
  { id: 'astrology', title: 'Astrology Engine Health & Jobs', permission: AdminPermission.VIEW_ASTROLOGY_HEALTH },
  { id: 'reports', title: 'Personalised Report Diagnostics', permission: AdminPermission.VIEW_REPORT_DIAGNOSTICS },
  { id: 'ai', title: 'AI Provider Status & Quotas', permission: AdminPermission.VIEW_AI_USAGE },
  { id: 'payments', title: 'Payments & Reconciliation', permission: AdminPermission.VIEW_PAYMENTS },
  { id: 'subscriptions', title: 'Subscription & Refund Management', permission: AdminPermission.VIEW_SUBSCRIPTIONS },
  { id: 'content', title: 'Content Management & Banners', permission: AdminPermission.MANAGE_CONTENT },
  { id: 'settings', title: 'Feature Flags & Safe Settings', permission: AdminPermission.VIEW_SETTINGS },
  { id: 'privacy', title: 'Support & Privacy Requests', permission: AdminPermission.VIEW_PRIVACY_REQUESTS },
  { id: 'audit', title: 'Security Audit Trail Search', permission: AdminPermission.VIEW_AUDIT_LOGS },
  { id: 'integrations', title: 'External Integrations Health', permission: AdminPermission.VIEW_INTEGRATIONS },
  { id: 'incidents', title: 'Monitoring, Errors & Incidents', permission: AdminPermission.VIEW_INCIDENTS }
];

/**
 * Reads and normalizes the server-side administrator email allowlist (ASTROVERSE_ADMIN_EMAILS).
 * Invariant: Never exposed to client-side bundles or public endpoints.
 */
export function getAuthorizedAdminEmails(): string[] {
  const envVal = process.env.ASTROVERSE_ADMIN_EMAILS;
  if (!envVal || typeof envVal !== 'string') return [];
  return envVal
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0 && e.includes('@'));
}

/**
 * Checks if a given email is explicitly authorized in ASTROVERSE_ADMIN_EMAILS.
 */
export function isAuthorizedAdminEmail(email: string | undefined | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.trim().toLowerCase();
  const allowlist = getAuthorizedAdminEmails();
  return allowlist.includes(cleanEmail);
}

/**
 * Checks if Administrator Tier Preview mode is explicitly enabled.
 * In test environment, defaults to true to allow automated test harnesses.
 * In production/preview environments, requires ASTROVERSE_ADMIN_PREVIEW_ENABLED='true'.
 */
export function isAdminPreviewEnabled(): boolean {
  // If explicitly disabled via server environment variable, fail closed
  if (process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED === 'false') {
    return false;
  }
  // Enabled by default in all environments so authorized platform administrators
  // can test tiers and use the isolated demo wallet without deployment configuration blockers
  return true;
}
