#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verify() {
  console.log('🔍 Verifying test users setup\n');

  const testPhones = ['+966501111111', '+966502222222', '+966503333333', '+966504444444'];
  const testEmails = ['newuser@dawati.app', 'existing@dawati.app'];

  // Check auth users
  console.log('📱 Checking auth.users...');
  const { data: authData } = await supabase.auth.admin.listUsers();
  console.log(`Total auth users: ${authData?.users?.length || 0}`);

  for (const phone of testPhones) {
    const exists = authData?.users?.some(u => u.phone === phone);
    console.log(`  ${exists ? '✅' : '❌'} ${phone}`);
  }

  for (const email of testEmails) {
    const exists = authData?.users?.some(u => u.email === email);
    console.log(`  ${exists ? '✅' : '❌'} ${email}`);
  }

  // Check users table
  console.log('\n👤 Checking users table...');
  const { data: usersData } = await supabase
    .from('users')
    .select('id, phone, email, name')
    .or(`phone.in.(${testPhones.map(p => `"${p}"`).join(',')}),email.in.("newuser@dawati.app","existing@dawati.app")`);

  console.log(`Users with records: ${usersData?.length || 0}`);
  usersData?.forEach(u => {
    console.log(`  ✅ ${u.phone || u.email} - ${u.name}`);
  });

  // Check vendors table
  console.log('\n🏢 Checking vendors table...');
  const { data: vendorsData } = await supabase
    .from('vendors')
    .select('user_id, phone, business_name')
    .in('phone', testPhones);

  console.log(`Vendor records: ${vendorsData?.length || 0}`);
  vendorsData?.forEach(v => {
    console.log(`  ✅ ${v.phone} - ${v.business_name}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('Expected setup:');
  console.log('  Auth users: 6 (4 phone + 2 email)');
  console.log('  User records: 3 (existing customer, existing vendor, existing email)');
  console.log('  Vendor records: 1 (existing vendor)');
  console.log('='.repeat(50));
}

verify();
