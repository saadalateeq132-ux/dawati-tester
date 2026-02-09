# Troubleshooting Test OTP Setup

**Issue:** Test OTP not saving in Supabase
**Symptom:** You paste the format but it doesn't save, or no error appears

---

## 🔍 Diagnosis Steps

### Step 1: Check Supabase Phone Auth Settings

**Path:** Supabase Dashboard → Authentication → Settings → Phone Auth

Look for these settings:

#### Option A: "Enable Phone Signup" Section
- Enable phone signup: **✅ ON**
- Enable phone confirmations: **✅ ON**

#### Option B: "Phone OTP expiry duration"
- Should see a field for expiry (default: 60 seconds)

#### Option C: "Test OTP" Section
Look for one of these:
1. **"Enable phone test OTP"** toggle
2. **"Phone OTP test mode"** section
3. **"Test OTP hash"** field

---

## 🎯 Solution 1: Enable Test Mode First

Some Supabase projects require enabling test mode before entering test numbers:

1. Find **"Enable phone test OTP"** toggle
2. Turn it **ON** first
3. **THEN** enter the test numbers

---

## 🎯 Solution 2: Try Different Formats

Supabase has changed this format over time. Try these variations:

### Format 1: Comma-separated (Recommended)
```
966501111111=123456,966502222222=123456,966503333333=123456,966504444444=123456,966500000001=123456
```

### Format 2: One per line
```
966501111111=123456
966502222222=123456
966503333333=123456
966504444444=123456
966500000001=123456
```

### Format 3: JSON format
```json
{
  "966501111111": "123456",
  "966502222222": "123456",
  "966503333333": "123456",
  "966504444444": "123456",
  "966500000001": "123456"
}
```

### Format 4: With country code separator
```
966-501111111=123456,966-502222222=123456,966-503333333=123456,966-504444444=123456,966-500000001=123456
```

---

## 🎯 Solution 3: Use Twilio Test Credentials (Alternative)

If Test OTP doesn't work, you can use Twilio test credentials:

1. Go to Authentication → Settings → Phone Auth
2. Find **"Phone provider"** section
3. If using Twilio, add these to your Twilio account:
   - Test phone number: `+15005550006` (magic number that always works)
   - Test verification code: `123456`

---

## 🎯 Solution 4: Check Supabase Project Type

**Free Tier Limitation?**
Some Supabase free tier projects may not support Test OTP mode.

**Workaround:**
1. Create real users with real phone numbers
2. Use your own phone number for testing
3. Request real OTP codes during tests

---

## 🎯 Solution 5: Verify Save is Working

After pasting the test numbers:

1. **Look for:**
   - Green success message
   - "Saved" confirmation
   - The field stays filled (doesn't clear)

2. **If it clears immediately:**
   - Try a different browser (Chrome, Firefox)
   - Disable browser extensions
   - Clear browser cache
   - Try in incognito/private mode

3. **If no save button appears:**
   - The setting might auto-save
   - Scroll down to see if there's a "Save" button at bottom
   - Try clicking somewhere else on the page

---

## 🎯 Solution 6: Alternative Testing Strategy

**If Test OTP still doesn't work:**

### Option A: Use Your Own Phone
Update `.env`:
```env
TEST_PHONE=+966YOUR_ACTUAL_PHONE
```

Then manually enter the real OTP during tests.

### Option B: Mock OTP in Code
We can modify the test to skip OTP verification:
```typescript
// In auth-tester.ts, add this option
const SKIP_OTP_VERIFICATION = process.env.SKIP_OTP_VERIFICATION === 'true';
```

### Option C: Use Email Instead
Email verification is easier to test:
```env
TEST_EMAIL=your-real-email@gmail.com
```

---

## 📊 Common Supabase Versions

### V1 (Old Supabase - before 2023)
- Test OTP format: One per line, with `+` prefix
- Location: Phone → Test numbers

### V2 (Current Supabase - 2023-2024)
- Test OTP format: Comma-separated, NO `+` prefix
- Location: Authentication → Settings → Phone Auth → Enable phone test OTP

### V3 (Latest Supabase - 2024+)
- May use Twilio test credentials instead
- Location: Authentication → Settings → Phone Auth → Twilio settings

---

## 🆘 If Still Not Working

### Share these details:
1. **Supabase plan:** Free, Pro, or Enterprise?
2. **Supabase dashboard version:** Look at bottom of page for version number
3. **Phone auth provider:** Twilio, MessageBird, Vonage?
4. **Screenshot:** Take screenshot of the Test OTP section

### Workaround for now:
We can run tests without Test OTP by:
1. Creating users with confirmed phone numbers
2. Using email auth instead (easier to test)
3. Mocking the OTP verification in test code

---

## 📝 Next Steps

1. **Try Format 1** (comma-separated) again
2. **Take screenshot** of the Phone Auth settings page
3. **Run the database schema check** (CHECK-DATABASE-SCHEMA.sql)
4. **Share results** so we can adjust the setup

Once we know your database schema, we can:
- Create the correct SQL for your tables
- Set up test users properly
- Run the authentication tests

---

**Status:** TROUBLESHOOTING
**Next:** Run CHECK-DATABASE-SCHEMA.sql and share results
