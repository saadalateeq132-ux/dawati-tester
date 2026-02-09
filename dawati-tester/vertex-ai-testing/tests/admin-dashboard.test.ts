import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Admin Dashboard Flow
 *
 * Tests all admin tabs:
 * 1. Admin home (dashboard)
 * 2. Users management
 * 3. Vendors management
 * 4. Bookings management
 * 5. Finance overview
 * 6. Transactions
 * 7. Payouts
 * 8. Contracts
 * 9. Disputes
 * 10. Loyalty program
 * 11. Security
 * 12. Tips
 * 13. Settings
 *
 * NOTE: Admin pages require admin auth. We test whatever renders.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Admin Home ---
    {
      id: 'admin-home',
      name: 'Admin Dashboard Home',
      description: 'Admin main dashboard with overview stats',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)`,
          description: 'Navigate to admin dashboard',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for dashboard' },
        { type: 'screenshot', description: 'Admin dashboard home' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check admin dashboard:
1. Stats cards (Users, Vendors, Bookings, Revenue) - labels in Arabic
2. Currency amounts with symbol AFTER number
3. Charts/graphs with Arabic labels
4. Navigation menu/tabs in Arabic
5. No hardcoded English text
6. RTL layout correct`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Users Management ---
    {
      id: 'admin-users',
      name: 'Admin Users Page',
      description: 'User management list',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/users`,
          description: 'Navigate to admin users',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin users page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check admin users:
1. User list table/cards with proper RTL alignment
2. Search bar placeholder in Arabic
3. Filter options in Arabic
4. User role labels in Arabic
5. Action buttons (Edit/Block/Delete) in Arabic
6. Pagination in Arabic
7. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendors Management ---
    {
      id: 'admin-vendors',
      name: 'Admin Vendors Page',
      description: 'Vendor management list',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/vendors`,
          description: 'Navigate to admin vendors',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin vendors page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check admin vendors:
1. Vendor list with category labels in Arabic
2. Tier badges in Arabic (not GOLD/BRONZE)
3. Approval status in Arabic
4. Rating display
5. Action buttons in Arabic
6. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Admin Bookings ---
    {
      id: 'admin-bookings',
      name: 'Admin Bookings Page',
      description: 'All bookings management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/bookings`,
          description: 'Navigate to admin bookings',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin bookings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: booking list with status badges in Arabic, date formatting correct, currency AFTER number, filter options in Arabic, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Finance ---
    {
      id: 'admin-finance',
      name: 'Admin Finance Page',
      description: 'Financial overview and reports',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/finance`,
          description: 'Navigate to admin finance',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin finance page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check admin finance:
1. Revenue cards with amounts (currency AFTER number)
2. Currency: NO hardcoded SAR/ريال/ر.س - should use SVG icon
3. Charts with Arabic labels
4. Date ranges in correct format
5. All section headers in Arabic
6. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Transactions ---
    {
      id: 'admin-transactions',
      name: 'Admin Transactions Page',
      description: 'Transaction history',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/transactions`,
          description: 'Navigate to admin transactions',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin transactions page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: transaction list with amounts (currency AFTER number), date formatting, status labels in Arabic, filter/search in Arabic, RTL alignment correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Payouts ---
    {
      id: 'admin-payouts',
      name: 'Admin Payouts Page',
      description: 'Vendor payouts management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/payouts`,
          description: 'Navigate to admin payouts',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin payouts page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: payout list with amounts, bank info (IBAN masked), status badges in Arabic, action buttons in Arabic, currency formatting correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Contracts ---
    {
      id: 'admin-contracts',
      name: 'Admin Contracts Page',
      description: 'Contract management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/contracts`,
          description: 'Navigate to admin contracts',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin contracts page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: contract list with parties, status, dates - all in Arabic. Contract status badges in Arabic. Filter options in Arabic. No hardcoded English.',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Disputes ---
    {
      id: 'admin-disputes',
      name: 'Admin Disputes Page',
      description: 'Dispute resolution management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/disputes`,
          description: 'Navigate to admin disputes',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin disputes page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: dispute list with status (Open/Resolved/Escalated) in Arabic, priority levels in Arabic, parties involved, action buttons in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Loyalty ---
    {
      id: 'admin-loyalty',
      name: 'Admin Loyalty Page',
      description: 'Loyalty program management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/loyalty`,
          description: 'Navigate to admin loyalty',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin loyalty page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: loyalty tiers in Arabic (not Gold/Silver/Bronze), points system labels in Arabic, rewards list in Arabic, stats in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Security ---
    {
      id: 'admin-security',
      name: 'Admin Security Page',
      description: 'Platform security settings',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/security`,
          description: 'Navigate to admin security',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin security page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: security settings/logs with Arabic labels, suspicious activity list in Arabic, action buttons in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Settings ---
    {
      id: 'admin-settings',
      name: 'Admin Settings Page',
      description: 'Admin platform settings',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/settings`,
          description: 'Navigate to admin settings',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin settings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: settings categories in Arabic, toggle switches with Arabic labels, save button in Arabic, all section headers in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Tips ---
    {
      id: 'admin-tips',
      name: 'Admin Tips Page',
      description: 'Tips/gratuity management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(admin-tabs)/tips`,
          description: 'Navigate to admin tips',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Admin tips page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: tips list with amounts (currency AFTER number), vendor info, date formatting, all labels in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Admin Dashboard Flow', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
