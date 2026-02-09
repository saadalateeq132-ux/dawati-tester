import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Events Flow
 *
 * Tests all event-related pages:
 * 1. Create event page
 * 2. Event dashboard (overview, guests, settings)
 * 3. Event guests management
 * 4. Event reports
 *
 * NOTE: Some pages may require auth. We test whatever renders.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Create Event ---
    {
      id: 'create-event',
      name: 'Create Event Page',
      description: 'Event creation form',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/events/create-event`,
          description: 'Navigate to create event',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Create event page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check create event page:
1. Page title in Arabic (not "Create Event")
2. Form fields: event name, date, time, location - all labels in Arabic
3. Event type selector options in Arabic
4. Date picker showing correct format
5. Back button on RIGHT (RTL)
6. Submit/Create button in Arabic
7. No hardcoded English text
8. No raw i18n keys`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Create Event Scrolled ---
    {
      id: 'create-event-scroll',
      name: 'Create Event Scrolled',
      description: 'Bottom of create event form',
      actions: [
        {
          type: 'scroll-to-bottom',
          description: 'Scroll to bottom',
        },
        { type: 'wait', timeout: 1000, description: 'Wait' },
        { type: 'screenshot', description: 'Create event bottom' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: all remaining form fields visible, submit button at bottom, no content cut off, proper padding',
        },
      ],
      dependencies: ['create-event'],
    },

    // --- Event Dashboard ---
    {
      id: 'event-dashboard',
      name: 'Event Dashboard',
      description: 'Event management dashboard',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/events/event-dashboard`,
          description: 'Navigate to event dashboard',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Event dashboard page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check event dashboard:
1. Dashboard tabs (Overview, Guests, Settings) - all in Arabic
2. Event info card with name, date, status
3. Stats (guests count, RSVPs, etc.) with Arabic labels
4. Back button on RIGHT (RTL)
5. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Event Dashboard Overview ---
    {
      id: 'event-overview',
      name: 'Event Dashboard Overview',
      description: 'Event overview sub-page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/events/event-dashboard/overview`,
          description: 'Navigate to event overview',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Event overview page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: event summary visible, key stats in Arabic, date/time displayed correctly, all section headers in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Event Guests ---
    {
      id: 'event-guests',
      name: 'Event Guests Page',
      description: 'Guest list management',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/events/event-guests`,
          description: 'Navigate to event guests',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Event guests page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check event guests:
1. Guest list table/cards with proper RTL alignment
2. Status badges (Confirmed/Pending/Declined) in Arabic
3. Search input for guests in Arabic
4. Add guest button in Arabic
5. Guest count stats in Arabic
6. No hardcoded English status text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Event Reports ---
    {
      id: 'event-reports',
      name: 'Event Reports Page',
      description: 'Event analytics and reports',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/events/event-reports`,
          description: 'Navigate to event reports',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Event reports page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: report cards/charts with Arabic labels, date ranges in correct format, stats summary in Arabic, back button on RIGHT, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Event Report Detail ---
    {
      id: 'event-report-detail',
      name: 'Event Report Detail',
      description: 'Single event report',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/events/event-report`,
          description: 'Navigate to event report detail',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Event report detail' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: detailed report content in Arabic, charts/graphs labeled in Arabic, export options in Arabic, proper RTL layout',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Events Flow', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
