import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Vendor Dashboard Flow
 *
 * Tests ALL vendor tabs:
 * 1. Vendor Dashboard (home) - stats, recent bookings
 * 2. Bookings tab - pending/upcoming/completed tabs
 * 3. Earnings tab - totals, transaction history
 * 4. Availability tab - calendar, date management
 * 5. Profile tab - business info, contact, bank
 * 6. Activity tab - activity feed
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Vendor Dashboard Home ---
    {
      id: 'vendor-home',
      name: 'Vendor Dashboard Home',
      description: 'Vendor main dashboard with stats and bookings',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(vendor-tabs)`,
          description: 'Navigate to vendor dashboard',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for dashboard' },
        { type: 'screenshot', description: 'Vendor dashboard home' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check vendor dashboard:
1. Welcome greeting in Arabic
2. Stats cards (Pending, Today, This Month, Rating) - numbers readable, labels Arabic
3. Currency amounts: symbol AFTER number (not before), use SVG icon not ر.س text
4. Recent bookings list: customer names, dates, status badges all in Arabic
5. "Switch to Customer Mode" button in Arabic
6. Tab bar at bottom: all labels in Arabic, icons aligned, active tab highlighted
7. No hardcoded English text
8. RTL layout correct (content flows right-to-left)`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Scroll Vendor Dashboard ---
    {
      id: 'vendor-home-scroll',
      name: 'Vendor Dashboard Scrolled',
      description: 'Check vendor dashboard after scrolling',
      actions: [
        {
          type: 'scroll-to-bottom',
          description: 'Scroll to bottom',
        },
        { type: 'wait', timeout: 1000, description: 'Wait for scroll' },
        { type: 'screenshot', description: 'Vendor dashboard scrolled' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: quick actions section visible (Manage Availability, View Earnings, Edit Profile) - all in Arabic, properly aligned for RTL, no cut-off content at bottom',
        },
      ],
      dependencies: ['vendor-home'],
    },

    // --- Vendor Bookings Tab ---
    {
      id: 'vendor-bookings',
      name: 'Vendor Bookings Tab',
      description: 'Bookings management with status tabs',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(vendor-tabs)/bookings`,
          description: 'Navigate to vendor bookings',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for bookings' },
        { type: 'screenshot', description: 'Vendor bookings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check bookings tab:
1. Filter tabs (Pending/Upcoming/Completed/Cancelled) - all in Arabic
2. Booking cards: customer name, date, time, amount, status badge
3. Currency formatting correct (amount THEN symbol)
4. Status badges in Arabic (مؤكد/قيد الانتظار/مكتمل/ملغي)
5. Tab bar at bottom with bookings tab active
6. Empty state if no bookings (should be in Arabic)
7. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Earnings Tab ---
    {
      id: 'vendor-earnings',
      name: 'Vendor Earnings Tab',
      description: 'Earnings overview and transactions',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(vendor-tabs)/earnings`,
          description: 'Navigate to vendor earnings',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for earnings' },
        { type: 'screenshot', description: 'Vendor earnings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check earnings tab:
1. Total earnings card - amount properly formatted, currency AFTER number
2. Monthly change indicator in Arabic
3. Stats grid (This Month, Pending Payout) - all labels Arabic
4. Bank/payout info: IBAN masked, bank name in Arabic
5. Transaction history list - dates, amounts, status all localized
6. Currency: NO hardcoded SAR/sar/ريال/ر.س - should use SVG icon after number
7. No hardcoded English text
8. RTL layout correct`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Availability Tab ---
    {
      id: 'vendor-availability',
      name: 'Vendor Availability Tab',
      description: 'Calendar and date management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(vendor-tabs)/availability`,
          description: 'Navigate to vendor availability',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for availability' },
        { type: 'screenshot', description: 'Vendor availability page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check availability tab:
1. Calendar component: month/year header in Arabic, day names in Arabic
2. Legend (Booked/Blocked/Available) - labels in Arabic
3. Color coding clear and visible
4. Selected date card - action buttons in Arabic
5. Date format: DD/MM/YYYY or Hijri calendar
6. No hardcoded English month/day names
7. RTL layout correct`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Profile Tab ---
    {
      id: 'vendor-profile',
      name: 'Vendor Profile Tab',
      description: 'Business profile and settings',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(vendor-tabs)/profile`,
          description: 'Navigate to vendor profile',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for profile' },
        { type: 'screenshot', description: 'Vendor profile page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check vendor profile:
1. Business name and category in Arabic
2. Rating stars with review count
3. Stats row (Base Price, Reviews, Featured) - labels Arabic
4. Contact info section: phone, WhatsApp, email properly formatted
5. Bank info: IBAN masked, bank name
6. Action buttons (Edit Profile, View Reviews, Settings) - all Arabic
7. Logout button in Arabic
8. All section headers in Arabic
9. No raw i18n keys visible
10. RTL layout correct`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Profile Scrolled ---
    {
      id: 'vendor-profile-scroll',
      name: 'Vendor Profile Scrolled',
      description: 'Bottom of vendor profile page',
      actions: [
        {
          type: 'scroll-to-bottom',
          description: 'Scroll to bottom of profile',
        },
        { type: 'wait', timeout: 1000, description: 'Wait for scroll' },
        { type: 'screenshot', description: 'Vendor profile bottom' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: logout button visible at bottom, all action buttons properly sized, no content cut off, proper bottom padding',
        },
      ],
      dependencies: ['vendor-profile'],
    },
  ];

  const result = await orchestrator.runTestSuite('Vendor Dashboard Flow', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
