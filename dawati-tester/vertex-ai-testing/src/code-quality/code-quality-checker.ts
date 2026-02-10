/**
 * Code Quality Checker for Dawati App
 *
 * Scans actual component SOURCE CODE for violations:
 * - Hardcoded colors (should use theme tokens)
 * - Hardcoded text (should use i18n t() function)
 * - Hardcoded spacing (should use Spacing tokens)
 * - Manual RTL overrides (marginLeft/Right instead of Start/End)
 * - Inline styles that should be in StyleSheet
 *
 * Integrated into test runner as Score 4: Code Quality
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CodeViolation {
  file: string;
  line: number;
  category: 'color' | 'text' | 'spacing' | 'rtl' | 'shadow' | 'icon-size';
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
  message: string;
  suggestion: string;
}

export interface CodeQualityResult {
  score: number; // 0-10
  totalViolations: number;
  violations: CodeViolation[];
  breakdown: {
    colors: { count: number; score: number };
    text: { count: number; score: number };
    spacing: { count: number; score: number };
    rtl: { count: number; score: number };
    shadows: { count: number; score: number };
    iconSizes: { count: number; score: number };
  };
  filesAnalyzed: number;
  summary: string;
}

export class CodeQualityChecker {
  private appRoot: string;
  private violations: CodeViolation[] = [];

  constructor(appRoot: string) {
    this.appRoot = appRoot;
  }

  /**
   * Analyze a specific component file for code quality violations
   */
  async analyzeFile(filePath: string): Promise<CodeViolation[]> {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const lines = code.split('\n');
    const fileViolations: CodeViolation[] = [];
    const relPath = path.relative(this.appRoot, filePath);

    // Skip node_modules, test files, config files
    if (relPath.includes('node_modules') || relPath.includes('.test.') || relPath.includes('.config.')) {
      return [];
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      // Skip comments and imports
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ')) {
        continue;
      }

      // CHECK 1: Hardcoded hex colors in styles
      this.checkHardcodedColors(relPath, lineNum, trimmed, fileViolations);

      // CHECK 2: Hardcoded text (English/Arabic not using t())
      this.checkHardcodedText(relPath, lineNum, trimmed, line, fileViolations);

      // CHECK 3: Hardcoded spacing values
      this.checkHardcodedSpacing(relPath, lineNum, trimmed, fileViolations);

      // CHECK 4: Manual RTL overrides (Left/Right instead of Start/End)
      this.checkRTLOverrides(relPath, lineNum, trimmed, fileViolations);

      // CHECK 5: Hardcoded shadows (should use Shadows.sm/md/lg)
      this.checkHardcodedShadows(relPath, lineNum, trimmed, fileViolations);

      // CHECK 6: Inconsistent icon sizes
      this.checkIconSizes(relPath, lineNum, trimmed, fileViolations);
    }

    return fileViolations;
  }

  /**
   * Analyze a page by URL path (e.g., /account/security → app/account/security.tsx)
   */
  async analyzePageByUrl(urlPath: string): Promise<CodeQualityResult> {
    this.violations = [];

    // Convert URL to file path
    const cleanPath = urlPath.replace(/^\//, '').replace(/\//g, path.sep);
    const possibleFiles = [
      path.join(this.appRoot, 'app', cleanPath + '.tsx'),
      path.join(this.appRoot, 'app', cleanPath, 'index.tsx'),
      path.join(this.appRoot, 'app', cleanPath + '.ts'),
    ];

    let filesAnalyzed = 0;

    for (const filePath of possibleFiles) {
      if (fs.existsSync(filePath)) {
        const fileViolations = await this.analyzeFile(filePath);
        this.violations.push(...fileViolations);
        filesAnalyzed++;
      }
    }

    return this.buildResult(filesAnalyzed);
  }

  /**
   * Analyze multiple files (e.g., all files in a directory)
   */
  async analyzeDirectory(dirPath: string): Promise<CodeQualityResult> {
    this.violations = [];
    let filesAnalyzed = 0;

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, hidden dirs
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDir(fullPath);
          }
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          // Skip test files and configs
          if (!entry.name.includes('.test.') && !entry.name.includes('.config.')) {
            filesAnalyzed++;
          }
        }
      }
    };

    scanDir(dirPath);

    // Analyze .tsx files only (components)
    const tsxFiles = this.findTsxFiles(dirPath);
    for (const file of tsxFiles) {
      const fileViolations = await this.analyzeFile(file);
      this.violations.push(...fileViolations);
    }

    return this.buildResult(tsxFiles.length);
  }

  // ─── CHECK METHODS ─────────────────────────────────────────────

  private checkHardcodedColors(file: string, line: number, code: string, violations: CodeViolation[]) {
    // Match: backgroundColor: '#FF5733', color: 'red', borderColor: '#000'
    // But NOT: Colors.primary, colors.text, etc.
    const hexPattern = /(backgroundColor|color|borderColor|shadowColor):\s*['"]#[0-9A-Fa-f]{3,8}['"]/;
    const namedColorPattern = /(backgroundColor|color|borderColor):\s*['"](red|blue|green|yellow|orange|purple|pink|gray|grey|white|black)['"]/;

    if (hexPattern.test(code)) {
      violations.push({
        file, line, category: 'color', severity: 'high',
        code: code.trim(),
        message: 'Hardcoded hex color found',
        suggestion: 'Use theme token: colors.primary, Colors.success, etc.',
      });
    }

    if (namedColorPattern.test(code)) {
      violations.push({
        file, line, category: 'color', severity: 'high',
        code: code.trim(),
        message: 'Hardcoded named color found',
        suggestion: 'Use theme token from constants/theme.ts',
      });
    }
  }

  private checkHardcodedText(file: string, line: number, trimmed: string, raw: string, violations: CodeViolation[]) {
    // Match: <Text>Submit</Text> or <Text>إرسال</Text>
    // But NOT: <Text>{t('key')}</Text> or <Text>{variable}</Text>

    // English text in JSX
    const englishTextPattern = />\s*([A-Z][a-z]{2,}(?:\s[A-Za-z]+)*)\s*</;
    // Arabic text in JSX
    const arabicTextPattern = />\s*([\u0600-\u06FF][\u0600-\u06FF\s]{2,})\s*</;

    // Skip if line contains t( or variable interpolation
    if (trimmed.includes('{t(') || trimmed.includes('{`') || trimmed.includes('${')) {
      return;
    }

    // Skip style definitions, comments
    if (trimmed.includes('style=') || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      return;
    }

    const engMatch = raw.match(englishTextPattern);
    if (engMatch) {
      // Skip known exceptions (single letters, component names)
      const text = engMatch[1];
      if (text.length > 3 && !['View', 'Text', 'ScrollView', 'Pressable', 'Switch'].includes(text)) {
        violations.push({
          file, line, category: 'text', severity: 'critical',
          code: trimmed,
          message: `Hardcoded English text: "${text}"`,
          suggestion: `Use i18n: {t('key')} instead of "${text}"`,
        });
      }
    }

    const arMatch = raw.match(arabicTextPattern);
    if (arMatch) {
      violations.push({
        file, line, category: 'text', severity: 'critical',
        code: trimmed,
        message: `Hardcoded Arabic text: "${arMatch[1]}"`,
        suggestion: `Use i18n: {t('key')} instead of hardcoded Arabic`,
      });
    }
  }

  private checkHardcodedSpacing(file: string, line: number, code: string, violations: CodeViolation[]) {
    // Match: margin: 20, padding: 15, gap: 10
    // But NOT: Spacing.md, margin: Spacing.lg
    // Only in StyleSheet definitions (not JSX)
    const spacingPattern = /(margin|padding|gap|marginTop|marginBottom|marginVertical|marginHorizontal|paddingTop|paddingBottom|paddingVertical|paddingHorizontal):\s*(\d+)\s*[,}]/;

    if (code.includes('Spacing.') || code.includes('spacing.')) {
      return; // Already using tokens
    }

    const match = code.match(spacingPattern);
    if (match) {
      const value = parseInt(match[2]);
      // Skip 0, 1, 2 (too small to matter) and common flex values
      if (value > 2) {
        // Find closest Spacing token
        const spacingMap: Record<number, string> = {
          4: 'Spacing.xs', 8: 'Spacing.sm', 16: 'Spacing.md',
          24: 'Spacing.lg', 32: 'Spacing.xl', 48: 'Spacing.xxl', 64: 'Spacing.xxxl',
        };
        const suggestion = spacingMap[value] || `Spacing token (closest: ${this.findClosestSpacing(value)})`;

        violations.push({
          file, line, category: 'spacing', severity: 'medium',
          code: code.trim(),
          message: `Hardcoded spacing: ${match[1]}: ${value}`,
          suggestion: `Use ${suggestion}`,
        });
      }
    }
  }

  private checkRTLOverrides(file: string, line: number, code: string, violations: CodeViolation[]) {
    // Match: marginLeft, marginRight, paddingLeft, paddingRight
    // But NOT: marginStart, marginEnd, paddingStart, paddingEnd
    const rtlPattern = /(marginLeft|marginRight|paddingLeft|paddingRight)\s*:/;

    if (rtlPattern.test(code)) {
      const match = code.match(rtlPattern)!;
      const prop = match[1];
      const replacement = prop
        .replace('Left', 'Start')
        .replace('Right', 'End');

      violations.push({
        file, line, category: 'rtl', severity: 'high',
        code: code.trim(),
        message: `Manual RTL override: ${prop}`,
        suggestion: `Use ${replacement} instead for automatic RTL support`,
      });
    }
  }

  private checkHardcodedShadows(file: string, line: number, code: string, violations: CodeViolation[]) {
    // Match: shadowColor: '#000', shadowOffset: { ... }
    // But NOT: ...Shadows.sm, ...Shadows.md
    if (code.includes('Shadows.') || code.includes('shadows.')) {
      return;
    }

    if (/shadowColor:\s*['"]/.test(code) || /shadowOffset:\s*\{/.test(code)) {
      violations.push({
        file, line, category: 'shadow', severity: 'low',
        code: code.trim(),
        message: 'Hardcoded shadow value',
        suggestion: 'Use theme token: ...Shadows.sm, ...Shadows.md, or ...Shadows.lg',
      });
    }
  }

  private checkIconSizes(file: string, line: number, code: string, violations: CodeViolation[]) {
    // Check for non-standard icon sizes (standard: 16, 20, 24, 32)
    const iconSizePattern = /size=\{(\d+)\}/;
    const match = code.match(iconSizePattern);

    if (match) {
      const size = parseInt(match[1]);
      const standardSizes = [12, 16, 20, 24, 28, 32, 48];
      if (!standardSizes.includes(size)) {
        violations.push({
          file, line, category: 'icon-size', severity: 'low',
          code: code.trim(),
          message: `Non-standard icon size: ${size}`,
          suggestion: `Use standard size: ${this.findClosestIconSize(size)} (standard: 16, 20, 24, 32)`,
        });
      }
    }
  }

  // ─── HELPERS ───────────────────────────────────────────────────

  private findClosestSpacing(value: number): string {
    const spacings = [
      { val: 4, name: 'Spacing.xs' },
      { val: 8, name: 'Spacing.sm' },
      { val: 16, name: 'Spacing.md' },
      { val: 24, name: 'Spacing.lg' },
      { val: 32, name: 'Spacing.xl' },
      { val: 48, name: 'Spacing.xxl' },
      { val: 64, name: 'Spacing.xxxl' },
    ];

    let closest = spacings[0];
    let minDiff = Math.abs(value - spacings[0].val);

    for (const s of spacings) {
      const diff = Math.abs(value - s.val);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }

    return closest.name;
  }

  private findClosestIconSize(value: number): number {
    const sizes = [12, 16, 20, 24, 28, 32, 48];
    let closest = sizes[0];
    let minDiff = Math.abs(value - sizes[0]);

    for (const s of sizes) {
      const diff = Math.abs(value - s);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }

    return closest;
  }

  private findTsxFiles(dir: string): string[] {
    const files: string[] = [];

    const scan = (d: string) => {
      if (!fs.existsSync(d)) return;
      const entries = fs.readdirSync(d, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scan(fullPath);
          }
        } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  private buildResult(filesAnalyzed: number): CodeQualityResult {
    const colorViolations = this.violations.filter(v => v.category === 'color');
    const textViolations = this.violations.filter(v => v.category === 'text');
    const spacingViolations = this.violations.filter(v => v.category === 'spacing');
    const rtlViolations = this.violations.filter(v => v.category === 'rtl');
    const shadowViolations = this.violations.filter(v => v.category === 'shadow');
    const iconViolations = this.violations.filter(v => v.category === 'icon-size');

    // Calculate category scores (10 = no violations, deduct based on count)
    const categoryScore = (count: number, weight: number): number => {
      return Math.max(0, 10 - Math.floor(count * weight));
    };

    // Deduction weights: lower = more lenient per violation
    // Real-world apps often have many minor violations; weights should reflect severity
    const breakdown = {
      colors: { count: colorViolations.length, score: categoryScore(colorViolations.length, 0.3) },
      text: { count: textViolations.length, score: categoryScore(textViolations.length, 0.4) },
      spacing: { count: spacingViolations.length, score: categoryScore(spacingViolations.length, 0.1) },
      rtl: { count: rtlViolations.length, score: categoryScore(rtlViolations.length, 0.5) },
      shadows: { count: shadowViolations.length, score: categoryScore(shadowViolations.length, 0.15) },
      iconSizes: { count: iconViolations.length, score: categoryScore(iconViolations.length, 0.15) },
    };

    // Overall score: weighted average (critical categories weight more)
    const weights = { colors: 3, text: 3, spacing: 1, rtl: 2, shadows: 0.5, iconSizes: 0.5 };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedSum =
      breakdown.colors.score * weights.colors +
      breakdown.text.score * weights.text +
      breakdown.spacing.score * weights.spacing +
      breakdown.rtl.score * weights.rtl +
      breakdown.shadows.score * weights.shadows +
      breakdown.iconSizes.score * weights.iconSizes;

    const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;

    // Generate summary
    const criticalCount = this.violations.filter(v => v.severity === 'critical').length;
    const highCount = this.violations.filter(v => v.severity === 'high').length;

    let summary: string;
    if (overallScore >= 9) {
      summary = 'Excellent code quality - minimal violations';
    } else if (overallScore >= 7) {
      summary = `Good code quality - ${this.violations.length} minor issues`;
    } else if (overallScore >= 5) {
      summary = `Code quality needs work - ${criticalCount} critical, ${highCount} high violations`;
    } else {
      summary = `Poor code quality - ${this.violations.length} violations (${criticalCount} critical)`;
    }

    return {
      score: overallScore,
      totalViolations: this.violations.length,
      violations: this.violations,
      breakdown,
      filesAnalyzed,
      summary,
    };
  }
}
