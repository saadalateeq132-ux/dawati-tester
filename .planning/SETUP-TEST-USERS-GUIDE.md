# Complete Test Users Setup Guide

**Created:** 2026-02-09
**Purpose:** Set up 6 test users for comprehensive authentication testing
**Time Required:** 10-15 minutes

---

## 📋 Overview

We're creating 6 test users to test all authentication scenarios:

| Phone/Email | Auth? | Profile? | Business? | Expected Result |
|-------------|-------|----------|-----------|-----------------|
| `+966501111111` | ✅ | ❌ | ❌ | Customer onboarding wizard |
| `+966502222222` | ✅ | ✅ | ❌ | Dashboard (skip wizard) |
| `+966503333333` | ✅ | ❌ | ❌ | Vendor registration wizard |
| `+966504444444` | ✅ | ✅ | ✅ | Vendor dashboard (skip wizard) |
| `newuser@dawati.app` | ✅ | ❌ | ❌ | Customer onboarding wizard |
| `existing@dawati.app` | ✅ | ✅ | ❌ | Dashboard (skip wizard) |

---

## 🚀 Step-by-Step Setup

### Step 1: Enable Test OTP Mode

**Location:** Supabase Dashboard → Authentication → Settings → Phone Auth

1. Scroll to **"Test OTP"** section
2. Enable **"Enable phone test OTP"** toggle
3. In the text field, paste this **exact format** (no spaces, no `+`):

```
966501111111=123456,966502222222=123456,966503333333=123456,966504444444=123456,966500000001=123456
```

4. Click **Save**

**Important notes:**
- Format: `countrycode+number=otp` (no `+` prefix)
- Multiple entries separated by commas
- All numbers will accept OTP `123456`

---

### Step 2: Create Auth Users Manually

**Location:** Supabase Dashboard → Authentication → Users → "Add user manually"

Create these 6 users one by one:

#### User 1: New Customer
- **Phone:** `+966501111111`
- **Confirm Phone:** ✅ YES
- **Auto Confirm User:** ✅ YES
- Click **"Create user"**

#### User 2: Existing Customer
- **Phone:** `+966502222222`
- **Confirm Phone:** ✅ YES
- **Auto Confirm User:** ✅ YES
- Click **"Create user"**

#### User 3: New Vendor
- **Phone:** `+966503333333`
- **Confirm Phone:** ✅ YES
- **Auto Confirm User:** ✅ YES
- Click **"Create user"**

#### User 4: Existing Vendor
- **Phone:** `+966504444444`
- **Confirm Phone:** ✅ YES
- **Auto Confirm User:** ✅ YES
- Click **"Create user"**

#### User 5: New Email User
- **Email:** `newuser@dawati.app`
- **Confirm Email:** ✅ YES
- **Auto Confirm User:** ✅ YES
- Click **"Create user"**

#### User 6: Existing Email User
- **Email:** `existing@dawati.app`
- **Confirm Email:** ✅ YES
- **Auto Confirm User:** ✅ YES
- Click **"Create user"**

---

### Step 3: Get User IDs

**Location:** Supabase Dashboard → SQL Editor → New Query

Run this query to get all user IDs:

```sql
SELECT
  id,
  phone,
  email,
  created_at,
  CASE
    WHEN phone = '+966501111111' THEN 'New Customer'
    WHEN phone = '+966502222222' THEN 'Existing Customer'
    WHEN phone = '+966503333333' THEN 'New Vendor'
    WHEN phone = '+966504444444' THEN 'Existing Vendor'
    WHEN email = 'newuser@dawati.app' THEN 'New Email User'
    WHEN email = 'existing@dawati.app' THEN 'Existing Email User'
  END as user_type
FROM auth.users
WHERE phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444')
   OR email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY created_at;
```

**Copy the IDs** - you'll need them for Step 4.

---

### Step 4: Create Database Records

**Location:** Supabase Dashboard → SQL Editor → New Query

Open the SQL file: `.planning/SUPABASE-TEST-USERS-SETUP.sql`

1. Copy the entire SQL script
2. **Replace** all `'PASTE_USER_ID_HERE'` with actual IDs from Step 3
3. Run the modified SQL script

**What this does:**
- Creates profiles for 3 "existing" users (existing customer, existing vendor, existing email)
- Creates vendor business for 1 vendor (existing vendor)
- Leaves 3 users with NO profile (new customer, new vendor, new email)

---

### Step 5: Verify Setup

Run this verification query:

```sql
SELECT
  au.id,
  au.phone,
  au.email,
  CASE
    WHEN p.id IS NOT NULL THEN '✅ HAS PROFILE'
    ELSE '❌ NO PROFILE (will see wizard)'
  END as profile_status,
  CASE
    WHEN vb.id IS NOT NULL THEN '✅ HAS BUSINESS'
    ELSE '❌ NO BUSINESS'
  END as business_status,
  CASE
    WHEN au.phone = '+966501111111' THEN 'Expected: Customer Wizard'
    WHEN au.phone = '+966502222222' THEN 'Expected: Dashboard'
    WHEN au.phone = '+966503333333' THEN 'Expected: Vendor Wizard'
    WHEN au.phone = '+966504444444' THEN 'Expected: Vendor Dashboard'
    WHEN au.email = 'newuser@dawati.app' THEN 'Expected: Customer Wizard'
    WHEN au.email = 'existing@dawati.app' THEN 'Expected: Dashboard'
  END as expected_behavior
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN vendor_businesses vb ON vb.owner_id = au.id
WHERE au.phone IN ('+966501111111', '+966502222222', '+966503333333', '+966504444444')
   OR au.email IN ('newuser@dawati.app', 'existing@dawati.app')
ORDER BY au.created_at;
```

**Expected results:**
- 3 users with profiles (existing customer, existing email, existing vendor)
- 1 user with business (existing vendor)
- 3 users with NO profile (new customer, new vendor, new email)

---

### Step 6: Update `.env` File

Open `.env` in the dawati-tester project:

```bash
cd /Users/saadalateeq/Desktop/dawati-tester/dawati-tester
code .env
```

Add these values:

```env
# Required
GEMINI_API_KEY=your_actual_key_here
DAWATI_URL=https://your-dawati-app.vercel.app

# Basic test phone (if you have one that already works)
TEST_PHONE=+966500000001

# 6 scenario test phones
TEST_PHONE_NEW_CUSTOMER=+966501111111
TEST_PHONE_EXISTING_CUSTOMER=+966502222222
TEST_PHONE_NEW_VENDOR=+966503333333
TEST_PHONE_EXISTING_VENDOR=+966504444444
TEST_EMAIL_NEW=newuser@dawati.app
TEST_EMAIL_EXISTING=existing@dawati.app

# Browser settings (set to false to see browser)
HEADLESS=false
SLOW_MO=1000
```

---

## 🧪 Test the Setup

### Option 1: Manual Test (Recommended First)

1. Open your Dawati app in a browser
2. Try logging in with `+966501111111` and OTP `123456`
3. **Expected:** Should show customer onboarding wizard
4. Try logging in with `+966502222222` and OTP `123456`
5. **Expected:** Should skip wizard and go to dashboard

### Option 2: Run Automated Tests

```bash
cd /Users/saadalateeq/Desktop/dawati-tester/dawati-tester

# Build
npm run build

# Run all 6 authentication scenarios
npm run test:auth

# View results
npm run report
```

---

## 🐛 Troubleshooting

### Issue: OTP Not Working

**Check:**
1. Test OTP format is correct (no `+`, comma-separated)
2. Phone numbers in Supabase Auth are confirmed
3. Try manual login first to verify

**Solution:**
```
966501111111=123456,966502222222=123456,966503333333=123456,966504444444=123456,966500000001=123456
```

### Issue: User Goes to Dashboard Instead of Wizard

**Problem:** User has a profile when they shouldn't

**Solution:** Delete the profile:
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE phone = '+966501111111';

-- Delete profile if found
DELETE FROM profiles WHERE phone = '+966501111111';
```

### Issue: User Goes to Wizard Instead of Dashboard

**Problem:** User is missing profile

**Solution:** Create profile using SQL from Step 4

---

## ✅ Success Checklist

- [ ] Test OTP enabled with correct format
- [ ] 6 auth users created in Supabase
- [ ] User IDs collected from SQL query
- [ ] SQL script run to create profiles/businesses
- [ ] Verification query shows expected results
- [ ] `.env` file updated with test credentials
- [ ] Manual login test passes
- [ ] Automated tests pass

---

## 📊 Expected Test Results

When you run `npm run test:auth`, you should see:

```
✅ Test 1: New Customer Phone
  → Navigate to home
  → Enter phone: +966501111111
  → Enter OTP: 123456
  → Wizard shown (EXPECTED) ✅

✅ Test 2: Existing Customer Phone
  → Navigate to home
  → Enter phone: +966502222222
  → Enter OTP: 123456
  → Dashboard reached (EXPECTED) ✅

✅ Test 3: New Vendor Phone
  → Navigate to home
  → Enter phone: +966503333333
  → Enter OTP: 123456
  → Vendor wizard shown (EXPECTED) ✅

✅ Test 4: Existing Vendor Phone
  → Navigate to home
  → Enter phone: +966504444444
  → Enter OTP: 123456
  → Vendor dashboard reached (EXPECTED) ✅

✅ Test 5: New Email User
  → Navigate to home
  → Enter email: newuser@dawati.app
  → Request code
  → (Manual verification required)

✅ Test 6: Existing Email User
  → Navigate to home
  → Enter email: existing@dawati.app
  → Request code
  → (Manual verification required)

Results: 6/6 scenarios tested ✅
```

---

**Status:** READY TO EXECUTE
**Next:** Follow steps 1-6 above, then run tests

🚀 Let's get to 100% auth coverage!
