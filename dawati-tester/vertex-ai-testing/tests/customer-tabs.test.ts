import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Customer Tab Navigation
 *
 * Tests all customer-facing tabs and navigation:
 * 1. Welcome page → Login → Tab bar appears
 * 2. Each tab page layout, RTL, back button position
 * 3. Tab bar icon/label positions
 *
 * NOTE: Pages behind auth will redirect to welcome/login.
 * We test whatever renders after navigation.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Welcome & Auth Entry ---
    {
      id: 'welcome-full',
      name: 'Welcome Page - Full Check',
      description: 'Comprehensive welcome page check: buttons, layout, language toggle',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to app root',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait for full render',
        },
        {
          type: 'screenshot',
          description: 'Welcome page full layout',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: logo centered, brand name visible, buttons properly sized and aligned, language toggle positioned correctly, RTL layout correct, no hardcoded text' },
        { type: 'rtl', description: 'Full RTL validation' },
      ],
    },

    // --- Navigate to Customer Login ---
    {
      id: 'customer-login-full',
      name: 'Customer Login - Component Check',
      description: 'Full component-level check of login page',
      actions: [
        {
          type: 'click',
          selector: '[data-testid="welcome-login-button"]',
          description: 'Click login/signup button',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for login page',
        },
        {
          type: 'screenshot',
          description: 'Login page full components',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: back button on RIGHT side (RTL), header title centered, phone input aligned correctly, country code selector visible, checkbox aligned, continue button full-width and centered text, social buttons (Apple/Google) side-by-side and equal width, email button full-width, divider centered, all text Arabic' },
        { type: 'rtl', description: 'RTL layout validation' },
      ],
      dependencies: ['welcome-full'],
    },

    // --- Scroll Down Login Page ---
    {
      id: 'login-scrolled',
      name: 'Login Page - Scrolled Down',
      description: 'Check bottom of login page after scrolling',
      actions: [
        {
          type: 'scroll-to-bottom',
          description: 'Scroll to bottom of login page',
        },
        {
          type: 'wait',
          timeout: 1000,
          description: 'Wait for scroll settle',
        },
        {
          type: 'screenshot',
          description: 'Login page scrolled bottom',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: social login buttons visible and properly aligned, email button visible, no elements cut off or overlapping at bottom, proper spacing between elements' },
      ],
      dependencies: ['customer-login-full'],
    },

    // --- Navigate to Email Auth ---
    {
      id: 'email-auth',
      name: 'Email Auth Page',
      description: 'Check email authentication page layout',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/auth/email`,
          description: 'Navigate to email auth page',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for email page',
        },
        {
          type: 'screenshot',
          description: 'Email auth page layout',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: back button on correct side for RTL, email input field properly sized, password field with show/hide toggle, login button centered and properly sized, all labels in Arabic, no hardcoded English text' },
        { type: 'rtl', description: 'RTL validation' },
      ],
    },

    // --- Try accessing tabs (will redirect if no auth) ---
    {
      id: 'tabs-home',
      name: 'Home Tab Navigation',
      description: 'Navigate to home tab - check what renders',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)`,
          description: 'Navigate to home tab',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for page',
        },
        {
          type: 'screenshot',
          description: 'Home tab or redirect page',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: if tab bar visible - icons aligned, labels in Arabic, active tab highlighted. If redirected - check redirect page layout is correct' },
        { type: 'rtl', description: 'RTL validation' },
      ],
    },

    {
      id: 'tabs-marketplace',
      name: 'Marketplace Tab',
      description: 'Navigate to marketplace tab',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/marketplace`,
          description: 'Navigate to marketplace',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for marketplace',
        },
        {
          type: 'screenshot',
          description: 'Marketplace page layout',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: search bar aligned for RTL, category filter chips, vendor cards layout, tab bar at bottom with correct icon positions, all text in Arabic' },
        { type: 'rtl', description: 'RTL validation' },
      ],
    },

    {
      id: 'tabs-invitations',
      name: 'Invitations Tab',
      description: 'Navigate to invitations tab',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/invitations`,
          description: 'Navigate to invitations',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for invitations page',
        },
        {
          type: 'screenshot',
          description: 'Invitations page layout',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: stats grid properly aligned, event cards layout correct for RTL, search bar, floating action button position, all labels in Arabic' },
        { type: 'rtl', description: 'RTL validation' },
      ],
    },

    {
      id: 'tabs-account',
      name: 'Account Tab',
      description: 'Navigate to account/settings tab',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/account`,
          description: 'Navigate to account page',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for account page',
        },
        {
          type: 'screenshot',
          description: 'Account page layout',
        },
      ],
      validations: [
        { type: 'ai', description: 'Check: profile card layout, settings menu items aligned for RTL (icon on right, arrow on left), section headers in Arabic, logout button visible' },
        { type: 'rtl', description: 'RTL validation' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Customer Tabs Navigation', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
