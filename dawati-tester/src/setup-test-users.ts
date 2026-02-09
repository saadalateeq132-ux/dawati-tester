#!/usr/bin/env node
/**
 * Automated Test Users Setup Script
 *
 * Creates 6 test users in Supabase for comprehensive authentication testing:
 * 1. New Customer (phone) - no user record → shows wizard
 * 2. Existing Customer (phone) - has user record → skip wizard
 * 3. New Vendor (phone) - no records → shows vendor wizard
 * 4. Existing Vendor (phone) - has user + vendor → skip wizard
 * 5. New Email User - no user record → shows wizard
 * 6. Existing Email User - has user record → skip wizard
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUser {
  phone?: string;
  email?: string;
  type: 'new_customer' | 'existing_customer' | 'new_vendor' | 'existing_vendor' | 'new_email' | 'existing_email';
  needsUserRecord: boolean;
  needsVendorRecord: boolean;
  description: string;
}

const TEST_USERS: TestUser[] = [
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

async function createAuthUser(user: TestUser): Promise<string | null> {
  const { phone, email, type, description } = user;

  console.log(`\n📱 Creating auth user: ${phone || email}`);
  console.log(`   Type: ${type}`);
  console.log(`   Expected: ${description}`);

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(
      (u) => u.phone === phone || u.email === email
    );

    if (existing) {
      console.log(`   ✅ User already exists (ID: ${existing.id})`);
      return existing.id;
    }

    // Create new auth user
    const { data, error } = await supabase.auth.admin.createUser({
      phone: phone,
      email: email,
      phone_confirm: phone ? true : undefined,
      email_confirm: email ? true : undefined,
      user_metadata: {
        test_user: true,
        test_type: type,
      },
    });

    if (error) {
      console.error(`   ❌ Error creating auth user: ${error.message}`);
      return null;
    }

    if (!data.user) {
      console.error(`   ❌ No user returned from createUser`);
      return null;
    }

    console.log(`   ✅ Auth user created (ID: ${data.user.id})`);
    return data.user.id;
  } catch (error) {
    console.error(`   ❌ Exception: ${error}`);
    return null;
  }
}

async function createUserRecord(userId: string, user: TestUser): Promise<boolean> {
  const { phone, email, type } = user;

  console.log(`   📝 Creating user record in 'users' table...`);

  try {
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
      role: null, // Let app set role on first login
      is_vendor: type.includes('vendor'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

    if (error) {
      console.error(`   ❌ Error creating user record: ${error.message}`);
      return false;
    }

    console.log(`   ✅ User record created`);
    return true;
  } catch (error) {
    console.error(`   ❌ Exception: ${error}`);
    return false;
  }
}

async function createVendorRecord(userId: string, user: TestUser): Promise<boolean> {
  const { phone } = user;

  console.log(`   🏢 Creating vendor record in 'vendors' table...`);

  try {
    const { error } = await supabase.from('vendors').upsert({
      user_id: userId,
      business_name: 'Test Vendor Business',
      business_name_ar: 'أعمال بائع الاختبار',
      business_type: 'catering',
      city: 'Riyadh',
      phone: phone,
      is_approved: true,
      is_active: true,
      rating: 4.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

    if (error) {
      console.error(`   ❌ Error creating vendor record: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Vendor record created`);
    return true;
  } catch (error) {
    console.error(`   ❌ Exception: ${error}`);
    return false;
  }
}

async function verifySetup(): Promise<void> {
  console.log('\n🔍 Verifying setup...\n');

  // Check auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const testAuthUsers = authUsers?.users?.filter(
    (u) => TEST_USERS.some((tu) => tu.phone === u.phone || tu.email === u.email)
  ) || [];

  console.log(`✅ Auth users created: ${testAuthUsers.length}/6`);

  // Check user records
  const { data: userRecords } = await supabase
    .from('users')
    .select('*')
    .in('phone', TEST_USERS.filter(u => u.phone).map(u => u.phone!));

  console.log(`✅ User records created: ${userRecords?.length || 0}/3 (expected)`);

  // Check vendor records
  const { data: vendorRecords } = await supabase
    .from('vendors')
    .select('*')
    .in('phone', TEST_USERS.filter(u => u.needsVendorRecord && u.phone).map(u => u.phone!));

  console.log(`✅ Vendor records created: ${vendorRecords?.length || 0}/1 (expected)`);

  console.log('\n📊 Expected Behavior:');
  for (const user of TEST_USERS) {
    const identifier = user.phone || user.email;
    console.log(`   ${identifier}: ${user.description}`);
  }

  console.log('\n✅ Setup complete! You can now run: npm run test:auth');
}

async function main() {
  console.log('🚀 Dawati Test Users Setup');
  console.log('='.repeat(50));
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Using service role key: ${SERVICE_ROLE_KEY?.substring(0, 20)}...`);
  console.log('='.repeat(50));

  let successCount = 0;
  let failCount = 0;

  for (const user of TEST_USERS) {
    try {
      // Step 1: Create auth user
      const userId = await createAuthUser(user);
      if (!userId) {
        failCount++;
        continue;
      }

      // Step 2: Create user record (if needed)
      if (user.needsUserRecord) {
        const userCreated = await createUserRecord(userId, user);
        if (!userCreated) {
          failCount++;
          continue;
        }
      }

      // Step 3: Create vendor record (if needed)
      if (user.needsVendorRecord) {
        const vendorCreated = await createVendorRecord(userId, user);
        if (!vendorCreated) {
          failCount++;
          continue;
        }
      }

      successCount++;
      console.log(`   ✅ Setup complete for ${user.phone || user.email}`);
    } catch (error) {
      console.error(`   ❌ Failed to set up ${user.phone || user.email}: ${error}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}/${TEST_USERS.length}`);
  console.log(`❌ Failed: ${failCount}/${TEST_USERS.length}`);
  console.log('='.repeat(50));

  if (successCount === TEST_USERS.length) {
    await verifySetup();
  } else {
    console.log('\n⚠️  Some users failed to set up. Please check errors above.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
