# Dawati Autonomous Testing System

## What This Is

An on-demand autonomous testing system for the Dawati event planning app. Uses Playwright for browser automation and Google Gemini AI for intelligent test decisions and analysis. Runs when triggered by command, tests systematically (not randomly), and generates comprehensive reports with screenshots.

## Core Value

**The ONE thing that must work:** Systematic, complete testing of the entire Dawati app with AI-powered analysis - ensuring nothing is missed and every issue is documented with screenshots.

## The Problem

Manual QA testing is:
- Time-consuming and tedious
- Easy to miss edge cases
- Not systematic (humans skip things)
- Hard to reproduce exactly

The Dawati app has:
- Multiple auth methods (Phone, Apple, Google)
- 15+ marketplace categories
- Complex booking flows
- Payment integrations
- RTL/LTR support

Testing all of this manually before each release is impractical.

## The Solution

An autonomous tester that:
1. Follows a structured test plan (not random exploration)
2. Tests ALL authentication methods
3. Tests ALL categories and tabs
4. Tests ALL scrolling behaviors
5. Takes screenshots of every action
6. Uses Gemini AI to analyze screenshots for issues
7. Generates a comprehensive report
8. Runs on-demand with a single command

## Target Platform

- **Test Target:** Web version of Dawati (Expo export → Vercel)
- **Testing Tech:** Playwright (browser automation) + Gemini AI
- **Runtime:** Node.js on local machine or CI/CD
- **Trigger:** Manual command (`npm run test`)

## What It Tests

### Functionality
- All auth flows work (Phone OTP, Apple, Google)
- All navigation paths accessible
- All forms submit correctly
- All buttons respond
- All API integrations function

### UI/UX
- Visual bugs and glitches
- Layout problems
- Missing loading states
- Missing error states
- Missing empty states
- RTL layout correctness

### Performance
- Slow-loading pages
- Janky scrolling
- Unresponsive elements
- Image load times

## Requirements

### Validated

(None yet — building from scratch)

### Active

- [ ] **SETUP-01**: System installs with one command (auto-setup.bat)
- [ ] **SETUP-02**: User only provides Gemini API key and app URL
- [ ] **AUTH-01**: Tests Phone OTP sign-in flow completely
- [ ] **AUTH-02**: Tests Apple sign-in flow completely
- [ ] **AUTH-03**: Tests Google sign-in flow completely
- [ ] **NAV-01**: Tests all homepage tabs (Birthdays, Weddings, Corporate, etc.)
- [ ] **NAV-02**: Tests all 15+ marketplace categories
- [ ] **SCROLL-01**: Tests vertical scrolling behavior
- [ ] **SCROLL-02**: Tests horizontal scrolling (carousels, tabs)
- [ ] **SCROLL-03**: Tests infinite scroll / load more
- [ ] **SCREEN-01**: Takes screenshot after every action
- [ ] **AI-01**: Sends screenshots to Gemini for analysis
- [ ] **AI-02**: AI identifies UI/UX issues
- [ ] **AI-03**: AI identifies functionality issues
- [ ] **AI-04**: AI identifies performance issues
- [ ] **REPORT-01**: Generates HTML report with all findings
- [ ] **REPORT-02**: Prioritizes issues (critical, high, medium, low)
- [ ] **REPORT-03**: Provides actionable fix suggestions
- [ ] **RUN-01**: Runs on-demand with single command
- [ ] **RUN-02**: Stops when testing is complete (not continuous)
- [ ] **COMPARE-01**: Can compare two test runs to show improvements

### Out of Scope

- 24/7 continuous monitoring — user wants on-demand testing only
- Mobile device testing — using web export for Playwright compatibility
- Native app testing — Maestro already exists for this in the Dawati codebase
- Real payment testing — too risky, will mock or skip
- Real SMS/OTP testing — will use test credentials or mock

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web over Mobile | Playwright can't automate mobile apps, but works perfectly for web | — Pending |
| Gemini over GPT-4 | User already has Gemini API, cost-effective | — Pending |
| On-demand over 24/7 | User preference, lower cost, more intentional | — Pending |
| Systematic over Random | Complete coverage, reproducible, professional QA approach | — Pending |

## Constraints

- **Budget:** Minimize API costs (Gemini is cheap but still has costs)
- **Simplicity:** One-click setup, minimal configuration
- **Completeness:** Must test 100% of app, not sample
- **Independence:** Self-contained project, doesn't modify Dawati codebase

## Success Metrics

1. **Coverage:** 100% of screens and flows tested
2. **Time:** Complete test run in < 2 hours
3. **Accuracy:** AI correctly identifies real issues (low false positives)
4. **Actionability:** Report provides clear next steps

---
*Last updated: 2026-02-08 after initialization*
