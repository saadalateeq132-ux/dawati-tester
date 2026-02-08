import { devices, Browser, BrowserContext, Page } from 'playwright';
import { DeviceConfig } from './types';
import { createChildLogger } from './logger';

const log = createChildLogger('device-manager');

export interface DeviceContext {
  name: string;
  context: BrowserContext;
  page: Page;
  viewport: { width: number; height: number };
}

let currentDeviceName: string = 'Desktop 1280x720';

export function setCurrentDevice(name: string): void {
  currentDeviceName = name;
}

export function getCurrentDevice(): string {
  return currentDeviceName;
}

export function sanitizeDeviceName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

export async function createDeviceContext(
  browser: Browser,
  deviceConfig: DeviceConfig,
  options: { locale?: string; timezoneId?: string } = {}
): Promise<DeviceContext> {
  const { locale = 'ar-SA', timezoneId = 'Asia/Riyadh' } = options;

  let contextOptions: Parameters<Browser['newContext']>[0] = {
    locale,
    timezoneId,
  };

  if (deviceConfig.playwright) {
    // Use Playwright's built-in device descriptor
    const deviceDescriptor = devices[deviceConfig.playwright];
    if (deviceDescriptor) {
      contextOptions = {
        ...deviceDescriptor,
        ...contextOptions,
      };
      log.info({ device: deviceConfig.name, playwright: deviceConfig.playwright }, 'Using Playwright device');
    } else {
      log.warn({ device: deviceConfig.playwright }, 'Playwright device not found, using custom viewport');
      contextOptions.viewport = deviceConfig.viewport || { width: 1280, height: 720 };
    }
  } else if (deviceConfig.viewport) {
    contextOptions.viewport = deviceConfig.viewport;
  } else {
    contextOptions.viewport = { width: 1280, height: 720 };
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Set timeouts
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(90000);

  const viewport = contextOptions.viewport || { width: 1280, height: 720 };

  log.info(
    { device: deviceConfig.name, viewport },
    'Device context created'
  );

  return {
    name: deviceConfig.name,
    context,
    page,
    viewport,
  };
}

export async function closeDeviceContext(deviceContext: DeviceContext): Promise<void> {
  try {
    await deviceContext.page.close();
    await deviceContext.context.close();
    log.info({ device: deviceContext.name }, 'Device context closed');
  } catch (error) {
    log.warn({ device: deviceContext.name, error }, 'Error closing device context');
  }
}

export function getDefaultDevices(): DeviceConfig[] {
  return [
    { name: 'Desktop 1280x720', viewport: { width: 1280, height: 720 } },
  ];
}

export function parseDeviceConfigs(configs: DeviceConfig[] | undefined): DeviceConfig[] {
  if (!configs || configs.length === 0) {
    return getDefaultDevices();
  }
  return configs;
}
