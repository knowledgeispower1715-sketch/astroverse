import dotenv from 'dotenv';
dotenv.config();
import { db, Role, AccountStatus } from '../db';
import { normalizeRole, isAnyAdmin } from '../security/permissions';

export const CANONICAL_ADMIN_ROLES = [
  Role.OWNER,
  Role.SECURITY_ADMIN,
  Role.SUPPORT_ADMIN,
  Role.CONTENT_EDITOR,
  Role.FINANCE_ADMIN,
  Role.ASTROLOGY_OPS_ADMIN,
  Role.READONLY_ANALYST
];

export interface ProvisionAdminOptions {
  email: string;
  role?: string;
  displayName?: string;
  password?: string;
}

export async function provisionAdmin(options: ProvisionAdminOptions) {
  const { email, role = 'OWNER', displayName, password } = options;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('A valid email address is required (e.g. --email owner@example.com).');
  }

  const cleanEmail = email.trim().toLowerCase();
  const rawRole = (role || 'OWNER').toUpperCase();
  const targetRole = normalizeRole(rawRole);

  if (!isAnyAdmin(targetRole)) {
    throw new Error(
      `Invalid administrator role: "${role}". Allowed roles: ${CANONICAL_ADMIN_ROLES.join(', ')}.`
    );
  }

  let passwordHash: string | undefined;
  let passwordSalt: string | undefined;
  if (password && typeof password === 'string') {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    const crypto = await import('crypto');
    passwordSalt = crypto.randomBytes(16).toString('hex');
    passwordHash = crypto.scryptSync(password, passwordSalt, 64).toString('hex');
  }

  let user = await db.findUserByIdentifier(cleanEmail);
  let action: 'CREATED' | 'PROMOTED';

  if (!user) {
    const name = displayName || cleanEmail.split('@')[0];
    user = await db.createUser({
      email: cleanEmail,
      displayName: name,
      emailVerified: true,
      phoneVerified: false,
      role: targetRole,
      status: AccountStatus.ACTIVE,
      passwordHash: passwordHash || null,
      passwordSalt: passwordSalt || null,
      walletBalance: 0.00
    });
    action = 'CREATED';
  } else {
    const updateData: any = {
      role: targetRole,
      emailVerified: true,
      status: AccountStatus.ACTIVE,
      lastLoginAt: new Date().toISOString()
    };
    if (passwordHash && passwordSalt) {
      updateData.passwordHash = passwordHash;
      updateData.passwordSalt = passwordSalt;
    }
    user = await db.updateUser(user.id, updateData);
    action = 'PROMOTED';
  }

  await db.recordAuditEvent({
    userId: user.id,
    action: 'ADMIN_CLI_PROVISION',
    targetType: 'USER',
    targetId: user.id,
    outcome: 'SUCCESS',
    metadata: {
      action,
      email: cleanEmail,
      assignedRole: targetRole,
      timestamp: new Date().toISOString()
    },
    ipAddress: '127.0.0.1'
  });

  return {
    action,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status
    }
  };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  let email = '';
  let role = 'OWNER';
  let displayName = '';
  let password = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' || arg === '-e') {
      email = args[++i];
    } else if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    } else if (arg === '--role' || arg === '-r') {
      role = args[++i];
    } else if (arg.startsWith('--role=')) {
      role = arg.split('=')[1];
    } else if (arg === '--name' || arg === '-n') {
      displayName = args[++i];
    } else if (arg.startsWith('--name=')) {
      displayName = arg.split('=')[1];
    } else if (arg === '--password' || arg === '-p') {
      password = args[++i];
    } else if (arg.startsWith('--password=')) {
      password = arg.split('=')[1];
    }
  }

  if (!email) {
    console.error('Error: --email parameter is required.');
    console.error('Usage: npm run admin:provision -- --email <email> [--password <pwd>] [--role OWNER|SECURITY_ADMIN|...] [--name "Admin Name"]');
    process.exit(1);
  }

  provisionAdmin({ email, role, displayName, password })
    .then((result) => {
      console.log(`[AstroVerse Provisioning] Successfully ${result.action.toLowerCase()} administrator:`);
      console.log(`  User ID:      ${result.user.id}`);
      console.log(`  Email:        ${result.user.email}`);
      console.log(`  Display Name: ${result.user.displayName}`);
      console.log(`  Role:         ${result.user.role}`);
      console.log(`  Status:       ${result.user.status}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[AstroVerse Provisioning Error] ${err.message}`);
      process.exit(1);
    });
}
