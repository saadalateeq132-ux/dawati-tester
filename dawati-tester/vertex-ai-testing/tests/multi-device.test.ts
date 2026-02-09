import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Multi-Device Viewport Testing
 *
 * Tests the same key pages across different screen sizes:
 * 1. iPhone SE (375x667) - Small phone
 * 2. iPhone 13 Pro (390x844) - Standard phone
 * 3. Samsung Galaxy S21 (360x800) - Android phone
 * 4. iPad (768x1024) - Tablet
 * 5. Desktop (1280x720) - Desktop browser
 *
 * Checks: elements not cut off, text not overflowing,
 * buttons properly sized for touch, layout adapts to size
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const devices = [
    { name: 'iPhone-SE', width: 375, height: 667 },
    { name: 'iPhone-13-Pro', width: 390, height: 844 },
    { name: 'Samsung-S21', width: 360, height: 800 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  const phases: TestPhase[] = [];

  // Test Welcome page on all devices
  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    phases.push({
      id: `welcome-${device.name}`,
      name: `Welcome - ${device.name} (${device.width}x${device.height})`,
      description: `Welcome page on ${device.name}`,
      actions: [
        {
          type: 'resize',
          width: device.width,
          height: device.height,
          description: `Resize to ${device.name} (${device.width}x${device.height})`,
        },
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to welcome page',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait for render',
        },
        {
          type: 'screenshot',
          description: `Welcome ${device.name} ${device.width}x${device.height}`,
        },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check on ${device.name} (${device.width}x${device.height}): logo not cut off, brand name fully visible, buttons properly sized for screen width (min 44px touch target), text not overflowing container, language toggle visible, vendor button fully visible, no horizontal scrollbar, proper spacing between elements`,
        },
        { type: 'rtl', description: 'RTL validation' },
      ],
      // Only first device has no dependency
      dependencies: i > 0 ? [`welcome-${devices[i - 1].name}`] : undefined,
    });
  }

  // Test Login page on all devices
  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    phases.push({
      id: `login-${device.name}`,
      name: `Login - ${device.name} (${device.width}x${device.height})`,
      description: `Login page on ${device.name}`,
      actions: [
        {
          type: 'resize',
          width: device.width,
          height: device.height,
          description: `Resize to ${device.name}`,
        },
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to welcome',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait for welcome',
        },
        {
          type: 'click',
          selector: '[data-testid="welcome-login-button"]',
          description: 'Click login button',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for login page',
        },
        {
          type: 'screenshot',
          description: `Login ${device.name} ${device.width}x${device.height}`,
        },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check on ${device.name}: back button visible and properly positioned, phone input not overflowing, country code + phone side by side (not stacked on small screens unless designed), social buttons not cut off, continue button full-width with adequate padding, checkbox and terms text readable, all touch targets >= 44px`,
        },
        { type: 'rtl', description: 'RTL validation' },
      ],
      dependencies: [`welcome-${device.name}`],
    });
  }

  const result = await orchestrator.runTestSuite('Multi-Device Viewport Test', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
