import { Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { AccessibilityResult, AccessibilityViolation } from './types';
import { getCurrentDevice } from './device-manager';
import { createChildLogger } from './logger';

const log = createChildLogger('accessibility');

let accessibilityResults: AccessibilityResult[] = [];
let impactLevels: string[] = ['critical', 'serious', 'moderate'];

export function initAccessibility(levels: string[] = ['critical', 'serious', 'moderate']): void {
  accessibilityResults = [];
  impactLevels = levels;
}

export async function runAccessibilityCheck(
  page: Page,
  pageName: string
): Promise<AccessibilityResult> {
  const device = getCurrentDevice();

  log.info({ page: pageName, device }, 'Running accessibility check');

  try {
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filter violations by impact level
    const filteredViolations = axeResults.violations.filter((v) =>
      impactLevels.includes(v.impact || 'minor')
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

    accessibilityResults.push(result);

    if (violations.length > 0) {
      log.warn(
        { page: pageName, violations: violations.length },
        'Accessibility violations found'
      );
    } else {
      log.info({ page: pageName, passes: result.passes }, 'Accessibility check passed');
    }

    return result;
  } catch (error) {
    log.error({ page: pageName, error }, 'Accessibility check failed');

    const emptyResult: AccessibilityResult = {
      page: pageName,
      device,
      violations: [],
      passes: 0,
      incomplete: 0,
      timestamp: new Date(),
    };

    accessibilityResults.push(emptyResult);
    return emptyResult;
  }
}

export function getAccessibilityResults(): AccessibilityResult[] {
  return accessibilityResults;
}

export function getAllViolations(): AccessibilityViolation[] {
  const allViolations: AccessibilityViolation[] = [];
  for (const result of accessibilityResults) {
    allViolations.push(...result.violations);
  }
  return allViolations;
}

export function getViolationSummary(): Record<string, number> {
  const summary: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    total: 0,
  };

  for (const result of accessibilityResults) {
    for (const violation of result.violations) {
      summary[violation.impact]++;
      summary.total++;
    }
  }

  return summary;
}

export function formatViolationsForAI(violations: AccessibilityViolation[]): string {
  if (violations.length === 0) {
    return 'No accessibility violations detected.';
  }

  const formatted = violations.map((v) => {
    const nodeTargets = v.nodes.map((n) => n.target.join(' > ')).join('; ');
    return `- [${v.impact.toUpperCase()}] ${v.id}: ${v.help} (Affected: ${nodeTargets})`;
  });

  return `Accessibility violations found:\n${formatted.join('\n')}`;
}

export function clearAccessibilityResults(): void {
  accessibilityResults = [];
}
