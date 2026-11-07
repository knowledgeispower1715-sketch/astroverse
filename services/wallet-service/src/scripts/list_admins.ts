import { db, Role, UserRecord } from '../db';

async function main() {
  const result = await db.listUsers({ page: 1, limit: 100 });
  const users: UserRecord[] = result.users;
  const admins = users.filter((u: UserRecord) => u.role !== Role.USER);
  console.log('Total users in DB:', users.length);
  console.log('Admins count:', admins.length);
  admins.forEach((a: UserRecord) => {
    console.log({
      id: a.id,
      email: a.email,
      phone: a.phone,
      role: a.role,
      status: a.status,
      mfaEnabled: a.mfaEnabled,
      mfaEnforced: a.mfaEnforced,
      hasPassword: Boolean(a.passwordHash),
      hasMfaSecret: Boolean(a.mfaSecret)
    });
  });
}

main().catch(console.error);
