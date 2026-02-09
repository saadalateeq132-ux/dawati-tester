# 📊 Dawati Test Coverage System

## What You Got

Two comprehensive checklists merged into ONE master tracking system:

1. ✅ **237 Features** - What exists in event planning + marketplace apps (from competitor analysis)
2. ✅ **185 Test Cases** - Industry-standard E2E tests (from QA best practices)

**Total:** 422 items to track for 100% coverage

---

## 🚀 Quick Start

### Check Coverage
```bash
npm run coverage
```

Shows:
- Overall coverage percentage
- Priority breakdown (P0/P1/P2/P3)
- Category-level coverage
- Critical gaps (P0 failures)
- Recommendations

### Verbose Mode
```bash
npm run coverage:verbose
```

Shows detailed pass/fail/partial/todo counts per category.

### Filter by Category
```bash
npm run coverage:category=account
npm run coverage:category=marketplace
```

---

## 📁 Important Files

| File | Description |
|------|-------------|
| `.planning/MASTER-TEST-CHECKLIST.md` | **Master checklist** (422 items) - Update this after each test run |
| `.planning/COVERAGE-TRACKING-GUIDE.md` | **Full guide** - How to use the coverage system |
| `.planning/research/FEATURE-CHECKLISTS.md` | Original 237 features from research |
| `.planning/TEST-COVERAGE-CHECKLIST.md` | Original 185 test cases from research |
| `scripts/check-coverage.ts` | Coverage calculator script |

---

## 🎯 Current Status

**Overall Coverage:** ~20% (83/422 items)

### By Priority
- 🔥 **P0 Critical:** 3/45 (7%) ❌ **BLOCKER**
- ⚡ **P1 High:** 20/60 (33%)
- 📌 **P2 Medium:** 40/50 (80%)
- 💡 **P3 Low:** 18/30 (60%)

### By Category
- ✅ **i18n & RTL:** 80% (excellent!)
- ⚠️ **Marketplace:** 43%
- ❌ **Account:** 7% (critical gap)
- 🚫 **Vendor Dashboard:** 0% (not started)
- 🚫 **AI Consultant:** 0% (not started)

---

## 📝 How to Update

After running tests:

1. Open `.planning/MASTER-TEST-CHECKLIST.md`
2. Update status markers:
   ```markdown
   - [ ] 📝 TODO  → Test not written yet
   - [x] ✅ PASS  → Test passing
   - [ ] ❌ FAIL  → Test failing
   - [ ] ⚠️ PARTIAL → Test flaky/incomplete
   - [ ] 🚫 MISSING → Feature doesn't exist
   ```
3. Run `npm run coverage` to see updated stats
4. Commit: `git commit -m "chore: update coverage"`

---

## 🎯 8-Week Roadmap

| Week | Target | Focus Area |
|------|--------|------------|
| 1 | 30% | Account security (password, email, phone) |
| 2 | 45% | Core events + booking |
| 3 | 60% | Marketplace features |
| 4 | 70% | Settings + notifications |
| 5 | 78% | Vendor dashboard |
| 6 | 85% | AI consultant |
| 7 | 92% | Performance + security |
| 8 | 100% ✅ | Polish + edge cases |

---

## 💡 What to Test Next

Run coverage and look for:

1. **Critical Gaps** - P0 tests that are ❌ FAIL or 📝 TODO
2. **Low Coverage Categories** - <20% coverage
3. **Master Checklist** - Each test has full instructions

Example from checklist:
```markdown
- [ ] 📝 ACC-003: Password change
  Priority: P0 (Critical)
  Test Steps:
  1. Login → 2. Go to Security → 3. Change password
  4. Verify logged out → 5. Login with new password
  Edge Cases: Wrong current password, weak password
```

---

## 📚 Full Documentation

Read `.planning/COVERAGE-TRACKING-GUIDE.md` for:
- Detailed usage instructions
- Integration with Playwright
- Tracking progress weekly
- Best practices

---

**Questions?** Open `.planning/COVERAGE-TRACKING-GUIDE.md`
