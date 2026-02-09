import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Example Test: Authentication Flow
 *
 * This test validates the complete authentication flow:
 * 1. Landing page loads correctly
 * 2. Navigate to login page
 * 3. Fill login form
 * 4. Submit and verify success
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    {
      id: 'landing-page',
      name: 'Landing Page',
      description: 'Verify landing page loads with correct RTL layout',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to landing page',
        },
        {
          type: 'wait',
          timeout: 2000,
          description: 'Wait for page load',
        },
        {
          type: 'screenshot',
          description: 'Landing page initial state',
        },
      ],
      validations: [
        {
          type: 'element',
          selector: 'h1',
          description: 'Page title should be visible',
        },
        {
          type: 'rtl',
          description: 'RTL layout should be correct',
        },
        {
          type: 'ai',
          description: 'No error pages, hardcoded strings, or RTL issues',
        },
      ],
    },

    {
      id: 'login-page',
      name: 'Login Page',
      description: 'Navigate to login page and verify form',
      actions: [
        {
          type: 'click',
          selector: 'a[href*="login"], button:has-text("تسجيل الدخول")',
          description: 'Click login button',
        },
        {
          type: 'wait',
          selector: 'form',
          timeout: 3000,
          description: 'Wait for login form',
        },
        {
          type: 'screenshot',
          description: 'Login page form',
        },
      ],
      validations: [
        {
          type: 'element',
          selector: 'input[type="email"], input[name="email"]',
          description: 'Email input should be visible',
        },
        {
          type: 'element',
          selector: 'input[type="password"], input[name="password"]',
          description: 'Password input should be visible',
        },
        {
          type: 'rtl',
          description: 'Form should have RTL layout',
        },
        {
          type: 'ai',
          description: 'Form should be complete and properly localized',
        },
      ],
      dependencies: ['landing-page'],
    },

    {
      id: 'fill-login-form',
      name: 'Fill Login Form',
      description: 'Enter test credentials',
      actions: [
        {
          type: 'fill',
          selector: 'input[type="email"], input[name="email"]',
          value: 'test@example.com',
          description: 'Enter email',
        },
        {
          type: 'fill',
          selector: 'input[type="password"], input[name="password"]',
          value: 'TestPassword123!',
          description: 'Enter password',
        },
        {
          type: 'screenshot',
          description: 'Form filled',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Form should be filled correctly',
        },
      ],
      dependencies: ['login-page'],
    },

    {
      id: 'submit-login',
      name: 'Submit Login',
      description: 'Submit form and verify success or error handling',
      actions: [
        {
          type: 'click',
          selector: 'button[type="submit"], button:has-text("تسجيل الدخول")',
          description: 'Click submit button',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait for response',
        },
        {
          type: 'screenshot',
          description: 'Login result',
        },
      ],
      validations: [
        {
          type: 'url',
          description: 'Should redirect to dashboard or show error',
        },
        {
          type: 'ai',
          description: 'Should show success or proper error message',
        },
      ],
      dependencies: ['fill-login-form'],
    },

    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Verify user lands on dashboard after login',
      actions: [
        {
          type: 'wait',
          timeout: 2000,
          description: 'Wait for dashboard load',
        },
        {
          type: 'screenshot',
          description: 'Dashboard view',
        },
      ],
      validations: [
        {
          type: 'element',
          selector: '[data-testid="dashboard"], main',
          description: 'Dashboard should be visible',
        },
        {
          type: 'rtl',
          description: 'Dashboard should have RTL layout',
        },
        {
          type: 'visual',
          description: 'Dashboard should match baseline',
        },
        {
          type: 'ai',
          description: 'Dashboard should be complete and properly localized',
        },
      ],
      dependencies: ['submit-login'],
    },
  ];

  // Run test suite
  const result = await orchestrator.runTestSuite('Authentication Flow', phases);

  // Exit with appropriate code
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
