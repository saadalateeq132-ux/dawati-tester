# Roadmap: Dawati Autonomous Testing System - v1.1 Hardening & Full Coverage

**Created:** 2026-02-10
**Milestone:** v1.1 - Production Hardening & Full Coverage
**Depth:** Comprehensive (11 phases)
**Coverage:** 52/52 requirements mapped

---

## Overview

This roadmap transforms the working v1.0 system (63/63 phases PASS at 32% coverage) into a production-ready testing platform. The 11-phase structure prioritizes measurement before enforcement through shadow mode deployment, implements critical legal requirements (PII masking), adds visual regression testing, expands security and performance testing, and scales coverage from 32% to 75%+ across all major app features. The graduated enforcement approach preserves the current 63/63 PASS success rate while incrementally tightening quality thresholds.

---

## Phase 10: Shadow Mode & Measurement Infrastructure

**Goal:** Add measurement capabilities without enforcing new thresholds to establish baselines.

**Dependencies:** v1.0 (Phases 1-9 completed)

**Requirements:**
- SCORE-01: Shadow mode for new checks - measure without failing, collect baselines before enforcement
- SCORE-02: Graduated threshold tightening - RTL, Color, Code Quality thresholds increase over time
- DAT-01: Hardcoded English string detection - expand from ~30 to 150+ patterns
- DAT-02: Hardcoded Arabic string detection - expand to 150+ patterns
- DAT-14: Hardcoded colors & theme consistency - flag inline hex codes, check all primary buttons use same color
- DAT-15: Dynamic content & script detection - JS-generated text not localized

**Success Criteria:**
1. System logs what WOULD fail under strict thresholds without actually failing tests
2. Shadow mode metrics collected for all 63 existing phases showing potential failures
3. Pattern library expands from ~30 to 300+ patterns (150 English, 150 Arabic) covering app-relevant terms
4. All 63 phases maintain PASS status while shadow metrics identify quality issues
5. Shadow mode dashboard shows category-by-category readiness for threshold enforcement

---

## Phase 11: PII Masking & Legal Compliance

**Goal:** Users can run tests with PII-masked screenshots that comply with data protection regulations.

**Dependencies:** Phase 10 (requires measurement infrastructure)

**Requirements:**
- VIS-02: PII masking in screenshots before storage/AI analysis (emails, phone numbers, names, credit cards) using Playwright's mask option
- DAT-06: Authentication component testing - email format validation, phone format, auto error messages
- DAT-08: Name field validation - reject numeric input, invalid characters, max length enforcement

**Success Criteria:**
1. Screenshots mask all PII (emails, phone numbers, names) using DOM-based selectors before AI analysis
2. PII masking preserves context structure for AI validation (e.g., 0512XXXX34 not 05XXXXXXXX)
3. Test data substitution uses realistic values instead of blanking for better validation
4. Authentication components tested with format validation without exposing real user data
5. Name field validation works correctly with masked test data

---

## Phase 12: Visual Regression Testing

**Goal:** System detects visual regressions through pixel-level screenshot comparison with managed baselines.

**Dependencies:** Phase 11 (PII masking must happen before baseline creation)

**Requirements:**
- VIS-01: Page-by-page screenshot comparison (baseline vs current) using pixelmatch with configurable threshold (default 1%)
- VIS-03: Baseline management workflow (create, approve, reject, update baselines per screen)
- VIS-04: Visual diff reports with annotated screenshots showing changed regions
- VIS-06: RTL visual validation - force RTL, screenshot, verify mirroring, no overlaps, BiDi text support
- VIS-09: Header uniformity check - all marketplace sections have identical top headers

**Success Criteria:**
1. System compares current screenshots against baselines using pixelmatch with 1% threshold
2. Baseline approval workflow requires 2+ reviewer approval before baselines become truth
3. Visual diff reports highlight changed regions with pixel-level annotations
4. RTL visual validation detects layout mirroring issues and BiDi text problems
5. Header uniformity checker flags inconsistent branding/navigation across marketplace sections

---

## Phase 13: Component Consistency & Advanced Visual Testing

**Goal:** System validates visual consistency across pages and responsive behavior.

**Dependencies:** Phase 12 (requires baseline comparison infrastructure)

**Requirements:**
- VIS-05: Component consistency checker - verify back button, header, tab bar, primary buttons same position/size/color across pages
- VIS-07: Portrait/landscape orientation testing for mobile responsiveness
- VIS-08: Notification display testing - trigger notifications, screenshot states, verify visibility/clickability

**Success Criteria:**
1. Component consistency checker flags >5-10% positional variance in navigation elements across pages
2. System tests portrait and landscape orientations automatically for mobile responsiveness
3. Notification testing captures display states and verifies visibility/clickability
4. Color consistency validation detects theme breaks and button color mismatches
5. Positional variance reports show component drift across different screens

---

## Phase 14: Data Validation & Form Testing

**Goal:** System validates all form inputs, data formats, and user flows comprehensively.

**Dependencies:** Phase 11 (requires authentication and masking infrastructure)

**Requirements:**
- DAT-03: Number formatting detection - flag Arabic/Eastern numerals when Western expected
- DAT-04: Currency formatting enforcement - SAR after number, flag text currency when SVG icon preferred
- DAT-05: Date format validation - detect English MM/DD/YYYY in Arabic context, verify Hijri month names
- DAT-07: User flow validation - existing users redirect to homepage, new users trigger onboarding wizard
- DAT-09: Password field validation - complexity requirements, show/hide toggle, confirm match
- DAT-10: Event creation wizard validation - required fields, image uploads, step progression, error handling
- DAT-11: Date/time picker validation - backend-available slots, vendor availability calendars, time conflict detection
- DAT-12: General form validation - max lengths, input types, autocomplete, real-time validation with visual indicators
- DAT-13: Marketplace search deep testing - autocomplete, filters, results from backend, sort functionality

**Success Criteria:**
1. Number and currency format validation detects inconsistencies between Arabic and Western conventions
2. Date format checker identifies mismatched formats in bilingual contexts and validates Hijri calendars
3. User flow validation confirms routing behavior for new vs existing users
4. Password validation verifies complexity requirements and UI interactions (show/hide, confirm match)
5. Form validation testing covers all wizard flows with edge cases and error state verification

---

## Phase 15: Backend Integration & API Testing

**Goal:** System validates frontend-to-backend connectivity and data synchronization.

**Dependencies:** Phase 14 (requires form testing infrastructure)

**Requirements:**
- API-01: Frontend-to-backend connectivity verification - all API calls return 200 OK, no 4xx/5xx errors
- API-02: Data synchronization testing - submitted data persists, updates in real-time, graceful failure handling
- API-03: Vendor dashboard data flow - event creation to vendor assignment, real-time booking updates
- API-04: Navigation state management - no data loss on back navigation, sessions persist across screens
- API-05: Real-time data updates - saved drafts, synced profiles, instant booking notifications

**Success Criteria:**
1. API monitoring verifies all endpoints return 200 OK with no unexpected 4xx/5xx errors
2. Data persistence testing confirms submitted forms save correctly and updates propagate in real-time
3. Vendor dashboard flow testing validates event-to-vendor assignment and booking update mechanisms
4. Navigation state testing detects data loss on back button and verifies session persistence
5. Real-time update testing confirms draft saves, profile syncs, and notification delivery

---

## Phase 16: Security Testing

**Goal:** System validates security controls across authentication, input handling, and session management.

**Dependencies:** Phase 15 (requires backend integration testing)

**Requirements:**
- SEC-01: XSS payload injection testing across all user inputs (search, forms, reviews, chat)
- SEC-02: SQL injection testing across all search/filter inputs
- SEC-03: CSRF token validation on all mutation endpoints
- SEC-04: Rate limiting verification (429 with retry-after)
- SEC-05: Session timeout testing
- SEC-06: Input sanitization checks on all text fields
- SEC-07: File upload validation (size limits, type restrictions, error messages)
- SEC-08: Auth bypass attempt testing

**Success Criteria:**
1. XSS payload testing injects malicious scripts across all input fields and verifies sanitization
2. SQL injection testing attempts common attacks on search and filter endpoints
3. CSRF validation confirms all mutation endpoints require valid tokens
4. Rate limiting testing triggers 429 responses and verifies retry-after headers
5. Security testing runs with customer, vendor, and admin roles to cover authenticated contexts

---

## Phase 17: Performance Testing & Core Web Vitals

**Goal:** System measures performance metrics and validates Core Web Vitals compliance.

**Dependencies:** Phase 10 (can run in parallel with security after infrastructure ready)

**Requirements:**
- PERF-01: First Contentful Paint measurement (<1.8s target)
- PERF-02: Largest Contentful Paint measurement (<2.5s target)
- PERF-03: Time to Interactive measurement (<3.8s target)
- PERF-04: Cumulative Layout Shift measurement (<0.1 target)
- PERF-05: First Input Delay / INP measurement (<100ms target)
- PERF-06: Memory leak detection over navigation cycles
- PERF-07: Bundle size tracking

**Success Criteria:**
1. Core Web Vitals measured on all key pages (FCP, LCP, TTI, CLS, FID/INP)
2. Performance metrics collected without failing builds (observation mode initially)
3. Memory leak detection runs across 10+ navigation cycles to detect accumulation
4. Performance reports show P95 measurements over 5 runs for consistency
5. Bundle size tracking establishes baseline for future regression detection

---

## Phase 18: Coverage Expansion - Vendor Dashboard & AI Consultant

**Goal:** Expand test coverage to major untested features: vendor dashboard and AI consultant.

**Dependencies:** Phase 15 (requires backend integration and auth infrastructure)

**Requirements:**
- COV-01: Vendor Dashboard test suite - 28/33 features tested (calendar, bookings, earnings, messaging, profile, packages, reviews)
- COV-02: AI Consultant test suite - 15/18 features tested (natural language, recommendations, budget, history)
- COV-04: Guest Management expansion - 20/25 features tested (add/delete guests, invitations, RSVP, QR check-in)
- COV-05: Event Test expansion - 28/35 features tested (create, edit, delete, visibility, cancel with notifications)
- COV-06: Booking Test expansion - 27/30 features tested (complete flow, cancel/refund, payment, modification)

**Success Criteria:**
1. Vendor Dashboard testing covers 28/33 features including calendar management, bookings, and earnings
2. AI Consultant testing validates 15/18 features including natural language processing and recommendations
3. Guest Management expansion covers invitation flows, RSVP tracking, and QR check-in
4. Event testing expanded to 28/35 features covering full lifecycle with edge cases
5. Booking testing covers 27/30 features including cancellation, refund, and modification flows

---

## Phase 19: Coverage Expansion - Admin Panel & Click Validation

**Goal:** Add admin panel testing and retrofit click validation across all existing suites.

**Dependencies:** Phase 18 (requires coverage expansion patterns established)

**Requirements:**
- COV-03: Admin Panel test suite - 24/30 features tested (users, vendors, bookings, finance, disputes, security, settings)
- COV-07: Add click validation (expectAfterClick) to all 15 existing test suites

**Success Criteria:**
1. Admin Panel testing covers 24/30 features including user management, vendor approval, and finance monitoring
2. Click validation (expectAfterClick) retrofitted to all 15 existing test suites with phased rollout
3. Click validation rollout phased over 3 weeks (5 suites per week) to prevent mass failures
4. Admin testing validates role-based access controls and security boundaries
5. Click validation soft assertions identify broken interactions before hard enforcement

---

## Phase 20: CI/CD Integration & Production Readiness

**Goal:** Automate test execution in CI/CD pipeline with Docker consistency and reporting.

**Dependencies:** Phase 17 (requires all testing features operational)

**Requirements:**
- CICD-01: GitHub Actions pipeline for automated test execution on push/PR
- CICD-02: Docker containerization for consistent screenshot rendering across environments
- CICD-03: Auto-setup script (setup.bat/setup.sh) for one-command installation
- CICD-04: Test run comparison - compare two runs to show improvements/regressions
- CICD-05: Allure reporting integration for historical tracking and trend analysis
- SCORE-03: AI decision re-engagement - move from always-PASS to threshold-gated FAIL on high-confidence critical issues

**Success Criteria:**
1. GitHub Actions workflow runs smoke tests on every PR and full suite nightly
2. Docker container provides consistent screenshot rendering eliminating CI flakiness
3. Auto-setup script installs all dependencies and configures environment in one command
4. Test run comparison shows improvements/regressions between consecutive runs
5. Allure reporting tracks historical trends with flakiness detection and failure analysis

---

## Progress Tracking

| Phase | Requirements | Status | Completion |
|-------|--------------|--------|------------|
| 10 - Shadow Mode & Measurement | SCORE-01, SCORE-02, DAT-01, DAT-02, DAT-14, DAT-15 (6) | Pending | 0% |
| 11 - PII Masking & Legal Compliance | VIS-02, DAT-06, DAT-08 (3) | Pending | 0% |
| 12 - Visual Regression Testing | VIS-01, VIS-03, VIS-04, VIS-06, VIS-09 (5) | Pending | 0% |
| 13 - Component Consistency | VIS-05, VIS-07, VIS-08 (3) | Pending | 0% |
| 14 - Data Validation & Forms | DAT-03, DAT-04, DAT-05, DAT-07, DAT-09, DAT-10, DAT-11, DAT-12, DAT-13 (9) | Pending | 0% |
| 15 - Backend Integration | API-01, API-02, API-03, API-04, API-05 (5) | Pending | 0% |
| 16 - Security Testing | SEC-01 to SEC-08 (8) | Pending | 0% |
| 17 - Performance Testing | PERF-01 to PERF-07 (7) | Pending | 0% |
| 18 - Coverage Expansion 1 | COV-01, COV-02, COV-04, COV-05, COV-06 (5) | Pending | 0% |
| 19 - Coverage Expansion 2 | COV-03, COV-07 (2) | Pending | 0% |
| 20 - CI/CD & Production | CICD-01 to CICD-05, SCORE-03 (6) | Pending | 0% |

**Overall Progress:** 0/52 requirements completed (0%)

---

## Phase Dependencies

```
Phase 10 (Shadow Mode)
    |
    v
Phase 11 (PII Masking) ----+
    |                      |
    v                      |
Phase 12 (Visual Regression)
    |                      |
    v                      |
Phase 13 (Component Consistency)
                           |
                           v
Phase 14 (Data Validation) <--- (parallel starts here)
    |
    v
Phase 15 (Backend Integration)
    |
    +----> Phase 16 (Security) --+
    |                             |
    +----> Phase 17 (Performance) |
    |                             |
    v                             |
Phase 18 (Coverage Expansion 1)   |
    |                             |
    v                             |
Phase 19 (Coverage Expansion 2)   |
    |                             |
    +-----------------------------+
    |
    v
Phase 20 (CI/CD & Production)
```

---

## Notes

**Coverage Validation:** All 52 v1.1 requirements mapped to phases. No orphaned requirements.

**Research Flags:**
- Phase 10: Shadow mode implementation pattern requires exemption mechanism design
- Phase 12: Visual regression baseline approval workflow must prevent baseline pollution
- Phase 16: Security testing requires customer, vendor, and admin test credentials
- Phase 17: Performance budgets must be environment-specific (CI vs local vs production)
- Phase 20: Docker screenshot consistency critical for CI reliability

**Key Risks:**
- Phase 10: Shadow mode must run for 4 weeks before Phase 20 enforcement to collect sufficient baselines
- Phase 12: Baseline pollution (buggy screenshots become truth) mitigated by manual approval workflow
- Phase 16/17: Security and performance can run in parallel after Phase 15 completes
- Phase 19: Click validation expansion risks 40% test failure rate - phased rollout over 3 weeks mitigates
- Phase 20: CI/CD timing assumptions may cause flakiness - 3x timeout multiplier for CI environment

**Graduated Enforcement Timeline:**
- Weeks 1-4: Shadow mode measurement (Phase 10) - NO threshold changes
- Weeks 5-8: Graduated threshold rollout via Phase 20
  - Week 5: RTL threshold 5.0 → 6.0
  - Week 6: Color threshold 4.0 → 5.0
  - Week 7: Code Quality threshold 4.0 → 5.0
  - Week 8: Security threshold 0 → 7.0, Performance threshold 0 → 50

**Success Metrics:**
- Maintain 63/63 PASS rate during shadow mode (Phases 10-19)
- CI flakiness <15% (Phase 20)
- Coverage expansion: 32% → 75% (Phases 18-19)
- No more than 10% pass rate regression per week during threshold tightening

---

*Last updated: 2026-02-10*
*Milestone: v1.1 Hardening & Full Coverage*
*Phases: 10-20 (continues from v1.0's Phases 1-9)*
