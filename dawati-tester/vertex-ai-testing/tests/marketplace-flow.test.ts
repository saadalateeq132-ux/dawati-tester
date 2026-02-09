import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Marketplace Booking Flow
 *
 * End-to-end vendor discovery to booking:
 * 1. Marketplace home - search, categories, vendor cards
 * 2. Vendor details page - gallery, packages, reviews
 * 3. Package customize
 * 4. Date selection
 * 5. Contract review
 * 6. Checkout
 *
 * NOTE: Deep pages may require auth. We test whatever renders.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Marketplace Home ---
    {
      id: 'marketplace-home',
      name: 'Marketplace Home',
      description: 'Vendor discovery and search page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/marketplace`,
          description: 'Navigate to marketplace',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for marketplace' },
        { type: 'screenshot', description: 'Marketplace home page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check marketplace home:
1. Search bar: placeholder text in Arabic, search icon positioned correctly for RTL
2. Category filter chips: All categories in Arabic (not "Catering", "Photography")
3. Vendor cards:
   - Name in Arabic
   - Category label in Arabic (not "makeup_artist")
   - City name in Arabic (الرياض not "Riyadh")
   - Rating stars and review count
   - Price with currency AFTER number (not before)
4. Section titles in Arabic ("Featured Vendors" should be Arabic)
5. "View All" links in Arabic
6. Tier badges in Arabic (not "GOLD", "BRONZE")
7. Tab bar at bottom with marketplace tab active
8. No hardcoded English text anywhere
9. RTL layout: cards align from right`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Marketplace Scrolled ---
    {
      id: 'marketplace-scroll',
      name: 'Marketplace Scrolled',
      description: 'Marketplace after scrolling to see more vendors',
      actions: [
        {
          type: 'scroll',
          value: '800',
          description: 'Scroll down to see more vendors',
        },
        { type: 'wait', timeout: 1000, description: 'Wait for content' },
        { type: 'screenshot', description: 'Marketplace scrolled down' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: more vendor cards visible, all with Arabic text, proper card layout, no loading placeholders stuck, prices formatted correctly with currency after number',
        },
      ],
      dependencies: ['marketplace-home'],
    },

    // --- Alternative marketplace URL ---
    {
      id: 'marketplace-alt',
      name: 'Marketplace Direct URL',
      description: 'Direct navigation to marketplace',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace`,
          description: 'Navigate to /marketplace directly',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Marketplace direct navigation' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: same marketplace page loads (or redirect). All text in Arabic, no raw keys, no English hardcoded text, vendor cards properly formatted',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Discovery ---
    {
      id: 'vendor-discovery',
      name: 'Vendor Discovery Page',
      description: 'Enhanced vendor browsing with filters',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/discovery`,
          description: 'Navigate to vendor discovery',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for discovery' },
        { type: 'screenshot', description: 'Vendor discovery page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: filter options in Arabic, sort options in Arabic, vendor cards with Arabic text, grid/list view toggle, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- AI Consultant ---
    {
      id: 'ai-consultant',
      name: 'AI Consultant Chat',
      description: 'AI-powered vendor recommendation chat',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/ai-consultant`,
          description: 'Navigate to AI consultant',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for chat' },
        { type: 'screenshot', description: 'AI consultant page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: chat interface in Arabic, welcome message in Arabic, input field placeholder in Arabic, send button, proper RTL alignment for messages (user right, bot left)',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Become Vendor ---
    {
      id: 'become-vendor',
      name: 'Become Vendor Page',
      description: 'Vendor registration start page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/become-vendor`,
          description: 'Navigate to become vendor',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Become vendor page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: page title in Arabic, benefits list in Arabic, call-to-action button in Arabic, proper RTL layout, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Marketplace Flow', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
