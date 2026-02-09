import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Marketplace Booking Deep Pages
 *
 * Tests marketplace booking flow deep pages:
 * 1. Vendor detail/profile pages
 * 2. Vendor list
 * 3. Package customize
 * 4. Select date
 * 5. Contract review
 * 6. Checkout/payment
 * 7. Payment success
 * 8. Booking confirmed/rejected/status
 * 9. Rate vendor
 * 10. Booking tracker
 *
 * NOTE: Many pages require auth and specific booking state.
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Vendor List ---
    {
      id: 'vendor-list',
      name: 'Vendor List Page',
      description: 'Browse vendors list',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/vendor-list`,
          description: 'Navigate to vendor list',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor list page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check vendor list:
1. Vendor cards with names in Arabic
2. Category labels in Arabic (not "photography", "catering")
3. City names in Arabic (الرياض not "Riyadh")
4. Rating stars and review count
5. Price with currency AFTER number
6. Filter/sort options in Arabic
7. Back button on RIGHT (RTL)
8. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Detail ---
    {
      id: 'vendor-detail',
      name: 'Vendor Detail Page',
      description: 'Single vendor profile/detail',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/vendor-detail`,
          description: 'Navigate to vendor detail',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor detail page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check vendor detail:
1. Vendor name and category in Arabic
2. Photo gallery/carousel
3. Rating with review count
4. Package cards with prices (currency AFTER number)
5. Description/about section in Arabic
6. Book Now button in Arabic
7. Reviews section with Arabic text
8. Contact info properly formatted
9. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Profile ---
    {
      id: 'vendor-profile',
      name: 'Vendor Profile Page',
      description: 'Public vendor profile',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/vendor-profile`,
          description: 'Navigate to vendor profile',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Vendor profile page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: vendor profile info in Arabic, gallery, packages with prices, reviews section, contact options, all in Arabic with RTL layout',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Package Customize ---
    {
      id: 'package-customize',
      name: 'Package Customize Page',
      description: 'Customize vendor package',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/package-customize`,
          description: 'Navigate to package customize',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Package customize page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: package options/add-ons in Arabic, price breakdown with currency AFTER number, total calculation, continue button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Select Date ---
    {
      id: 'select-date',
      name: 'Select Date Page',
      description: 'Booking date selection in marketplace',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/select-date`,
          description: 'Navigate to select date',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Select date page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: calendar with Arabic month/day names, available dates marked, vendor availability shown, confirm button in Arabic, Hijri calendar if applicable',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Contract Review ---
    {
      id: 'contract-review',
      name: 'Contract Review Page',
      description: 'Booking contract review before signing',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/contract-review`,
          description: 'Navigate to contract review',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Contract review page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check contract review:
1. Contract terms in Arabic
2. Price details with currency AFTER number
3. Parties info in Arabic
4. Terms and conditions in Arabic
5. Accept/Sign button in Arabic
6. Back button RTL
7. No hardcoded English legal text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Checkout ---
    {
      id: 'checkout-page',
      name: 'Checkout Page',
      description: 'Payment checkout',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/checkout`,
          description: 'Navigate to checkout',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Checkout page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check checkout:
1. Order summary in Arabic
2. Total with currency AFTER number
3. Payment method selection in Arabic
4. Pay button with amount in Arabic
5. Secure payment indicator
6. Promo code input in Arabic
7. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Payment Success ---
    {
      id: 'payment-success',
      name: 'Payment Success Page',
      description: 'Payment confirmation',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/payment-success`,
          description: 'Navigate to payment success',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Payment success page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: success message in Arabic, checkmark/success icon, booking reference number, next steps in Arabic, home/bookings button in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Booking Status ---
    {
      id: 'booking-status',
      name: 'Booking Status Page',
      description: 'Booking status tracking',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/booking-status`,
          description: 'Navigate to booking status',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Booking status page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: status timeline/steps in Arabic, current status highlighted, vendor info in Arabic, date/time formatted correctly, action buttons in Arabic',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Rate Vendor ---
    {
      id: 'rate-vendor',
      name: 'Rate Vendor Page',
      description: 'Post-booking vendor rating',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/rate-vendor`,
          description: 'Navigate to rate vendor',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Rate vendor page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: rating stars, review text input in Arabic, category ratings in Arabic, submit button in Arabic, vendor info visible, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Booking Tracker ---
    {
      id: 'booking-tracker',
      name: 'Booking Tracker Page',
      description: 'Real-time booking tracking',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace/booking-tracker`,
          description: 'Navigate to booking tracker',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Booking tracker page' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: tracking timeline/progress in Arabic, status updates in Arabic, vendor contact info, estimated time in Arabic, RTL layout correct',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Marketplace Booking Deep', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
