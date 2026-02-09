-- ============================================
-- Dawati Test Users Setup Script
-- ============================================
-- Run this in Supabase SQL Editor AFTER creating auth users manually
--
-- IMPORTANT: First create these users in Supabase Dashboard → Authentication → Users:
-- 1. +966501111111 (New Customer - no profile needed)
-- 2. +966502222222 (Existing Customer - will get profile below)
-- 3. +966503333333 (New Vendor - no profile needed)
-- 4. +966504444444 (Existing Vendor - will get profile + business below)
-- 5. newuser@dawati.app (New Email - no profile needed)
-- 6. existing@dawati.app (Existing Email - will get profile below)
--
-- Enable Test OTP: 966501111111=123456,966502222222=123456,966503333333=123456,966504444444=123456,966500000001=123456
-- ============================================

-- ============================================
-- STEP 1: Verify Auth Users Exist
-- ============================================
-- Run this first to get the user IDs
SELECT
  id,
  phone,
  email,
  created_at,
  CASE
    WHEN phone = '+966501111111' THEN 'New Customer (no profile)'
    WHEN phone = '+966502222222' THEN 'Existing Customer (needs profile)'
    WHEN phone = '+966503333333' THEN 'New Vendor (no profile)'
    WHEN phone = '+966504444444' THEN 'Existing Vendor (needs profile + business)'
    WHEN email = 'newuser@dawati.app' THEN 'New Email User (no profile)'
    WHEN email = 'existing@dawati.app' THEN 'Existing Email User (needs profile)'
  END as user_type
FROM auth.users
WHERE phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444', '+966500000001')
   OR email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY created_at;

-- ============================================
-- STEP 2: Create Profiles for EXISTING Users Only
-- ============================================
-- IMPORTANT: Replace 'PASTE_USER_ID_HERE' with actual IDs from Step 1

-- Profile for EXISTING CUSTOMER (+966502222222)
INSERT INTO profiles (
  id, -- Must match auth.users.id
  phone,
  full_name,
  display_name,
  avatar_url,
  bio,
  language_preference,
  notification_preferences,
  created_at,
  updated_at
) VALUES (
  'PASTE_USER_ID_HERE', -- Get from Step 1 query for +966502222222
  '+966502222222',
  'Test Customer Existing',
  'Test Customer',
  NULL,
  'This is a test customer with existing profile for automated testing',
  'ar',
  '{"email": true, "push": true, "sms": false}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Profile for EXISTING EMAIL USER (existing@dawati.app)
INSERT INTO profiles (
  id, -- Must match auth.users.id
  email,
  full_name,
  display_name,
  avatar_url,
  bio,
  language_preference,
  notification_preferences,
  created_at,
  updated_at
) VALUES (
  'PASTE_USER_ID_HERE', -- Get from Step 1 query for existing@dawati.app
  'existing@dawati.app',
  'Test Email User Existing',
  'Test Email',
  NULL,
  'This is a test email user with existing profile for automated testing',
  'en',
  '{"email": true, "push": true, "sms": false}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Profile for EXISTING VENDOR (+966504444444)
INSERT INTO profiles (
  id, -- Must match auth.users.id
  phone,
  full_name,
  display_name,
  avatar_url,
  bio,
  language_preference,
  notification_preferences,
  created_at,
  updated_at
) VALUES (
  'PASTE_USER_ID_HERE', -- Get from Step 1 query for +966504444444
  '+966504444444',
  'Test Vendor Existing',
  'Test Vendor',
  NULL,
  'This is a test vendor with existing business for automated testing',
  'ar',
  '{"email": true, "push": true, "sms": false}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- ============================================
-- STEP 3: Create Vendor Business for EXISTING VENDOR
-- ============================================
-- IMPORTANT: Replace 'PASTE_VENDOR_USER_ID_HERE' with ID from Step 1 for +966504444444

INSERT INTO vendor_businesses (
  id,
  owner_id, -- Must match the user ID from Step 1
  phone,
  business_name,
  business_name_ar,
  business_type,
  description,
  description_ar,
  city,
  city_ar,
  address,
  address_ar,
  is_approved,
  is_active,
  rating,
  total_bookings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'PASTE_VENDOR_USER_ID_HERE', -- Get from Step 1 query for +966504444444
  '+966504444444',
  'Test Vendor Business',
  'أعمال بائع الاختبار',
  'catering', -- Options: catering, photography, decoration, entertainment, venue
  'This is a test vendor business for automated testing. Full service catering company.',
  'أعمال بائع اختبار للاختبار الآلي. شركة تموين كاملة الخدمات.',
  'Riyadh',
  'الرياض',
  '123 Test Street, Riyadh',
  'شارع الاختبار 123، الرياض',
  true, -- Approved
  true, -- Active
  4.5, -- Rating
  10, -- Total bookings
  NOW(),
  NOW()
) ON CONFLICT (owner_id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  is_approved = true,
  is_active = true,
  updated_at = NOW();

-- ============================================
-- STEP 4: Verification Queries
-- ============================================

-- Check profiles created (should see 3: existing customer, existing email, existing vendor)
SELECT
  p.id,
  p.phone,
  p.email,
  p.full_name,
  'HAS PROFILE' as status
FROM profiles p
WHERE p.phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444', '+966500000001')
   OR p.email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY p.created_at;

-- Check vendor businesses (should see 1: existing vendor)
SELECT
  vb.id,
  vb.phone,
  vb.business_name,
  vb.business_name_ar,
  vb.is_approved,
  vb.is_active,
  'HAS BUSINESS' as status
FROM vendor_businesses vb
WHERE vb.phone IN ('+966503333333', '+966504444444')
ORDER BY vb.created_at;

-- Final verification: Show which users need onboarding vs dashboard
SELECT
  au.id,
  au.phone,
  au.email,
  CASE
    WHEN p.id IS NOT NULL THEN 'HAS PROFILE'
    ELSE 'NO PROFILE (will see wizard)'
  END as profile_status,
  CASE
    WHEN vb.id IS NOT NULL THEN 'HAS BUSINESS'
    ELSE 'NO BUSINESS'
  END as business_status,
  CASE
    WHEN au.phone = '+966501111111' THEN 'Expected: Customer Onboarding Wizard'
    WHEN au.phone = '+966502222222' THEN 'Expected: Dashboard (skip wizard)'
    WHEN au.phone = '+966503333333' THEN 'Expected: Vendor Registration Wizard'
    WHEN au.phone = '+966504444444' THEN 'Expected: Vendor Dashboard (skip wizard)'
    WHEN au.email = 'newuser@dawati.app' THEN 'Expected: Customer Onboarding Wizard'
    WHEN au.email = 'existing@dawati.app' THEN 'Expected: Dashboard (skip wizard)'
    WHEN au.phone = '+966500000001' THEN 'Expected: Depends on profile status'
  END as expected_behavior
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN vendor_businesses vb ON vb.owner_id = au.id
WHERE au.phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444', '+966500000001')
   OR au.email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY au.created_at;

-- ============================================
-- EXPECTED RESULTS AFTER SETUP:
-- ============================================
-- +966501111111 → NO PROFILE → Shows Customer Onboarding Wizard ✅
-- +966502222222 → HAS PROFILE → Skip wizard, go to Dashboard ✅
-- +966503333333 → NO PROFILE, NO BUSINESS → Shows Vendor Registration Wizard ✅
-- +966504444444 → HAS PROFILE, HAS BUSINESS → Skip wizard, go to Vendor Dashboard ✅
-- newuser@dawati.app → NO PROFILE → Shows Customer Onboarding Wizard ✅
-- existing@dawati.app → HAS PROFILE → Skip wizard, go to Dashboard ✅
-- ============================================
