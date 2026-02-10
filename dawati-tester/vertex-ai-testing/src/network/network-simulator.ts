/**
 * Network Simulator: Offline, Slow 3G, API Timeout Testing
 *
 * Simulates:
 * - Offline mode (disconnected)
 * - Slow 3G (Saudi mobile network)
 * - Fast 3G
 * - API timeouts
 * - Verifies graceful degradation
 */

import { Page, Route } from 'playwright';
import { NetworkProfile, NetworkSimulationResult } from '../types';

export const NETWORK_PROFILES: Record<string, NetworkProfile> = {
  offline: { name: 'Offline', downloadKbps: 0, uploadKbps: 0, latencyMs: 0 },
  slow3g: { name: 'Slow 3G', downloadKbps: 500, uploadKbps: 500, latencyMs: 2000 },
  fast3g: { name: 'Fast 3G', downloadKbps: 1500, uploadKbps: 750, latencyMs: 563 },
  good4g: { name: '4G', downloadKbps: 4000, uploadKbps: 3000, latencyMs: 170 },
  apiTimeout: { name: 'API Timeout', downloadKbps: 4000, uploadKbps: 3000, latencyMs: 30000 },
};

export class NetworkSimulator {
  private page: Page;
  private activeRoutes: Array<(route: Route) => Promise<void>> = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Enable network throttling with a specific profile
   */
  async enableThrottling(profile: NetworkProfile): Promise<void> {
    console.log(`[NetworkSimulator] Enabling ${profile.name} network profile`);

    if (profile.name === 'Offline') {
      // Block all requests
      const handler = async (route: Route) => {
        await route.abort('internetdisconnected');
      };
      await this.page.route('**/*', handler);
      this.activeRoutes.push(handler);
    } else if (profile.name === 'API Timeout') {
      // Only slow down API requests
      const handler = async (route: Route) => {
        const url = route.request().url();
        if (this.isAPICall(url)) {
          await new Promise(resolve => setTimeout(resolve, profile.latencyMs));
          await route.continue();
        } else {
          await route.continue();
        }
      };
      await this.page.route('**/*', handler);
      this.activeRoutes.push(handler);
    } else {
      // Throttle with latency
      const handler = async (route: Route) => {
        await new Promise(resolve => setTimeout(resolve, profile.latencyMs));
        await route.continue();
      };
      await this.page.route('**/*', handler);
      this.activeRoutes.push(handler);
    }
  }

  /**
   * Disable all network throttling
   */
  async disableThrottling(): Promise<void> {
    await this.page.unrouteAll({ behavior: 'wait' });
    this.activeRoutes = [];
    console.log('[NetworkSimulator] Network throttling disabled');
  }

  /**
   * Test offline behavior: check for graceful error handling
   */
  async testOfflineBehavior(url: string): Promise<NetworkSimulationResult> {
    console.log(`[NetworkSimulator] Testing offline behavior at ${url}`);

    // Enable offline mode
    await this.enableThrottling(NETWORK_PROFILES.offline);

    try {
      // Try to navigate
      await this.page.goto(url, { timeout: 10000 }).catch(() => { /* expected to fail */ });
      await this.page.waitForTimeout(2000);

      // Check what the page shows
      const offlineBehavior = await this.page.evaluate(() => {
        const text = document.body?.innerText?.toLowerCase() || '';
        // Check for graceful offline messages
        if (text.includes('offline') || text.includes('غير متصل') || text.includes('لا يوجد اتصال') ||
            text.includes('no connection') || text.includes('no internet')) {
          return 'graceful';
        }
        // Check for default browser error page
        if (text.includes('err_internet_disconnected') || text.includes('this site can') ||
            text.length < 50) {
          return 'error-page';
        }
        return 'no-handling';
      });

      await this.disableThrottling();

      return {
        profile: 'Offline',
        pagesLoaded: 0,
        avgLoadTimeMs: 0,
        failedLoads: 1,
        offlineBehavior: offlineBehavior as NetworkSimulationResult['offlineBehavior'],
        summary: `Offline behavior: ${offlineBehavior}`,
      };
    } catch {
      await this.disableThrottling();
      return {
        profile: 'Offline',
        pagesLoaded: 0,
        avgLoadTimeMs: 0,
        failedLoads: 1,
        offlineBehavior: 'error-page',
        summary: 'Offline test: page failed to handle offline state',
      };
    }
  }

  /**
   * Test slow network: measure load time under throttling
   */
  async testSlowNetwork(url: string, profile: NetworkProfile): Promise<NetworkSimulationResult> {
    console.log(`[NetworkSimulator] Testing ${profile.name} at ${url}`);

    await this.enableThrottling(profile);

    const startTime = Date.now();
    let loadSuccess = false;

    try {
      await this.page.goto(url, { timeout: 30000, waitUntil: 'load' });
      loadSuccess = true;
    } catch {
      // Load failed under slow network
    }

    const loadTimeMs = Date.now() - startTime;
    await this.disableThrottling();

    return {
      profile: profile.name,
      pagesLoaded: loadSuccess ? 1 : 0,
      avgLoadTimeMs: loadTimeMs,
      failedLoads: loadSuccess ? 0 : 1,
      offlineBehavior: 'graceful', // N/A for slow network
      summary: `${profile.name}: ${loadSuccess ? 'loaded' : 'failed'} in ${loadTimeMs}ms`,
    };
  }

  private isAPICall(url: string): boolean {
    if (url.includes('/api/') || url.includes('/graphql') || url.includes('/rest/')) return true;
    if (url.includes('.json') && !url.includes('manifest.json')) return true;
    if (url.includes('googleapis.com') || url.includes('firebase')) return true;
    return false;
  }
}
