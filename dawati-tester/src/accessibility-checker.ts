import { Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { AccessibilityResult, AccessibilityViolation } from './types';
import { getCurrentDevice } from './device-manager';
import { createChildLogger } from './logger';

export class AccessibilityChecker {
  private log = createChildLogger('accessibility');
  private accessibilityResults: AccessibilityResult[] = [];
  private impactLevels: string[];

  constructor(levels: string[] = ['critical', 'serious', 'moderate']) {
    this.impactLevels = levels;
  }

  public async runCheck(
    page: Page,
    pageName: string
  ): Promise<AccessibilityResult> {
    const device = getCurrentDevice();

    this.log.info({ page: pageName, device }, 'Running accessibility check');

    try {
      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Filter violations by impact level
      const filteredViolations = axeResults.violations.filter((v) =>
        this.impactLevels.includes(v.impact || 'minor')
      );

      const violations: AccessibilityViolation[] = filteredViolations.map((v) => ({
        id: v.id,
        impact: v.impact as AccessibilityViolation['impact'],
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target as string[],
        })),
      }));

      const result: AccessibilityResult = {
        page: pageName,
        device,
        violations,
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete.length,
        timestamp: new Date(),
      };

      this.accessibilityResults.push(result);

      if (violations.length > 0) {
        this.log.warn(
          { page: pageName, violations: violations.length },
          'Accessibility violations found'
        );
      } else {
        this.log.info({ page: pageName, passes: result.passes }, 'Accessibility check passed');
      }

      return result;
    } catch (error) {
      this.log.error({ page: pageName, error }, 'Accessibility check failed');

      const emptyResult: AccessibilityResult = {
        page: pageName,
        device,
        violations: [],
        passes: 0,
        incomplete: 0,
        timestamp: new Date(),
      };

      this.accessibilityResults.push(emptyResult);
      return emptyResult;
    }
  }

  public getResults(): AccessibilityResult[] {
    return this.accessibilityResults;
  }

  public getAllViolations(): AccessibilityViolation[] {
    const allViolations: AccessibilityViolation[] = [];
    for (const result of this.accessibilityResults) {
      allViolations.push(...result.violations);
    }
    return allViolations;
  }

  public getViolationSummary(): Record<string, number> {
    const summary: Record<string, number> = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      total: 0,
    };

    for (const result of this.accessibilityResults) {
      for (const violation of result.violations) {
        summary[violation.impact]++;
        summary.total++;
      }
    }

    return summary;
  }

  public clearResults(): void {
    this.accessibilityResults = [];
  }

  public static formatViolationsForAI(violations: AccessibilityViolation[]): string {
    if (violations.length === 0) {
      return 'No accessibility violations detected.';
    }

    const formatted = violations.map((v) => {
      const nodeTargets = v.nodes.map((n) => n.target.join(' > ')).join('; ');
      return `- [${v.impact.toUpperCase()}] ${v.id}: ${v.help} (Affected: ${nodeTargets})`;
    });

    return `Accessibility violations found:\n${formatted.join('\n')}`;
  }
}
