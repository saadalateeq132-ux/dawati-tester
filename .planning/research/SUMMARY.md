# Research Summary: v1.1 Hardening & Full Coverage

**Project:** Dawati Autonomous Testing System
**Milestone:** v1.1 - Production Hardening & Full Coverage
**Synthesized:** 2026-02-10
**Overall Confidence:** HIGH

---

## Executive Summary

The v1.1 milestone transforms a working proof-of-concept (63/63 phases PASS at 32% coverage) into a production-ready testing system. The research reveals that **hardening an existing working system is more dangerous than building from scratch**—teams must balance adding critical features (visual regression, PII masking, security testing, performance testing) while preserving the current success rate.

**The Core Challenge:** The system currently achieves 63/63 PASS through lenient advisory-only scoring (AI never fails tests, execution errors return PASS). v1.1 must tighten thresholds and enforce quality gates WITHOUT causing mass test failures that demoralize the team and trigger revert pressure from management.

**The Recommended Approach:** Graduated enforcement over 4 weeks with shadow mode measurement BEFORE any failing thresholds are enabled. Add new testing dimensions (visual regression, security, performance) as parallel checkers that integrate into the existing orchestrator pattern. Prioritize PII masking and visual regression (legal/quality blockers) over performance optimization (monitoring-first, budgets-later).

**Key Risks:**
1. **Baseline pollution** (buggy screenshots become "truth" for visual regression)
2. **Over-masking PII** (removing context breaks AI analysis effectiveness)
3. **CI/CD timing assumptions** (100% local success, 40% CI flakiness due to network/resource differences)
4. **Premature threshold enforcement** (63/63 → 5/63 overnight regression destroys team trust)

---

## Key Findings

### From STACK Research (STACK.md + STACK-v1.1.md)

**Base Stack (Already Solid):**
- **Playwright 1.48-1.50**: Cross-browser, 20% faster than Selenium, built-in trace viewer
- **Gemini 2.0 Flash via Vertex AI**: Multimodal AI for screenshot analysis
- **TypeScript + ts-node**: Type-safe test definitions
- **Pino logging**: 5-10x faster than Winston for high-performance test runs
- **Allure Reporter**: Essential for production systems (historical tracking, flakiness detection)

**v1.1 Stack Additions (2-3 new dependencies):**
- **pixelmatch + pngjs**: ALREADY INSTALLED for visual regression (just needs enhancement)
- **sharp ^0.33.x**: NEW - High-performance image masking for PII (Windows-compatible)
- **web-vitals ^4.x**: NEW - Official Google library for Core Web Vitals measurement
- **lighthouse ^12.x**: OPTIONAL - Comprehensive performance audits (heavy, 50MB+)

**Stack Confidence:**
- HIGH: Visual regression (dependencies installed), PII masking DOM approach (Playwright built-in), CI/CD (GitHub Actions standard)
- MEDIUM: sharp version (should verify Windows pre-built binaries), Lighthouse integration with Playwright
- LOW: OWASP ZAP integration (complex proxy setup, high false-positive rate)

**Critical Stack Decision:** Use DOM-based PII masking (Playwright selectors) as primary approach, sharp image masking as fallback. DOM approach is faster (no OCR), more reliable, and doesn't add latency to test execution.

---

### From FEATURES Research (FEATURES.md)

**Table Stakes (Must-Have for v1.1):**

1. **Visual Regression Testing** (0% → 100%)
   - Current: Takes screenshots but never compares them (50% value loss)
   - Target: Baselines for 15 critical screens, pixel-diff with threshold, ignore regions for dynamic content
   - Complexity: MEDIUM | Effort: 5 days
   - **Blocker Risk:** Baseline pollution (Pitfall 2) - must implement review workflow FIRST

2. **PII Masking** (0% → 100%)
   - Current: HTML masking only, screenshots sent to Gemini with visible PII
   - Target: Mask phone numbers, emails, names BEFORE AI analysis (PDPL compliance requirement)
   - Complexity: MEDIUM | Effort: 3 days
   - **Blocker Risk:** Over-redaction (Pitfall 3) - must preserve structure for AI context

3. **Security Testing** (10% → 90%)
   - Current: 2/20 OWASP tests implemented
   - Target: XSS payload injection, CSRF token validation, SQL injection tests, security headers
   - Complexity: HIGH | Effort: 5 days
   - **Critical Gap:** No authenticated security testing (Pitfall 6) - must test vendor/admin panels

4. **Core Web Vitals** (30% → 90%)
   - Current: 3/10 performance metrics tracked
   - Target: FCP, LCP, TTI, CLS, FID, INP measurement with performance budgets
   - Complexity: MEDIUM | Effort: 3 days
   - **Warning:** Don't fail builds on performance initially (Pitfall 5) - monitor first, enforce later

5. **Pattern Library Expansion** (30 → 300+ patterns)
   - Current: Documentation claims "300+ patterns" but only ~30 exist (false advertising)
   - Target: 150+ English, 150+ Arabic hardcoded string patterns
   - Complexity: LOW | Effort: 2 days
   - **Warning:** Don't add every dictionary word (Pitfall 8) - prioritize app-relevant patterns

**Should-Have (High Value):**

6. **Vendor Dashboard Coverage** (0% → 85%)
   - Critical gap: 0/33 features tested in vendor dashboard
   - Target: 28/33 phases covering calendar, bookings, analytics
   - Complexity: MEDIUM | Effort: 5 days
   - **Uses existing framework:** Reuses orchestrator + AI + RTL validation patterns

7. **AI Consultant Coverage** (0% → 85%)
   - Critical gap: 0/18 AI consultant features tested
   - Target: 15/18 phases covering AI recommendations, chat, suggestions
   - Complexity: MEDIUM | Effort: 3 days

**Defer to Post-v1.1:**
- Admin panel coverage (0% → 50%) - Need admin credentials + approval
- AI visual defect detection enhancements - Color consistency checker already exists as differentiator
- Multi-language test generation - Can expand manually for now
- Performance budgets in CI/CD - Monitor trends first, enforce thresholds in v1.2

**Complexity vs Value Matrix:**
- **HIGH ROI (Do First):** Visual regression, PII masking, Core Web Vitals, pattern expansion
- **MEDIUM ROI:** Security testing (high effort, critical value), vendor coverage
- **LOW ROI (Defer):** Admin coverage, AI enhancements, multi-lang generation

---

### From ARCHITECTURE Research (ARCHITECTURE.md)

**Current Architecture Pattern:** Pipeline orchestration with parallel checkers
- **Orchestrator** coordinates sequential phase execution
- **Checkers** (RTL, Color, Code Quality, AI) run independently and report scores
- **Threshold enforcement** happens centrally in orchestrator (lines 110-121)
- **Advisory-only AI** (response-parser.ts lines 98-104: always returns PASS)

**v1.1 Integration Architecture:**

```
TestOrchestrator (enhanced)
├── BrowserManager (ENHANCED: add hidePIIElements())
├── GeminiClient (no changes)
├── RTLIntegration (no changes)
├── CodeQualityChecker (no changes)
├── ChecklistValidator (no changes)
├── BaselineManager (ENHANCED: region masking, multi-device baselines)
├── PIIMasker (ENHANCED: DOMElementMasker, ScreenshotMasker)
├── SecurityScanner (NEW: 4 sub-checkers)
├── PerformanceTester (NEW: Lighthouse + custom metrics)
└── HTMLReporter (ENHANCED: security + performance sections)
```

**Integration as Parallel Checkers:**
- Security and performance scanners run alongside existing checks
- Results feed into unified scoring system
- Threshold enforcement remains in orchestrator (single source of truth)
- All features configurable (can disable individually)

**Data Flow Enhancement (Per Phase):**
1. BrowserManager executes actions → **hidePIIElements()** before screenshot
2. Capture screenshot (PII-masked) + HTML snapshot
3. **BaselineManager compares** with baseline (if enabled, parallel)
4. **SecurityScanner runs** checks (if enabled, parallel)
5. **PerformanceTester measures** CWV (if enabled, parallel)
6. GeminiClient analyzes screenshot → AIIssue[] (advisory)
7. RTLIntegration runs 18 DOM checks → RTLCheckResult[]
8. CodeQualityChecker analyzes source → violations[]
9. ChecklistValidator maps to coverage → score
10. **Orchestrator enforces thresholds** (RTL <6.0, Color <5.0, CQ <5.0, **Security <7.0, Perf <50**)
11. HTMLReporter generates report with 7 score dimensions (was 3)

**Build Order Recommendation:**
1. **Phase 1 (Weeks 1-2):** PII masking DOM-based + Visual regression ignore regions
2. **Phase 2 (Weeks 3-4):** CI/CD pipeline (test execution, artifact collection, PR feedback)
3. **Phase 3 (Weeks 5-6):** Security testing (headers, dependencies, auth testing)
4. **Phase 4 (Weeks 7-8):** Performance testing (custom metrics, CWV, Lighthouse)
5. **Phase 5 (Weeks 9-10):** Advanced features (multi-device baselines, approval workflow)

**Architectural Risks:**
- **LOW:** Visual regression enhancements, PII DOM masking, network analyzer
- **MEDIUM:** CI/CD GCP credentials management, Lighthouse integration (slow, 5-10s/page)
- **HIGH:** OWASP ZAP integration (complex setup, proxy config, false positives)

**Performance Impact:**
- Current: ~10-15 seconds per phase
- v1.1 with all features: +6-8 seconds per phase
  - Visual regression: +0.5s (pixelmatch)
  - PII masking DOM: +0.2s
  - Security headers: +0s (uses existing logs)
  - Performance custom: +0.5s
  - Lighthouse: +5-10s (OPTIONAL, per-page only)
- **Mitigation:** Run expensive checks (Lighthouse, OWASP) only on key pages or in nightly CI

---

### From PITFALLS Research (PITFALLS.md)

**CRITICAL PITFALLS (Production-Hardening Specific):**

**#1: Tightening Scoring Without Baseline Measurement** 🔴 CRITICAL
- **What happens:** 63/63 PASS → 5/63 PASS overnight when strict thresholds enabled
- **Why critical:** Destroys team trust, triggers revert pressure, kills hardening initiative
- **Prevention:**
  1. **Shadow mode first** (4 weeks): Measure what WOULD fail, don't fail tests yet
  2. **Gradual threshold progression**: 5.0 → 6.0 → 7.0 → 8.0 over 4 weeks
  3. **Category-based rollout**: RTL week 1, Color week 2, Code Quality week 3, AI week 4
  4. **Exemption mechanism**: Allow phases to declare "known issues" with expiry dates
- **Success metric:** No more than 10% regression from current 63/63 PASS rate per week

**#2: Visual Regression Baseline Pollution** 🔴 CRITICAL
- **What happens:** Capture baselines while app has bugs, buggy screenshots become "truth"
- **Why critical:** Future fixes flagged as failures because they differ from buggy baselines
- **Prevention:**
  1. **Never auto-create baselines in CI/CD** (require manual local capture)
  2. **Baseline review checklist** (2+ reviewers, metadata.json tracking)
  3. **Baseline approval workflow** (capture → review → approve → commit)
  4. **Progressive baseline approval** script-driven process
- **Success metric:** 100% of baselines have metadata with 2+ reviewer approval

**#3: PII Masking Breaking AI Context** 🟡 MODERATE
- **What happens:** Aggressive masking (05XXXXXXXX) removes structure, AI can't validate format bugs
- **Why important:** AI analysis becomes useless, validation bugs slip through
- **Prevention:**
  1. **Contextual masking**: Preserve structure (0512XXXX34), mask identity
  2. **Test data substitution**: Use realistic test values (+966501234567) not blanking
  3. **Selective masking**: Don't mask known test accounts
  4. **Screenshot bounding boxes**: Redact before screenshot, not OCR after
  5. **PII masking levels**: MINIMAL (local) → MODERATE (CI) → AGGRESSIVE (never)
- **Success metric:** AI still catches validation bugs with PII-masked data

**#4: CI/CD Flakiness from Timing Assumptions** 🟡 MODERATE
- **What happens:** 100% pass locally, 40% flaky in CI due to slow runners/network
- **Why important:** Developer friction, retry waste, "ignore CI" culture
- **Prevention:**
  1. **Dynamic waits**: `waitForSelector()` not `waitForTimeout(5000)`
  2. **Network wait for Vercel**: Verify app responsive before tests (30-60s deploy time)
  3. **Viewport-aware waits**: Wait for networkidle + DOMContentLoaded + fonts
  4. **Resource contention detection**: Extend timeouts if runner overloaded
  5. **Explicit CI/Local split**: 3x longer timeouts in CI
- **Success metric:** <15% flakiness rate in CI (industry standard)

**#5: Performance Testing on Inconsistent Environments** 🟡 MODERATE
- **What happens:** LCP <2s locally, >5s in CI, team sets threshold to 10s (meaningless)
- **Why important:** Performance budgets too loose or tests disabled
- **Prevention:**
  1. **Separate budgets**: CI (5s LCP) vs Real Users (2.5s LCP) vs Local (1.5s LCP)
  2. **Percentile-based**: P95 over 5 runs, not single measurement
  3. **Network throttling**: Fast 3G emulation for consistency
  4. **Relative tests**: "LCP must not regress >20%" not "LCP <2.5s"
  5. **Nightly/release only**: Don't run performance tests on every PR
- **Success metric:** Performance tests run nightly with <20% variance

**MODERATE PITFALLS:**

**#6: Security Testing Without Authenticated Contexts**
- Missing: XSS in account settings, CSRF on payment forms, SQL injection in admin panel
- Prevention: Test with 3 roles (customer, vendor, admin), reuse auth from functional tests

**#7: Click Validation Expansion Breaking Tests**
- 63/63 → 30/63 when `expectAfterClick` validation added (40% of clicks don't work)
- Prevention: Phased rollout by file (3 files week 1, 5 files week 2, 7 files week 3), soft assertions first

**MINOR PITFALLS:**

**#8: Pattern Expansion Without Priority**
- 30 → 300 patterns in one commit, 10x slower RTL checks, 90% patterns never match
- Prevention: Tiered matching (critical/standard/comprehensive), pattern usage metrics

**#9: CI Pipeline Without Manual Trigger**
- Full suite on every commit = CI queue congestion, cost explosion ($50/day), disabled automation
- Prevention: Tiered CI (smoke tests 15min on PR, full suite nightly/manual)

---

## Implications for v1.1 Roadmap

### Phase Structure Recommendation

The roadmap should follow the **4-phase graduated enforcement pattern** to avoid destroying the current 63/63 PASS success:

**Phase 1: Measurement & Foundation (Weeks 1-2)**
- **Goal:** Add features WITHOUT enforcing thresholds (shadow mode)
- **Deliverables:**
  - PII masking (DOM-based) operational but not blocking tests
  - Visual regression baselines created with review workflow
  - Shadow mode logging (what WOULD fail under strict rules)
  - Pattern library expansion to 300+ (research app-relevant patterns)
- **Threshold Changes:** NONE (everything still passes)
- **Success Metric:** 63/63 PASS maintained, shadow metrics collected

**Phase 2: CI/CD & Observability (Weeks 3-4)**
- **Goal:** Automate test execution, collect production-like data
- **Deliverables:**
  - GitHub Actions workflows (smoke tests on PR, full suite nightly)
  - Artifact storage and PR feedback
  - Security testing (headers, dependencies) - observability only
  - Performance testing (CWV measurement) - logging only
- **Threshold Changes:** NONE (still advisory-only)
- **Success Metric:** CI runs reliably with <15% flakiness, costs <$10/day

**Phase 3: Graduated Enforcement (Weeks 5-8)**
- **Goal:** Enable enforcement category-by-category with graduated thresholds
- **Week 5:** RTL threshold 5.0 → 6.0 (expected failures: ~10%)
- **Week 6:** Color threshold 4.0 → 5.0 (expected failures: ~5%)
- **Week 7:** Code Quality threshold 4.0 → 5.0 (expected failures: ~8%)
- **Week 8:** Security threshold 0 → 7.0 (NEW enforcement)
- **Deliverables:**
  - Exemption mechanism for known issues with expiry dates
  - Weekly reports showing pass rate and issues fixed
- **Success Metric:** No more than 10% regression per week, team confidence maintained

**Phase 4: Coverage Expansion (Weeks 9-12)**
- **Goal:** Expand test coverage from 32% to 75%
- **Deliverables:**
  - Vendor Dashboard: 0% → 85% (28/33 tests)
  - AI Consultant: 0% → 85% (15/18 tests)
  - Security: 10% → 90% (18/20 tests)
  - Performance: 30% → 90% (9/10 tests)
- **Threshold Changes:** Performance threshold 0 → 50 (Lighthouse score)
- **Success Metric:** Overall coverage 75%+, all P0/P1 features tested

### Roadmap Dependency Map

```
CRITICAL PATH (must do in order):
1. PII Masking (DOM-based)
   ↓ blocks
2. Visual Regression with Review Workflow
   ↓ blocks
3. Shadow Mode Enforcement (4 weeks measurement)
   ↓ blocks
4. Graduated Threshold Enablement (4 weeks rollout)

PARALLEL TRACKS (can do concurrently after Phase 1):
Track A: Security Hardening
  - Security headers checker
  - Dependency auditor
  - Authenticated security tests (XSS, CSRF, SQL injection)

Track B: Performance Monitoring
  - Custom metrics collector (browser APIs)
  - Network analyzer (existing logs)
  - Lighthouse integration (optional, per-page)

Track C: Coverage Expansion
  - Vendor Dashboard tests (reuse framework)
  - AI Consultant tests
  - Click validation expansion (phased rollout)
```

### Research Flags for Each Phase

| Phase | Needs Deep Research? | Topic | Priority |
|-------|---------------------|-------|----------|
| **PII Masking** | MEDIUM | Selective masking strategies (preserve context) | P0 |
| **Visual Regression** | HIGH | Baseline approval workflows, review processes | P0 |
| **CI/CD Integration** | MEDIUM | CI-specific config patterns (timeout/retry logic) | P1 |
| **Performance Testing** | HIGH | Percentile-based budgets, network throttling configs | P1 |
| **Security Testing** | MEDIUM | Role-based test patterns (customer/vendor/admin) | P1 |
| **Threshold Enforcement** | CRITICAL | Shadow mode implementation, exemption mechanism | P0 |
| **Click Validation** | LOW | Use existing click-validation-example.test.ts pattern | P2 |
| **Pattern Expansion** | LOW | Pattern usage metrics, tiered matching | P2 |

### Stack Choices Impact on Roadmap

**Immediate Dependencies (Install Before Phase 1):**
```bash
cd dawati-tester/vertex-ai-testing

# PII masking
npm install sharp
npm install --save-dev @types/sharp

# Performance testing
npm install --save-dev web-vitals

# Optional: Lighthouse (defer if time-constrained)
# npm install --save-dev lighthouse
```

**CI/CD Prerequisites:**
- GitHub Secrets: `GCP_SERVICE_ACCOUNT_KEY` (Vertex AI credentials)
- Repository Settings: Enable GitHub Actions, artifact storage
- Branch Protection: Require status checks (smoke tests only, not full suite)

**Docker Considerations (Optional for v1.1):**
- Can defer to v1.2 if local + GitHub Actions sufficient
- Priority: Get tests running reliably in cloud CI first, containerize later

---

## Confidence Assessment

| Dimension | Confidence Level | Evidence Source | Gaps/Concerns |
|-----------|-----------------|-----------------|---------------|
| **Stack Additions** | HIGH | Dependencies verified in package.json (pixelmatch installed), training data for versions | sharp Windows binaries should be verified, Lighthouse Playwright compatibility unknown |
| **Feature Scope** | HIGH | MASTER-TEST-CHECKLIST.md shows explicit gaps (0% vendor, 10% security), READY-TO-TEST.md documents claims vs reality | Admin panel access may be blocked (need credentials) |
| **Architecture** | HIGH | Existing orchestrator pattern well-defined (test-orchestrator.ts), integration points clear | OWASP ZAP integration complexity high (may defer) |
| **Pitfalls** | HIGH | Analysis of existing code (response-parser.ts advisory-only, baseline-manager.ts auto-create) + industry patterns | Performance budgets need field data baseline (currently estimated) |
| **Timeline** | MEDIUM | Effort estimates based on existing codebase complexity, single developer full-time assumed | Vendor/admin access blockers unknown, team size unclear |

**Overall Confidence:** HIGH (75%+)

**Primary Uncertainty:** Whether shadow mode + graduated rollout will maintain 63/63 PASS success. This depends on:
1. Current test quality (are they passing due to leniency or actual quality?)
2. App maturity (how many real issues exist vs. false positives?)
3. Team capacity to fix issues uncovered during shadow mode measurement

**Recommended Pre-Work:** Run 1-week shadow mode measurement BEFORE committing to v1.1 timeline to validate assumptions about failure rates under strict thresholds.

---

## Gaps to Address During Planning

1. **Performance Baseline Unknown**
   - Need: Run Lighthouse on 5 key pages to establish realistic CI budgets
   - Risk: Setting thresholds based on guesses leads to disabled tests (Pitfall 5)
   - Action: Week 0 pre-work before Phase 1 kickoff

2. **Admin/Vendor Test Credentials**
   - Need: Test accounts with vendor dashboard access + admin panel access
   - Risk: Can't test 33 vendor features or 30 admin features without credentials
   - Action: Escalate to product team for test account creation

3. **Shadow Mode Implementation Details**
   - Need: Specific exemption mechanism design (how to declare "known issue"?)
   - Risk: Without exemptions, forced to fix 20+ issues simultaneously or revert
   - Action: Design exemption config schema before Phase 3

4. **Pattern Library Research**
   - Need: Analyze competitor apps (Eventbrite, Luma) for common i18n patterns
   - Risk: Adding 270 generic patterns (medical terms) instead of 150 app-relevant ones
   - Action: 2-day research sprint for domain-specific patterns

5. **CI Performance Benchmarking**
   - Need: Run test suite in GitHub Actions to measure actual CI timing
   - Risk: Local timing assumptions (10-15s/phase) may be 3x slower in CI
   - Action: Prototype CI workflow in Week 0

6. **Visual Regression Review Workflow**
   - Need: Define who reviews baselines, approval process, metadata requirements
   - Risk: Baseline pollution (Pitfall 2) if auto-created without review
   - Action: Design approval workflow before any baseline creation

---

## Sources

### High Confidence (Direct Codebase Analysis)
- c:\Users\pc\Desktop\new\.planning\research\STACK-v1.1.md (v1.1 stack additions research)
- c:\Users\pc\Desktop\new\.planning\research\STACK.md (base stack research)
- c:\Users\pc\Desktop\new\.planning\research\FEATURES.md (feature landscape research)
- c:\Users\pc\Desktop\new\.planning\research\ARCHITECTURE.md (integration architecture research)
- c:\Users\pc\Desktop\new\.planning\research\PITFALLS.md (production hardening pitfalls research)
- c:\Users\pc\Desktop\new\.planning\MASTER-TEST-CHECKLIST.md (coverage gaps, 32% overall)
- c:\Users\pc\Desktop\new\dawati-tester\vertex-ai-testing\READY-TO-TEST.md (current system status)
- c:\Users\pc\Desktop\new\dawati-tester\vertex-ai-testing\src\orchestrator\test-orchestrator.ts (threshold enforcement logic)
- c:\Users\pc\Desktop\new\dawati-tester\vertex-ai-testing\src\decision-engine\response-parser.ts (AI advisory-only mode)

### Medium Confidence (Industry Standards)
- Playwright documentation (CI/CD patterns, visual regression, network emulation)
- OWASP Testing Methodology (security test patterns, authenticated testing)
- Google Core Web Vitals (performance thresholds: LCP <2.5s, CLS <0.1, FID <100ms)
- GitHub Actions documentation (workflow patterns, artifact management, secrets)

### Research Confidence by Area
- **Stack/Dependencies:** HIGH (verified in package.json, versions from training data)
- **Feature Gaps:** HIGH (explicit checklist tracking, documented in MASTER-TEST-CHECKLIST.md)
- **Architecture:** HIGH (existing patterns analyzed from source code)
- **Pitfalls:** HIGH (identified from existing system weaknesses + industry anti-patterns)
- **Timeline:** MEDIUM (estimates based on complexity, single developer assumed)

---

## Ready for Requirements Definition

This research synthesis provides the foundation for roadmap creation. The gsd-roadmapper agent can now:

1. **Structure phases** based on the 4-phase graduated enforcement pattern (measurement → CI/CD → enforcement → coverage)
2. **Sequence work** using the dependency map (PII masking blocks visual regression, shadow mode blocks threshold enforcement)
3. **Estimate effort** using complexity assessments and build order recommendations
4. **Avoid pitfalls** by incorporating preventions into phase definitions (baseline review workflows, shadow mode, CI/CD timing configs)
5. **Set success metrics** per phase (maintain 63/63 PASS, <15% CI flakiness, 75% coverage target)

**Key insight for roadmapper:** v1.1 success is NOT about adding features—it's about preserving the current 63/63 PASS success rate while gradually increasing quality enforcement. The roadmap must prioritize measurement and graduated rollout over rapid feature addition.

---

**Last Updated:** 2026-02-10
**Synthesized From:** 4 research files (STACK + STACK-v1.1, FEATURES, ARCHITECTURE, PITFALLS)
**Research Confidence:** HIGH (75%+)
