#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createVendorRecord() {
  console.log('🏢 Creating vendor record for +966504444444...\n');

  // Find the user record
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('phone', '+966504444444')
    .single();

  if (!user) {
    console.error('❌ User record not found for +966504444444');
    return;
  }

  console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);

  // Check if vendor already exists
  const { data: existingVendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (existingVendor) {
    console.log('✅ Vendor record already exists!');
    return;
  }

  // Create vendor record
  const { error } = await supabase.from('vendors').insert({
    user_id: user.id,
    business_name: 'Test Vendor Business',
    business_name_ar: 'أعمال بائع الاختبار',
    category: 'catering',
    service_description: 'Test vendor for automated testing',
    service_description_ar: 'بائع اختبار للاختبار الآلي',
    city: 'Riyadh',
    location: 'Riyadh, Saudi Arabia',
    location_ar: 'الرياض، المملكة العربية السعودية',
    phone: '+966504444444',
    status: 'approved', // Try approved instead of active
    verified: true,
    is_visible: true,
    rating: 4.5,
    review_count: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`❌ Error creating vendor: ${error.message}`);
    return;
  }

  console.log('✅ Vendor record created successfully!\n');
  console.log('🎉 Setup complete! Now run: npm run test:auth');
}

createVendorRecord();
