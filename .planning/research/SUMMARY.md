# Research Summary: Dawati Autonomous Testing System

**Project:** Dawati Autonomous AI-Powered Web Testing
**Completed:** 2026-02-08
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

This research synthesizes findings across technology stack, feature landscape, architecture patterns, and domain pitfalls for building an autonomous testing system targeting React Native/Expo web applications with AI-powered screenshot analysis.

**The recommended approach:** Build a modular, event-driven testing system using Playwright for browser automation, Gemini 2.0 Flash for AI-powered screenshot analysis, and Allure for comprehensive reporting. The architecture follows agentic patterns where AI components orchestrate test lifecycle activities while maintaining human oversight for critical validations. The system prioritizes OAuth flow testing (Phone/Apple/Google), navigation path coverage, and visual regression detection as core capabilities.

**Key risks and mitigation:** The most critical risk is AI hallucination in test assertions—Gemini can confidently assert incorrect behaviors, creating false confidence in broken features. Mitigate with multi-layer verification (never rely on single AI inference), hallucination rate monitoring (alert when >10% of assertions contradict deterministic checks), and human-in-the-loop validation for critical paths. Secondary risks include Gemini API rate limit exhaustion (mitigated via exponential backoff and paid tier budget), OAuth token refresh failures (mitigated via centralized token manager), and screenshot test flakiness (mitigated via Docker-based standardized environments and semantic comparison).

The technology choices are battle-tested for 2026: Playwright dominates browser automation (20% faster than Selenium, cross-browser support), Gemini 3 Flash provides agentic vision capabilities for UI analysis, and Node.js 24 LTS ensures long-term stability. The feature set balances table stakes requirements (self-healing locators, CI/CD integration, parallel execution) with differentiators (autonomous test generation, multi-modal AI analysis, defect prediction).

---

## Key Findings

### From STACK.md: Technology Recommendations

**Core Stack (HIGH CONFIDENCE):**
- **Node.js 24.x LTS (Krypton)** — Active LTS through April 2028, recommended for production
- **TypeScript 5.x with strict mode** — Type safety essential for autonomous systems
- **Playwright 1.58.x** — Clear winner over Puppeteer (cross-browser) and Selenium (20% faster, better debugging)
- **Google Gemini SDK (@google/genai)** — Official GA SDK for Gemini 2.0+, replaces deprecated @google/generative-ai
- **Pino 9.x for logging** — 5-10x faster than Winston, async by default, critical for test performance
- **Allure Reporter 3.x** — Essential for production testing with historical tracking, flakiness detection, trend analysis

**Why these choices:**
- Playwright's auto-wait mechanisms, built-in trace viewer, and native screenshot comparison eliminate entire classes of flaky tests
- Gemini 2.0 Flash provides multimodal image+text analysis with agentic vision (step-by-step investigation vs single-pass)
- Pino's async logging ensures test execution isn't blocked by I/O operations
- Allure tracks trends across test runs, automatically identifies flaky tests, provides step-level execution details

**Alternatives rejected:**
- Puppeteer (Chrome-only, lacks cross-browser support)
- Selenium (20% slower, requires WebDriver setup, weaker debugging)
- Winston logging (5-10x slower than Pino despite popularity)
- Built-in Playwright HTML reporter (lacks historical tracking, flakiness detection)

**Version requirements:**
- Node.js 24.11.0 (Active LTS) or 22.x (Maintenance LTS)
- Playwright: Update monthly (frequent releases with fixes)
- Gemini SDK: Update quarterly (check for Gemini 2.x features)

### From FEATURES.md: What to Build

**Table Stakes (Must-Have for MVP):**
1. **Self-Healing Test Locators** — Must use intent-based locators with semantic understanding, not simple fallback chains
2. **Visual Regression Testing** — AI-powered comparison that understands context (ignore timestamps/animations), not pixel-perfect matching
3. **CI/CD Integration** — GitHub Actions/GitLab CI support with clear pass/fail signals
4. **Screenshot Capture** — Automatic at failure points + on-demand
5. **Test Reports & Dashboards** — Real-time visibility with historical tracking
6. **Parallel Test Execution** — 2-10x faster feedback via matrix builds
7. **Flaky Test Detection** — Track patterns, auto-rerun random failures, quarantine chronic offenders
8. **OAuth Flow Testing** — Phone/Apple/Google authentication with deep link handling (critical for Expo apps)
9. **Navigation Path Testing** — All routes/screens reachable, detect broken links

**Differentiators (Competitive Advantage):**
1. **Multi-Modal AI Analysis (Gemini)** — Understand UI semantically, identify usability issues pixel comparison misses
2. **Autonomous Test Generation** — LLM-powered test creation from natural language (2026 trend: ReAct pattern)
3. **Defect Prediction** — ML models predict failure points with 85% accuracy (requires training data)
4. **Intelligent Test Prioritization** — Run high-risk tests first based on code changes
5. **Accessibility Testing** — Automated WCAG 2.2 compliance checks (60-70% coverage vs manual)

**Explicit Anti-Features (Don't Build):**
- Complete AI testing platform (niche tools win; integrate, don't replace)
- Manual regression testing (automate all regression tests)
- Hard-coded test data (use generators, fixtures, database seeding)
- Procedure-driven BDD (behavior-driven, not step-by-step instructions)
- Zero human oversight (design for human-in-the-loop validation)

**React Native/Expo Considerations:**
- OAuth deep links require custom URI scheme handling (critical for Phase 1)
- Cannot test OAuth in Expo Go (must use Development Builds)
- Screenshot comparison more valuable than DOM inspection for native components
- React Navigation/Expo Router compatibility essential

**Feature Adoption Context:**
- Your Gemini AI analysis places you in "Early Adoption" tier (ahead of basic tools, grounded in proven tech)
- 90%+ of commercial tools have table stakes features
- Only 20-30% have autonomous test generation or multi-modal AI analysis

### From ARCHITECTURE.md: How to Structure It

**Recommended Architecture: Agentic, Event-Driven, Modular**

**Layer 1: Orchestration Layer**
- Test Planner (converts goals into executable plans, prioritizes test cases)
- Scheduler (queue management, on-demand triggering, retry logic)
- Workflow Controller (state management, event routing, error handling)
- Pattern: Observer Pattern for event propagation, Strategy Pattern for adaptive test selection

**Layer 2: Execution Engine**
- Playwright Controller (browser automation, test execution)
- Screenshot Capture (full page, element-level, viewport management)
- Browser Manager (launch/close, context isolation, parallel execution)
- Pattern: Page Object Model for UI abstraction, Repository Pattern for test data

**Layer 3: AI Analysis Layer**
- Gemini Vision API (agentic investigation: multi-step analysis, screen understanding, code execution)
- Analysis Validator (compare vs baselines, detect visual regressions, ignore insignificant diffs)
- Pattern: Agentic Vision (Gemini 3 Flash treats vision as active investigation, not single-pass)

**Layer 4: Reporting System**
- Result Aggregator (collect execution data, calculate metrics, track trends)
- Report Generator (HTML for humans, JSON for systems, screenshot galleries)
- Notification Hub (email, Slack, webhooks for failure alerts)
- Pattern: Observer Pattern for flexible reporting without modifying core logic

**Layer 5: Storage Layer**
- File-based for MVP (simple, debuggable, no database overhead)
- Organized hierarchy: `data/plans/`, `data/screenshots/`, `data/baselines/`, `data/results/`, `data/reports/`
- Pattern: Repository Pattern for data access abstraction

**Data Flow:**
```
User Trigger → Orchestration (plan/schedule) → Execution (Playwright) →
Screenshot Capture → AI Analysis (Gemini) → Validation → Storage →
Result Aggregation → Report Generation → Notification
```

**Event-Driven Communication:**
- Central Event Bus for loose coupling
- Events: test.started, step.executing, screenshot.captured, analysis.complete, test.completed, test.failed
- Benefits: Components testable in isolation, easy to add new listeners, built-in audit trail

**Key Architectural Decisions:**
- **Agentic orchestration:** AI decides what to do next; orchestration controls whether it should happen
- **Test isolation:** Each test runs with isolated context (storage, session, cookies)
- **Robust selectors:** Prioritize user-facing attributes (text, aria-label) over CSS/XPath
- **Self-healing:** Track selector changes, adapt automatically
- **Multi-layer verification:** Never rely on single AI inference for test assertions

**Patterns to Follow:**
1. Event-Driven Architecture (loose coupling, extensibility)
2. Page Object Model (maintainability, reusability)
3. Repository Pattern (swap storage implementations without changing consumers)
4. Strategy Pattern (adaptive behaviors like test prioritization)
5. Observer Pattern (multiple observers react to test results)

**Patterns to Avoid:**
1. Tight coupling between layers (use Event Bus or Dependency Injection)
2. Fragile selectors (use semantic selectors: getByRole, getByLabel, getByTestId)
3. Testing too much in one test (break into focused, atomic tests)
4. No test isolation (each test sets up its own state)
5. Hardcoded waits (use Playwright's auto-wait, explicit conditions)
6. Pixel-perfect visual comparison (use AI semantic comparison)
7. Ignoring flaky tests (track, investigate, fix)

**Scalability Path:**
- 100 tests: Single-process, file storage, sequential execution (~1 hour runtime)
- 1,000 tests: Job queue, parallel workers, cloud storage (~2-3 hours with parallelization)
- 10,000+ tests: Distributed workers (Kubernetes), database metadata, AI-driven prioritization (~3-4 hours with smart selection)

**React Native/Expo Specifics:**
- Playwright tests web builds (`expo start --web` on `localhost:19006`)
- Playwright does NOT support native iOS/Android apps (would need Detox or Appium)
- React Native New Architecture (SDK 55+): 60fps, 40% faster startup, 20-30% less memory → better screenshot stability, reduced flakiness

### From PITFALLS.md: What Can Go Wrong

**Critical Pitfalls (Cause Rewrites, Production Incidents):**

1. **AI Hallucination in Test Assertions** (CRITICAL)
   - Problem: Gemini confidently generates incorrect assertions → false positives (broken features ship) or false negatives (working features flagged)
   - Root cause: LLMs generate plausible text, don't verify facts
   - Prevention: Multi-layer verification (AI + DOM state + expected elements), hallucination rate monitoring (alert >10%), confidence scoring (reject <0.85), human-in-the-loop for critical paths
   - Detection: Tests pass in CI but fail in production, AI contradicts Playwright DOM queries

2. **Gemini API Rate Limit Chaos** (CRITICAL)
   - Problem: Random 429 errors in CI; tests work with 5 tests, fail with 50 tests
   - Root cause: December 2025 quota cuts (50-92% reduction), misunderstanding project-level limits (not per API key), conflating RPM vs RPD limits
   - Prevention: Distinguish limit types in error handling (RPM: wait 60s; RPD: fatal), exponential backoff with jitter, monitor quota proactively, batch/cache intelligently
   - Detection: Sporadic 429s in CI, tests pass early in day but fail later

3. **OAuth Testing Without Token Refresh** (CRITICAL)
   - Problem: Tests authenticate successfully, fail 30 min later when tokens expire
   - Root cause: OAuth tokens are short-lived (15-30 min), tests assume one-time setup
   - Prevention: Centralized token manager with refresh logic, OAuth mock servers for tests, test token expiration explicitly, secure token storage
   - Detection: Tests pass locally (<15 min) but fail in CI (queued 45+ min), parallel execution causes token conflicts

4. **Screenshot Test Flakiness Cascade** (CRITICAL)
   - Problem: Screenshots differ by pixels due to font rendering, animations, blinking cursors
   - Root cause: OS-dependent fonts, dynamic content (dates, spinners), race conditions, mouse/focus states
   - Prevention: Standardize environment (Docker), hide dynamic content before screenshots, wait for stability, element-level screenshots (not full-page), set pixel difference thresholds, run in CI (not local)
   - Detection: Diffs showing only font/color shifts, tests pass/fail randomly, pixel differences in same UI regions

**Moderate Pitfalls (Delays, Technical Debt):**

5. **Fragile Playwright Selectors** — Use semantic selectors (getByRole, getByLabel, getByTestId), not CSS chains
6. **Misusing Playwright Auto-Wait** — Let Playwright auto-wait; avoid fixed timeouts (waitForTimeout)
7. **Insufficient Test Isolation** — Each test gets fresh context, no shared state
8. **AI System Integration Blindness** — Plan integration architecture early, create abstraction layer, test the testing system
9. **Playwright Can't Test Native Mobile** — Playwright tests web only; use Detox/Appium for native iOS/Android

**Minor Pitfalls (Annoyances, Quick Fixes):**

10. **Not Reporting Test Results** — Implement HTML, JUnit, JSON reports from day 1
11. **Timeout Errors in CI vs Local** — Configure CI-specific timeouts, use retries, avoid `networkidle`
12. **Ignoring AI Data Quality** — Collect training data, implement feedback loop, monitor AI performance metrics

**Phase-Specific Warnings:**
- Initial Setup: Budget for paid Gemini tier from day 1 (free tier insufficient post-Dec 2025 cuts)
- OAuth Implementation: Test token refresh flow explicitly, not just happy path
- Screenshot Capture: Use Docker for consistent rendering; hide dynamic content
- AI Integration: Multi-layer verification (never trust AI alone)
- CI/CD: Configure CI-specific timeouts; avoid `networkidle` wait condition
- Scaling: Ensure test isolation with fresh contexts, use transactions for DB tests

**Key Takeaway:** AI is a tool, not a replacement for verification. Always validate AI assertions with deterministic checks. Track hallucination rates. Budget for Gemini paid tier. Implement token refresh for OAuth. Standardize screenshot environments. Playwright auto-wait is powerful but not universal. Test isolation prevents 90% of flakiness. CI differs from local (configure accordingly). React Native Web ≠ Native (Playwright can't test native apps).

---

## Implications for Roadmap

### Suggested Phase Structure

Based on combined research, the roadmap should follow dependency order and risk mitigation:

**Phase 1: Core Testing Foundation (Weeks 1-4)**
- **Deliverables:** Basic Playwright execution, OAuth flow testing, screenshot capture, simple reporting
- **Features:** Authentication testing (Phone/Apple/Google OAuth), navigation path testing, screenshot capture at key points, basic CLI runner
- **Rationale:** These are stated requirements and represent core functional testing. OAuth is critical for Expo apps and has complex pitfalls (token refresh, deep links), so tackle early. Establishes foundation for AI integration.
- **Pitfalls to avoid:** OAuth without token refresh strategy (Pitfall 3), fragile selectors (Pitfall 5), insufficient test isolation (Pitfall 7)
- **Research needs:** Standard patterns well-documented; skip `/gsd:research-phase`

**Phase 2: Intelligence Layer (Weeks 5-8)**
- **Deliverables:** Gemini vision analysis, self-healing locators, visual regression testing, flaky test detection
- **Features:** AI-powered screenshot analysis, intent-based locators with semantic understanding, AI-powered visual comparison (ignore timestamps/animations), hallucination rate monitoring
- **Rationale:** Adds intelligence that separates you from basic test runners. Gemini integration is your differentiator. Self-healing reduces maintenance burden. Flaky test detection prevents trust erosion.
- **Pitfalls to avoid:** AI hallucination without verification (Pitfall 1), Gemini rate limit chaos (Pitfall 2), screenshot flakiness (Pitfall 4)
- **Research needs:** Likely needs `/gsd:research-phase` for Gemini integration patterns, hallucination mitigation strategies

**Phase 3: Scale & Integration (Weeks 9-12)**
- **Deliverables:** CI/CD integration, parallel execution, enhanced reporting, test prioritization
- **Features:** GitHub Actions/GitLab CI support, matrix builds (browsers/devices), Allure reports with historical tracking, risk-based test prioritization
- **Rationale:** Makes tool production-ready for teams. Scales to larger test suites. Reporting provides visibility stakeholders need.
- **Pitfalls to avoid:** AI system integration blindness (Pitfall 8), timeout errors in CI vs local (Pitfall 11), not reporting results (Pitfall 10)
- **Research needs:** Standard CI/CD patterns; skip `/gsd:research-phase`

**Phase 4: Advanced Features (Post-MVP)**
- **Deliverables:** Autonomous test generation, defect prediction, API testing, performance monitoring
- **Features:** LLM-powered test creation from natural language, ML-based failure prediction (85% accuracy), REST/GraphQL endpoint validation, load time tracking
- **Rationale:** High complexity, lower priority for v1. Manual test creation sufficient for MVP. Requires historical data for defect prediction.
- **Pitfalls to avoid:** Ignoring AI data quality (Pitfall 12), over-automation (anti-feature)
- **Research needs:** Likely needs `/gsd:research-phase` for autonomous test generation patterns, defect prediction models

**Defer to Post-MVP:**
- Cross-browser testing (React Native uses native components; focus on iOS/Android device testing instead)
- Security scanning (important but not differentiating)
- Complete AI testing platform (anti-feature: niche tools win)

### Roadmap Implications by Research Dimension

**From STACK.md:**
- Phase 1 must install Playwright, Gemini SDK, Pino, dotenv, TypeScript with strict mode
- Phase 2 requires Allure reporter setup for historical tracking
- All phases: Use Node.js 24 LTS, update Playwright monthly, Gemini SDK quarterly

**From FEATURES.md:**
- Phase 1: OAuth flow testing (Phone/Apple/Google), navigation path testing, screenshot capture (table stakes)
- Phase 2: Self-healing locators, visual regression, AI analysis (differentiators), flaky test detection (table stakes)
- Phase 3: CI/CD integration, parallel execution (table stakes), test prioritization (differentiator)
- Phase 4: Autonomous test generation, defect prediction (differentiators)

**From ARCHITECTURE.md:**
- Phase 1: Build Storage Layer, Execution Engine (basic), simple CLI
- Phase 2: Build AI Analysis Layer, Orchestration Layer (basic), Event Bus
- Phase 3: Build Reporting System, Orchestration Layer (advanced), Notification Hub
- Phase 4: Refine Orchestration with agentic capabilities, API Layer (optional)

**From PITFALLS.md:**
- Phase 1: Implement centralized OAuth token manager, use semantic selectors, fresh contexts per test
- Phase 2: Multi-layer AI verification from day 1, exponential backoff for Gemini API, Docker for screenshots
- Phase 3: CI-specific timeouts, multiple report formats, monitoring/alerting
- Phase 4: AI data quality feedback loop, hallucination rate tracking

### Research Flags for Planning

**Phases needing `/gsd:research-phase` during planning:**
- **Phase 2:** Gemini integration patterns, hallucination mitigation strategies, agentic vision implementation
- **Phase 4:** Autonomous test generation patterns (ReAct architecture), defect prediction model training

**Phases with well-documented patterns (skip research):**
- **Phase 1:** Playwright basics, OAuth testing, file-based storage
- **Phase 3:** CI/CD integration (GitHub Actions, GitLab CI), Allure reporting

**Rationale:** Gemini agentic vision is cutting-edge (2026); research confirmed capability but implementation patterns are emerging. Autonomous test generation requires ReAct pattern understanding. Standard Playwright, CI/CD, and reporting are mature with extensive documentation.

---

## Confidence Assessment

| Area | Confidence | Source Quality | Notes |
|------|------------|---------------|-------|
| **Stack** | HIGH | Official documentation (Node.js, Playwright, Gemini), industry comparisons (BrowserStack, BetterStack) | All technologies verified via official docs. Version numbers current as of 2026-02-08. Playwright advantages confirmed across multiple sources. |
| **Features** | MEDIUM | Industry analysis (multiple 2026 sources), vendor documentation (mabl, Percy, Applitools) | Table stakes vs differentiators validated across 7+ industry sources. MVP recommendations based on project context. React Native/Expo considerations verified via official Expo docs. |
| **Architecture** | MEDIUM | WebSearch findings (2026 autonomous testing patterns), official Playwright docs, Google Gemini blog | General patterns well-documented. Gemini agentic vision confirmed via Google Developer Blog (Feb 2026). Some specifics (exact API usage) would benefit from hands-on verification. |
| **Pitfalls** | HIGH | Multiple 2026 sources, official documentation (Gemini rate limits, OAuth best practices), Playwright gotchas verified | Critical pitfalls verified across multiple independent sources. Gemini rate limit details confirmed via official Google docs. OAuth patterns validated via OWASP, Curity, Microsoft. Screenshot flakiness solutions confirmed via Applitools, Argos. |

**Overall Confidence: MEDIUM-HIGH**

**Strengths:**
- Stack recommendations verified via official documentation and 2026 industry consensus
- Pitfalls validated across multiple independent sources with concrete mitigation strategies
- Architecture patterns grounded in established software engineering principles
- Feature landscape reflects current market state (2026 trends, adoption stages)

**Gaps to Address:**

1. **Gemini API Practical Costs:** Research confirmed rate limits but actual cost per test execution with Gemini 2.0 Flash at scale is unclear. Budget planning needs hands-on validation.

2. **Gemini Vision Accuracy on Mobile Screenshots:** No benchmarks found for Gemini's UI analysis accuracy specifically on mobile app screenshots. Empirical testing required to establish acceptable hallucination thresholds.

3. **React Native Self-Healing Effectiveness:** Most self-healing research focuses on web DOM. React Native's component hierarchy may behave differently. Validation needed during Phase 2 implementation.

4. **Expo Development Build OAuth Testing:** Practical challenges of testing OAuth in Development Builds vs Expo Go remain under-documented. Hands-on validation required in Phase 1.

5. **Screenshot Stability at Scale:** What constitutes acceptable pixel difference thresholds for your specific UI? Requires empirical testing with actual Dawati app screenshots.

6. **Performance Baselines:** What is "fast" for autonomous test execution on Expo web apps? No industry consensus found. Needs benchmarking during Phase 1.

7. **Agentic AI Production Maturity:** Industry sources claim agentic AI is "conference demo magic" in some contexts. Verify which Gemini agentic vision capabilities are production-ready vs experimental during Phase 2.

**Validation Strategy:**
- Phase 1: Validate OAuth token refresh patterns, Expo Development Build testing, performance baselines
- Phase 2: Empirically test Gemini hallucination rates, establish pixel difference thresholds, validate self-healing effectiveness
- Phase 3: Measure actual Gemini API costs at scale, validate agentic vision production readiness
- All phases: Track metrics (pass rate, execution time, flakiness rate, hallucination rate) to validate research assumptions

---

## Sources

This synthesis drew from 100+ sources across 4 research dimensions:

### Technology Stack (STACK.md)
**High Confidence:**
- [Node.js Releases](https://nodejs.org/en/about/previous-releases) — LTS versions and EOL dates
- [Playwright Documentation](https://playwright.dev/docs/intro) — Official Playwright docs
- [Google Gemini API Libraries](https://ai.google.dev/gemini-api/docs/libraries) — Official SDK docs
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig/strict.html) — Official TypeScript config

**Medium Confidence:**
- [Playwright vs Puppeteer vs Selenium (2025)](https://www.browserbase.com/blog/recommending-playwright) — Browser automation comparison
- [Pino vs Winston Comparison](https://betterstack.com/community/comparisons/pino-vs-winston/) — Logging library comparison
- [Allure Report Documentation](https://allurereport.org/docs/playwright/) — Allure Playwright integration

### Feature Landscape (FEATURES.md)
**High Confidence:**
- [Expo Authentication Documentation](https://docs.expo.dev/develop/authentication/) — Expo auth patterns
- [Playwright Test Generator](https://playwright.dev/docs/codegen) — Test recording patterns

**Medium Confidence:**
- [Autonomous Quality Engineering: AI Testing in 2026](https://fintech.global/2026/01/27/autonomous-quality-engineering-ai-testing-in-2026/)
- [12 AI Test Automation Tools QA Teams Actually Use in 2026](https://testguild.com/7-innovative-ai-test-automation-tools-future-third-wave/)
- [Agentic AI in Testing: The 2026 Blueprint](https://medium.com/the-qa-space/agentic-ai-in-testing-the-2026-blueprint-for-autonomous-qa-786412ab2644)
- [14 Best AI Testing Tools & Platforms in 2026](https://www.virtuosoqa.com/post/best-ai-testing-tools)
- [mabl GenAI Test Automation with Self-Healing](https://www.mabl.com/auto-healing-tests)
- [Percy Visual Testing Engine](https://www.browserstack.com/percy/visual-regression-testing)

### Architecture Patterns (ARCHITECTURE.md)
**High Confidence:**
- [Best Practices | Playwright](https://playwright.dev/docs/best-practices) — Official best practices
- [15 Best Practices for Playwright testing in 2026](https://www.browserstack.com/guide/playwright-best-practices)
- [React Native's New Architecture - Expo Documentation](https://docs.expo.dev/guides/new-architecture/)

**Medium Confidence:**
- [Introducing Agentic Vision in Gemini 3 Flash](https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/) — Google Developer Blog
- [Building a Future-Proof Test Automation Architecture](https://www.accelq.com/blog/test-automation-architecture/)
- [Enterprise Agentic AI Architecture Guide 2026](https://www.kellton.com/kellton-tech-blog/enterprise-agentic-ai-architecture)
- [Software Testing Basics for 2026](https://momentic.ai/blog/software-testing-basics)

### Domain Pitfalls (PITFALLS.md)
**High Confidence:**
- [Gemini API Rate Limits Official Docs](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Testing for OAuth Weaknesses - OWASP](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/05-Testing_for_OAuth_Weaknesses)
- [15 Playwright Selector Best Practices 2026 - BrowserStack](https://www.browserstack.com/guide/playwright-selectors-best-practices)
- [Dealing with Waits and Timeouts in Playwright - Checkly](https://www.checklyhq.com/docs/learn/playwright/waits-and-timeouts/)

**Medium Confidence:**
- [AI Hallucinations Testing Guide - TestFort](https://testfort.com/blog/ai-hallucination-testing-guide)
- [Google AI Studio Quota Issues – 2026 Guide](https://help.apiyi.com/en/google-ai-studio-rate-limit-solution-guide-en.html)
- [Gemini API Free Tier: Complete Guide 2026](https://www.aifreeapi.com/en/posts/google-gemini-api-free-tier)
- [How to Test OAuth Authentication - Testim](https://www.testim.io/blog/how-to-test-oauth-authentication/)
- [OAuth Refresh Token Rotation Best Practices 2026](https://www.serverion.com/uncategorized/refresh-token-rotation-best-practices-for-developers/)
- [Why Screenshot Image Comparison Tools Fail - Applitools](https://applitools.com/blog/why-screenshot-image-comparison-tools-fail/)
- [Stabilize Flaky Tests for Visual Testing - Argos](https://argos-ci.com/blog/screenshot-stabilization)
- [Operating System Independent Screenshot Testing with Playwright and Docker](https://adequatica.medium.com/operating-system-independent-screenshot-testing-with-playwright-and-docker-6e2251a9eb32)
- [Universal E2E Testing with Detox and Playwright](https://ignitecookbook.com/docs/recipes/UniversalE2ETesting/)

**Complete source lists available in individual research files (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md).**

---

## Ready for Roadmap Creation

This synthesis provides the foundation for structured roadmap planning:

**For gsd-roadmapper agent:**
- **Executive Summary** provides domain understanding
- **Key Findings** inform technology and feature decisions
- **Implications for Roadmap** suggest 4-phase structure with clear rationale
- **Research Flags** identify which phases need deeper research (Phase 2, Phase 4)
- **Confidence Assessment** highlights gaps requiring validation during implementation
- **Pitfalls** provide phase-specific warnings to avoid common mistakes

**Recommended next steps:**
1. Use Phase 1-4 structure as roadmap skeleton
2. Expand each phase with specific tickets based on Key Findings
3. Flag Phase 2 and Phase 4 for potential `/gsd:research-phase` (Gemini integration, autonomous test generation)
4. Incorporate phase-specific pitfall warnings into acceptance criteria
5. Plan validation strategy for identified gaps during implementation

**Key recommendations for roadmapper:**
- **Be opinionated:** Use Playwright (not Puppeteer/Selenium), Gemini 2.0 Flash (not GPT-4 Vision), Pino (not Winston), Allure (not basic HTML reporter)
- **Prioritize risk mitigation:** Phase 1 must include OAuth token refresh manager, Phase 2 must include multi-layer AI verification from day 1
- **Plan for scale:** Start with file-based storage (simple), plan migration path to database at 1,000+ tests
- **Budget for reality:** Gemini paid tier required (free tier insufficient post-Dec 2025 cuts), budget for DevOps time (Docker setup for screenshot consistency)
- **Avoid anti-features:** Don't build complete platform, don't attempt zero-human-oversight, don't over-automate exploratory testing

SUMMARY.md committed. Orchestrator can proceed to requirements definition.
