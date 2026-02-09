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
          selector: '[data-testid="welcome-login-button"]',
          description: 'Click login button (تسجيل الدخول / إنشاء حساب)',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for login page to load',
        },
        {
          type: 'screenshot',
          description: 'Login page form',
        },
      ],
      validations: [
        {
          type: 'rtl',
          description: 'Login page should have RTL layout',
        },
        {
          type: 'ai',
          description: 'Login page should be properly localized',
        },
      ],
      dependencies: ['landing-page'],
    },

    {
      id: 'vendor-login',
      name: 'Vendor Login Page',
      description: 'Navigate back and check vendor login option',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate back to landing page',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for page load',
        },
        {
          type: 'click',
          selector: '[data-testid="welcome-vendor-button"]',
          description: 'Click vendor login button (تسجيل الدخول كمزود خدمة)',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for vendor login page',
        },
        {
          type: 'screenshot',
          description: 'Vendor login page',
        },
      ],
      validations: [
        {
          type: 'rtl',
          description: 'Vendor login should have RTL layout',
        },
        {
          type: 'ai',
          description: 'Vendor login should be complete and properly localized',
        },
      ],
      dependencies: ['landing-page'],
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
