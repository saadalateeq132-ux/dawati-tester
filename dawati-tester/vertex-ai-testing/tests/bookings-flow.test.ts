import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Bookings Flow
 *
 * Tests all booking-related pages:
 * 1. My bookings list
 * 2. Booking detail
 * 3. Booking summary
 * 4. Cancel/modify booking
 * 5. Date/time picker
 * 6. Package selection
 * 7. Delivery confirmation
 *
 * NOTE: Most pages require auth. We test whatever renders.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- My Bookings ---
    {
      id: 'my-bookings',
      name: 'My Bookings List',
      description: 'Customer bookings list page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/my-bookings`,
          description: 'Navigate to my bookings',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'My bookings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check my bookings:
1. Page title in Arabic
2. Filter tabs (All/Pending/Confirmed/Completed/Cancelled) in Arabic
3. Booking cards with vendor name, date, status in Arabic
4. Status badges in Arabic (مؤكد/قيد الانتظار/مكتمل/ملغي)
5. Currency amounts AFTER number (not before)
6. Empty state message in Arabic if no bookings
7. Back button on RIGHT (RTL)
8. No hardcoded English`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Booking Detail ---
    {
      id: 'booking-detail',
      name: 'Booking Detail Page',
      description: 'Single booking details',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/booking-detail`,
          description: 'Navigate to booking detail',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Booking detail page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check booking detail:
1. Vendor info card with name, category in Arabic
2. Booking date/time formatted correctly
3. Package details in Arabic
4. Price breakdown with currency AFTER number
5. Status badge in Arabic
6. Action buttons (Cancel/Modify/Contact) in Arabic
7. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Booking Summary ---
    {
      id: 'booking-summary',
      name: 'Booking Summary Page',
      description: 'Booking confirmation summary',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/booking-summary`,
          description: 'Navigate to booking summary',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Booking summary page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: summary card with all booking info in Arabic, total price with correct currency formatting, confirm button in Arabic, back button RTL, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Date Picker ---
    {
      id: 'date-picker',
      name: 'Date Picker Page',
      description: 'Booking date selection',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/date-picker`,
          description: 'Navigate to date picker',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Date picker page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check date picker:
1. Calendar component with Arabic month/day names
2. Available/blocked dates clearly marked
3. Legend in Arabic
4. Confirm button in Arabic
5. Hijri calendar support if applicable
6. RTL layout for calendar navigation (prev/next arrows)`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Time Picker ---
    {
      id: 'time-picker',
      name: 'Time Picker Page',
      description: 'Booking time selection',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/time-picker`,
          description: 'Navigate to time picker',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Time picker page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: time slots displayed in Arabic, AM/PM labels in Arabic (ص/م), selected time highlighted, confirm button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Package Selection ---
    {
      id: 'package-selection',
      name: 'Package Selection Page',
      description: 'Vendor package selection for booking',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/package-selection`,
          description: 'Navigate to package selection',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Package selection page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check package selection:
1. Package cards with names in Arabic
2. Prices with currency AFTER number
3. Feature lists in Arabic
4. Select/Choose button in Arabic
5. Comparison features in Arabic
6. No hardcoded English`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Cancel Booking ---
    {
      id: 'cancel-booking',
      name: 'Cancel Booking Page',
      description: 'Booking cancellation flow',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/cancel-booking`,
          description: 'Navigate to cancel booking',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Cancel booking page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: cancellation reason options in Arabic, refund policy text in Arabic, confirm cancellation button in Arabic, warning text in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Modify Booking ---
    {
      id: 'modify-booking',
      name: 'Modify Booking Page',
      description: 'Booking modification form',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/modify-booking`,
          description: 'Navigate to modify booking',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Modify booking page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: modification form fields in Arabic, date/time change options, price difference display with correct currency, save button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Delivery Confirmation ---
    {
      id: 'delivery-confirmation',
      name: 'Delivery Confirmation',
      description: 'Service delivery confirmation page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/bookings/delivery-confirmation`,
          description: 'Navigate to delivery confirmation',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Delivery confirmation page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: confirmation message in Arabic, rating stars, review input in Arabic, confirm delivery button in Arabic, RTL layout correct, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Bookings Flow', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
