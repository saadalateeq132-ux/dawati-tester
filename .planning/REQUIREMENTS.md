# Requirements: Dawati Autonomous Testing System

## v1 Requirements

### Setup & Configuration

- [ ] **SETUP-01**: System installs with one command (auto-setup.bat on Windows)
- [ ] **SETUP-02**: User only provides Gemini API key and Dawati app URL
- [ ] **SETUP-03**: Auto-installs Node.js if not present
- [ ] **SETUP-04**: Auto-installs all npm dependencies
- [ ] **SETUP-05**: Auto-installs Playwright browsers
- [ ] **SETUP-06**: Creates .env file from user input
- [ ] **SETUP-07**: Validates configuration before first run

### Authentication Testing

- [ ] **AUTH-01**: Tests Phone OTP sign-in flow completely (enter phone → receive code → verify → logged in)
- [ ] **AUTH-02**: Tests Email sign-in flow completely (enter email → receive code → verify → logged in)
- [ ] **AUTH-03**: Tests logout flow from any screen
- [ ] **AUTH-04**: Verifies auth state persists after page refresh
- [ ] **AUTH-05**: Takes screenshot at each auth step

### Navigation Testing

- [ ] **NAV-01**: Tests all homepage tabs (Birthdays, Weddings, Corporate, Gatherings, etc.)
- [ ] **NAV-02**: Tests all 15+ marketplace categories
- [ ] **NAV-03**: Tests navigation to vendor profiles
- [ ] **NAV-04**: Tests back navigation works correctly
- [ ] **NAV-05**: Tests bottom navigation bar (all tabs)
- [ ] **NAV-06**: Takes screenshot of each unique screen visited

### Scrolling Testing

- [ ] **SCROLL-01**: Tests vertical scrolling on list pages
- [ ] **SCROLL-02**: Tests horizontal scrolling (carousels, tabs)
- [ ] **SCROLL-03**: Tests infinite scroll / load more functionality
- [ ] **SCROLL-04**: Verifies smooth scrolling (no jank)
- [ ] **SCROLL-05**: Takes screenshots during scroll to capture all content

### Screenshot Capture

- [ ] **SCREEN-01**: Captures screenshot after every significant action
- [ ] **SCREEN-02**: Saves screenshots with descriptive filenames (001_home.png, 002_login.png)
- [ ] **SCREEN-03**: Organizes screenshots in timestamped folders
- [ ] **SCREEN-04**: Supports full-page screenshots for long content

### AI Analysis (Gemini)

- [ ] **AI-01**: Sends each screenshot to Gemini for analysis
- [ ] **AI-02**: Detects UI/UX issues (layout problems, missing elements)
- [ ] **AI-03**: Detects functionality issues (broken buttons, failed actions)
- [ ] **AI-04**: Detects performance issues (slow loading indicators)
- [ ] **AI-05**: Provides actionable fix suggestions for each issue
- [ ] **AI-06**: Rates issue severity (critical, high, medium, low)

### RTL & Internationalization

- [ ] **RTL-01**: Verifies all text displays right-to-left correctly
- [ ] **RTL-02**: Detects hardcoded English text (should be Arabic)
- [ ] **RTL-03**: Checks icon/button alignment for RTL
- [ ] **RTL-04**: Verifies numbers and dates format correctly
- [ ] **RTL-05**: Flags any LTR-only styling issues

### UI State Coverage

- [ ] **STATE-01**: Captures loading states (spinners, skeletons)
- [ ] **STATE-02**: Captures error states (error messages, retry buttons)
- [ ] **STATE-03**: Captures empty states (no data messages)
- [ ] **STATE-04**: Captures success states (confirmations, checkmarks)
- [ ] **STATE-05**: Verifies all states have appropriate visual feedback

### Reporting

- [ ] **REPORT-01**: Generates comprehensive HTML report
- [ ] **REPORT-02**: Includes all screenshots in report
- [ ] **REPORT-03**: Lists all issues with severity ratings
- [ ] **REPORT-04**: Groups issues by category (UI, functionality, performance, RTL)
- [ ] **REPORT-05**: Provides overall app health score (1-10)
- [ ] **REPORT-06**: Includes fix suggestions for each issue
- [ ] **REPORT-07**: Saves report with timestamp for history

### Execution

- [ ] **RUN-01**: Runs on-demand with single command (npm run test)
- [ ] **RUN-02**: Completes full test and stops (not continuous)
- [ ] **RUN-03**: Shows progress during execution
- [ ] **RUN-04**: Handles errors gracefully (doesn't crash on failures)
- [ ] **RUN-05**: Supports test plan configuration (what to test)

---

## v2 Requirements (Deferred)

### Authentication
- [ ] Apple Sign-In testing
- [ ] Google OAuth testing
- [ ] Social login error handling

### Advanced Features
- [ ] Compare two test runs to show improvements
- [ ] Self-healing locators (auto-fix broken selectors)
- [ ] Visual regression detection (pixel-level comparison)
- [ ] Flaky test detection and handling
- [ ] CI/CD integration (GitHub Actions, etc.)
- [ ] Parallel test execution
- [ ] Test prioritization (critical paths first)

### Reporting
- [ ] Email report on completion
- [ ] Slack/Teams notifications
- [ ] Historical trend analysis
- [ ] Allure Reporter integration

---

## Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Native mobile testing | Playwright only supports web; use Maestro for native |
| Real payment testing | Too risky; would need mock/sandbox |
| Real SMS OTP | Cost + complexity; use test mode or mock |
| 24/7 continuous monitoring | User wants on-demand testing only |
| Autonomous test generation | High complexity, defer to post-MVP |
| Cross-browser testing | Focus on Chrome/Chromium for MVP |
| API testing | Focus on UI testing; API tests exist in Dawati codebase |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 - Foundation & Setup | Pending |
| SETUP-02 | Phase 1 - Foundation & Setup | Pending |
| SETUP-03 | Phase 1 - Foundation & Setup | Pending |
| SETUP-04 | Phase 1 - Foundation & Setup | Pending |
| SETUP-05 | Phase 1 - Foundation & Setup | Pending |
| SETUP-06 | Phase 1 - Foundation & Setup | Pending |
| SETUP-07 | Phase 1 - Foundation & Setup | Pending |
| AUTH-01 | Phase 2 - Authentication Testing | Pending |
| AUTH-02 | Phase 2 - Authentication Testing | Pending |
| AUTH-03 | Phase 2 - Authentication Testing | Pending |
| AUTH-04 | Phase 2 - Authentication Testing | Pending |
| AUTH-05 | Phase 2 - Authentication Testing | Pending |
| NAV-01 | Phase 3 - Core Navigation Testing | Pending |
| NAV-02 | Phase 3 - Core Navigation Testing | Pending |
| NAV-03 | Phase 3 - Core Navigation Testing | Pending |
| NAV-04 | Phase 3 - Core Navigation Testing | Pending |
| NAV-05 | Phase 3 - Core Navigation Testing | Pending |
| NAV-06 | Phase 3 - Core Navigation Testing | Pending |
| SCROLL-01 | Phase 4 - Scrolling & State Coverage | Pending |
| SCROLL-02 | Phase 4 - Scrolling & State Coverage | Pending |
| SCROLL-03 | Phase 4 - Scrolling & State Coverage | Pending |
| SCROLL-04 | Phase 4 - Scrolling & State Coverage | Pending |
| SCROLL-05 | Phase 4 - Scrolling & State Coverage | Pending |
| STATE-01 | Phase 4 - Scrolling & State Coverage | Pending |
| STATE-02 | Phase 4 - Scrolling & State Coverage | Pending |
| STATE-03 | Phase 4 - Scrolling & State Coverage | Pending |
| STATE-04 | Phase 4 - Scrolling & State Coverage | Pending |
| STATE-05 | Phase 4 - Scrolling & State Coverage | Pending |
| SCREEN-01 | Phase 5 - Screenshot Capture System | Pending |
| SCREEN-02 | Phase 5 - Screenshot Capture System | Pending |
| SCREEN-03 | Phase 5 - Screenshot Capture System | Pending |
| SCREEN-04 | Phase 5 - Screenshot Capture System | Pending |
| AI-01 | Phase 6 - AI-Powered Analysis | Pending |
| AI-02 | Phase 6 - AI-Powered Analysis | Pending |
| AI-03 | Phase 6 - AI-Powered Analysis | Pending |
| AI-04 | Phase 6 - AI-Powered Analysis | Pending |
| AI-05 | Phase 6 - AI-Powered Analysis | Pending |
| AI-06 | Phase 6 - AI-Powered Analysis | Pending |
| RTL-01 | Phase 7 - RTL & Internationalization | Pending |
| RTL-02 | Phase 7 - RTL & Internationalization | Pending |
| RTL-03 | Phase 7 - RTL & Internationalization | Pending |
| RTL-04 | Phase 7 - RTL & Internationalization | Pending |
| RTL-05 | Phase 7 - RTL & Internationalization | Pending |
| REPORT-01 | Phase 8 - Reporting System | Pending |
| REPORT-02 | Phase 8 - Reporting System | Pending |
| REPORT-03 | Phase 8 - Reporting System | Pending |
| REPORT-04 | Phase 8 - Reporting System | Pending |
| REPORT-05 | Phase 8 - Reporting System | Pending |
| REPORT-06 | Phase 8 - Reporting System | Pending |
| REPORT-07 | Phase 8 - Reporting System | Pending |
| RUN-01 | Phase 9 - Execution & Orchestration | Pending |
| RUN-02 | Phase 9 - Execution & Orchestration | Pending |
| RUN-03 | Phase 9 - Execution & Orchestration | Pending |
| RUN-04 | Phase 9 - Execution & Orchestration | Pending |
| RUN-05 | Phase 9 - Execution & Orchestration | Pending |

**Coverage:** 55/55 requirements mapped (100%)

---
*Generated: 2026-02-08*
