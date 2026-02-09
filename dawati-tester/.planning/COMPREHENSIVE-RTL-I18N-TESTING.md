# Comprehensive RTL & i18n Testing Guide

## Overview

This document describes the complete RTL (Right-to-Left) and internationalization testing strategy for Dawati, a bilingual Arabic/English event planning app for Saudi Arabia.

## Testing Categories

### 1. 404 Error Detection (CRITICAL)

**Purpose**: Detect error pages before running other tests

**Implementation**:
- Check HTTP status codes (>= 400)
- Detect error page content indicators:
  - "NOT_FOUND"
  - "404"
  - "Page Not Found"
  - "deployment not found"
  - "Application error"
  - Error page HTML markers

**Location**: `src/browser.ts` - `navigateTo()` function

**Severity**: CRITICAL - Test should fail immediately if error page detected

---

### 2. Hardcoded Strings Detection

**Purpose**: Identify hardcoded text that should use i18n keys

#### English Strings (Should be translated to Arabic)

**Categories**:
- Basic actions: Submit, Cancel, Save, Delete, Edit, Add, Remove, Search, Filter, Sort
- Status messages: Loading, Error, Success, Failed, Pending, Complete, Warning
- Authentication: Sign In, Sign Up, Login, Logout, Password, Email, Phone, Verify
- Navigation: Home, Profile, Settings, Dashboard, Menu, Help, Support
- UI elements: Welcome, Hello, Thank You, Please, Continue, OK, Yes, No
- Event planning: Event, Vendor, Service, Booking, Order, Cart, Checkout, Payment
- Form fields: Name, Email, Phone, Address, City, Country, Date, Time, Location
- Time-related: Today, Tomorrow, Yesterday, Now, Later, days of week, months

**Total patterns**: 150+ English strings

#### Arabic Strings (Should use i18n keys)

**Categories**:
- Basic actions: إرسال, إلغاء, حفظ, حذف, تعديل, إضافة, إزالة, بحث
- Status: تحميل, خطأ, نجح, فشل, قيد الانتظار, مكتمل
- Authentication: تسجيل الدخول, تسجيل, خروج, كلمة المرور, البريد الإلكتروني
- Navigation: الرئيسية, الملف الشخصي, الإعدادات, لوحة التحكم, القائمة
- Event planning: حدث, مناسبة, بائع, خدمة, حجز, طلب, سلة, الدفع
- Health/wellness: صحة, صحي, طبي, علاج, دواء
- Hijri months: محرم, صفر, ربيع الأول, رمضان, شوال, ذو القعدة, ذو الحجة
- Saudi-specific: ريال, ر.س, المملكة العربية السعودية, الرياض, جدة

**Total patterns**: 150+ Arabic strings

**Why detect hardcoded Arabic?**
Even Arabic text should use i18n keys for:
- Maintenance: Single source of truth
- Consistency: Same translation across app
- Testing: Easy to update all instances
- Future: Potential dialect variations (Gulf vs Egyptian vs Levantine)

**Example**:
```typescript
// ❌ WRONG - Hardcoded
<button>إرسال</button>
<button>Submit</button>

// ✅ CORRECT - i18n keys
<button>{t('actions.submit')}</button>
```

**Location**: `src/rtl-checker.ts` - `checkHardcodedStrings()`

---

### 3. Image Text Detection (OCR)

**Purpose**: Identify text embedded in images that needs localization

**What to detect**:
- Button labels in images
- Icon labels/badges
- Graphic text (logos, banners)
- Infographic text
- Error message screenshots
- Placeholder images with text

**AI Analysis**: Gemini model reads all visible text in screenshots and reports:
- All text found in images
- Whether image text is in English (should be Arabic)
- Whether image text is hardcoded (should be localized)

**Best practices**:
- Avoid text in images (use real text)
- If unavoidable, provide localized image versions
- Use SVG with text elements (localizable)
- Use CSS to overlay text on images

**Location**: `src/ai-analyzer.ts` - Enhanced Gemini prompt with OCR instructions

---

### 4. BiDi (Bidirectional) Text Handling

**Purpose**: Properly handle mixed Arabic/English content

**Challenges**:
- Arabic text flows RTL
- English text flows LTR
- Mixed content needs proper isolation

**What to check**:
- Mixed Arabic/English paragraphs
- Phone numbers in Arabic text (should be LTR)
- Email addresses in Arabic text (should be LTR)
- URLs in Arabic text (should be LTR)
- Product codes / IDs (should be LTR)

**Solutions**:
- Use `<bdi>` element for isolated text
- Use Unicode controls: RLI (\u2067), LRI (\u2066), PDI (\u2069)
- Set `unicode-bidi: isolate` or `embed` in CSS
- Wrap phone/email/URL in `dir="ltr"` spans

**Example**:
```html
<!-- ❌ WRONG - Phone number flows RTL -->
<p>اتصل بنا: +966501234567</p>

<!-- ✅ CORRECT - Phone isolated as LTR -->
<p>اتصل بنا: <span dir="ltr">+966501234567</span></p>
```

**Location**: `src/rtl-checker.ts` - `checkBiDiTextHandling()`

---

### 5. Currency Formatting (SAR)

**Purpose**: Ensure Saudi Riyal is formatted correctly

**Saudi Arabia currency rules**:
- Currency: Saudi Riyal (SAR / ريال / ر.س)
- Symbol placement: **AFTER** the number
- Decimal separator: . (period)
- Thousands separator: , (comma)
- Format: `١٠٠ ر.س` or `100 ريال` or `100 SAR`

**What to check**:
- ❌ Using $ symbol
- ❌ Currency before number: "SAR 100" or "ر.س 100"
- ✅ Currency after number: "100 SAR" or "100 ر.س"
- Basket/cart values formatting
- Decimal places (2 digits: 99.99)
- Thousands separators (1,000.00)

**Examples**:
```
❌ WRONG:
$100
SAR 100
ر.س 100
100$

✅ CORRECT:
100 ر.س
100 ريال
100 SAR
1,250.50 ر.س
```

**Special attention**:
- Shopping cart total
- Product prices
- Service fees
- Payment amounts
- Invoice totals

**Location**: `src/rtl-checker.ts` - `checkCurrencyFormatting()`

---

### 6. Number Formatting

**Purpose**: Ensure consistent numeral system usage

**Options**:
- Western numerals: 0-9 (most common in Saudi Arabia)
- Arabic numerals: ٠-٩ (traditional)

**What to check**:
- **Consistency**: Don't mix Western and Arabic numerals
- Phone numbers: Usually Western (0501234567)
- Dates: Usually Western (15/02/2026)
- Prices: Usually Western (100.50)
- Percentages: Usually Western (25%)

**Note**: Both numeral systems are acceptable in Saudi Arabia, but consistency matters.

**Location**: `src/rtl-checker.ts` - `checkNumbersAndDates()`

---

### 7. Date & Time Formatting

**Purpose**: Support both Gregorian and Hijri calendars

**Saudi Arabia date requirements**:
- **Hijri calendar**: Islamic lunar calendar (official calendar)
- **Gregorian calendar**: Western solar calendar (commonly used)
- Date format: DD/MM/YYYY (not MM/DD/YYYY)
- Timezone: Arabia Standard Time (AST = UTC+3)

**What to check**:
- Presence of Hijri dates alongside Gregorian
- Hijri month names: محرم, صفر, ربيع الأول, رمضان, etc.
- Date format order (DD/MM vs MM/DD)
- Timezone handling (AST/UTC+3)
- Friday as start of week (not Sunday)

**Hijri months** (12 total):
1. محرم (Muharram)
2. صفر (Safar)
3. ربيع الأول (Rabi' al-Awwal)
4. ربيع الثاني (Rabi' al-Thani)
5. جمادى الأول (Jumada al-Ula)
6. جمادى الثاني (Jumada al-Akhirah)
7. رجب (Rajab)
8. شعبان (Sha'ban)
9. رمضان (Ramadan)
10. شوال (Shawwal)
11. ذو القعدة (Dhu al-Qi'dah)
12. ذو الحجة (Dhu al-Hijjah)

**Example**:
```
✅ GOOD: Display both calendars
15/02/2026 (27 شعبان 1448)

❌ BAD: Only Gregorian
02/15/2026
```

**Location**: `src/rtl-checker.ts` - `checkHijriCalendar()`

---

### 8. Layout Expansion

**Purpose**: Account for Arabic text being ~30% longer than English

**Challenge**:
- Arabic words are typically 20-40% longer than English equivalents
- Right-to-left reading affects layout flow
- Text overflow and truncation issues

**What to check**:
- Buttons too narrow for Arabic text
- Text truncated with ellipsis (...)
- Fixed-width containers causing overflow
- Wrapped text in unexpected places
- Hidden content due to overflow: hidden

**Solutions**:
- Use flexible layouts (flex, grid)
- Set min-width on buttons
- Avoid fixed widths for text containers
- Test with longest translations
- Use overflow: visible or text wrapping

**Example**:
```css
/* ❌ WRONG - Fixed width */
button {
  width: 100px;
  overflow: hidden;
}

/* ✅ CORRECT - Flexible width */
button {
  min-width: 100px;
  padding: 0 16px;
  white-space: nowrap;
}
```

**Location**: `src/rtl-checker.ts` - `checkLayoutExpansion()`

---

### 9. Text Direction & Alignment

**Purpose**: Ensure proper RTL layout

**What to check**:
- HTML/body has `dir="rtl"`
- Text alignment using `start/end` not `left/right`
- Margin/padding using `inline-start/end` not `left/right`
- No explicit `dir="ltr"` on Arabic text
- Flex direction respects RTL

**CSS best practices**:
```css
/* ❌ WRONG */
text-align: left;
margin-left: 16px;
padding-right: 8px;
direction: ltr;

/* ✅ CORRECT */
text-align: start;
margin-inline-start: 16px;
padding-inline-end: 8px;
/* direction inherited from html[dir="rtl"] */
```

**Location**: `src/rtl-checker.ts` - `checkRTLDirection()`, `checkTextAlignment()`

---

### 10. Icon Alignment

**Purpose**: Flip directional icons in RTL mode

**Directional icons** (should flip):
- Arrows: ← → ↑ ↓
- Chevrons: ‹ ›
- Back/forward buttons
- Navigation arrows
- Breadcrumb separators

**Non-directional icons** (don't flip):
- Checkmarks: ✓ ✔
- Close: ✕ ×
- Plus: +
- Minus: −
- Search: 🔍
- Home: 🏠
- Settings: ⚙️

**Implementation**:
```css
/* Flip directional icons in RTL */
[dir="rtl"] .icon-arrow,
[dir="rtl"] .icon-chevron {
  transform: scaleX(-1);
}
```

**Location**: `src/rtl-checker.ts` - `checkIconAlignment()`

---

## Testing Workflow

### Phase 1: Error Detection (CRITICAL)
1. Navigate to URL
2. Check HTTP status code
3. Check for error page content
4. **FAIL immediately if error detected**

### Phase 2: RTL Layout Checks
1. Text direction (html/body dir="rtl")
2. Text alignment (start/end)
3. Margin/padding (inline-start/end)
4. Icon alignment (directional flipping)

### Phase 3: Content Checks
1. Hardcoded English strings
2. Hardcoded Arabic strings
3. Image text (OCR)
4. BiDi text handling

### Phase 4: Localization Checks
1. Currency formatting (SAR)
2. Number formatting consistency
3. Date formatting (Hijri + Gregorian)
4. Timezone handling

### Phase 5: Layout Quality
1. Text overflow/truncation
2. Layout expansion (30% rule)
3. Button sizing
4. Container widths

### Phase 6: AI Analysis
1. Screenshot analysis with Gemini
2. Comprehensive issue detection
3. OCR for image text
4. Overall quality score

---

## Test Execution

### Files Modified

1. **`src/browser.ts`**
   - Added 404 detection in `navigateTo()`
   - HTTP status checking
   - Error page content detection

2. **`src/rtl-checker.ts`**
   - Expanded hardcoded patterns (150+ English + 150+ Arabic)
   - Added `checkCurrencyFormatting()`
   - Added `checkBiDiTextHandling()`
   - Added `checkHijriCalendar()`
   - Added `checkLayoutExpansion()`
   - Updated `runRTLChecks()` to include all new checks

3. **`src/ai-analyzer.ts`**
   - Enhanced Gemini prompt with comprehensive instructions
   - Added 404/error page detection priority
   - Added image text (OCR) detection
   - Added currency/date/BiDi checking
   - Added `imageText` field to results

### Running Tests

```bash
# Full test suite
npm run test

# Quick test (skip visual regression)
npm run test:quick

# Auth tests only
npm run test:auth

# RTL tests only
npm run test:rtl
```

### Expected Output

**Successful test**:
```
✅ Navigation successful (HTTP 200)
✅ RTL direction check: 9/10
✅ Hardcoded strings: 0 found
✅ Currency formatting: SAR format correct
✅ BiDi text: Properly isolated
✅ Hijri calendar: Supported
✅ Layout expansion: No overflow
```

**Failed test (404)**:
```
❌ ERROR: HTTP 404 when navigating to URL
❌ Test failed immediately - error page detected
```

**RTL issues found**:
```
⚠️  Found 3 hardcoded English strings: Submit, Cancel, Save
⚠️  Found 2 hardcoded Arabic strings: إرسال, حفظ
⚠️  Currency before number: "SAR 100" (should be "100 SAR")
⚠️  No Hijri calendar dates found
⚠️  5 buttons with potential text overflow
```

---

## Scoring System

Each check returns a score from 0-10:

- **10**: Perfect, no issues
- **8-9**: Minor issues (low severity)
- **6-7**: Noticeable issues (medium severity)
- **4-5**: Significant issues (high severity)
- **0-3**: Critical issues or check failed

**Overall score**: Average of all check scores

**Grade scale**:
- 9.0+: Excellent RTL support
- 7.0-8.9: Good RTL support
- 5.0-6.9: Needs improvement
- Below 5.0: Poor RTL support

---

## Common Issues & Solutions

### Issue: Text overflowing buttons
**Solution**: Use `min-width` and flexible padding

### Issue: Mixed English/Arabic without separation
**Solution**: Wrap segments in `<bdi>` or use Unicode controls

### Issue: Currency symbol before number
**Solution**: Format as "100 ر.س" not "ر.س 100"

### Issue: Phone numbers flowing RTL
**Solution**: Wrap in `<span dir="ltr">`

### Issue: No Hijri calendar
**Solution**: Use date library supporting both Hijri and Gregorian

### Issue: Text truncated with ellipsis
**Solution**: Increase container width or use wrapping

### Issue: Icons not flipping
**Solution**: Add `transform: scaleX(-1)` for directional icons

### Issue: Hardcoded strings
**Solution**: Replace all strings with i18n keys: `t('key')`

---

## Best Practices Summary

### DO:
✅ Use `dir="rtl"` on html/body
✅ Use `start/end` for alignment
✅ Use `inline-start/end` for margin/padding
✅ Place SAR symbol **after** number
✅ Support both Hijri and Gregorian calendars
✅ Use i18n keys for ALL strings (English AND Arabic)
✅ Wrap mixed content in `<bdi>` tags
✅ Flip directional icons in RTL
✅ Allow 30% extra space for Arabic text
✅ Test with longest translations
✅ Isolate LTR data (phones, emails) in RTL context

### DON'T:
❌ Use `left/right` for directional properties
❌ Put currency symbol before number
❌ Use MM/DD/YYYY date format
❌ Mix Western and Arabic numerals
❌ Hardcode any UI strings (English OR Arabic)
❌ Put text in images
❌ Use fixed widths for text containers
❌ Flip non-directional icons (✓, ×, +, −)
❌ Assume English text length
❌ Forget to test BiDi text scenarios

---

## Research Credits

This comprehensive testing strategy is based on industry best practices for RTL and i18n testing, specifically tailored for Saudi Arabian applications.

**Key considerations for Saudi Arabia**:
- Official language: Arabic
- Official calendar: Hijri (Islamic lunar calendar)
- Currency: Saudi Riyal (SAR / ريال / ر.س)
- Timezone: Arabia Standard Time (AST = UTC+3)
- Week start: Saturday (weekend: Friday-Saturday)
- Common numeral system: Western (0-9)
- Date format: DD/MM/YYYY

---

*Document version: 1.0*
*Last updated: 2026-02-09*
*Project: Dawati Automated Testing System*
