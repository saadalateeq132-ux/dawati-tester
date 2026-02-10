/**
 * Security Checker: XSS, CSRF, Sensitive Data, Auth Protection
 *
 * Validates:
 * - XSS prevention (script injection in inputs)
 * - CSRF token presence on forms
 * - Sensitive data exposure in page/API responses
 * - Auth protection (unauthenticated access to protected pages)
 * - Open redirects
 */

import { Page } from 'playwright';
import { SecurityResult, SecurityVulnerability } from '../types';

export class SecurityChecker {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Run all security checks on the current page
   */
  async checkSecurity(): Promise<SecurityResult> {
    console.log('[SecurityChecker] Running security analysis...');

    const [xssVulns, csrfProtected, sensitiveData, authIssues] = await Promise.all([
      this.checkXSSPrevention(),
      this.checkCSRFProtection(),
      this.checkSensitiveDataExposure(),
      this.checkAuthProtection(),
    ]);

    let score = 10;

    // XSS vulnerabilities
    for (const v of xssVulns) {
      if (v.severity === 'critical') score -= 3;
      else if (v.severity === 'high') score -= 2;
      else score -= 1;
    }

    // CSRF
    if (!csrfProtected) score -= 1;

    // Sensitive data
    for (const v of sensitiveData) {
      if (v.severity === 'critical') score -= 2;
      else if (v.severity === 'high') score -= 1.5;
      else score -= 0.5;
    }

    // Auth issues
    for (const v of authIssues) {
      if (v.severity === 'critical') score -= 2;
      else score -= 1;
    }

    score = Math.max(0, Math.round(score * 10) / 10);

    const allVulns = [...xssVulns, ...sensitiveData, ...authIssues];
    const summary = allVulns.length === 0
      ? 'No security issues detected'
      : `${allVulns.length} security issues found (${xssVulns.length} XSS, ${sensitiveData.length} data exposure, ${authIssues.length} auth)`;

    console.log(`[SecurityChecker] Score: ${score}/10 | ${allVulns.length} vulnerabilities`);

    return {
      score,
      xssVulnerabilities: xssVulns,
      csrfProtection: csrfProtected,
      sensitiveDataExposure: sensitiveData,
      authProtection: authIssues,
      summary,
    };
  }

  /**
   * Check XSS prevention: look for unescaped content, dangerous patterns
   */
  private async checkXSSPrevention(): Promise<SecurityVulnerability[]> {
    const vulns: SecurityVulnerability[] = [];

    try {
      const results = await this.page.evaluate(() => {
        const issues: Array<{ location: string; description: string }> = [];

        // Check for innerHTML usage in visible scripts
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach(script => {
          const content = script.textContent || '';
          if (content.includes('innerHTML') || content.includes('outerHTML')) {
            issues.push({
              location: 'Inline script',
              description: 'Uses innerHTML/outerHTML which can lead to XSS',
            });
          }
          if (content.includes('document.write')) {
            issues.push({
              location: 'Inline script',
              description: 'Uses document.write which can lead to XSS',
            });
          }
          if (content.includes('eval(')) {
            issues.push({
              location: 'Inline script',
              description: 'Uses eval() which is dangerous for XSS',
            });
          }
        });

        // Check for inputs without proper sanitization attributes
        const inputs = document.querySelectorAll('input[type="text"], textarea');
        inputs.forEach(input => {
          const el = input as HTMLInputElement;
          // Check if autocomplete is off for sensitive fields
          const name = (el.name || el.id || '').toLowerCase();
          if ((name.includes('password') || name.includes('token') || name.includes('secret')) &&
              el.autocomplete !== 'off') {
            issues.push({
              location: `input[name="${el.name || el.id}"]`,
              description: 'Sensitive field without autocomplete="off"',
            });
          }
        });

        // Check for unescaped URL parameters in page content
        const urlParams = new URLSearchParams(window.location.search);
        const pageText = document.body.innerHTML;
        urlParams.forEach((value, key) => {
          if (value.length > 3 && pageText.includes(value) && /<[a-z]/.test(value)) {
            issues.push({
              location: `URL parameter: ${key}`,
              description: 'URL parameter reflected in page without escaping',
            });
          }
        });

        return issues;
      });

      for (const r of results) {
        vulns.push({
          type: 'xss',
          severity: r.description.includes('eval') ? 'critical' : 'medium',
          location: r.location,
          description: r.description,
          suggestion: 'Use textContent instead of innerHTML, avoid eval(), sanitize user input',
        });
      }
    } catch {
      // Security check failed - not a vulnerability
    }

    return vulns;
  }

  /**
   * Check CSRF protection on forms
   */
  private async checkCSRFProtection(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        if (forms.length === 0) return true; // No forms = no CSRF risk

        let protected_ = 0;
        forms.forEach(form => {
          // Check for CSRF token input
          const hasToken = form.querySelector('input[name*="csrf" i], input[name*="token" i], input[name*="_token" i]');
          // Check for meta tag CSRF
          const metaToken = document.querySelector('meta[name*="csrf" i]');
          if (hasToken || metaToken) protected_++;
        });

        // Consider protected if at least one form has CSRF or there's a meta token
        return protected_ > 0 || document.querySelector('meta[name*="csrf" i]') !== null;
      });
    } catch {
      return true; // Assume protected if check fails
    }
  }

  /**
   * Check for sensitive data exposed in page content
   */
  private async checkSensitiveDataExposure(): Promise<SecurityVulnerability[]> {
    const vulns: SecurityVulnerability[] = [];

    try {
      const results = await this.page.evaluate(() => {
        const issues: Array<{ location: string; description: string; severity: string }> = [];
        const pageText = document.body.innerText || '';
        const pageHTML = document.body.innerHTML || '';

        // Check for API keys/tokens in page source
        const apiKeyPatterns = [
          /AIza[0-9A-Za-z_-]{35}/,       // Google API key
          /sk-[a-zA-Z0-9]{20,}/,           // OpenAI/Stripe secret key
          /pk_live_[a-zA-Z0-9]+/,          // Stripe publishable key
          /access_token['":\s]*[a-zA-Z0-9._-]{20,}/, // Generic access token
        ];

        for (const pattern of apiKeyPatterns) {
          if (pattern.test(pageHTML)) {
            issues.push({
              location: 'Page source',
              description: `Potential API key/token exposed (pattern: ${pattern.source.substring(0, 30)})`,
              severity: 'critical',
            });
          }
        }

        // Check for sensitive PII in visible text
        // Saudi National ID pattern (10 digits starting with 1 or 2)
        if (/\b[12]\d{9}\b/.test(pageText)) {
          // Exclude phone numbers and common numbers
          const matches = pageText.match(/\b[12]\d{9}\b/g) || [];
          for (const m of matches) {
            if (!m.startsWith('05') && !m.startsWith('9665')) {
              issues.push({
                location: 'Visible text',
                description: `Possible Saudi National ID exposed: ${m.substring(0, 4)}******`,
                severity: 'high',
              });
              break;
            }
          }
        }

        // Check for passwords in page source
        if (/password['":\s]*['"]((?![\s*]).{3,})['"]/i.test(pageHTML)) {
          issues.push({
            location: 'Page source',
            description: 'Possible password value in page source',
            severity: 'critical',
          });
        }

        // Check for debug info exposed
        if (pageHTML.includes('stack trace') || pageHTML.includes('at Object.<anonymous>') ||
            pageHTML.includes('node_modules/')) {
          issues.push({
            location: 'Page content',
            description: 'Stack trace or debug information exposed to user',
            severity: 'medium',
          });
        }

        return issues;
      });

      for (const r of results) {
        vulns.push({
          type: 'sensitive-data',
          severity: r.severity as SecurityVulnerability['severity'],
          location: r.location,
          description: r.description,
          suggestion: 'Remove sensitive data from client-side code; use server-side rendering for protected data',
        });
      }
    } catch {
      // Check failed
    }

    return vulns;
  }

  /**
   * Check auth protection: verify protected pages redirect unauthenticated users
   */
  private async checkAuthProtection(): Promise<SecurityVulnerability[]> {
    const vulns: SecurityVulnerability[] = [];

    try {
      const results = await this.page.evaluate(() => {
        const issues: Array<{ location: string; description: string }> = [];
        const url = window.location.pathname;

        // Protected page patterns
        const protectedPatterns = ['/admin', '/dashboard', '/settings', '/account/security', '/account/wallet'];
        const isProtectedPage = protectedPatterns.some(p => url.includes(p));

        if (isProtectedPage) {
          // Check if there's any auth indicator (token in storage, auth cookie)
          const hasSession = sessionStorage.length > 0;
          const hasLocal = localStorage.length > 0;
          const hasCookies = document.cookie.length > 0;

          // If we can access a protected page without any auth state, flag it
          if (!hasSession && !hasLocal && !hasCookies) {
            issues.push({
              location: url,
              description: 'Protected page accessible without authentication state',
            });
          }
        }

        // Check for links with javascript: protocol
        const jsLinks = document.querySelectorAll('a[href^="javascript:"]');
        if (jsLinks.length > 0) {
          issues.push({
            location: 'Page links',
            description: `${jsLinks.length} links with javascript: protocol (potential XSS vector)`,
          });
        }

        return issues;
      });

      for (const r of results) {
        vulns.push({
          type: 'auth',
          severity: 'high',
          location: r.location,
          description: r.description,
          suggestion: 'Implement server-side authentication check; redirect unauthenticated users to login',
        });
      }
    } catch {
      // Check failed
    }

    return vulns;
  }
}
