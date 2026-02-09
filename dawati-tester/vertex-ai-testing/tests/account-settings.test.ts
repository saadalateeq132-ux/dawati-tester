import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Account Settings Flow
 *
 * Tests all account/settings sub-pages:
 * 1. Account home (settings menu)
 * 2. Edit Profile
 * 3. Wallet
 * 4. Packages
 * 5. Transactions
 * 6. Notifications settings
 * 7. Appearance settings
 * 8. Security
 * 9. Privacy & Data
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Account Home ---
    {
      id: 'account-home',
      name: 'Account Settings Home',
      description: 'Main account/settings menu page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(tabs)/account`,
          description: 'Navigate to account page',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for account' },
        { type: 'screenshot', description: 'Account settings home' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check account settings page:
1. Profile card at top: avatar, name, email/phone, tier badge - all in Arabic
2. Settings sections with headers in Arabic:
   - Account section (Edit Profile, Wallet, Packages, Transactions)
   - Security section (Password, 2FA, Login History)
   - Preferences section (Notifications, Appearance, Events)
   - Help section (Help Center, Contact Us)
   - About section (Terms, Privacy, Delete Account)
3. Each menu item: icon on RIGHT (RTL), text in Arabic, arrow on LEFT (RTL)
4. No raw i18n keys like "settings.title" or "SETTINGS.ACCOUNT_GENERAL"
5. Logout button at bottom in Arabic
6. Tab bar with account tab active
7. No hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Account Home Scrolled ---
    {
      id: 'account-home-scroll',
      name: 'Account Settings Scrolled',
      description: 'Bottom of account settings page',
      actions: [
        {
          type: 'scroll-to-bottom',
          description: 'Scroll to bottom',
        },
        { type: 'wait', timeout: 1000, description: 'Wait' },
        { type: 'screenshot', description: 'Account settings bottom' },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: logout button visible, about/legal section visible, all labels in Arabic, proper spacing at bottom, no cut-off content',
        },
      ],
      dependencies: ['account-home'],
    },

    // --- Edit Profile ---
    {
      id: 'edit-profile',
      name: 'Edit Profile Page',
      description: 'User profile editing form',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/edit-profile`,
          description: 'Navigate to edit profile',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Edit profile page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check edit profile:
1. Back button on RIGHT (RTL)
2. Page title in Arabic
3. Avatar upload area centered
4. Form fields: labels in Arabic, inputs aligned for RTL
5. Name input, email input, phone input - all labeled in Arabic
6. Save button full-width with Arabic text
7. No raw i18n keys
8. No hardcoded English labels`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Wallet ---
    {
      id: 'wallet-page',
      name: 'Wallet Page',
      description: 'User balance and credits',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/wallet`,
          description: 'Navigate to wallet',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Wallet page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check wallet:
1. Balance card: amount with currency AFTER number (not before)
2. Currency: NO hardcoded SAR/ريال/ر.س text - should use SVG icon
3. "Add Balance" button in Arabic
4. Transaction history labels in Arabic
5. Back button on RIGHT (RTL)
6. No hardcoded English`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Packages ---
    {
      id: 'packages-page',
      name: 'Packages Page',
      description: 'Invitation credit packages',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/packages`,
          description: 'Navigate to packages',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Packages page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check packages:
1. Package cards with invite counts
2. Prices with currency AFTER number
3. "Buy Now" buttons in Arabic
4. Package descriptions in Arabic
5. Back button on RIGHT (RTL)
6. No hardcoded English`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Notifications Settings ---
    {
      id: 'notifications-settings',
      name: 'Notification Settings',
      description: 'Push/email/SMS notification preferences',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/notifications`,
          description: 'Navigate to notifications',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Notification settings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check notifications:
1. Toggle switches with Arabic labels
2. Categories (Bookings, Payments, Marketing) in Arabic
3. Section headers in Arabic
4. Back button on RIGHT (RTL)
5. No hardcoded English`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Appearance ---
    {
      id: 'appearance-settings',
      name: 'Appearance Settings',
      description: 'Theme and language settings',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/appearance`,
          description: 'Navigate to appearance settings',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Appearance settings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check appearance:
1. Theme selector (Light/Dark/Auto) - labels in Arabic
2. Language selector (English/Arabic) - properly shown
3. Date format preference in Arabic
4. Back button on RIGHT (RTL)
5. No hardcoded English except language names`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Security ---
    {
      id: 'security-page',
      name: 'Security Settings',
      description: 'Password, 2FA, login history',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account/security`,
          description: 'Navigate to security',
        },
        { type: 'wait', timeout: 5000, description: 'Wait for page' },
        { type: 'screenshot', description: 'Security settings page' },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check security:
1. Security overview/score if shown
2. Password change option in Arabic
3. 2FA toggle with Arabic labels
4. Active sessions list with Arabic labels
5. Back button on RIGHT (RTL)
6. No raw i18n keys
7. No hardcoded English`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Help Page ---
    {
      id: 'help-page',
      name: 'Help Page',
      description: 'Help center and support',
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
          description: 'Check: help center content in Arabic, FAQ items in Arabic, contact options labeled in Arabic, back button on RIGHT, no hardcoded English',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Account Settings Flow', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
