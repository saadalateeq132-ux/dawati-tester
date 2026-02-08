# Roadmap: Dawati Autonomous Testing System

**Created:** 2026-02-08
**Depth:** Comprehensive (9 phases)
**Coverage:** 55/55 requirements mapped

---

## Overview

This roadmap delivers a systematic, AI-powered autonomous testing system for the Dawati event planning app. The system executes structured test plans (not random exploration), captures screenshots at every step, uses Gemini AI for intelligent analysis, and generates comprehensive reports. The 9-phase structure follows natural delivery boundaries from foundational setup through advanced internationalization testing, ensuring complete coverage of all 55 v1 requirements.

---

## Phase 1: Foundation & Setup

**Goal:** User can install and configure the testing system with minimal effort.

**Dependencies:** None (foundational phase)

**Requirements:**
- SETUP-01: System installs with one command (auto-setup.bat on Windows)
- SETUP-02: User only provides Gemini API key and Dawati app URL
- SETUP-03: Auto-installs Node.js if not present
- SETUP-04: Auto-installs all npm dependencies
- SETUP-05: Auto-installs Playwright browsers
- SETUP-06: Creates .env file from user input
- SETUP-07: Validates configuration before first run

**Success Criteria:**
1. User runs auto-setup.bat and system installs all dependencies without manual intervention
2. User provides only Gemini API key and app URL, system generates working configuration
3. Configuration validation catches missing or invalid settings before test execution
4. First-time setup completes in under 5 minutes on clean machine

---

## Phase 2: Authentication Testing

**Goal:** System can test all authentication flows end-to-end with token management.

**Dependencies:** Phase 1 (requires configured environment)

**Requirements:**
- AUTH-01: Tests Phone OTP sign-in flow completely (enter phone → receive code → verify → logged in)
- AUTH-02: Tests Email sign-in flow completely (enter email → receive code → verify → logged in)
- AUTH-03: Tests logout flow from any screen
- AUTH-04: Verifies auth state persists after page refresh
- AUTH-05: Takes screenshot at each auth step

**Success Criteria:**
1. System successfully authenticates via Phone OTP flow and maintains session across screens
2. System successfully authenticates via Email flow and maintains session across screens
3. System verifies logout clears auth state and redirects appropriately
4. System detects when auth tokens expire and handles refresh automatically
5. Screenshots capture every authentication step for debugging

---

## Phase 3: Core Navigation Testing

**Goal:** System can navigate and verify all routes, tabs, and screens in the app.

**Dependencies:** Phase 2 (requires authenticated session)

**Requirements:**
- NAV-01: Tests all homepage tabs (Birthdays, Weddings, Corporate, Gatherings, etc.)
- NAV-02: Tests all 15+ marketplace categories
- NAV-03: Tests navigation to vendor profiles
- NAV-04: Tests back navigation works correctly
- NAV-05: Tests bottom navigation bar (all tabs)
- NAV-06: Takes screenshot of each unique screen visited

**Success Criteria:**
1. System visits every homepage tab and verifies content loads
2. System navigates through all 15+ marketplace categories without errors
3. System can click into vendor profiles and navigate back successfully
4. System verifies back button/navigation returns to expected previous screen
5. Screenshots document every unique screen visited during navigation testing

---

## Phase 4: Scrolling & State Coverage

**Goal:** System can test all scrolling behaviors and capture all UI states.

**Dependencies:** Phase 3 (requires navigation capability)

**Requirements:**
- SCROLL-01: Tests vertical scrolling on list pages
- SCROLL-02: Tests horizontal scrolling (carousels, tabs)
- SCROLL-03: Tests infinite scroll / load more functionality
- SCROLL-04: Verifies smooth scrolling (no jank)
- SCROLL-05: Takes screenshots during scroll to capture all content
- STATE-01: Captures loading states (spinners, skeletons)
- STATE-02: Captures error states (error messages, retry buttons)
- STATE-03: Captures empty states (no data messages)
- STATE-04: Captures success states (confirmations, checkmarks)
- STATE-05: Verifies all states have appropriate visual feedback

**Success Criteria:**
1. System scrolls vertically through long lists and captures content at intervals
2. System scrolls horizontally through carousels and tab bars
3. System triggers and verifies infinite scroll/load more functionality
4. System captures screenshots of loading, error, empty, and success states
5. Screenshots document UI states that typically appear briefly or inconsistently

---

## Phase 5: Screenshot Capture System

**Goal:** System captures high-quality, organized screenshots for every test action.

**Dependencies:** Phase 3 (requires navigation for screenshot contexts)

**Requirements:**
- SCREEN-01: Captures screenshot after every significant action
- SCREEN-02: Saves screenshots with descriptive filenames (001_home.png, 002_login.png)
- SCREEN-03: Organizes screenshots in timestamped folders
- SCREEN-04: Supports full-page screenshots for long content

**Success Criteria:**
1. Every test action generates a screenshot with contextual filename
2. Screenshots organize into timestamped run folders (e.g., 2026-02-08_14-30-45/)
3. Long scrolling pages capture as full-page screenshots showing all content
4. Screenshot filenames clearly indicate what action or screen was captured

---

## Phase 6: AI-Powered Analysis

**Goal:** Gemini AI analyzes screenshots and identifies issues with actionable recommendations.

**Dependencies:** Phase 5 (requires screenshot capture), Phase 4 (requires state coverage)

**Requirements:**
- AI-01: Sends each screenshot to Gemini for analysis
- AI-02: Detects UI/UX issues (layout problems, missing elements)
- AI-03: Detects functionality issues (broken buttons, failed actions)
- AI-04: Detects performance issues (slow loading indicators)
- AI-05: Provides actionable fix suggestions for each issue
- AI-06: Rates issue severity (critical, high, medium, low)

**Success Criteria:**
1. System sends all captured screenshots to Gemini API with appropriate prompts
2. AI correctly identifies visual layout problems, missing UI elements, broken functionality
3. AI provides specific, actionable fix suggestions (not generic recommendations)
4. AI severity ratings align with actual impact (critical = app-breaking, low = cosmetic)
5. System implements multi-layer verification to prevent AI hallucination false positives

---

## Phase 7: RTL & Internationalization

**Goal:** System verifies Arabic RTL layout correctness and internationalization compliance.

**Dependencies:** Phase 6 (requires AI analysis capability)

**Requirements:**
- RTL-01: Verifies all text displays right-to-left correctly
- RTL-02: Detects hardcoded English text (should be Arabic)
- RTL-03: Checks icon/button alignment for RTL
- RTL-04: Verifies numbers and dates format correctly
- RTL-05: Flags any LTR-only styling issues

**Success Criteria:**
1. AI analysis detects text flowing left-to-right when it should be RTL
2. System flags hardcoded English strings in Arabic-language context
3. System verifies icons and buttons align correctly in RTL layout (right-aligned, mirrored when appropriate)
4. System validates Arabic number formatting and date presentation
5. Screenshots with RTL issues are clearly annotated with specific problems

---

## Phase 8: Reporting System

**Goal:** System generates comprehensive, actionable HTML reports with all findings.

**Dependencies:** Phase 6 (requires AI analysis results)

**Requirements:**
- REPORT-01: Generates comprehensive HTML report
- REPORT-02: Includes all screenshots in report
- REPORT-03: Lists all issues with severity ratings
- REPORT-04: Groups issues by category (UI, functionality, performance, RTL)
- REPORT-05: Provides overall app health score (1-10)
- REPORT-06: Includes fix suggestions for each issue
- REPORT-07: Saves report with timestamp for history

**Success Criteria:**
1. HTML report displays all screenshots in organized gallery format
2. Report categorizes issues into UI, functionality, performance, and RTL sections
3. Each issue includes severity rating, screenshot reference, and actionable fix suggestion
4. Report calculates overall app health score based on issue severity distribution
5. Historical reports save with timestamps for trend analysis across test runs

---

## Phase 9: Execution & Orchestration

**Goal:** System runs on-demand, shows progress, handles errors gracefully, and completes reliably.

**Dependencies:** Phase 8 (requires reporting), Phase 2 (requires auth)

**Requirements:**
- RUN-01: Runs on-demand with single command (npm run test)
- RUN-02: Completes full test and stops (not continuous)
- RUN-03: Shows progress during execution
- RUN-04: Handles errors gracefully (doesn't crash on failures)
- RUN-05: Supports test plan configuration (what to test)

**Success Criteria:**
1. User runs npm run test and system executes complete test suite without manual intervention
2. System displays real-time progress (current test, completion percentage)
3. Errors during testing log clearly without halting entire test run
4. System completes test run and generates report even when individual tests fail
5. User can configure test plan (which flows to test, which screens to skip) via configuration file

---

## Progress Tracking

| Phase | Requirements | Status | Completion |
|-------|--------------|--------|------------|
| 1 - Foundation & Setup | SETUP-01 to SETUP-07 (7) | Pending | 0% |
| 2 - Authentication Testing | AUTH-01 to AUTH-05 (5) | Pending | 0% |
| 3 - Core Navigation Testing | NAV-01 to NAV-06 (6) | Pending | 0% |
| 4 - Scrolling & State Coverage | SCROLL-01 to SCROLL-05, STATE-01 to STATE-05 (10) | Pending | 0% |
| 5 - Screenshot Capture System | SCREEN-01 to SCREEN-04 (4) | Pending | 0% |
| 6 - AI-Powered Analysis | AI-01 to AI-06 (6) | Pending | 0% |
| 7 - RTL & Internationalization | RTL-01 to RTL-05 (5) | Pending | 0% |
| 8 - Reporting System | REPORT-01 to REPORT-07 (7) | Pending | 0% |
| 9 - Execution & Orchestration | RUN-01 to RUN-05 (5) | Pending | 0% |

**Overall Progress:** 0/55 requirements completed (0%)

---

## Notes

**Coverage Validation:** All 55 v1 requirements mapped to phases. No orphaned requirements.

**Research Flags:**
- Phase 6 (AI-Powered Analysis): Complex Gemini integration patterns, hallucination mitigation strategies
- Phase 7 (RTL & Internationalization): RTL layout detection patterns with AI

**Key Risks:**
- Phase 2: OAuth token refresh must be implemented from start (Pitfall 3 from research)
- Phase 6: AI hallucination prevention requires multi-layer verification (Pitfall 1 from research)
- Phase 5/6: Screenshot consistency requires Docker standardization (Pitfall 4 from research)
- All phases: Gemini API rate limits require exponential backoff strategy (Pitfall 2 from research)

---

*Last updated: 2026-02-08*
