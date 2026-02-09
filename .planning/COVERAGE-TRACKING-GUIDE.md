# Test Coverage Tracking Guide

## Overview

This guide explains how to use the unified test coverage system for dawati-tester.

---

## 📋 The Master Checklist

**File:** `.planning/MASTER-TEST-CHECKLIST.md`

This is your **single source of truth** combining:
- ✅ **237 features** from competitor analysis (what features exist)
- ✅ **185 test cases** from QA best practices (how to test them)

**Total:** 422 items to track

---

## 🎯 Status Markers

Use these in the checklist:

```markdown
- [x] ✅ PASS = Feature exists + Test passes
- [ ] ⚠️ PARTIAL = Feature exists but test incomplete/flaky
- [ ] ❌ FAIL = Feature exists but test fails
- [ ] 🚫 MISSING = Feature not implemented in Dawati
- [ ] 📝 TODO = Feature exists, no test yet
```

---

## 🚀 Quick Start

### 1. Check Current Coverage

```bash
cd /Users/saadalateeq/Desktop/dawati-tester/dawati-tester
npm run coverage
```

**Output:**
```
📊 Dawati Test Coverage Report

═══════════════════════════════════════════════════════════

📈 OVERALL COVERAGE

Features:   39/237 passing (16%)
Test Cases: 42/185 passing (23%)

Overall:    81/422 (19%)

Progress:   [█████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 19%

────────────────────────────────────────────────────────────

🎯 PRIORITY BREAKDOWN

🔥 P0 Critical  ❌ 3/45 passing (7%)
⚡ P1 High      ⚠️ 20/60 passing (33%)
📌 P2 Medium    ✅ 40/50 passing (80%)
💡 P3 Low       ✅ 18/30 passing (60%)

────────────────────────────────────────────────────────────

📂 CATEGORY BREAKDOWN

✅ i18n & RTL              8/10    80%
⚠️ Marketplace            15/35    43%
❌ Booking Flow           10/26    38%
❌ Home Page               6/24    25%
❌ Account                 2/28     7%
🚫 Vendor Dashboard        0/33     0%
🚫 AI Consultant           0/18     0%

────────────────────────────────────────────────────────────

🚨 CRITICAL GAPS (42 P0 tests not passing)

📝 ACC-003          Account
📝 ACC-005          Account
📝 ACC-006          Account
❌ EVT-001          Event Management
...

────────────────────────────────────────────────────────────

💡 RECOMMENDATIONS

⚠️  BLOCKER: 42 P0 critical tests failing/missing
   → Focus on P0 tests before production
📉 Lowest coverage: Vendor Dashboard (0%)
   → Implement 33 Vendor Dashboard tests
```

---

### 2. Detailed Coverage

```bash
npm run coverage:verbose
```

Shows detailed breakdown per category with pass/fail/partial/todo counts.

---

### 3. Filter by Category

```bash
npm run coverage:category=account
npm run coverage:category=marketplace
npm run coverage:category=vendor
```

Shows only tests for that category.

---

## 📝 Updating the Checklist

### After Each Test Run

1. **Open the master checklist:**
   ```bash
   code .planning/MASTER-TEST-CHECKLIST.md
   ```

2. **Update status markers:**
   ```markdown
   # Before
   - [ ] 📝 TODO ACC-003: Password change

   # After (test passes)
   - [x] ✅ PASS ACC-003: Password change

   # After (test fails)
   - [ ] ❌ FAIL ACC-003: Password change - OTP not received
   ```

3. **Check coverage again:**
   ```bash
   npm run coverage
   ```

4. **Commit changes:**
   ```bash
   git add .planning/MASTER-TEST-CHECKLIST.md
   git commit -m "chore: update test coverage - Week 1 (35% complete)"
   ```

---

## 🎯 Priority-Based Testing Strategy

### Week 1-2: P0 Critical (45 tests)

**Goal:** Pass all P0 tests before production

Focus on:
- Account security (password, email, phone change)
- Event creation/deletion
- Guest management (add, delete, invite, RSVP)
- Booking flow (complete purchase)
- Security (SQL injection, XSS, CSRF)

**Commands:**
```bash
npm run test:auth      # Authentication tests
npm run test:security  # Security tests
npm run coverage       # Check P0 progress
```

---

### Week 3-4: P1 High (60 tests)

**Goal:** Production-ready quality

Focus on:
- Vendor profiles
- Search and filtering
- Account settings
- Notifications

---

### Week 5-6: P2 Medium (50 tests)

**Goal:** Polish and UX

Focus on:
- UI states (loading, empty, error)
- Performance benchmarks
- Advanced features

---

### Week 7-8: P3 Low (30 tests)

**Goal:** Long tail features

---

## 📊 Coverage Goals

| Week | Target Coverage | P0 Coverage | Focus Area |
|------|-----------------|-------------|------------|
| 0 | 20% | 7% | Current state |
| 1 | 30% | 40% | Account security |
| 2 | 45% | 100% ✅ | Core flows |
| 3 | 60% | 100% ✅ | Marketplace |
| 4 | 70% | 100% ✅ | Settings |
| 5 | 78% | 100% ✅ | Vendor dashboard |
| 6 | 85% | 100% ✅ | AI features |
| 7 | 92% | 100% ✅ | Performance |
| 8 | 100% ✅ | 100% ✅ | Polish |

---

## 🔍 Finding What to Test Next

### 1. Check Critical Gaps

```bash
npm run coverage | grep "CRITICAL GAPS"
```

Shows all P0 tests that are failing or missing.

---

### 2. Find Lowest Coverage Categories

```bash
npm run coverage | grep "CATEGORY BREAKDOWN"
```

Start with categories at 0% or <20%.

---

### 3. Read the Checklist

Open `.planning/MASTER-TEST-CHECKLIST.md` and look for:
- 📝 TODO markers
- ❌ FAIL markers
- Sections with low coverage

Each test includes:
- **ID** (e.g., ACC-003)
- **Description** (what to test)
- **Test Steps** (how to verify)
- **Edge Cases** (boundary conditions)

Example:
```markdown
- [ ] 📝 ACC-003: Password change with session invalidation
  - Priority: P0 (Critical)
  - Source: OWASP, NIST password guidelines
  - Test Steps:
    1. Login as test user
    2. Navigate to Security settings
    3. Enter current password
    4. Enter new password
    5. Save changes
    6. Verify logged out
    7. Login with NEW password → Success
    8. Try login with OLD password → Fails
  - Edge Cases:
    - Wrong current password → Error
    - Weak new password → Error
    - Same as current → Error
```

---

## 📈 Tracking Progress

### Weekly Review

Every Monday:

1. **Run coverage:**
   ```bash
   npm run coverage > coverage-week-X.txt
   ```

2. **Update roadmap table:**
   ```markdown
   | Week | Date | Coverage % | P0 % | Notes |
   |------|------|------------|------|-------|
   | 1 | 2026-02-16 | 35% | 40% | Account tests done |
   ```

3. **Commit snapshot:**
   ```bash
   git add .planning/MASTER-TEST-CHECKLIST.md coverage-week-X.txt
   git commit -m "chore: Week X coverage snapshot (35%)"
   ```

---

## 🤖 Integration with Playwright

### Mapping Tests to Scripts

Each test in the checklist can become a Playwright test:

**From Checklist:**
```markdown
- [ ] ACC-003: Password change
  Steps: Login → Navigate → Fill form → Save → Logout → Login
```

**To Playwright:**
```typescript
// tests/account/password-change.spec.ts
test('ACC-003: Password change with session invalidation', async ({ page }) => {
  // 1. Login
  await loginAsTestUser(page, 'test@example.com', 'OldPass123!');

  // 2. Navigate to Security
  await page.goto('/account/security');

  // 3-5. Fill password form
  await page.fill('[name="currentPassword"]', 'OldPass123!');
  await page.fill('[name="newPassword"]', 'NewPass123!');
  await page.fill('[name="confirmPassword"]', 'NewPass123!');
  await page.click('button:text("Save")');

  // 6. Verify logged out
  await expect(page).toHaveURL('/auth/login');

  // 7. Login with NEW password
  await loginAsTestUser(page, 'test@example.com', 'NewPass123!');
  await expect(page).toHaveURL('/home');

  // 8. Try OLD password (should fail)
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'OldPass123!');
  await page.click('button:text("Login")');
  await expect(page.locator('.error')).toBeVisible();
});
```

**After test passes:**
```markdown
- [x] ✅ PASS ACC-003: Password change
```

---

## 🎯 Best Practices

### 1. Update Immediately After Test Runs

Don't wait - update the checklist right after running tests so coverage is accurate.

### 2. Be Honest with Status

- Don't mark ✅ PASS if test is flaky
- Use ⚠️ PARTIAL for incomplete tests
- Use ❌ FAIL with notes about why it fails

### 3. Track Blockers

If a test can't be written yet, add a note:
```markdown
- [ ] 📝 TODO ACC-015: 2FA setup
  **BLOCKED:** 2FA feature not implemented yet (see issue #123)
```

### 4. Celebrate Milestones

When you hit a major milestone:
```bash
npm run coverage

# If P0 hits 100%:
git tag "coverage-p0-complete"
git push --tags
```

---

## 📚 Additional Resources

- **Feature Checklist:** `.planning/research/FEATURE-CHECKLISTS.md` (237 features)
- **Test Standards:** `.planning/TEST-COVERAGE-CHECKLIST.md` (185 test cases)
- **Master Checklist:** `.planning/MASTER-TEST-CHECKLIST.md` (unified 422 items)
- **Coverage Script:** `scripts/check-coverage.ts`

---

## 🆘 Troubleshooting

### Coverage script not found

```bash
npm run build
npm run coverage
```

### Checklist not parsing correctly

Make sure status markers use exact format:
- `✅ PASS` (not "pass" or "PASSED")
- `📝 TODO` (not "todo" or "TODO:")
- `❌ FAIL` (not "fail" or "FAILED")

### Coverage not updating

1. Check you saved `.planning/MASTER-TEST-CHECKLIST.md`
2. Rebuild: `npm run build`
3. Run: `npm run coverage`

---

**Last Updated:** 2026-02-09
**Maintained By:** dawati-tester team
