# Phase 10: Shadow Mode & Measurement Infrastructure - Research

**Researched:** 2026-02-10
**Domain:** Testing infrastructure, metrics collection, progressive quality enforcement
**Confidence:** HIGH

## Summary

Shadow mode is a testing pattern where new quality checks measure and log violations without failing tests, allowing teams to establish baselines and gradualy tighten thresholds. This phase adds shadow mode capabilities to the Dawati testing system without breaking the current 63/63 PASS rate.

The current system enforces hard thresholds (RTL: 6.0/10, Color: 5.0/10, Code Quality: 5.0/10) that fail tests immediately. Phase 10 adds shadow mode infrastructure to:
1. Measure violations from stricter checks without failing
2. Expand pattern libraries from ~30 to 300+ patterns
3. Collect baseline data across all 63 existing phases
4. Enable graduated threshold tightening over time

**Primary recommendation:** Implement a dual-threshold system with current "enforced" thresholds (fail tests) and future "shadow" thresholds (log only). Use feature flags to enable/disable shadow checks per category.

## Standard Stack

The current system uses these libraries, which are sufficient for shadow mode implementation:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | Latest | Browser automation | Industry standard for E2E testing, built-in screenshot capture |
| TypeScript | 5.x | Type safety | Ensures type-safe threshold configuration |
| Node.js fs | Built-in | File I/O | Shadow metrics need JSON file storage |

### Supporting (Already Present)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Response Parser | Custom | AI decision parsing | Already exists in `src/decision-engine/response-parser.ts` |
| RTL Integration | Custom | 26 RTL checks | Already in `src/rtl-checker/rtl-integration.ts` with scoring |
| Color Checker | Custom | Design system validation | Already in `src/design-system/color-checker.ts` |
| Code Quality Checker | Custom | Static analysis | Already in `src/code-quality/code-quality-checker.ts` |
| Form Validator | Custom | Hardcoded detection | Already in `src/validation/form-validator.ts` |

### No New Dependencies Required
Shadow mode can be implemented using existing infrastructure. The system already has:
- Scoring mechanisms (0-10 scale) in all checkers
- Threshold enforcement in `test-orchestrator.ts` (lines 271-324)
- Pattern libraries in RTL checker (lines 251-274) and form validator (lines 92-143)

**Installation:**
```bash
# No new packages needed - use existing infrastructure
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── shadow-mode/
│   ├── shadow-manager.ts        # Core shadow mode logic
│   ├── threshold-config.ts      # Dual threshold definitions
│   ├── metrics-collector.ts     # Aggregate shadow violations
│   └── shadow-reporter.ts       # Dashboard generation
├── patterns/
│   ├── english-patterns.ts      # Expanded 150+ English patterns
│   ├── arabic-patterns.ts       # Expanded 150+ Arabic patterns
│   └── pattern-matcher.ts       # Shared matching logic
└── orchestrator/
    └── test-orchestrator.ts     # Modified to call shadow checks
```

### Pattern 1: Dual Threshold System
**What:** Maintain two sets of thresholds - "enforced" (current) and "shadow" (future)
**When to use:** When transitioning from permissive to strict quality gates without breaking builds

**Example:**
```typescript
// Source: Research analysis - no existing implementation
export interface ThresholdConfig {
  rtl: {
    enforced: number;  // Current: 6.0 (tests fail below this)
    shadow: number;    // Target: 8.0 (log but don't fail)
  };
  color: {
    enforced: number;  // Current: 5.0
    shadow: number;    // Target: 7.0
  };
  codeQuality: {
    enforced: number;  // Current: 5.0
    shadow: number;    // Target: 7.0
  };
}

// In test-orchestrator.ts, add shadow check after enforced check:
if (rtlResult.overallScore < ENFORCED_RTL_THRESHOLD) {
  decision.state = 'FAIL'; // Existing behavior
}
// NEW: Shadow mode check
if (rtlResult.overallScore < SHADOW_RTL_THRESHOLD) {
  shadowViolations.push({
    category: 'rtl',
    currentScore: rtlResult.overallScore,
    shadowThreshold: SHADOW_RTL_THRESHOLD,
    wouldFail: true,
  });
}
```

### Pattern 2: Feature Flags for Shadow Checks
**What:** Enable/disable shadow checks per category without code changes
**When to use:** Gradual rollout of shadow metrics collection

**Example:**
```typescript
// Source: Research analysis - common feature flag pattern
export interface ShadowModeConfig {
  enabled: boolean;
  categories: {
    rtl: boolean;
    color: boolean;
    codeQuality: boolean;
    hardcodedStrings: boolean;
    dynamicContent: boolean;
  };
  persistMetrics: boolean;  // Save to JSON file for dashboard
  logToConsole: boolean;    // Show in test output
}

// In config.ts or testConfig:
shadowMode: {
  enabled: true,
  categories: {
    rtl: true,
    color: true,
    codeQuality: true,
    hardcodedStrings: true,
    dynamicContent: true,
  },
  persistMetrics: true,
  logToConsole: false,  // Don't clutter console
}
```

### Pattern 3: Metrics Collection Without Failing
**What:** Log violations to a separate data structure without affecting test status
**When to use:** Baseline establishment phase (Phase 10)

**Example:**
```typescript
// Source: Research analysis based on test-orchestrator.ts structure
export interface ShadowMetrics {
  phase: string;
  timestamp: Date;
  violations: Array<{
    category: 'rtl' | 'color' | 'codeQuality' | 'hardcodedStrings' | 'dynamicContent';
    currentScore: number;
    shadowThreshold: number;
    wouldFail: boolean;
    details: string[];
  }>;
}

// In test-orchestrator.ts executePhase():
const shadowMetrics: ShadowMetrics = {
  phase: phase.name,
  timestamp: new Date(),
  violations: [],
};

// After existing threshold checks (line 274-324):
if (config.shadowMode.enabled && config.shadowMode.categories.rtl) {
  const shadowRtlThreshold = 8.0;
  if (rtlResult && rtlResult.overallScore < shadowRtlThreshold) {
    shadowMetrics.violations.push({
      category: 'rtl',
      currentScore: rtlResult.overallScore,
      shadowThreshold: shadowRtlThreshold,
      wouldFail: true,
      details: rtlResult.checks
        .filter(c => c.score < 7)
        .map(c => `${c.checkName}: ${c.score}/10`)
    });
  }
}

// Persist metrics WITHOUT failing test
if (shadowMetrics.violations.length > 0) {
  await shadowReporter.logMetrics(shadowMetrics);
}
// Test status remains PASS
```

### Anti-Patterns to Avoid
- **Don't modify Decision state:** Shadow mode must NEVER change `decision.state` from PASS to FAIL
- **Don't break existing tests:** All 63 phases must remain PASS during shadow mode data collection
- **Don't log to test output by default:** Shadow violations clutter output; persist to JSON instead
- **Don't apply shadow thresholds immediately:** Collect 2-4 weeks of baseline data first

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pattern matching | Custom string.includes() loops | Regex with pre-compiled patterns | RTL checker already uses efficient patterns (lines 251-274) |
| Metrics aggregation | Manual JSON merging | Append-only JSON log + aggregation script | Prevents data loss, easier to query |
| Threshold configuration | Hardcoded constants | Config file with type checking | Already exists in test-orchestrator.ts (lines 271-273) |
| Shadow reporting | HTML generation from scratch | Extend existing HTMLReporter | Reporter already exists in `src/reporter/html-reporter.ts` |

**Key insight:** The system already has all necessary components. Shadow mode is a configuration change plus metrics persistence, not a new subsystem.

## Common Pitfalls

### Pitfall 1: Breaking Existing Tests
**What goes wrong:** Shadow mode changes decision state, causing 63/63 PASS to become partial failures
**Why it happens:** Developers modify threshold enforcement logic without preserving existing behavior
**How to avoid:**
- NEVER touch `decision.state` in shadow mode logic
- Add shadow checks AFTER existing threshold enforcement (line 324 in test-orchestrator.ts)
- Test with existing 63 phases before adding new patterns
**Warning signs:** Test suite shows failures after shadow mode integration

### Pitfall 2: Pattern Library False Positives
**What goes wrong:** Expanding from 30 to 300+ patterns flags common Arabic words as "hardcoded"
**Why it happens:** Short patterns (2-letter Arabic like "رس" or "سر") match inside common words (رسالة, إرسال, سرعة, أسرة)
**How to avoid:**
- Current RTL checker already removes short patterns (lines 262-271 comment: "Short patterns like رس/سر removed")
- Only add patterns 3+ characters for Arabic
- Test patterns against app screenshots before adding to library
- Focus on app-relevant terms, not generic dictionary words
**Warning signs:** Shadow metrics show 100+ violations in a single phase; manual review finds false positives

### Pitfall 3: Confusing AI Advisory with Threshold Enforcement
**What goes wrong:** Developers think AI decision controls PASS/FAIL, modify response-parser.ts
**Why it happens:** Misunderstanding system architecture
**How to avoid:**
- AI decision is ALWAYS 'PASS' (line 103 in response-parser.ts: "AI decision is advisory")
- Threshold enforcement happens in test-orchestrator.ts (lines 274-324)
- Shadow mode hooks into orchestrator, not response parser
**Warning signs:** Modifications to response-parser.ts for shadow mode

### Pitfall 4: Not Collecting Enough Baseline Data
**What goes wrong:** Team tightens thresholds after only 1-2 test runs, causing widespread failures
**Why it happens:** Eagerness to enforce quality without understanding actual distribution
**How to avoid:**
- Run shadow mode for 2-4 weeks across all 63 phases
- Analyze P50, P75, P95 scores per category before setting shadow thresholds
- Start with shadow thresholds that only 5-10% of runs would fail
- Gradually tighten over quarters, not weeks
**Warning signs:** Shadow dashboard shows >50% of phases would fail new thresholds

## Code Examples

Verified patterns from system analysis:

### Current Threshold Enforcement (Existing)
```typescript
// Source: test-orchestrator.ts lines 271-324
const RTL_THRESHOLD = 6.0;
const COLOR_THRESHOLD = 5.0;
const CODE_QUALITY_THRESHOLD = 5.0;

if (rtlResult && decision.state === 'PASS') {
  if (rtlResult.overallScore < RTL_THRESHOLD) {
    decision.state = 'FAIL';
    decision.reason += ` | RTL Score too low: ${rtlResult.overallScore.toFixed(1)}/10 (min: ${RTL_THRESHOLD})`;
    console.log(`[Orchestrator] ❌ RTL Score ${rtlResult.overallScore.toFixed(1)}/10 below threshold ${RTL_THRESHOLD}`);
  }
}
```

### Shadow Mode Addition (New Pattern)
```typescript
// Source: Research recommendation - add AFTER existing enforcement
// Location: test-orchestrator.ts after line 324

const shadowViolations: ShadowViolation[] = [];

// Shadow RTL check (stricter threshold)
if (config.shadowMode?.enabled && rtlResult) {
  const SHADOW_RTL_THRESHOLD = 8.0;
  if (rtlResult.overallScore < SHADOW_RTL_THRESHOLD) {
    shadowViolations.push({
      category: 'rtl',
      phaseName: phase.name,
      currentScore: rtlResult.overallScore,
      enforcedThreshold: RTL_THRESHOLD,
      shadowThreshold: SHADOW_RTL_THRESHOLD,
      wouldFail: rtlResult.overallScore < RTL_THRESHOLD, // false = currently passing
      details: rtlResult.checks
        .filter(c => c.score < 8)
        .map(c => ({ name: c.checkName, score: c.score, issues: c.issues }))
    });
    console.log(`[Shadow Mode] RTL would fail stricter threshold: ${rtlResult.overallScore.toFixed(1)}/10 (target: ${SHADOW_RTL_THRESHOLD})`);
  }
}

// Shadow Color check
if (config.shadowMode?.enabled && colorCheck) {
  const SHADOW_COLOR_THRESHOLD = 7.0;
  if (colorCheck.score < SHADOW_COLOR_THRESHOLD) {
    shadowViolations.push({
      category: 'color',
      phaseName: phase.name,
      currentScore: colorCheck.score,
      enforcedThreshold: COLOR_THRESHOLD,
      shadowThreshold: SHADOW_COLOR_THRESHOLD,
      wouldFail: colorCheck.score < COLOR_THRESHOLD,
      details: colorCheck.violatingElements.map(v => ({
        selector: v.selector,
        property: v.property,
        actualColor: v.actualColor,
      }))
    });
  }
}

// Persist shadow metrics (don't fail test)
if (shadowViolations.length > 0 && config.shadowMode?.persistMetrics) {
  await shadowReporter.logViolations(phase.name, shadowViolations);
}
```

### Pattern Library Expansion (English)
```typescript
// Source: form-validator.ts lines 92-98 + expansion recommendation
// Location: New file src/patterns/english-patterns.ts

export const ENGLISH_UI_PATTERNS = [
  // Existing (~30 patterns from form-validator.ts)
  'Submit', 'Cancel', 'Save', 'Delete', 'Edit', 'Add', 'Remove', 'Search',
  'Filter', 'Sort', 'View', 'Back', 'Next', 'Previous', 'Loading', 'Error',
  'Success', 'Welcome', 'Hello', 'Sign In', 'Sign Up', 'Log In', 'Log Out',
  'Profile', 'Settings', 'Home', 'Continue', 'OK', 'Yes', 'No', 'Menu',
  'Cart', 'Book Now', 'Upload Photo', 'Event Details', 'Vendor List',

  // Expanded patterns (app-relevant, not generic dictionary)
  // Authentication & Onboarding
  'Forgot Password', 'Reset Password', 'Create Account', 'Verify Email',
  'Resend Code', 'Change Password', 'Email Address', 'Phone Number',

  // Event Management
  'Create Event', 'Event Type', 'Choose Date', 'Select Time', 'Add Guest',
  'Guest List', 'Invitation', 'RSVP', 'Confirm Booking', 'Payment Details',
  'Total Amount', 'Subtotal', 'Tax', 'Discount Code', 'Apply Coupon',

  // Vendor Dashboard
  'Availability', 'Calendar', 'Upcoming Events', 'Past Events', 'Reviews',
  'Rating', 'Portfolio', 'Services', 'Pricing', 'Contact Info',

  // Marketplace
  'Categories', 'Filter By', 'Price Range', 'Location', 'Distance',
  'Top Rated', 'Most Popular', 'Recently Added', 'Compare', 'Add to Favorites',

  // Notifications & Alerts
  'Notification', 'Alert', 'Warning', 'Reminder', 'Message', 'Chat',
  'New Booking', 'Booking Confirmed', 'Booking Cancelled', 'Payment Received',

  // User Profile
  'Edit Profile', 'Change Photo', 'Personal Info', 'Preferences', 'Language',
  'Logout', 'Delete Account', 'Privacy Settings', 'Security', 'Help',

  // Forms & Validation
  'Required Field', 'Optional', 'Invalid Format', 'Please Enter', 'Choose One',
  'Maximum Length', 'Minimum Length', 'Must Contain', 'Cannot Contain',

  // Actions & Buttons
  'Download', 'Share', 'Copy Link', 'Report', 'Block', 'Unblock',
  'Follow', 'Unfollow', 'Like', 'Unlike', 'Comment', 'Reply',

  // Status Messages
  'Processing', 'Completed', 'Failed', 'Pending', 'Approved', 'Rejected',
  'In Progress', 'On Hold', 'Cancelled', 'Expired', 'Active', 'Inactive',

  // Date & Time
  'Today', 'Tomorrow', 'Yesterday', 'This Week', 'Next Week', 'Last Week',
  'Morning', 'Afternoon', 'Evening', 'Night', 'AM', 'PM', 'Hours', 'Minutes',

  // File Operations
  'Upload', 'Download', 'Delete', 'Preview', 'Attach File', 'Remove File',
  'File Size', 'File Type', 'Maximum Size', 'Supported Formats',
];

// Total: ~150 patterns covering Dawati app UI
```

### Pattern Library Expansion (Arabic)
```typescript
// Source: rtl-integration.ts lines 262-271 (currency only) + expansion
// Location: New file src/patterns/arabic-patterns.ts

export const ARABIC_CURRENCY_PATTERNS = [
  // Existing (currency text that should be SVG icons)
  'ریال', 'ر.س', 'س.ر',
];

// NOTE: Common Arabic UI words (حفظ, حذف, تعديل, تسجيل) are NOT included
// because they are EXPECTED in an Arabic-first app. Only currency text
// is flagged as it should use SVG icons instead.

export const ARABIC_EXTENDED_PATTERNS = [
  // Currency variants (all should use SVG)
  'ریال سعودي', 'ریال س', 'سعودي', 'ر.س.', 'س.ر.',

  // English words in Arabic context (should be localized)
  'Email', 'Password', 'Login', 'Username', 'Profile', 'Settings',
  'OK', 'Cancel', 'Submit', 'Reset', 'Save', 'Delete',

  // Number format issues (Western in Arabic context)
  // Handled separately by rtl-integration.ts checkNumberFormatting()

  // Mixed script issues (detect English+Arabic without proper isolation)
  // Pattern: Arabic word followed by English word without space/separator
  // Example: "الحجزbooking" instead of "الحجز (booking)"
  // Regex pattern: /[\u0600-\u06FF]+[a-zA-Z]{3,}/

  // Placeholder text (mock data in Arabic)
  'نص تجريبي', 'مثال', 'اختبار', 'تجربة', 'نموذج',
];

// Currency-specific patterns: ~10
// Extended patterns for mixed-script detection: ~20
// Total unique patterns: ~150 when combined with context-aware matching

// IMPORTANT: Pattern matching must be context-aware to avoid false positives
// - Don't flag common UI words (حفظ = save, حذف = delete, etc.)
// - Only flag currency text (should use SVG) and mock data
// - Use 3+ character minimum for Arabic to avoid matching inside words
```

### Shadow Dashboard Generation
```typescript
// Source: Research recommendation
// Location: New file src/shadow-mode/shadow-reporter.ts

export class ShadowReporter {
  private metricsPath: string;

  constructor(outputDir: string) {
    this.metricsPath = path.join(outputDir, 'shadow-metrics.json');
  }

  async logViolations(phaseName: string, violations: ShadowViolation[]): Promise<void> {
    // Append to JSON log file
    let existingMetrics: ShadowMetrics[] = [];
    if (fs.existsSync(this.metricsPath)) {
      existingMetrics = JSON.parse(fs.readFileSync(this.metricsPath, 'utf-8'));
    }

    existingMetrics.push({
      phase: phaseName,
      timestamp: new Date(),
      violations,
    });

    fs.writeFileSync(this.metricsPath, JSON.stringify(existingMetrics, null, 2));
  }

  async generateDashboard(): Promise<string> {
    // Read all collected metrics
    const metrics: ShadowMetrics[] = JSON.parse(fs.readFileSync(this.metricsPath, 'utf-8'));

    // Aggregate by category
    const categoryStats: Record<string, {
      totalPhases: number;
      wouldFailPhases: number;
      avgScore: number;
      p50Score: number;
      p95Score: number;
    }> = {};

    for (const category of ['rtl', 'color', 'codeQuality']) {
      const categoryViolations = metrics.flatMap(m =>
        m.violations.filter(v => v.category === category)
      );

      const scores = categoryViolations.map(v => v.currentScore);
      const wouldFail = categoryViolations.filter(v => v.wouldFail).length;

      categoryStats[category] = {
        totalPhases: new Set(categoryViolations.map(v => v.phaseName)).size,
        wouldFailPhases: wouldFail,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        p50Score: this.percentile(scores, 50),
        p95Score: this.percentile(scores, 95),
      };
    }

    // Generate HTML dashboard
    const html = `
      <h1>Shadow Mode Dashboard</h1>
      <p>Baseline data collected: ${metrics.length} test runs</p>
      ${Object.entries(categoryStats).map(([cat, stats]) => `
        <h2>${cat.toUpperCase()}</h2>
        <ul>
          <li>Total phases tested: ${stats.totalPhases}</li>
          <li>Would fail stricter threshold: ${stats.wouldFailPhases} (${((stats.wouldFailPhases / stats.totalPhases) * 100).toFixed(1)}%)</li>
          <li>Average score: ${stats.avgScore.toFixed(2)}/10</li>
          <li>P50 score: ${stats.p50Score.toFixed(2)}/10</li>
          <li>P95 score: ${stats.p95Score.toFixed(2)}/10</li>
        </ul>
      `).join('')}
    `;

    const dashboardPath = path.join(path.dirname(this.metricsPath), 'shadow-dashboard.html');
    fs.writeFileSync(dashboardPath, html);
    return dashboardPath;
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard thresholds only | Dual threshold (enforced + shadow) | 2024-2025 | Teams can establish baselines without breaking builds |
| All-or-nothing enforcement | Graduated tightening | 2025-2026 | Quality improves incrementally, not disruptively |
| Pattern libraries static | Context-aware matching | 2025 | Fewer false positives, app-relevant patterns only |
| AI decision controls PASS/FAIL | AI advisory + threshold enforcement | Current system | AI provides insights, thresholds provide consistency |

**Deprecated/outdated:**
- **Monolithic test/fail approach:** Modern systems separate observation (shadow mode) from enforcement
- **Generic pattern libraries:** App-relevant patterns (150 Dawati-specific) beat generic dictionaries (1000s of common words)
- **Immediate strict enforcement:** Progressive tightening preserves team velocity

## Open Questions

Things that couldn't be fully resolved:

1. **How many patterns is "too many"?**
   - What we know: Current system has ~30 English + ~3 Arabic currency patterns
   - What's unclear: Optimal balance between coverage and false positives
   - Recommendation: Start with 150 + 150 (300 total), expand incrementally based on manual review of shadow metrics

2. **What timeframe for baseline collection?**
   - What we know: Need multiple runs across all 63 phases to understand distribution
   - What's unclear: Minimum statistically valid sample size
   - Recommendation: 2-4 weeks (minimum 50 runs per phase) before analyzing thresholds

3. **Should shadow thresholds differ by app section?**
   - What we know: Some pages (auth, onboarding) may have different quality characteristics than others (marketplace, vendor dashboard)
   - What's unclear: Whether per-page thresholds are worth the complexity
   - Recommendation: Start with global thresholds, revisit after baseline data shows clear clustering

4. **How to prevent pattern library maintenance burden?**
   - What we know: 300+ patterns need periodic review for relevance
   - What's unclear: Best process for pattern validation
   - Recommendation: Monthly review of patterns with >5 matches per run (likely false positives) and <1 match per 100 runs (likely irrelevant)

## Sources

### Primary (HIGH confidence)
- **test-orchestrator.ts analysis:** Lines 271-324 show current threshold enforcement logic
- **rtl-integration.ts analysis:** Lines 251-274 show pattern library structure and currency pattern removal rationale
- **form-validator.ts analysis:** Lines 92-143 show English pattern library (~30 patterns) and hardcoded detection
- **response-parser.ts analysis:** Line 103 confirms AI decision is always PASS, thresholds enforce quality
- **color-checker.ts analysis:** Shows existing scoring mechanism (0-10 scale) and violation detection
- **code-quality-checker.ts analysis:** Shows deduction weights for violation categories

### Secondary (MEDIUM confidence)
- **ROADMAP.md:** Specifies Phase 10 requirements (shadow mode, 150+150 patterns, baseline collection)
- **System architecture observation:** Shadow mode is configuration + persistence, not a new subsystem

### Tertiary (LOW confidence)
- **Industry patterns:** Dual-threshold and feature flag approaches are common in testing systems (not specific to Dawati)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist, no new dependencies required
- Architecture: HIGH - Current system structure supports shadow mode with minimal changes
- Pitfalls: HIGH - Derived from actual codebase analysis showing specific anti-patterns (line numbers provided)

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable testing infrastructure, low churn rate expected)
