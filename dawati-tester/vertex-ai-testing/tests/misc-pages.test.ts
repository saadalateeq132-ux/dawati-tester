import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Miscellaneous Pages
 *
 * Tests standalone pages and remaining sections:
 * 1. Notifications page
 * 2. Onboarding flow
 * 3. Mode selection (customer/vendor)
 * 4. Planning pages (wedding planner, budget)
 * 5. Split wedding pages
 * 6. Invitations deep pages
 * 7. Disputes pages
 * 8. Payment pages
 * 9. Missing customer tabs (create, messages, plan, scan)
 *
 * NOTE: Many pages require auth. We test whatever renders.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Notifications ---
    {
      id: 'notifications',
      name: 'Notifications Page',
      description: 'User notifications list',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/notifications`,
          description: 'Navigate to notifications',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Notifications page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check notifications:
1. Notification items with proper RTL layout
2. Timestamps in Arabic (منذ 5 دقائق not "5 minutes ago")
3. Notification types/categories in Arabic
4. Read/unread indicator
5. Mark all read button in Arabic
6. Empty state in Arabic if none
7. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Mode Selection ---
    {
      id: 'mode-selection',
      name: 'Mode Selection Page',
      description: 'Customer/vendor mode switch',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/mode-selection`,
          description: 'Navigate to mode selection',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Mode selection page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: mode options (Customer/Vendor) in Arabic, icons aligned, descriptions in Arabic, selection buttons in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Onboarding ---
    {
      id: 'onboarding',
      name: 'Onboarding Page',
      description: 'New user onboarding flow',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/onboarding`,
          description: 'Navigate to onboarding',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Onboarding page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: welcome slides/steps in Arabic, progress dots, next/skip buttons in Arabic, illustrations/icons, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Customer Create Tab ---
    {
      id: 'tabs-create',
      name: 'Create Tab',
      description: 'Create event tab',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/create`,
          description: 'Navigate to create tab',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Create tab page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: event creation form/options in Arabic, event type buttons in Arabic, tab bar with create tab active, RTL layout, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Customer Messages Tab ---
    {
      id: 'tabs-messages',
      name: 'Messages Tab',
      description: 'User messaging tab',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/messages`,
          description: 'Navigate to messages tab',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Messages tab page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: message list with contact names, last message preview, timestamps, unread indicator, search bar in Arabic, tab bar active, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Customer Plan Tab ---
    {
      id: 'tabs-plan',
      name: 'Plan Tab',
      description: 'Event planning tab',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/plan`,
          description: 'Navigate to plan tab',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Plan tab page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: planning tools/checklist in Arabic, budget tracker with correct currency, timeline in Arabic, tab bar active, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Customer Scan Tab ---
    {
      id: 'tabs-scan',
      name: 'Scan Tab',
      description: 'QR code scanning tab',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/scan`,
          description: 'Navigate to scan tab',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Scan tab page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: scan interface/camera placeholder, instructions in Arabic, scan button in Arabic, tab bar active, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Planning Home ---
    {
      id: 'planning-home',
      name: 'Planning Home Page',
      description: 'Wedding planning tools',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/planning`,
          description: 'Navigate to planning',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Planning home page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: planning tools list in Arabic, checklist items in Arabic, progress indicators, budget overview with correct currency, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Wedding Budget ---
    {
      id: 'wedding-budget',
      name: 'Wedding Budget Page',
      description: 'Budget planning tool',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/planning/wedding-budget`,
          description: 'Navigate to wedding budget',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Wedding budget page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: budget categories in Arabic, amounts with currency AFTER number, total/remaining display, add item button in Arabic, charts with Arabic labels, RTL layout',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Wedding Planner ---
    {
      id: 'wedding-planner',
      name: 'Wedding Planner Page',
      description: 'AI wedding planner',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/planning/wedding-planner`,
          description: 'Navigate to wedding planner',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Wedding planner page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: planner interface in Arabic, task list in Arabic, timeline view, vendor suggestions in Arabic, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Split Wedding Home ---
    {
      id: 'split-wedding',
      name: 'Split Wedding Page',
      description: 'Split wedding cost sharing',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/split-wedding`,
          description: 'Navigate to split wedding',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Split wedding page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: split wedding info in Arabic, cost sharing options, participant list, amounts with correct currency, action buttons in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Disputes - My Disputes ---
    {
      id: 'my-disputes',
      name: 'My Disputes Page',
      description: 'User disputes list',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/disputes/my-disputes`,
          description: 'Navigate to my disputes',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'My disputes page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: dispute list with status badges in Arabic, dispute types in Arabic, dates formatted correctly, file new dispute button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- File Dispute ---
    {
      id: 'file-dispute',
      name: 'File Dispute Page',
      description: 'Create new dispute',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/disputes/file-dispute`,
          description: 'Navigate to file dispute',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'File dispute page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: dispute form in Arabic, reason dropdown in Arabic, description input in Arabic, attachment upload in Arabic, submit button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Invitations Preview ---
    {
      id: 'invitation-preview',
      name: 'Invitation Preview Page',
      description: 'Preview digital invitation',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/invitations/invitation-preview`,
          description: 'Navigate to invitation preview',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Invitation preview page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: invitation card preview with Arabic text, event details in Arabic, RSVP options in Arabic, share button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Send Invitations ---
    {
      id: 'send-invitations',
      name: 'Send Invitations Page',
      description: 'Send invitations to guests',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/invitations/send-invitations`,
          description: 'Navigate to send invitations',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Send invitations page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: recipient selection in Arabic, send method options (WhatsApp/SMS/Email) in Arabic, message preview in Arabic, send button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Help Page (standalone) ---
    {
      id: 'help-standalone',
      name: 'Help Page',
      description: 'Help center',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/help`,
          description: 'Navigate to help',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Help page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: FAQ items in Arabic, contact options in Arabic, search bar in Arabic, category sections in Arabic, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Miscellaneous Pages', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
