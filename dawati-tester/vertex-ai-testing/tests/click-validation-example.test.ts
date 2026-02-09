import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Example Test: Click Validation Demo
 *
 * This test demonstrates how to use click validation to ensure
 * clicks actually work and produce expected results.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'Navigate to landing page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to landing page',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait for page load',
        },
        {
          type: 'screenshot',
          description: 'Landing page',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Landing page should load without errors',
        },
      ],
    },

    {
      id: 'click-login',
      name: 'Click Login Button',
      description: 'Click login button and verify login page appears',
      actions: [
        {
          type: 'click',
          selector: '[data-testid="welcome-login-button"]',
          description: 'Click login button',
          timeout: 5000,
          // ✅ NEW: Click validation!
          expectAfterClick: {
            type: 'element',
            selector: '[data-testid="login-form"], form',
            timeout: 5000,
            errorMessage: 'Login page did not appear after clicking login button',
          },
        },
        {
          type: 'wait',
          timeout: 2000,
          description: 'Wait for animations',
        },
        {
          type: 'screenshot',
          description: 'Login page after click',
        },
      ],
      validations: [
        {
          type: 'element',
          selector: 'form',
          description: 'Login form should be visible',
        },
        {
          type: 'ai',
          description: 'Login page should be complete',
        },
      ],
      dependencies: ['landing'],
    },

    {
      id: 'click-tab',
      name: 'Click Tab Navigation',
      description: 'Click a tab and verify it becomes active',
      actions: [
        {
          type: 'click',
          selector: '[role="tab"][aria-label*="Phone"], button:has-text("رقم الجوال")',
          description: 'Click phone tab',
          timeout: 5000,
          // ✅ NEW: Verify tab becomes active
          expectAfterClick: {
            type: 'element',
            selector: '[role="tab"][aria-selected="true"], .active-tab',
            timeout: 3000,
            errorMessage: 'Tab did not become active after click',
          },
        },
        {
          type: 'screenshot',
          description: 'After tab click',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Tab should be active',
        },
      ],
      dependencies: ['click-login'],
    },

    {
      id: 'submit-form',
      name: 'Submit Form',
      description: 'Submit form and verify navigation or success message',
      actions: [
        {
          type: 'fill',
          selector: 'input[type="tel"], input[name="phone"]',
          value: '+966501234567',
          description: 'Enter phone number',
        },
        {
          type: 'click',
          selector: 'button[type="submit"]',
          description: 'Click submit button',
          timeout: 5000,
          // ✅ NEW: Verify form submission worked
          expectAfterClick: {
            type: 'text',
            expected: /OTP|code|رمز|تحقق/i, // Look for OTP/verification text
            timeout: 10000,
            errorMessage: 'OTP page did not appear after form submission',
          },
        },
        {
          type: 'wait',
          timeout: 2000,
          description: 'Wait for OTP page',
        },
        {
          type: 'screenshot',
          description: 'After form submission',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Should show OTP input or success message',
        },
      ],
      dependencies: ['click-tab'],
    },

    {
      id: 'click-modal',
      name: 'Click to Open Modal',
      description: 'Click button to open modal and verify it appears',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Go back to homepage',
        },
        {
          type: 'wait',
          timeout: 2000,
          description: 'Wait for page',
        },
        {
          type: 'click',
          selector: 'button[aria-label*="menu"], [data-testid="menu-button"]',
          description: 'Click menu button',
          timeout: 5000,
          // ✅ NEW: Verify modal opens
          expectAfterClick: {
            type: 'element',
            selector: '[role="dialog"], [role="menu"], .modal',
            timeout: 3000,
            errorMessage: 'Modal/menu did not open after click',
          },
        },
        {
          type: 'screenshot',
          description: 'Modal open',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Modal should be visible',
        },
      ],
      dependencies: ['landing'],
    },

    {
      id: 'click-close-modal',
      name: 'Click to Close Modal',
      description: 'Click close button and verify modal disappears',
      actions: [
        {
          type: 'click',
          selector: 'button[aria-label*="close"], [data-testid="close-button"]',
          description: 'Click close button',
          timeout: 5000,
          // ✅ NEW: Verify modal closes
          expectAfterClick: {
            type: 'not-visible',
            selector: '[role="dialog"], [role="menu"], .modal',
            timeout: 3000,
            errorMessage: 'Modal did not close after clicking close button',
          },
        },
        {
          type: 'screenshot',
          description: 'Modal closed',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Modal should be hidden',
        },
      ],
      dependencies: ['click-modal'],
    },
  ];

  // Run test suite
  const result = await orchestrator.runTestSuite('Click Validation Demo', phases);

  // Exit with appropriate code
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
