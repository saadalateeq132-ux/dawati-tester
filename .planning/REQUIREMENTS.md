# Requirements: Dawati Autonomous Testing System — v1.1 Hardening & Full Coverage

## v1.1 Requirements

### Level 1: Visual & User Experience Testing

- [ ] **VIS-01**: Page-by-page screenshot comparison (baseline vs current) using pixelmatch with configurable threshold (default 1%)
- [ ] **VIS-02**: PII masking in screenshots before storage/AI analysis (emails, phone numbers, names, credit cards) using Playwright's `mask` option
- [ ] **VIS-03**: Baseline management workflow (create, approve, reject, update baselines per screen)
- [ ] **VIS-04**: Visual diff reports with annotated screenshots showing changed regions
- [ ] **VIS-05**: Component consistency checker — verify back button, header, tab bar, primary buttons same position/size/color across pages (flag >5-10% positional variance)
- [ ] **VIS-06**: RTL visual validation — force RTL, screenshot, verify mirroring, no overlaps, BiDi text support (beyond DOM checks — pixel-level comparison)
- [ ] **VIS-07**: Portrait/landscape orientation testing for mobile responsiveness
- [ ] **VIS-08**: Notification display testing — trigger notifications, screenshot states, verify visibility/clickability
- [ ] **VIS-09**: Header uniformity check — all marketplace sections have identical top headers with consistent branding, search, and navigation

### Level 2: Data Validation & Component Testing

- [ ] **DAT-01**: Hardcoded English string detection — expand from ~30 to 150+ patterns (Submit, Cancel, Save, Delete, Edit, Add, Remove, Search, Filter, Sort, View, Back, Next, Previous, Loading, Error, Success, Welcome, Hello, Sign In, Sign Up, Log In, Log Out, Profile, Settings, Home, Continue, OK, Yes, No, Menu, Cart, Book Now, Upload Photo, Event Details, Vendor List, Availability, Confirm, Reset, etc.)
- [ ] **DAT-02**: Hardcoded Arabic string detection — expand to 150+ patterns (إرسال, إلغاء, حفظ, حذف, تعديل, إضافة, إزالة, بحث, تحميل, خطأ, نجح, فشل, قيد الانتظار, مكتمل, تسجيل الدخول, تسجيل, خروج, كلمة المرور, البريد الإلكتروني, الرئيسية, الملف الشخصي, الإعدادات, لوحة التحكم, القائمة, حدث, مناسبة, بائع, خدمة, حجز, طلب, سلة, الدفع, محرم, صفر, ربيع الأول, رمضان, شوال, ذو القعدة, ذو الحجة, ريال, ر.س, etc.)
- [ ] **DAT-03**: Number formatting detection — flag Arabic/Eastern numerals (١٢٣٤) when Western (1234) expected in UI; validate consistency
- [ ] **DAT-04**: Currency formatting enforcement — SAR after number (100 SAR), flag text currency when SVG icon preferred
- [ ] **DAT-05**: Date format validation — detect English MM/DD/YYYY in Arabic context, verify Hijri month names present
- [ ] **DAT-06**: Authentication component testing — email format validation (@, valid domain), phone format (country code + digits), auto error messages
- [ ] **DAT-07**: User flow validation — existing users redirect to homepage, new users trigger onboarding wizard
- [ ] **DAT-08**: Name field validation — reject numeric input, invalid characters, max length enforcement
- [ ] **DAT-09**: Password field validation — complexity requirements (uppercase, lowercase, special, min 8-12), show/hide toggle, confirm match
- [ ] **DAT-10**: Event creation wizard validation — required fields, image uploads (<5MB, JPG/PNG), step progression, back/forward nav, error handling
- [ ] **DAT-11**: Date/time picker validation — backend-available slots, vendor availability calendars, no past dates, time conflict detection, Hijri/Gregorian format
- [ ] **DAT-12**: General form validation — max lengths, input types, autocomplete, real-time validation with visual indicators
- [ ] **DAT-13**: Marketplace search deep testing — autocomplete, filters, results from backend, sort functionality
- [ ] **DAT-14**: Hardcoded colors & theme consistency — flag inline hex codes, check all primary buttons use same color, detect theme breaks
- [ ] **DAT-15**: Dynamic content & script detection — JS-generated text not localized, script injection checks in forms

### Level 3: Backend Integration & Data Flow

- [ ] **API-01**: Frontend-to-backend connectivity verification — all API calls return 200 OK, no 4xx/5xx errors
- [ ] **API-02**: Data synchronization testing — submitted data persists, updates in real-time, graceful failure handling
- [ ] **API-03**: Vendor dashboard data flow — event creation to vendor assignment, real-time booking updates
- [ ] **API-04**: Navigation state management — no data loss on back navigation, sessions persist across screens
- [ ] **API-05**: Real-time data updates — saved drafts, synced profiles, instant booking notifications

### Security Testing

- [ ] **SEC-01**: XSS payload injection testing across all user inputs (search, forms, reviews, chat)
- [ ] **SEC-02**: SQL injection testing across all search/filter inputs
- [ ] **SEC-03**: CSRF token validation on all mutation endpoints
- [ ] **SEC-04**: Rate limiting verification (429 with retry-after)
- [ ] **SEC-05**: Session timeout testing
- [ ] **SEC-06**: Input sanitization checks on all text fields (event names, descriptions, reviews, messages)
- [ ] **SEC-07**: File upload validation (size limits, type restrictions, error messages)
- [ ] **SEC-08**: Auth bypass attempt testing

### Performance Testing

- [ ] **PERF-01**: First Contentful Paint measurement (<1.8s target)
- [ ] **PERF-02**: Largest Contentful Paint measurement (<2.5s target)
- [ ] **PERF-03**: Time to Interactive measurement (<3.8s target)
- [ ] **PERF-04**: Cumulative Layout Shift measurement (<0.1 target)
- [ ] **PERF-05**: First Input Delay / INP measurement (<100ms target)
- [ ] **PERF-06**: Memory leak detection over navigation cycles
- [ ] **PERF-07**: Bundle size tracking

### Coverage Expansion

- [ ] **COV-01**: Vendor Dashboard test suite — 28/33 features tested (calendar, bookings, earnings, messaging, profile, packages, reviews)
- [ ] **COV-02**: AI Consultant test suite — 15/18 features tested (natural language, recommendations, budget, history)
- [ ] **COV-03**: Admin Panel test suite — 24/30 features tested (users, vendors, bookings, finance, disputes, security, settings)
- [ ] **COV-04**: Guest Management expansion — 20/25 features tested (add/delete guests, invitations, RSVP, QR check-in)
- [ ] **COV-05**: Event Test expansion — 28/35 features tested (create, edit, delete, visibility, cancel with notifications)
- [ ] **COV-06**: Booking Test expansion — 27/30 features tested (complete flow, cancel/refund, payment, modification)
- [ ] **COV-07**: Add click validation (expectAfterClick) to all 15 existing test suites

### CI/CD & Production Readiness

- [ ] **CICD-01**: GitHub Actions pipeline for automated test execution on push/PR
- [ ] **CICD-02**: Docker containerization for consistent screenshot rendering across environments
- [ ] **CICD-03**: Auto-setup script (setup.bat/setup.sh) for one-command installation
- [ ] **CICD-04**: Test run comparison — compare two runs to show improvements/regressions
- [ ] **CICD-05**: Allure reporting integration for historical tracking and trend analysis

### Scoring & Threshold Hardening

- [ ] **SCORE-01**: Shadow mode for new checks — measure without failing, collect baselines before enforcement
- [ ] **SCORE-02**: Graduated threshold tightening — RTL, Color, Code Quality thresholds increase over time
- [ ] **SCORE-03**: AI decision re-engagement — move from always-PASS to threshold-gated FAIL on high-confidence critical issues

---

## Future Requirements (v1.2+)

- [ ] Multi-language test generation (auto-duplicate tests for Arabic + English)
- [ ] Performance budgets in CI/CD (fail builds on regression)
- [ ] Full WCAG 2.2 accessibility audit
- [ ] Allure historical trend dashboards
- [ ] Active learning UI for autopilot fine-tuning

## Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Test recording/codegen | Playwright has built-in codegen, don't rebuild |
| Desktop browser testing | App is mobile-first, desktop = low priority |
| Full API testing suite | Keep E2E focused on UI; API tests are separate concern |
| Native mobile testing | Playwright tests web only; Maestro exists for native |
| 100% WCAG compliance | Event planning app, not government portal |

## Traceability

(Populated by roadmap — maps REQ-IDs to phases)

---
*Generated: 2026-02-10*
*Total: 52 requirements across 9 categories*
