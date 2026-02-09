# Phase 1: Authentication Fix - Action Plan

**Created:** 2026-02-09
**Priority:** CRITICAL (Blocks all other testing)
**Status:** 🚨 IN PROGRESS

---

## 🎯 Goal

Fix the authentication blocker so that phone OTP login works in the Playwright test environment, enabling all subsequent test phases (2-8).

---

## 🚨 Current Problem

**Issue:** Phone OTP authentication doesn't work in test environment
**Impact:** Cannot test ANY features that require login (Events, Guests, Marketplace, Settings, etc.)
**Status from TEST_RESULTS_PHASE_0_1.md:** Test 1.4 BLOCKED

**What's Happening:**
1. Test navigates to `/auth/phone`
2. Test enters phone number: `+966500000001`
3. Test clicks "Continue" button
4. Test enters OTP: `123456`
5. Test clicks "Verify" button
6. ❌ **STUCK HERE** - No redirect to dashboard occurs

---

## 🔍 Root Cause Analysis

### Potential Issues:

#### 1. Test Environment vs Development Environment Mismatch
- **Development:** Uses real Supabase with live phone authentication
- **Test:** May be hitting production Supabase or wrong environment
- **Fix:** Need dedicated test environment with mock authentication

#### 2. Terms & Conditions Checkbox Missing
- **Jules found:** Terms checkbox MUST be checked before "Continue" works
- **Current test:** May not be checking this checkbox
- **Fix:** Add checkbox click to test flow

#### 3. Hardcoded Test Credentials Not Working
- **Current credentials:** `+966500000001` and OTP `123456`
- **Issue:** May not be whitelisted in Supabase for testing
- **Fix:** Create proper test user in Supabase test project

#### 4. OTP Expiry or Rate Limiting
- **Issue:** Test OTP may expire or hit rate limits
- **Fix:** Use mock OTP that never expires

#### 5. Redirect Logic Not Working
- **Issue:** After OTP verification, redirect to dashboard may fail
- **Fix:** Check navigation logic and add explicit wait for redirect

---

## 📋 Step-by-Step Fix Plan

### Step 1: Check Current `.env` Configuration
**Action:** Verify test environment is properly configured
**Files:** `dawati-tester/dawati-tester/.env`

```bash
# Check if .env exists
cd /Users/saadalateeq/Desktop/dawati-tester/dawati-tester
cat .env
```

**What to look for:**
- `DAWATI_URL` - Should point to test/staging environment, NOT production
- `TEST_PHONE` - Test phone number (should be whitelisted)
- `GEMINI_API_KEY` - AI analysis key

**Expected:**
```env
DAWATI_URL=https://dawati-test.vercel.app  # or local http://localhost:19006
TEST_PHONE=+966500000001
GEMINI_API_KEY=your_key_here
```

---

### Step 2: Update `auth-tester.ts` to Check Terms Checkbox
**Action:** Add terms checkbox click before submitting phone number
**File:** `dawati-tester/dawati-tester/src/auth-tester.ts`

**Current code around line 100-150:**
```typescript
// Step 3: Enter phone number
const phoneInputSelectors = [
  'input[type="tel"]',
  'input[name="phone"]',
  'input[placeholder*="phone"]',
  'input[placeholder*="هاتف"]',
  '[data-testid="phone-input"]',
];

let phoneEntered = false;
for (const selector of phoneInputSelectors) {
  try {
    await page.fill(selector, config.testPhone);
    phoneEntered = true;
    break;
  } catch {
    continue;
  }
}
```

**ADD BEFORE "Continue" button click:**
```typescript
// Step 3.5: Check terms & conditions checkbox (CRITICAL FIX)
const termsCheckboxSelectors = [
  'input[type="checkbox"]',
  '[data-testid="terms-checkbox"]',
  'input[name="terms"]',
  'input[name="acceptTerms"]',
  '[role="checkbox"]',
];

log.info('Looking for terms checkbox...');
for (const selector of termsCheckboxSelectors) {
  try {
    const checkbox = page.locator(selector);
    if (await checkbox.isVisible({ timeout: 2000 })) {
      await checkbox.click();
      log.info(`Checked terms checkbox: ${selector}`);
      break;
    }
  } catch {
    continue;
  }
}

await page.waitForTimeout(500);
const screenshot3_5 = await takeScreenshot('phone_auth_03_5_terms_checked', 'Terms checkbox checked');
steps.push({ name: 'Accept terms', success: true, screenshot: screenshot3_5.filename });
```

---

### Step 3: Add Explicit Wait for OTP Verification Success
**Action:** Wait for dashboard redirect or success indicator
**File:** `dawati-tester/dawati-tester/src/auth-tester.ts`

**Find the OTP verification section (around line 200-250):**
```typescript
// After clicking "Verify" button
```

**ADD:**
```typescript
// Step 6: Wait for authentication success
log.info('Waiting for authentication success...');
const successIndicators = [
  '/dashboard',
  '/home',
  '/events',
  'text=Dashboard',
  'text=My Events',
  '[data-testid="user-menu"]',
  '[data-testid="dashboard"]',
];

let authSuccess = false;
for (const indicator of successIndicators) {
  try {
    if (indicator.startsWith('/')) {
      // Wait for URL change
      await page.waitForURL(`**${indicator}**`, { timeout: 10000 });
      authSuccess = true;
      log.info(`Auth success: Navigated to ${indicator}`);
      break;
    } else {
      // Wait for element
      await page.waitForSelector(indicator, { timeout: 10000 });
      authSuccess = true;
      log.info(`Auth success: Found ${indicator}`);
      break;
    }
  } catch {
    continue;
  }
}

if (!authSuccess) {
  throw new Error('Authentication did not complete - no redirect or success indicator found');
}

const screenshot6 = await takeScreenshot('phone_auth_06_success', 'Authentication successful');
steps.push({ name: 'Authentication success', success: true, screenshot: screenshot6.filename });
```

---

### Step 4: Create Supabase Test User (Backend Fix)
**Action:** Set up test credentials in Supabase
**Location:** Dawati main app Supabase project

**Option A: Add Test Phone to Supabase Auth (Recommended)**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user manually"
3. Phone: `+966500000001`
4. Password: (leave empty for phone auth)
5. Email: `test-phone@dawati.app` (optional)
6. Confirm email: YES
7. Enable: YES

**Option B: Mock Supabase in Test Environment**
1. Create separate Supabase test project
2. Point `DAWATI_URL` to test deployment using test Supabase
3. Disable phone verification requirements for testing

**Option C: Use Supabase Test OTP**
1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Test OTP" option
3. Set test OTP to `123456`
4. This OTP will always work for testing

---

### Step 5: Add Debug Logging
**Action:** Add detailed logging to understand where test gets stuck
**File:** `dawati-tester/dawati-tester/src/auth-tester.ts`

**Add throughout the test:**
```typescript
log.info(`Current URL: ${await page.url()}`);
log.info(`Page title: ${await page.title()}`);
log.info(`Visible elements: ${await page.locator('body').textContent()}`);
```

**Especially after OTP entry:**
```typescript
// After entering OTP
log.info('OTP entered, current state:');
log.info(`  URL: ${await page.url()}`);
log.info(`  Cookies: ${JSON.stringify(await page.context().cookies())}`);
log.info(`  localStorage: ${await page.evaluate(() => JSON.stringify(localStorage))}`);
```

---

### Step 6: Test with Slower Execution
**Action:** Slow down test execution to see what's happening
**File:** `dawati-tester/dawati-tester/.env`

```env
HEADLESS=false    # See browser window
SLOW_MO=1000      # 1 second delay between actions
```

**Run test manually:**
```bash
cd dawati-tester/dawati-tester
npm run build
node dist/index.js --only=auth
```

**Watch the browser to see where it gets stuck.**

---

### Step 7: Add Onboarding Wizard Detection
**Action:** Detect if user is redirected to onboarding instead of dashboard
**Reason:** NEW USERS see onboarding wizard AFTER OTP verification!

**ADD to auth success detection:**
```typescript
// Check if redirected to onboarding wizard
const onboardingIndicators = [
  '/onboarding',
  '/wizard',
  '/setup',
  'text=Welcome',
  'text=مرحباً',
  'text=Let\'s set up',
  '[data-testid="onboarding-wizard"]',
];

let onOnboarding = false;
for (const indicator of onboardingIndicators) {
  try {
    if (indicator.startsWith('/')) {
      if ((await page.url()).includes(indicator)) {
        onOnboarding = true;
        log.info(`Detected onboarding wizard: ${indicator}`);
        break;
      }
    } else {
      if (await page.locator(indicator).isVisible({ timeout: 2000 })) {
        onOnboarding = true;
        log.info(`Detected onboarding wizard: ${indicator}`);
        break;
      }
    }
  } catch {
    continue;
  }
}

if (onOnboarding) {
  log.info('Auth successful but user needs onboarding - this is EXPECTED for new users');
  const screenshot6_onboarding = await takeScreenshot('phone_auth_06_onboarding_wizard', 'Onboarding wizard shown');
  steps.push({ name: 'Onboarding wizard detected', success: true, screenshot: screenshot6_onboarding.filename });

  // For now, mark as success (we'll test onboarding separately)
  return {
    method: 'phone',
    success: true,
    steps,
  };
}
```

---

## ✅ Expected Results After Fixes

### Scenario 1: Existing User
```
1. Navigate to /auth/phone ✅
2. Enter phone: +966500000001 ✅
3. Check terms checkbox ✅ (NEW FIX)
4. Click "Continue" ✅
5. Enter OTP: 123456 ✅
6. Click "Verify" ✅
7. Redirect to /dashboard ✅ (NEW FIX)
8. Test PASSES ✅
```

### Scenario 2: New User
```
1. Navigate to /auth/phone ✅
2. Enter phone: +966500000001 ✅
3. Check terms checkbox ✅ (NEW FIX)
4. Click "Continue" ✅
5. Enter OTP: 123456 ✅
6. Click "Verify" ✅
7. Redirect to /onboarding/step1 ✅ (NEW FIX - EXPECTED!)
8. Test PASSES ✅ (onboarding detected)
9. Trigger Test 1.2 (Onboarding Wizard) ✅
```

---

## 🧪 Testing Steps

### 1. Update Code
```bash
cd /Users/saadalateeq/Desktop/dawati-tester/dawati-tester
code src/auth-tester.ts  # Apply fixes from Step 2, 3, 7
```

### 2. Configure Environment
```bash
# Check .env exists
cat .env

# If not, copy from example
cp .env.example .env

# Edit with your values
code .env
```

### 3. Build & Run
```bash
npm run build
npm run test:auth  # Run auth tests only
```

### 4. Check Results
```bash
# Open test report
npm run report

# Check screenshots
open test-results/latest/screenshots/
```

---

## 🎯 Success Criteria

- [ ] Test can enter phone number successfully
- [ ] Test can check terms checkbox
- [ ] Test can enter OTP successfully
- [ ] Test detects successful authentication (dashboard OR onboarding)
- [ ] Test generates screenshot evidence for each step
- [ ] Test passes without errors
- [ ] Auth blocker is UNBLOCKED
- [ ] Can proceed to Phase 2 tests

---

## 📝 Next Steps After Auth Fix

Once auth is working:

1. **Test 1.2: Host Onboarding Wizard**
   - Write 4-step wizard test
   - Verify profile, preferences, notifications
   - Ensure completion redirects to dashboard

2. **Test 1.3: Vendor Registration Wizard**
   - Write 4-step vendor wizard test
   - Verify business info, packages, portfolio, availability
   - Ensure completion redirects to vendor dashboard

3. **Phase 2-8: Continue Testing**
   - Unblock remaining 83 test cases
   - Achieve 90%+ production readiness

---

## 🆘 If Still Stuck

### Debug Checklist:
1. ✅ Is `DAWATI_URL` correct in `.env`?
2. ✅ Is the app actually running at that URL?
3. ✅ Does manual login work (try in browser)?
4. ✅ Is terms checkbox visible when you manually test?
5. ✅ Is test phone number `+966500000001` whitelisted in Supabase?
6. ✅ Does OTP `123456` work when you manually enter it?
7. ✅ Is there an onboarding wizard after OTP for new users?
8. ✅ Are there any console errors in browser DevTools?

### Get More Help:
- Check Supabase logs: Supabase Dashboard → Logs → Auth
- Check Playwright trace: Add `--trace on` flag to see full trace
- Run with `HEADLESS=false` to watch the test in real-time
- Add `await page.pause()` to stop and inspect at critical points

---

**Status:** READY TO IMPLEMENT
**Next Step:** Apply fixes to `auth-tester.ts` and test

---

*Created: 2026-02-09*
*Priority: CRITICAL*
*Blocking: Phases 2-8 (83 tests)*
