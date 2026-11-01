import dotenv from 'dotenv';
dotenv.config();
import { db } from '../db';
import { isAnyAdmin } from '../security/permissions';

export async function resetAdminMfa(email: string) {
  if (!email || !email.includes('@')) {
    throw new Error('A valid administrator email address is required (e.g. --email owner@example.com).');
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await db.findUserByIdentifier(cleanEmail);

  if (!user) {
    throw new Error(`User "${cleanEmail}" not found in database.`);
  }

  if (!isAnyAdmin(user.role)) {
    throw new Error(`User "${cleanEmail}" does not have an administrative role (current role: ${user.role}).`);
  }

  await db.updateUser(user.id, {
    mfaEnabled: false,
    mfaSecret: null,
    mfaRecoveryCodes: []
  });

  await db.recordAuditEvent({
    userId: user.id,
    action: 'ADMIN_MFA_RESET_CLI',
    targetType: 'USER',
    targetId: user.id,
    outcome: 'SUCCESS',
    metadata: {
      email: cleanEmail,
      timestamp: new Date().toISOString()
    },
    ipAddress: '127.0.0.1'
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mfaEnabled: false
    }
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let email = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' || arg === '-e') {
      email = args[++i];
    } else if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    }
  }

  if (!email) {
    console.error('Error: --email parameter is required.');
    console.error('Usage: npm run admin:reset-mfa -- --email <email>');
    process.exit(1);
  }

  resetAdminMfa(email)
    .then((res) => {
      console.log(`[AstroVerse Admin Security] Successfully reset MFA for administrator:`);
      console.log(`  User ID:    ${res.user.id}`);
      console.log(`  Email:      ${res.user.email}`);
      console.log(`  Role:       ${res.user.role}`);
      console.log(`  mfaEnabled: ${res.user.mfaEnabled}`);
      console.log(`Administrator can now log in with password and re-enroll MFA.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[AstroVerse Admin MFA Reset Error] ${err.message}`);
      process.exit(1);
    });
}
