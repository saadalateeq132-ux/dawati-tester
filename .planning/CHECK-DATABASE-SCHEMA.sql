-- ============================================
-- CHECK DATABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor to see what tables exist
-- and understand your database structure

-- ============================================
-- STEP 1: List all tables in your database
-- ============================================
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- STEP 2: Check if common user tables exist
-- ============================================
-- This will show which of these tables exist:
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
      THEN '✅ profiles exists'
    ELSE '❌ profiles NOT FOUND'
  END as profiles_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
      THEN '✅ users exists'
    ELSE '❌ users NOT FOUND'
  END as users_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers')
      THEN '✅ customers exists'
    ELSE '❌ customers NOT FOUND'
  END as customers_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hosts')
      THEN '✅ hosts exists'
    ELSE '❌ hosts NOT FOUND'
  END as hosts_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors')
      THEN '✅ vendors exists'
    ELSE '❌ vendors NOT FOUND'
  END as vendors_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_businesses')
      THEN '✅ vendor_businesses exists'
    ELSE '❌ vendor_businesses NOT FOUND'
  END as vendor_businesses_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses')
      THEN '✅ businesses exists'
    ELSE '❌ businesses NOT FOUND'
  END as businesses_status;

-- ============================================
-- STEP 3: Get all auth users (this should work)
-- ============================================
SELECT
  id,
  phone,
  email,
  created_at,
  email_confirmed_at,
  phone_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- STEP 4: Check what columns exist in main tables
-- ============================================
-- Uncomment the table you want to inspect:

-- For profiles table (if it exists):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;

-- For users table (if it exists):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- For customers table (if it exists):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'customers'
-- ORDER BY ordinal_position;

-- For vendors table (if it exists):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'vendors'
-- ORDER BY ordinal_position;

-- For vendor_businesses table (if it exists):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'vendor_businesses'
-- ORDER BY ordinal_position;

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Run STEP 1 to see all tables
-- 2. Run STEP 2 to see which user tables exist
-- 3. Run STEP 3 to see auth users (should work)
-- 4. Run STEP 4 (uncomment the table you want to inspect)
-- 5. Share the results so we can create the correct SQL
-- ============================================
