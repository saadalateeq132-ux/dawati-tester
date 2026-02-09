import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Account Extended Pages
 *
 * Tests additional account sub-pages not covered by account-settings:
 * 1. Payment methods
 * 2. Transactions history
 * 3. Referral program
 * 4. Subscription
 * 5. Two-factor auth
 * 6. Login history
 * 7. Privacy & data
 * 8. My reviews
 * 9. Event preferences
 * 10. Blocked users
 * 11. Tier benefits
 * 12. Invoices
 * 13. Delete account flow
 *
 * NOTE: Requires auth. We test whatever renders.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Payment Methods ---
    {
      id: 'payment-methods',
      name: 'Payment Methods Page',
      description: 'Saved cards and payment options',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/payment-methods`,
          description: 'Navigate to payment methods',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Payment methods page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check payment methods:
1. Saved cards list with masked numbers
2. Card type labels (Visa/Mastercard) - can be English brand names
3. Add card button in Arabic
4. Default card indicator in Arabic
5. Delete/Edit options in Arabic
6. Back button on RIGHT (RTL)
7. No raw i18n keys`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Transactions ---
    {
      id: 'account-transactions',
      name: 'Transactions History',
      description: 'Account transaction history',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/transactions`,
          description: 'Navigate to transactions',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Transactions page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: transaction list with amounts (currency AFTER number), date formatting, type labels in Arabic, filter options in Arabic, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Referral ---
    {
      id: 'referral-page',
      name: 'Referral Program Page',
      description: 'Refer friends and earn rewards',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/referral`,
          description: 'Navigate to referral',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Referral page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: referral code display, share button in Arabic, rewards info in Arabic, referral stats in Arabic, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Subscription ---
    {
      id: 'subscription-page',
      name: 'Subscription Page',
      description: 'User subscription management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/subscription`,
          description: 'Navigate to subscription',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Subscription page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: subscription plan details in Arabic, pricing with currency AFTER number, upgrade/downgrade buttons in Arabic, features list in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Two-Factor Auth ---
    {
      id: 'two-factor-auth',
      name: 'Two-Factor Auth Page',
      description: '2FA setup and management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/two-factor-auth`,
          description: 'Navigate to 2FA',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: '2FA page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: 2FA setup instructions in Arabic, enable/disable toggle, method options in Arabic, back button RTL, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Login History ---
    {
      id: 'login-history',
      name: 'Login History Page',
      description: 'Account login history and sessions',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/login-history`,
          description: 'Navigate to login history',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Login history page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: session list with device info, date/time formatting, location info, active session indicator in Arabic, logout other sessions button in Arabic',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Privacy & Data ---
    {
      id: 'privacy-data',
      name: 'Privacy & Data Page',
      description: 'Privacy settings and data management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/privacy-data`,
          description: 'Navigate to privacy',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Privacy and data page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: privacy toggles with Arabic labels, data export option in Arabic, data deletion info in Arabic, section headers in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- My Reviews ---
    {
      id: 'my-reviews',
      name: 'My Reviews Page',
      description: 'Reviews written by user',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/my-reviews`,
          description: 'Navigate to my reviews',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'My reviews page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: review cards with vendor name, rating stars, review text, date - all in Arabic, empty state in Arabic if no reviews, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Event Preferences ---
    {
      id: 'event-preferences',
      name: 'Event Preferences Page',
      description: 'User event preferences',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/event-preferences`,
          description: 'Navigate to event preferences',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Event preferences page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: preference options in Arabic, event type selections in Arabic, save button in Arabic, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Tier Benefits ---
    {
      id: 'tier-benefits',
      name: 'Tier Benefits Page',
      description: 'Loyalty tier benefits information',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/tier-benefits`,
          description: 'Navigate to tier benefits',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Tier benefits page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: tier names in Arabic (not Gold/Silver/Bronze), benefits list in Arabic, progress indicator, upgrade info in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Invoices ---
    {
      id: 'invoices-page',
      name: 'Invoices Page',
      description: 'User invoices history',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/invoices`,
          description: 'Navigate to invoices',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Invoices page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: invoice list with amounts (currency AFTER number), dates formatted correctly, download/view buttons in Arabic, status labels in Arabic, RTL correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Delete Account Warning ---
    {
      id: 'delete-account',
      name: 'Delete Account Page',
      description: 'Account deletion warning',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/delete-account-warning`,
          description: 'Navigate to delete account',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Delete account warning' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: warning message in Arabic, consequences listed in Arabic, confirm/cancel buttons in Arabic, back button RTL, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Blocked Users ---
    {
      id: 'blocked-users',
      name: 'Blocked Users Page',
      description: 'Blocked users management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/blocked-users`,
          description: 'Navigate to blocked users',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Blocked users page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: blocked users list in Arabic, unblock button in Arabic, empty state in Arabic if none, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Account Extended Pages', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
