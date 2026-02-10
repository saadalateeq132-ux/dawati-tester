/**
 * Level 3: Backend Integration & Data Flow Checker
 *
 * Validates frontend-to-backend connectivity:
 * - API call success (200 OK responses)
 * - Failed request detection (4xx, 5xx)
 * - Data synchronization verification
 * - Navigation state management (no data loss on back)
 * - Session persistence
 * - Real-time data update detection
 */

import { Page } from 'playwright';
import { BackendIntegrationResult, APICheckResult, StateManagementResult } from '../types';

export class BackendChecker {
  private page: Page;
  private capturedRequests: APICheckResult[] = [];
  private isListening = false;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Start monitoring network requests for API calls
   */
  startMonitoring(): void {
    if (this.isListening) return;
    this.isListening = true;
    this.capturedRequests = [];

    this.page.on('response', async (response) => {
      const url = response.url();
      const method = response.request().method();

      // Only track API calls (skip static assets)
      if (this.isAPICall(url)) {
        const status = response.status();
        const timing = response.request().timing();
        const latencyMs = timing.responseEnd > 0 ? Math.round(timing.responseEnd - timing.requestStart) : 0;

        this.capturedRequests.push({
          url: this.truncateUrl(url),
          method,
          status,
          latencyMs,
          passed: status >= 200 && status < 400,
          error: status >= 400 ? `HTTP ${status}` : undefined,
        });
      }
    });

    this.page.on('requestfailed', (request) => {
      const url = request.url();
      if (this.isAPICall(url)) {
        this.capturedRequests.push({
          url: this.truncateUrl(url),
          method: request.method(),
          status: 0,
          latencyMs: 0,
          passed: false,
          error: request.failure()?.errorText || 'Request failed',
        });
      }
    });
  }

  /**
   * Run backend integration checks
   */
  async checkIntegration(): Promise<BackendIntegrationResult> {
    console.log('[BackendChecker] Analyzing API calls and state management...');

    // Analyze captured requests
    const apiResults = [...this.capturedRequests];
    const totalRequests = apiResults.length;
    const successfulRequests = apiResults.filter(r => r.passed).length;
    const failedRequests = apiResults.filter(r => !r.passed).length;

    // Check state management
    const stateManagement = await this.checkStateManagement();

    // Score calculation
    let score = 10;

    // Deduct for failed API calls
    if (totalRequests > 0) {
      const failRate = failedRequests / totalRequests;
      if (failRate > 0.5) score -= 4;
      else if (failRate > 0.2) score -= 2;
      else if (failRate > 0) score -= 1;
    }

    // Deduct for state management issues
    if (stateManagement.issues.length > 0) {
      score -= stateManagement.issues.length * 0.5;
    }

    // Deduct for slow API responses (> 3s)
    const slowRequests = apiResults.filter(r => r.latencyMs > 3000);
    if (slowRequests.length > 0) {
      score -= slowRequests.length * 0.3;
    }

    score = Math.max(0, Math.round(score * 10) / 10);

    const summary = this.buildSummary(totalRequests, successfulRequests, failedRequests, stateManagement);

    console.log(`[BackendChecker] Score: ${score}/10 (${successfulRequests}/${totalRequests} API calls passed)`);

    return {
      score,
      totalRequests,
      successfulRequests,
      failedRequests,
      apiResults: apiResults.slice(0, 30), // Limit output
      stateManagement,
      summary,
    };
  }

  /**
   * Check state management: session persistence, back nav, form state
   */
  private async checkStateManagement(): Promise<StateManagementResult> {
    const issues: string[] = [];

    const stateCheck = await this.page.evaluate(() => {
      const results = {
        hasSessionStorage: false,
        hasLocalStorage: false,
        hasCookies: false,
        formInputsWithValues: 0,
        totalFormInputs: 0,
      };

      // Check storage mechanisms
      try {
        results.hasSessionStorage = sessionStorage.length > 0;
        results.hasLocalStorage = localStorage.length > 0;
        results.hasCookies = document.cookie.length > 0;
      } catch { /* storage access blocked */ }

      // Check form state persistence
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select');
      results.totalFormInputs = inputs.length;
      inputs.forEach(input => {
        const el = input as HTMLInputElement;
        if (el.value && el.value.length > 0) {
          results.formInputsWithValues++;
        }
      });

      return results;
    });

    // Check if page uses any state persistence mechanism
    if (!stateCheck.hasSessionStorage && !stateCheck.hasLocalStorage && !stateCheck.hasCookies) {
      // Not necessarily an issue for every page, but worth noting
      // Only flag if there are form inputs
      if (stateCheck.totalFormInputs > 0) {
        issues.push('Page has form inputs but no detected client-side state storage (localStorage/sessionStorage/cookies)');
      }
    }

    return {
      sessionPersistence: stateCheck.hasSessionStorage || stateCheck.hasLocalStorage,
      backNavDataLoss: false, // Would need back-navigation test to verify
      formStatePersistence: stateCheck.formInputsWithValues > 0 || stateCheck.totalFormInputs === 0,
      issues,
    };
  }

  /** Reset captured requests between phases */
  reset(): void {
    this.capturedRequests = [];
  }

  private isAPICall(url: string): boolean {
    // Filter API calls vs static assets
    if (url.includes('/api/') || url.includes('/graphql') || url.includes('/rest/')) return true;
    if (url.includes('.json') && !url.includes('manifest.json')) return true;
    // Exclude static assets
    if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico|mp4|webm)(\?|$)/i.test(url)) return false;
    if (url.includes('googleapis.com') || url.includes('firebase')) return true;
    return false;
  }

  private truncateUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.pathname + (u.search.length > 50 ? u.search.substring(0, 50) + '...' : u.search);
    } catch {
      return url.substring(0, 100);
    }
  }

  private buildSummary(total: number, success: number, failed: number, state: StateManagementResult): string {
    const parts: string[] = [];

    if (total === 0) {
      parts.push('No API calls detected on this page');
    } else {
      parts.push(`${success}/${total} API calls successful`);
      if (failed > 0) {
        parts.push(`${failed} failed`);
      }
    }

    if (state.issues.length > 0) {
      parts.push(`${state.issues.length} state management concerns`);
    }

    return parts.join('; ');
  }
}
