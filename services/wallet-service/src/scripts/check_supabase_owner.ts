import dotenv from 'dotenv';
dotenv.config();
import { getSupabaseAdminClient } from '../supabase';

async function checkSupabaseUsers() {
  const supa = getSupabaseAdminClient();
  if (!supa) {
    console.log('Supabase admin client not available');
    return;
  }

  const { data, error } = await supa.auth.admin.listUsers();
  if (error) {
    console.error('Error listing Supabase users:', error);
    return;
  }

  console.log('Total Supabase users:', data.users.length);
  const owner = data.users.find(u => u.email === 'tiwariji0028@gmail.com');
  if (owner) {
    console.log('Owner in Supabase Auth found:');
    console.log({
      id: owner.id,
      email: owner.email,
      factors: owner.factors,
      created_at: owner.created_at,
      app_metadata: owner.app_metadata,
      user_metadata: owner.user_metadata
    });
  } else {
    console.log('tiwariji0028@gmail.com NOT found in Supabase Auth list.');
    console.log('First 5 Supabase users:', data.users.slice(0, 5).map(u => ({ id: u.id, email: u.email })));
  }
}

checkSupabaseUsers().catch(console.error);
