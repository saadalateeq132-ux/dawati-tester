// Shared types for enhanced testing features

export interface DeviceConfig {
  name: string;
  viewport?: { width: number; height: number };
  playwright?: string; // Playwright device name
}

export interface VisualDiff {
  filename: string;
  baselineExists: boolean;
  diffPercentage: number;
  hasSignificantChange: boolean;
  diffImagePath?: string;
}

export interface PerformanceMetric {
  name: string;
  device: string;
  pageLoadTimeMs: number;
  scrollDurationMs?: number;
  timestamp: Date;
}

export interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
  }>;
}

export interface AccessibilityResult {
  page: string;
  device: string;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
  timestamp: Date;
}

export interface TestPlanConfig {
  devices: DeviceConfig[];
  headlessPerDevice: boolean;
  runAllDevices: boolean;
  visualRegression: {
    enabled: boolean;
    diffThreshold: number;
    baselinesDir: string;
  };
  accessibility: {
    enabled: boolean;
    runOnMajorPages: boolean;
    impactLevels: string[];
  };
  execution: {
    timeout: number;
    navigationTimeout: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
}
