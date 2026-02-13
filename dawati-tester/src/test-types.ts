import { BrowserContext } from 'playwright';

export interface TestFlow {
  name: string;
  execute(context: BrowserContext): Promise<TestResult>;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error: string | null;
}

export interface DeviceDescriptor {
  name: string;
  viewport: { width: number; height: number };
  userAgent: string;
}