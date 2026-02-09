import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Vendor Management Flow
 *
 * Tests vendor-specific pages NOT in vendor-tabs:
 * 1. Vendor activity tab (missing from vendor-dashboard.test.ts)
 * 2. Vendor dashboard standalone pages (packages, portfolio, reviews, chat, messages)
 * 3. Vendor onboarding flow
 * 4. Vendor booking detail
 *
 * NOTE: Requires vendor auth. We test whatever renders.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Vendor Activity Tab ---
    {
      id: 'vendor-activity',
      name: 'Vendor Activity Tab',
      description: 'Vendor activity feed',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(vendor-tabs)/activity`,
          description: 'Navigate to vendor activity',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor activity page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check vendor activity:
1. Activity feed items with timestamps
2. Activity types in Arabic (new booking, review, payout, etc.)
3. Relative time in Arabic (منذ 5 دقائق not "5 minutes ago")
4. Tab bar with correct active tab
5. No hardcoded English text
6. RTL layout correct`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Packages Management ---
    {
      id: 'vendor-packages',
      name: 'Vendor Packages Page',
      description: 'Vendor service packages management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/vendor-dashboard/packages`,
          description: 'Navigate to vendor packages',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor packages page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check vendor packages:
1. Package cards with names in Arabic
2. Prices with currency AFTER number
3. Feature lists in Arabic
4. Add/Edit/Delete buttons in Arabic
5. Active/Inactive status in Arabic
6. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Portfolio ---
    {
      id: 'vendor-portfolio',
      name: 'Vendor Portfolio Page',
      description: 'Vendor work portfolio/gallery',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/vendor-dashboard/portfolio`,
          description: 'Navigate to vendor portfolio',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor portfolio page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: image gallery grid, upload button in Arabic, category labels in Arabic, image captions in Arabic, empty state in Arabic if no images, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Reviews ---
    {
      id: 'vendor-reviews',
      name: 'Vendor Reviews Page',
      description: 'Vendor received reviews',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/vendor-dashboard/reviews`,
          description: 'Navigate to vendor reviews',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor reviews page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: review cards with customer names, rating stars, review text, dates - all formatted for RTL, average rating display, reply button in Arabic, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Messages ---
    {
      id: 'vendor-messages',
      name: 'Vendor Messages Page',
      description: 'Vendor messaging inbox',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/vendor-dashboard/messages`,
          description: 'Navigate to vendor messages',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor messages page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: message list with contact names, last message preview, timestamps, unread indicator, search bar in Arabic, empty state in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Chat ---
    {
      id: 'vendor-chat',
      name: 'Vendor Chat Page',
      description: 'Vendor chat conversation',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/vendor-dashboard/chat`,
          description: 'Navigate to vendor chat',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor chat page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: chat interface with proper RTL alignment (vendor messages on one side, customer on other), input field in Arabic, send button, timestamps, back button RTL',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Onboarding ---
    {
      id: 'vendor-onboarding',
      name: 'Vendor Onboarding Page',
      description: 'Vendor registration/onboarding start',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/vendor-onboarding`,
          description: 'Navigate to vendor onboarding',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor onboarding page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check vendor onboarding:
1. Welcome/intro screen in Arabic
2. Steps indicator/progress bar
3. Step labels in Arabic
4. Start/Continue button in Arabic
5. Requirements info in Arabic
6. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Booking Detail (standalone) ---
    {
      id: 'vendor-booking-detail-standalone',
      name: 'Vendor Booking Detail',
      description: 'Standalone vendor booking detail page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/vendor-booking-detail`,
          description: 'Navigate to vendor booking detail',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor booking detail' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: customer info in Arabic, booking details (date, time, package) in Arabic, status badge in Arabic, action buttons (Accept/Reject/Complete) in Arabic, price with correct currency',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Become Vendor (deeper check) ---
    {
      id: 'become-vendor-scroll',
      name: 'Become Vendor Scrolled',
      description: 'Bottom of become vendor page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/become-vendor`,
          description: 'Navigate to become vendor',
        },
        { type: 'wait', timeout: 3000, description: 'Wait' },
        {
          type: 'scroll-to-bottom',
          description: 'Scroll to bottom',
        },
        { type: 'wait', timeout: 1000, description: 'Wait' },
        { type: 'screenshot', description: 'Become vendor bottom' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: CTA button visible at bottom, benefits/features list complete, no cut-off content, all text in Arabic, proper padding at bottom',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Vendor Management Flow', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
