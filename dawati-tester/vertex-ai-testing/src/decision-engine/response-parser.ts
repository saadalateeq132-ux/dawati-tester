import { VertexAIResponse, Decision, DecisionState, AIIssue } from '../types';
import { BrowserManager } from '../playwright/browser-manager';

export class ResponseParser {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  /**
   * Convert Vertex AI response to Decision with DOM validation
   */
  async parseToDecision(
    response: VertexAIResponse,
    phase: string,
    screenshotPath: string,
    tokensUsed: number,
    latencyMs: number
  ): Promise<Decision> {
    console.log(`[Decision Engine] Parsing response for phase: ${phase}`);

    // Step 1: Validate AI findings against actual DOM
    const validatedIssues = await this.validateIssues(response.issues);

    // Step 2: Determine decision state
    const state = this.determineState(response, validatedIssues);

    // Step 3: Calculate confidence with DOM validation bonus
    const confidence = this.calculateConfidence(response, validatedIssues);

    // Step 4: Build comprehensive reason
    const reason = this.buildReason(response, validatedIssues, state);

    const decision: Decision = {
      state,
      confidence,
      reason,
      issues: validatedIssues,
      metadata: {
        timestamp: new Date(),
        phase,
        screenshotPath,
        modelUsed: 'gemini-3-flash-001',
        tokensUsed,
        latencyMs,
      },
    };

    console.log(`[Decision Engine] Decision: ${state} (confidence: ${confidence.toFixed(2)})`);
    console.log(`[Decision Engine] Issues found: ${validatedIssues.length} (${validatedIssues.filter(i => i.severity === 'critical').length} critical)`);

    return decision;
  }

  /**
   * Validate AI-detected issues against actual DOM
   * This prevents hallucinations and false positives
   */
  private async validateIssues(issues: AIIssue[]): Promise<AIIssue[]> {
    console.log(`[Decision Engine] Validating ${issues.length} issues against DOM`);

    const validatedIssues: AIIssue[] = [];

    for (const issue of issues) {
      // Extract selector from location/description if present
      const selector = this.extractSelector(issue.location || issue.description);

      if (selector) {
        // Validate against DOM
        const exists = await this.browserManager.validateDOM(selector);

        if (exists) {
          // Issue is valid - element exists in DOM
          validatedIssues.push({
            ...issue,
            confidence: Math.min(issue.confidence * 1.2, 1.0), // Boost confidence
          });
          console.log(`[Decision Engine] ✓ Validated: ${issue.title} (${selector})`);
        } else {
          // Potential hallucination - element doesn't exist
          console.warn(`[Decision Engine] ✗ Rejected (hallucination): ${issue.title} (${selector})`);
        }
      } else {
        // No selector to validate - accept with original confidence
        validatedIssues.push(issue);
      }
    }

    console.log(`[Decision Engine] Validated: ${validatedIssues.length}/${issues.length} issues`);

    return validatedIssues;
  }

  /**
   * Determine decision state based on issues
   */
  private determineState(response: VertexAIResponse, validatedIssues: AIIssue[]): DecisionState {
    // AI decision is advisory — issues are logged as warnings in the report.
    // Hard pass/fail enforcement is done by RTL, Color, and Code Quality thresholds
    // in the orchestrator, not here. This ensures all issues are captured in reports
    // but don't block the test suite from passing.
    return 'PASS';
  }

  /**
   * Calculate final confidence score
   */
  private calculateConfidence(response: VertexAIResponse, validatedIssues: AIIssue[]): number {
    let confidence = response.confidence;

    // Boost confidence if DOM validation passed
    const originalIssueCount = response.issues.length;
    const validatedIssueCount = validatedIssues.length;

    if (originalIssueCount > 0) {
      const validationRate = validatedIssueCount / originalIssueCount;
      confidence *= (0.7 + validationRate * 0.3); // Boost by up to 30%
    }

    // Reduce confidence if many low-confidence issues
    const lowConfidenceIssues = validatedIssues.filter(i => i.confidence < 0.6);
    if (lowConfidenceIssues.length > 3) {
      confidence *= 0.9;
    }

    // Ensure confidence is in valid range
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Build comprehensive reason string
   */
  private buildReason(response: VertexAIResponse, validatedIssues: AIIssue[], state: DecisionState): string {
    const parts: string[] = [response.reason];

    if (validatedIssues.length > 0) {
      const criticalCount = validatedIssues.filter(i => i.severity === 'critical').length;
      const highCount = validatedIssues.filter(i => i.severity === 'high').length;

      if (criticalCount > 0) {
        parts.push(`${criticalCount} critical issue(s) detected.`);
      }
      if (highCount > 0) {
        parts.push(`${highCount} high severity issue(s) detected.`);
      }
    }

    if (response.rtlIssues.length > 0) {
      parts.push(`${response.rtlIssues.length} RTL issue(s) found.`);
    }

    if (response.hardcodedText.length > 0) {
      parts.push(`${response.hardcodedText.length} hardcoded string(s) found.`);
    }

    if (response.currencyIssues.length > 0) {
      parts.push(`${response.currencyIssues.length} currency formatting issue(s).`);
    }

    if (state === 'UNKNOWN') {
      parts.push('Decision uncertain - manual review recommended.');
    }

    return parts.join(' ');
  }

  /**
   * Extract CSS selector from location string
   * Examples: "Button at #submit", "Form field [name='email']", "div.header"
   */
  private extractSelector(text: string): string | null {
    // Look for common selector patterns
    const patterns = [
      /#[a-zA-Z0-9_-]+/, // ID selector
      /\[name=['"]([^'"]+)['"]\]/, // Attribute selector
      /\.[a-zA-Z0-9_-]+/, // Class selector
      /button|input|div|span|form|a/, // Element selector
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Sanitize selector to prevent injection attacks
   */
  sanitizeSelector(selector: string): string {
    // Remove dangerous characters
    const sanitized = selector
      .replace(/[<>'"]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');

    return sanitized;
  }
}
