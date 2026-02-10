# Dawati App - AI Testing Continuation Prompt

Copy everything below this line and paste it into a new Claude Code chat:

---

## Project Context

I'm working on **Dawati** (دعوتي), a Saudi Arabian event planning app built with **Expo Router + React Native Web**. The app is fully RTL Arabic-first with i18next translations.

**Working directories:**
- App code: `untitled-folder-4/` (Expo app with `app/`, `locales/`, `components/`, etc.)
- Test system: `dawati-tester/vertex-ai-testing/` (Playwright + Gemini 2.0 Flash AI tester)

**How the test system works:**
- Playwright launches Chromium, navigates to `http://localhost:8081` (Expo web dev server must be running)
- Takes screenshots of each page/flow
- Sends screenshots to Gemini 2.0 Flash for AI analysis (RTL, i18n, currency, dates, UI)
- Decision engine determines PASS/FAIL per phase
- Autopilot collects feedback for fine-tuning

**Run tests with:** `cd dawati-tester/vertex-ai-testing && npx ts-node tests/run-all.ts <suite-name>`

**IMPORTANT: On Windows/Git Bash**, use forward slashes for cd paths: `cd "c:/Users/pc/Desktop/new/dawati-tester/vertex-ai-testing"`. Backslash paths fail in bash.

## What's Already Done (4/14 suites at 100%)

| Suite | Command | Phases | Status |
|-------|---------|--------|--------|
| Auth Flow | `auth-flow` | 3 | PASSED |
| Customer Tabs | `customer-tabs` | 8 | PASSED |
| Marketplace Flow | `marketplace-flow` | 6 | PASSED |
| Component Deep Checks | `component-deep` | 7 | PASSED |

**Total: 24 phases passing across 4 suites.**

## What's Remaining (10 suites, ~104 phases)

| Suite | Command | Phases | Test File |
|-------|---------|--------|-----------|
| Account Settings | `account-settings` | 9 | `tests/account-settings.test.ts` |
| Account Extended | `account-extended` | 13 | `tests/account-extended.test.ts` |
| Marketplace Booking Deep | `marketplace-booking` | 11 | `tests/marketplace-booking.test.ts` |
| Events Flow | `events-flow` | 7 | `tests/events-flow.test.ts` |
| Bookings Flow | `bookings-flow` | 9 | `tests/bookings-flow.test.ts` |
| Vendor Dashboard | `vendor-dashboard` | 7 | `tests/vendor-dashboard.test.ts` |
| Vendor Management | `vendor-management` | 9 | `tests/vendor-management.test.ts` |
| Admin Dashboard | `admin-dashboard` | 13 | `tests/admin-dashboard.test.ts` |
| Misc Pages | `misc-pages` | 16 | `tests/misc-pages.test.ts` |
| Multi-Device | `multi-device` | 10 | `tests/multi-device.test.ts` |

## Key Patterns Learned (CRITICAL - read before fixing)

### 1. Common Bug: Hardcoded English text
Most failures are hardcoded English strings in the app. Fix by:
- Import `useTranslation` from `react-i18next`
- Replace hardcoded text with `t('key_name')`
- Add Arabic translation to `locales/ar.json` and English to `locales/en.json`

### 2. Unconfigured file-based tabs
Expo Router auto-creates tab screens from filenames. Files like `messages.tsx` or `activity.tsx` in tab directories create English-labeled tabs. Fix by adding to the layout:
```tsx
<Tabs.Screen name="filename" options={{ href: null }} />
```

### 3. RTL Currency Display (TRICKY - got this wrong multiple times)
- Use `RiyalIcon` SVG component (from `components/icons/RiyalIcon.tsx`) instead of "ر.س" text
- In RTL `flex-direction: row`, first child goes **RIGHT** (inline-start), second goes **LEFT** (inline-end)
- For correct Arabic currency in JSX: `<Text>{amount}</Text><RiyalIcon/>` — Text=first child→RIGHT, Icon=second child→LEFT
- Visually on screen: number on RIGHT, icon on LEFT = **correct RTL reading order** (Arabic reads R-to-L: number first, then symbol)
- The AI prompt in `gemini-client.ts` has already been fixed to understand this. DO NOT re-introduce LTR-biased examples like `"100 [icon]" not "[icon] 100"` — these confuse the AI about RTL.

### 4. Hijri Calendar
Use `ar-SA-u-ca-islamic-umalqura` locale for Arabic dates:
```ts
date.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { month: 'short', day: 'numeric' });
```
Hijri month names like رمضان/شعبان/ذو الحجة are CORRECT — the AI prompt has been fixed to not flag these as Gregorian.

### 5. AI Prompt Already Fixed (DON'T BREAK IT)
The AI analysis prompt in `src/vertex-ai/gemini-client.ts` (both `buildBatchPrompt` ~line 249 and `buildSinglePrompt` ~line 312) has been carefully updated to:
- NOT flag correct RTL currency placement as "symbol before number"
- NOT flag Hijri month names (رمضان/شعبان) as Gregorian
- Understand that in RTL, icon LEFT of number is CORRECT
- The IMPORTANT summary line at ~line 295 also includes these rules

**If the AI keeps failing a phase that looks correct, the problem is usually in the AI prompt, NOT the app code.** This was the hardest lesson — we spent 6 patches and 5 test runs on vendor dashboard before realizing the app was correct but the AI prompt had LTR-biased examples.

### 6. Test validation descriptions NOT passed to AI
`TestPhase.validations[].description` text is NOT sent to the Gemini prompt. Only `phase.name` and expected elements are sent. So updating test checklist descriptions helps humans but doesn't directly fix AI decisions. To fix AI behavior, update the prompt in `gemini-client.ts`.

### 7. Duplicate JSON keys
`locales/ar.json` had a duplicate `"settings"` key (two objects with same key). The second overwrites the first, losing translations. If you see raw i18n keys like "settings.title" on screen, check for duplicate keys in the JSON.

### 8. Translation helpers for database values
Vendor category and city come from the database in English. Use translation helpers:
```ts
const translateCategory = (cat: string) => {
    const key = 'vendor_category_' + cat;
    const translated = t(key);
    return translated === key ? cat : translated;
};
```

### 9. i18n Config
- Default language: Arabic (`lng: 'ar'`, `fallbackLng: 'ar'`)
- Config at: `locales/i18n.ts`
- Dot notation: `t('settings.title')` → `{ "settings": { "title": "..." } }`

### 10. Account Pages Structure
The app has 32 account sub-pages under `app/account/`:
- Main: `index.tsx`, `_layout.tsx`
- Profile: `edit-profile.tsx`
- Financial: `wallet.tsx`, `packages.tsx`, `transactions.tsx`, `invoices.tsx`, `subscription.tsx`, `payment-methods.tsx`, `auto-recharge.tsx`, `tier-benefits.tsx`
- Security: `security.tsx`, `change-password.tsx`, `change-phone.tsx`, `two-factor-auth.tsx`, `setup-authenticator.tsx`, `recovery-codes.tsx`, `verify-code.tsx`, `login-history.tsx`
- Account Management: `manage-users.tsx`, `sub-user-activity.tsx`, `delete-account-warning.tsx`, `delete-account-verify.tsx`, `delete-account-feedback.tsx`, `delete-account-success.tsx`
- Settings: `appearance.tsx`, `notifications.tsx`, `event-preferences.tsx`, `privacy-data.tsx`
- Other: `blocked-users.tsx`, `my-reviews.tsx`, `referral.tsx`

Also `app/help.tsx` for the help page.

## Files Modified So Far

**App files (in `untitled-folder-4/`):**
- `locales/ar.json` - Added 30+ keys, fixed duplicate settings block, city translations
- `locales/en.json` - Matching English keys
- `app/marketplace/discovery.tsx` - Added useTranslation, translateCategory/translateCity, replaced ~20 strings
- `app/marketplace/ai-consultant.tsx` - Added useTranslation, replaced header/status/greeting/placeholder
- `app/(tabs)/messages.tsx` - Added useTranslation, replaced 3 strings
- `app/(tabs)/_layout.tsx` - Hidden messages tab with `href: null`, hidden scan tab
- `app/(vendor-tabs)/_layout.tsx` - Hidden activity tab with `href: null`
- `app/(vendor-tabs)/index.tsx` - Hijri dates via `ar-SA-u-ca-islamic-umalqura`, RiyalIcon SVG currency with correct RTL flex order (`<Text>{amount}</Text><RiyalIcon/>`), `showCurrencyIcon` prop on StatCard, `bookingAmountRow` style
- `app/welcome.tsx` - Language toggle label via `t()`

**Test system files (in `dawati-tester/vertex-ai-testing/`):**
- `src/vertex-ai/gemini-client.ts` - Fixed RTL currency and Hijri prompt rules in both `buildBatchPrompt` and `buildSinglePrompt`, and the IMPORTANT summary line
- `tests/component-deep.test.ts` - Added RTL currency/Hijri guidance to vendor dashboard checklist

## Fine-Tuning Pipeline Status
- 155 feedback records collected (in `feedback/feedback-records.jsonl`)
- 148 auto-approved (in `feedback/autopilot-state.json`)
- Active tuning job: `projects/43691028092/locations/europe-west4/tuningJobs/2791345974914580480` (JOB_STATE_RUNNING)
- More test runs = more training data = better AI accuracy
- Each suite run generates 7-16 new training examples

## Key Technical Details

**RiyalIcon component** (`components/icons/RiyalIcon.tsx`):
```tsx
import Svg, { Path } from 'react-native-svg';
// Props: size (default 24), color (default '#231f20')
// Usage: <RiyalIcon size={14} color={Colors.textPrimary} />
```

**StatCard with currency** (pattern from vendor dashboard):
```tsx
<View style={styles.statValueRow}>
  <Text style={styles.statValue}>{value}</Text>
  {showCurrencyIcon && <RiyalIcon size={14} color={Colors.textPrimary} />}
</View>
```

**Booking amount with currency** (correct RTL order):
```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
  <Text>{formatCurrency(booking.amount)}</Text>
  <RiyalIcon size={12} color={Colors.textPrimary} />
</View>
```

**Hijri date formatter**:
```ts
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(
    language === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-US',
    { month: 'short', day: 'numeric' }
  );
};
```

## How to Work Phase by Phase

The user wants to follow along patch by patch. For each suite:

1. **Run the suite:** `npx ts-node tests/run-all.ts <suite-name>`
2. **Check failures** - look at the AI analysis output for each failed phase
3. **View screenshots** if needed - they're in `artifacts/` folder
4. **Fix the app code** - usually replacing hardcoded English with `t()` calls
5. **Add missing translation keys** to both `ar.json` and `en.json`
6. **Re-run** until 100%
7. **Tell the user** each patch before applying it

## Debugging Tips

- If a phase FAILS but the app looks correct in the screenshot, the problem is in the **AI prompt** (`gemini-client.ts`), not the app code
- If you see raw i18n keys on screen (like `settings.title`), check for **duplicate JSON keys** in `ar.json`
- If a tab shows an English label, check if the file needs `href: null` in the `_layout.tsx`
- Currency "ر.س" as TEXT is wrong — must be `RiyalIcon` SVG component
- The `ts-node` commands sometimes fail silently on Windows — if no output, try reading the state files directly (`autopilot-state.json`, `feedback-records.jsonl`)

## Start

Please continue with the next suite: **Account Settings** (9 phases). Run it first to see what fails, then fix patch by patch. Show me each patch before applying.
