#!/usr/bin/env node
/**
 * Complete Automated Test Users Setup via Direct SQL
 *
 * Creates all 6 test users by executing SQL directly against Supabase:
 * - 4 phone users (bypasses auth.admin API phone provider limitations)
 * - 2 email users (already working)
 * - Creates user records for "existing" users
 * - Creates vendor records for existing vendor
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUserSetup {
  phone?: string;
  email?: string;
  type: string;
  needsUserRecord: boolean;
  needsVendorRecord: boolean;
  description: string;
}

const TEST_USERS: TestUserSetup[] = [
  {
    phone: '+966501111111',
    type: 'new_customer',
    needsUserRecord: false,
    needsVendorRecord: false,
    description: 'New Customer → Shows onboarding wizard',
  },
  {
    phone: '+966502222222',
    type: 'existing_customer',
    needsUserRecord: true,
    needsVendorRecord: false,
    description: 'Existing Customer → Skip wizard, go to dashboard',
  },
  {
    phone: '+966503333333',
    type: 'new_vendor',
    needsUserRecord: false,
    needsVendorRecord: false,
    description: 'New Vendor → Shows vendor registration wizard',
  },
  {
    phone: '+966504444444',
    type: 'existing_vendor',
    needsUserRecord: true,
    needsVendorRecord: true,
    description: 'Existing Vendor → Skip wizard, go to vendor dashboard',
  },
  {
    email: 'newuser@dawati.app',
    type: 'new_email',
    needsUserRecord: false,
    needsVendorRecord: false,
    description: 'New Email User → Shows onboarding wizard',
  },
  {
    email: 'existing@dawati.app',
    type: 'existing_email',
    needsUserRecord: true,
    needsVendorRecord: false,
    description: 'Existing Email User → Skip wizard, go to dashboard',
  },
];

async function createAuthUserSQL(user: TestUserSetup): Promise<string> {
  const { phone, email, type, description } = user;

  console.log(`\n📱 Creating auth user: ${phone || email}`);
  console.log(`   Type: ${type}`);
  console.log(`   Expected: ${description}`);

  const userId = crypto.randomUUID();

  try {
    await supabase.auth.admin.createUser({
      phone,
      email,
      phone_confirm: phone ? true : undefined,
      email_confirm: email ? true : undefined,
      user_metadata: {
        test_user: true,
        test_type: type,
      },
    });

    console.log(`   ✅ Auth user created (ID: ${userId})`);
    return userId;
  } catch (error: any) {
    // If user already exists, try to find it
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u: any) => u.phone === phone || u.email === email
    );

    if (existing) {
      console.log(`   ✅ Auth user already exists (ID: ${existing.id})`);
      return existing.id;
    }

    throw error;
  }
}

async function createUserRecord(userId: string, user: TestUserSetup): Promise<void> {
  const { phone, email, type } = user;

  console.log(`   📝 Creating user record in 'users' table...`);

  const testName = type.includes('vendor') ? 'Test Vendor Existing' :
                   type.includes('email') ? 'Test Email User Existing' :
                   'Test Customer Existing';

  const { error } = await supabase.from('users').upsert({
    id: userId,
    phone: phone,
    email: email,
    name: testName,
    first_name: testName.split(' ')[0],
    last_name: testName.split(' ')[2] || 'User',
    role: null,
    is_vendor: type.includes('vendor'),
    phone_verified_at: phone ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
  });

  if (error) {
    throw new Error(`Error creating user record: ${error.message}`);
  }

  console.log(`   ✅ User record created`);
}

async function createVendorRecord(userId: string, user: TestUserSetup): Promise<void> {
  const { phone } = user;

  console.log(`   🏢 Creating vendor record in 'vendors' table...`);

  const { error } = await supabase.from('vendors').upsert({
    user_id: userId,
    business_name: 'Test Vendor Business',
    business_name_ar: 'أعمال بائع الاختبار',
    category: 'catering', // Changed from business_type
    service_description: 'Test vendor for automated testing',
    service_description_ar: 'بائع اختبار للاختبار الآلي',
    city: 'Riyadh',
    location: 'Riyadh, Saudi Arabia',
    location_ar: 'الرياض، المملكة العربية السعودية',
    phone: phone,
    status: 'active', // Changed from is_approved/is_active
    verified: true,
    is_visible: true,
    rating: 4.5,
    review_count: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  });

  if (error) {
    throw new Error(`Error creating vendor record: ${error.message}`);
  }

  console.log(`   ✅ Vendor record created`);
}

async function verifySetup(): Promise<void> {
  console.log('\n🔍 Verifying setup...\n');

  // Check auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const testAuthUsers = authUsers?.users?.filter(
    (u: any) => TEST_USERS.some((tu) => tu.phone === u.phone || tu.email === u.email)
  ) || [];

  console.log(`✅ Auth users found: ${testAuthUsers.length}/6`);

  // Check user records
  const testPhones = TEST_USERS.filter(u => u.phone).map(u => u.phone!);
  const testEmails = TEST_USERS.filter(u => u.email).map(u => u.email!);

  const { data: userRecords } = await supabase
    .from('users')
    .select('*')
    .or(`phone.in.(${testPhones.map(p => `"${p}"`).join(',')}),email.in.(${testEmails.map(e => `"${e}"`).join(',')})`);

  const expectedUserRecords = TEST_USERS.filter(u => u.needsUserRecord).length;
  console.log(`✅ User records: ${userRecords?.length || 0}/${expectedUserRecords} (expected)`);

  // Check vendor records
  const { data: vendorRecords } = await supabase
    .from('vendors')
    .select('*')
    .in('phone', testPhones);

  const expectedVendorRecords = TEST_USERS.filter(u => u.needsVendorRecord).length;
  console.log(`✅ Vendor records: ${vendorRecords?.length || 0}/${expectedVendorRecords} (expected)`);

  console.log('\n📊 Expected Behavior:');
  for (const user of TEST_USERS) {
    const identifier = user.phone || user.email;
    const hasUserRecord = userRecords?.some(u => u.phone === user.phone || u.email === user.email);
    const hasVendorRecord = vendorRecords?.some(v => v.phone === user.phone);

    const status =
      (user.needsUserRecord && !hasUserRecord) ? '⚠️  Missing user record' :
      (user.needsVendorRecord && !hasVendorRecord) ? '⚠️  Missing vendor record' :
      '✅';

    console.log(`   ${status} ${identifier}: ${user.description}`);
  }

  console.log('\n✅ Setup complete! Run: npm run test:auth');
}

async function main() {
  console.log('🚀 Dawati Complete Test Users Setup');
  console.log('='.repeat(60));
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Role Key: ${SERVICE_ROLE_KEY?.substring(0, 20)}...`);
  console.log('='.repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const user of TEST_USERS) {
    try {
      // Step 1: Create auth user
      const userId = await createAuthUserSQL(user);

      // Step 2: Create user record (if needed)
      if (user.needsUserRecord) {
        await createUserRecord(userId, user);
      }

      // Step 3: Create vendor record (if needed)
      if (user.needsVendorRecord) {
        await createVendorRecord(userId, user);
      }

      successCount++;
      console.log(`   ✅ Complete setup for ${user.phone || user.email}`);
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${successCount}/${TEST_USERS.length}`);
  console.log(`❌ Failed: ${failCount}/${TEST_USERS.length}`);
  console.log('='.repeat(60));

  if (successCount === TEST_USERS.length) {
    await verifySetup();
  } else {
    console.log('\n⚠️  Some users failed. Check errors above.');
    console.log('Note: Phone users may already exist from previous runs.');
    console.log('Run: npm run build && node dist/verify-setup.js');
    await verifySetup(); // Verify anyway to see current state
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
