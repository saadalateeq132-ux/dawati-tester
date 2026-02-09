-- ============================================
-- Dawati Test Users Setup Script (CORRECT VERSION)
-- ============================================
-- Based on actual database schema with 'users' and 'vendors' tables
--
-- Run this in Supabase SQL Editor AFTER creating auth users manually
--
-- IMPORTANT: First create these users in Supabase Dashboard → Authentication → Users:
-- 1. +966501111111 (New Customer - no user record needed)
-- 2. +966502222222 (Existing Customer - will get user record below)
-- 3. +966503333333 (New Vendor - no user/vendor record needed)
-- 4. +966504444444 (Existing Vendor - will get user + vendor record below)
-- 5. newuser@dawati.app (New Email - no user record needed)
-- 6. existing@dawati.app (Existing Email - will get user record below)
--
-- Enable Test OTP (try line-by-line format):
-- 966501111111=123456
-- 966502222222=123456
-- 966503333333=123456
-- 966504444444=123456
-- 966500000001=123456
-- ============================================

-- ============================================
-- STEP 1: Verify Auth Users Exist
-- ============================================
SELECT
  id,
  phone,
  email,
  created_at,
  CASE
    WHEN phone = '+966501111111' THEN 'New Customer (no user record)'
    WHEN phone = '+966502222222' THEN 'Existing Customer (needs user record)'
    WHEN phone = '+966503333333' THEN 'New Vendor (no records)'
    WHEN phone = '+966504444444' THEN 'Existing Vendor (needs user + vendor)'
    WHEN email = 'newuser@dawati.app' THEN 'New Email User (no user record)'
    WHEN email = 'existing@dawati.app' THEN 'Existing Email User (needs user record)'
    WHEN phone = '+966500000001' THEN 'Your working test phone'
  END as user_type
FROM auth.users
WHERE phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444', '+966500000001')
   OR email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY created_at;

-- ============================================
-- STEP 2: Create User Records for EXISTING Users Only
-- ============================================
-- IMPORTANT: Replace 'PASTE_AUTH_USER_ID_HERE' with actual IDs from Step 1

-- User record for EXISTING CUSTOMER (+966502222222)
INSERT INTO users (
  id, -- Must match auth.users.id
  phone,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'PASTE_AUTH_USER_ID_HERE', -- Get from Step 1 for +966502222222
  '+966502222222',
  'Test Customer Existing',
  'customer', -- or 'user' - check your schema
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- User record for EXISTING EMAIL USER (existing@dawati.app)
INSERT INTO users (
  id, -- Must match auth.users.id
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'PASTE_AUTH_USER_ID_HERE', -- Get from Step 1 for existing@dawati.app
  'existing@dawati.app',
  'Test Email User Existing',
  'customer', -- or 'user' - check your schema
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- User record for EXISTING VENDOR (+966504444444)
INSERT INTO users (
  id, -- Must match auth.users.id
  phone,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'PASTE_AUTH_USER_ID_HERE', -- Get from Step 1 for +966504444444
  '+966504444444',
  'Test Vendor Existing',
  'vendor',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- ============================================
-- STEP 3: Create Vendor Record for EXISTING VENDOR
-- ============================================
-- IMPORTANT: Replace 'PASTE_VENDOR_USER_ID_HERE' with ID from Step 1 for +966504444444

INSERT INTO vendors (
  id,
  user_id, -- Links to users.id (which = auth.users.id)
  business_name,
  business_name_ar,
  business_type,
  city,
  phone,
  is_approved,
  is_active,
  rating,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'PASTE_VENDOR_USER_ID_HERE', -- Same ID as above for +966504444444
  'Test Vendor Business',
  'أعمال بائع الاختبار',
  'catering', -- Options: catering, photography, decoration, entertainment, venue
  'Riyadh',
  '+966504444444',
  true, -- Approved
  true, -- Active
  4.5, -- Rating
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  is_approved = true,
  is_active = true,
  updated_at = NOW();

-- ============================================
-- STEP 4: Verification Queries
-- ============================================

-- Check which users have user records (should see 3: existing customer, existing email, existing vendor)
SELECT
  u.id,
  u.phone,
  u.email,
  u.full_name,
  u.role,
  'HAS USER RECORD' as status
FROM users u
WHERE u.phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444', '+966500000001')
   OR u.email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY u.created_at;

-- Check which users have vendor records (should see 1: existing vendor)
SELECT
  v.id,
  v.phone,
  v.business_name,
  v.business_name_ar,
  v.is_approved,
  v.is_active,
  'HAS VENDOR RECORD' as status
FROM vendors v
WHERE v.phone IN ('+966503333333', '+966504444444')
ORDER BY v.created_at;

-- Final verification: Show which users need onboarding vs dashboard
SELECT
  au.id,
  au.phone,
  au.email,
  CASE
    WHEN u.id IS NOT NULL THEN '✅ HAS USER RECORD'
    ELSE '❌ NO USER RECORD (will see wizard)'
  END as user_status,
  CASE
    WHEN v.id IS NOT NULL THEN '✅ HAS VENDOR RECORD'
    ELSE '❌ NO VENDOR RECORD'
  END as vendor_status,
  CASE
    WHEN au.phone = '+966501111111' THEN 'Expected: Customer Onboarding Wizard'
    WHEN au.phone = '+966502222222' THEN 'Expected: Dashboard (skip wizard)'
    WHEN au.phone = '+966503333333' THEN 'Expected: Vendor Registration Wizard'
    WHEN au.phone = '+966504444444' THEN 'Expected: Vendor Dashboard (skip wizard)'
    WHEN au.email = 'newuser@dawati.app' THEN 'Expected: Customer Onboarding Wizard'
    WHEN au.email = 'existing@dawati.app' THEN 'Expected: Dashboard (skip wizard)'
    WHEN au.phone = '+966500000001' THEN 'Expected: Depends on user status'
  END as expected_behavior
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN vendors v ON v.user_id = au.id
WHERE au.phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444', '+966500000001')
   OR au.email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY au.created_at;

-- ============================================
-- EXPECTED RESULTS AFTER SETUP:
-- ============================================
-- +966501111111 → NO USER RECORD → Shows Customer Onboarding Wizard ✅
-- +966502222222 → HAS USER RECORD → Skip wizard, go to Dashboard ✅
-- +966503333333 → NO USER/VENDOR RECORDS → Shows Vendor Registration Wizard ✅
-- +966504444444 → HAS USER + VENDOR RECORDS → Skip wizard, go to Vendor Dashboard ✅
-- newuser@dawati.app → NO USER RECORD → Shows Customer Onboarding Wizard ✅
-- existing@dawati.app → HAS USER RECORD → Skip wizard, go to Dashboard ✅
-- ============================================

-- ============================================
-- OPTIONAL: Check users table schema
-- ============================================
-- Uncomment to see all columns in users table
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- ============================================
-- OPTIONAL: Check vendors table schema
-- ============================================
-- Uncomment to see all columns in vendors table
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'vendors'
-- ORDER BY ordinal_position;
