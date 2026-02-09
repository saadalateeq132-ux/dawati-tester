# 🎯 FINAL QUALITY RULES - 4 MUST-PASS CHECKS

## The 4 Rules (ALL Must Pass)

```
┌────────────────────────────────────────────────────────┐
│  RULE 1: Checklist Must Be 100%                       │
│    └── MASTER-TEST-CHECKLIST.md P0 items = 100% ✅    │
│    └── If < 100% → FAIL ❌                             │
│                                                        │
│  RULE 2: Component Quality                            │
│    └── RTL Score >= 7.0 ✅                             │
│    └── Color Score >= 7.0 ✅                           │
│    └── Font/Typography from theme ✅                   │
│    └── Font size consistent ✅                         │
│    └── No hardcoded values ✅                          │
│    └── If any fail → FAIL ❌                           │
│                                                        │
│  RULE 3: No Critical Issues                           │
│    └── AI finds any critical issue → FAIL ❌          │
│    └── App crash, 404, error page → FAIL ❌           │
│    └── Broken functionality → FAIL ❌                  │
│                                                        │
│  RULE 4: Typography Consistency                       │
│    └── Font type (family) from theme ✅               │
│    └── Font size from Typography tokens ✅            │
│    └── No random fontSize: 18, 16, 14... ✅           │
│    └── If violations found → FAIL ❌                   │
│                                                        │
│  ALL 4 RULES MUST PASS = TEST PASSES ✅               │
│  ANY RULE FAILS = TEST FAILS ❌                        │
└────────────────────────────────────────────────────────┘
```

---

## Rule 1: Checklist 100% (P0 Items)

### What It Checks:
- MASTER-TEST-CHECKLIST.md has 422 items
- P0 (Priority 0) = Critical items = **MUST be 100%**
- Currently: 45 P0 items at 7% (3/45 passing)

### Failure Condition:
```typescript
if (checklistScore.requiredScore < 100) {
  status = 'FAIL';
  reason = `Checklist P0 not complete: ${checklistScore.requiredScore}% (need 100%)`;
}
```

### Example:
```
❌ FAILED: Checklist P0: 67% (30/45 tests passing)
   Missing critical tests:
   - ACC-003: Password change with OTP
   - ACC-006: Phone number change
   - EVT-001: Event creation
   ... 15 more P0 tests missing
```

---

## Rule 2: Component Quality (Code Analysis)

### What It Checks:

#### 2A. RTL Score >= 7.0
```typescript
// BAD - Will FAIL:
marginLeft: 10
paddingRight: 20
flexDirection: isRTL ? 'row-reverse' : 'row'

// GOOD - Will PASS:
marginStart: 10
paddingEnd: 20
flexDirection: 'row'
```

#### 2B. Color Score >= 7.0
```typescript
// BAD - Will FAIL:
backgroundColor: '#FF5733'
color: '#000000'
borderColor: 'red'

// GOOD - Will PASS:
backgroundColor: colors.primary
color: colors.text
borderColor: colors.border
```

#### 2C. Font Type from Theme
```typescript
// BAD - Will FAIL:
fontFamily: 'Roboto'
fontFamily: 'Arial'
fontFamily: 'Helvetica'

// GOOD - Will PASS:
fontFamily: Typography.body.fontFamily
fontFamily: Typography.h1.fontFamily
// Or use preset:
style={Typography.body}
```

#### 2D. Font Size from Theme
```typescript
// BAD - Will FAIL:
fontSize: 18
fontSize: 16
fontSize: 14
fontSize: 12

// GOOD - Will PASS:
fontSize: Typography.h1.fontSize    // 24
fontSize: Typography.h2.fontSize    // 20
fontSize: Typography.body.fontSize  // 16
fontSize: Typography.caption.fontSize // 12
```

#### 2E. No Hardcoded Values
```typescript
// BAD - Will FAIL:
margin: 20
padding: 15
borderRadius: 8
width: 200

// GOOD - Will PASS:
margin: Spacing.md
padding: Spacing.sm
borderRadius: BorderRadius.md
width: Layout.cardWidth
```

### Failure Condition:
```typescript
if (rtlScore < 7.0 ||
    colorScore < 7.0 ||
    hardcodedFonts > 0 ||
    hardcodedSizes > 0 ||
    hardcodedValues > 0) {
  status = 'FAIL';
  reason = 'Component quality violations found';
}
```

---

## Rule 3: No Critical Issues (AI Detection)

### What It Checks:
- App crashes
- 404/error pages
- Broken buttons
- Missing content
- Visual bugs that break functionality

### Failure Condition:
```typescript
if (analysisResult.issues.some(issue => issue.severity === 'critical')) {
  status = 'FAIL';
  reason = `Critical issue found: ${issue.title}`;
}
```

### Example:
```
❌ FAILED: Critical issue detected
   - Error page displayed (404 Not Found)
   - Submit button not visible
   - App crashed on navigation
```

---

## Rule 4: Typography Consistency

### What It Checks:

All text must use Typography presets from `constants/theme.ts`:

```typescript
// Theme defines these levels:
Typography = {
  h1: { fontSize: 24, fontWeight: '700', fontFamily: 'Cairo-Bold' },
  h2: { fontSize: 20, fontWeight: '600', fontFamily: 'Cairo-SemiBold' },
  h3: { fontSize: 18, fontWeight: '600', fontFamily: 'Cairo-SemiBold' },
  body: { fontSize: 16, fontWeight: '400', fontFamily: 'Cairo-Regular' },
  caption: { fontSize: 12, fontWeight: '400', fontFamily: 'Cairo-Regular' },
}
```

### Violations to Detect:

```typescript
// BAD - Random sizes:
<Text style={{ fontSize: 22 }}>Title</Text>    // Should be h1 (24) or h2 (20)
<Text style={{ fontSize: 17 }}>Body</Text>     // Should be body (16) or h3 (18)
<Text style={{ fontSize: 13 }}>Caption</Text>  // Should be caption (12) or body (16)

// BAD - Random fonts:
<Text style={{ fontFamily: 'Roboto' }}>Text</Text>
<Text style={{ fontFamily: 'Arial' }}>Text</Text>

// BAD - Random weights:
<Text style={{ fontWeight: '500' }}>Text</Text>  // Not in theme!
<Text style={{ fontWeight: '800' }}>Text</Text>  // Not in theme!

// GOOD - Use presets:
<Text style={Typography.h1}>Title</Text>
<Text style={Typography.body}>Body text</Text>
<Text style={Typography.caption}>Small text</Text>
```

### Acceptable Typography:
- **5 font sizes only**: 24 (h1), 20 (h2), 18 (h3), 16 (body), 12 (caption)
- **3 font weights only**: 700 (bold), 600 (semi-bold), 400 (regular)
- **1 font family**: Cairo (with variants: Bold, SemiBold, Regular)

### Failure Condition:
```typescript
// Check for unauthorized font sizes
const allowedSizes = [24, 20, 18, 16, 12];
const usedSizes = extractFontSizes(component);
const invalidSizes = usedSizes.filter(s => !allowedSizes.includes(s));

if (invalidSizes.length > 0) {
  status = 'FAIL';
  reason = `Invalid font sizes found: ${invalidSizes.join(', ')}. Use Typography presets.`;
}

// Check for unauthorized font families
const allowedFonts = ['Cairo-Bold', 'Cairo-SemiBold', 'Cairo-Regular'];
const usedFonts = extractFontFamilies(component);
const invalidFonts = usedFonts.filter(f => !allowedFonts.includes(f));

if (invalidFonts.length > 0) {
  status = 'FAIL';
  reason = `Invalid font families found: ${invalidFonts.join(', ')}. Use Typography presets.`;
}
```

---

## Implementation: Code Quality Checker

### File: `dawati-tester/src/code-quality-checker.ts`

```typescript
export interface CodeQualityResult {
  // Rule 2A: RTL violations
  manualRTLOverrides: string[];     // marginLeft, paddingRight, etc.
  rtlScore: number;                 // 0-10

  // Rule 2B: Color violations
  hardcodedColors: string[];        // #FF5733, 'red', etc.
  colorScore: number;               // 0-10

  // Rule 2C & 2D: Typography violations
  hardcodedFontFamilies: string[];  // 'Roboto', 'Arial', etc.
  hardcodedFontSizes: number[];     // 17, 19, 21, etc. (not in theme)
  invalidFontWeights: string[];     // '500', '800', etc. (not in theme)
  typographyScore: number;          // 0-10

  // Rule 2E: General hardcoded values
  hardcodedSpacing: string[];       // margin: 20, padding: 15, etc.
  hardcodedBorderRadius: string[];  // borderRadius: 8, etc.

  // Overall
  overallScore: number;             // Average of all scores
  violations: number;               // Total count
  passed: boolean;                  // All scores >= 7.0
}

export async function analyzeComponentQuality(
  componentPath: string
): Promise<CodeQualityResult> {
  const code = fs.readFileSync(componentPath, 'utf-8');
  const lines = code.split('\n');

  const result: CodeQualityResult = {
    manualRTLOverrides: [],
    rtlScore: 10,
    hardcodedColors: [],
    colorScore: 10,
    hardcodedFontFamilies: [],
    hardcodedFontSizes: [],
    invalidFontWeights: [],
    typographyScore: 10,
    hardcodedSpacing: [],
    hardcodedBorderRadius: [],
    overallScore: 10,
    violations: 0,
    passed: true,
  };

  // Allowed typography values from theme
  const allowedFontSizes = [24, 20, 18, 16, 12];
  const allowedFontWeights = ['700', '600', '400'];
  const allowedFontFamilies = ['Cairo-Bold', 'Cairo-SemiBold', 'Cairo-Regular'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check RTL violations
    if (line.match(/(marginLeft|marginRight|paddingLeft|paddingRight|left|right):/)) {
      result.manualRTLOverrides.push(`Line ${lineNum}: ${line.trim()}`);
    }

    // Check hardcoded colors
    if (line.match(/(backgroundColor|color|borderColor):\s*['"]#[0-9A-Fa-f]{3,8}['"]/)) {
      result.hardcodedColors.push(`Line ${lineNum}: ${line.trim()}`);
    }

    // Check hardcoded font family
    const fontFamilyMatch = line.match(/fontFamily:\s*['"]([\w-]+)['"]/);
    if (fontFamilyMatch) {
      const family = fontFamilyMatch[1];
      if (!allowedFontFamilies.includes(family) &&
          !line.includes('Typography.')) {
        result.hardcodedFontFamilies.push(`Line ${lineNum}: ${family}`);
      }
    }

    // Check hardcoded font size
    const fontSizeMatch = line.match(/fontSize:\s*(\d+)/);
    if (fontSizeMatch) {
      const size = parseInt(fontSizeMatch[1]);
      if (!allowedFontSizes.includes(size) &&
          !line.includes('Typography.')) {
        result.hardcodedFontSizes.push(size);
      }
    }

    // Check hardcoded font weight
    const fontWeightMatch = line.match(/fontWeight:\s*['"](\d+)['"]/);
    if (fontWeightMatch) {
      const weight = fontWeightMatch[1];
      if (!allowedFontWeights.includes(weight) &&
          !line.includes('Typography.')) {
        result.invalidFontWeights.push(`Line ${lineNum}: ${weight}`);
      }
    }

    // Check hardcoded spacing
    if (line.match(/(margin|padding|gap):\s*\d+/) &&
        !line.includes('Spacing.')) {
      result.hardcodedSpacing.push(`Line ${lineNum}: ${line.trim()}`);
    }

    // Check hardcoded border radius
    if (line.match(/borderRadius:\s*\d+/) &&
        !line.includes('BorderRadius.')) {
      result.hardcodedBorderRadius.push(`Line ${lineNum}: ${line.trim()}`);
    }
  }

  // Calculate scores (deduct points per violation)
  result.rtlScore = Math.max(0, 10 - result.manualRTLOverrides.length);
  result.colorScore = Math.max(0, 10 - result.hardcodedColors.length);
  result.typographyScore = Math.max(0, 10 - (
    result.hardcodedFontFamilies.length +
    result.hardcodedFontSizes.length +
    result.invalidFontWeights.length
  ));

  result.violations =
    result.manualRTLOverrides.length +
    result.hardcodedColors.length +
    result.hardcodedFontFamilies.length +
    result.hardcodedFontSizes.length +
    result.invalidFontWeights.length +
    result.hardcodedSpacing.length +
    result.hardcodedBorderRadius.length;

  result.overallScore = (
    result.rtlScore +
    result.colorScore +
    result.typographyScore
  ) / 3;

  result.passed =
    result.rtlScore >= 7.0 &&
    result.colorScore >= 7.0 &&
    result.typographyScore >= 7.0;

  return result;
}
```

---

## Final Test Logic

### File: `dawati-tester/src/test-orchestrator.ts` (around line 225)

```typescript
// Apply the 4 RULES

// RULE 1: Checklist must be 100% (P0 items)
if (checklistScore && checklistScore.requiredScore < 100) {
  decision.state = 'FAIL';
  decision.reasoning += `\n❌ RULE 1 FAILED: Checklist P0 not complete: ${checklistScore.requiredScore}% (need 100%)`;
  decision.reasoning += `\n   Missing ${checklistScore.requiredItems - checklistScore.passingItems} critical tests`;
}

// RULE 2: Component quality (RTL, Color, Typography)
if (codeQuality) {
  if (codeQuality.rtlScore < 7.0) {
    decision.state = 'FAIL';
    decision.reasoning += `\n❌ RULE 2A FAILED: RTL Score too low: ${codeQuality.rtlScore}/10 (need >= 7.0)`;
    decision.reasoning += `\n   Found ${codeQuality.manualRTLOverrides.length} RTL violations`;
  }

  if (codeQuality.colorScore < 7.0) {
    decision.state = 'FAIL';
    decision.reasoning += `\n❌ RULE 2B FAILED: Color Score too low: ${codeQuality.colorScore}/10 (need >= 7.0)`;
    decision.reasoning += `\n   Found ${codeQuality.hardcodedColors.length} hardcoded colors`;
  }

  if (codeQuality.typographyScore < 7.0) {
    decision.state = 'FAIL';
    decision.reasoning += `\n❌ RULE 2C/2D FAILED: Typography Score too low: ${codeQuality.typographyScore}/10`;
    decision.reasoning += `\n   Found ${codeQuality.hardcodedFontSizes.length} invalid font sizes`;
    decision.reasoning += `\n   Found ${codeQuality.hardcodedFontFamilies.length} invalid font families`;
  }
}

// RULE 3: No critical issues (already handled by AI)
// Existing code checks for critical issues

// RULE 4: Typography consistency (included in Rule 2C/2D above)

const status =
  decision.state === 'PASS' ? 'passed' :
  decision.state === 'FAIL' ? 'failed' : 'unknown';
```

---

## Test Output Example

### FAIL Example:
```
═══════════════════════════════════════════════════════
                    🎯 TEST SCORES
═══════════════════════════════════════════════════════

  ❌ Score 1: RTL Score              6.5/10
  ✅ Score 2: AI Score (Gemini)      9.5/10
  ❌ Score 3: Checklist Coverage     67% (P0: 67%)
  ❌ Score 4: Code Quality           4.2/10
           - RTL violations:        8
           - Hardcoded colors:      23
           - Invalid font sizes:    15 (19, 17, 21, 13...)
           - Invalid font families: 3 (Roboto, Arial, Helvetica)

═══════════════════════════════════════════════════════

❌ TEST FAILED - 4 Rules Violated:

RULE 1: ❌ Checklist P0: 67% (need 100%)
  Missing 15 critical tests

RULE 2A: ❌ RTL Score: 6.5/10 (need >= 7.0)
  - Line 45: marginLeft: 20
  - Line 67: paddingRight: 15
  ... 6 more violations

RULE 2B: ❌ Color Score: 3.2/10 (need >= 7.0)
  - Line 23: backgroundColor: '#FF5733'
  - Line 89: color: '#000000'
  ... 21 more violations

RULE 2C/2D: ❌ Typography Score: 2.8/10 (need >= 7.0)
  - Line 34: fontSize: 19 (not in theme, use Typography.h2: 20)
  - Line 56: fontSize: 17 (not in theme, use Typography.body: 16)
  - Line 78: fontFamily: 'Roboto' (use Typography presets)
  ... 12 more violations

RULE 3: ✅ No critical issues

═══════════════════════════════════════════════════════
```

### PASS Example (After Fixes):
```
═══════════════════════════════════════════════════════
                    🎯 TEST SCORES
═══════════════════════════════════════════════════════

  ✅ Score 1: RTL Score              9.8/10
  ✅ Score 2: AI Score (Gemini)      9.5/10
  ✅ Score 3: Checklist Coverage     100% (P0: 100%)
  ✅ Score 4: Code Quality           9.6/10

═══════════════════════════════════════════════════════

✅ TEST PASSED - All 4 Rules Satisfied:

RULE 1: ✅ Checklist P0: 100% (45/45 tests passing)
RULE 2A: ✅ RTL Score: 9.8/10 (all marginStart/End)
RULE 2B: ✅ Color Score: 9.2/10 (all from theme)
RULE 2C/2D: ✅ Typography Score: 9.6/10 (all from presets)
RULE 3: ✅ No critical issues
RULE 4: ✅ Typography consistent (5 sizes, 1 font family)

═══════════════════════════════════════════════════════
```

---

## Summary

**ALL 4 RULES MUST PASS FOR TEST TO PASS:**

1. ✅ Checklist P0 = 100%
2. ✅ RTL + Color + Typography >= 7.0 (no hardcoded values)
3. ✅ No critical issues
4. ✅ Font type & size from theme (5 sizes, 1 family only)

**FAIL if ANY rule fails!** 🎯
