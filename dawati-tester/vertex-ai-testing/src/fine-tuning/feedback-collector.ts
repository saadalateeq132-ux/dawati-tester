import { FeedbackRecord, PhaseResult, FineTuningConfig, VertexAIResponse } from '../types';
import { FeedbackStore } from './feedback-store';
import * as crypto from 'crypto';

export class FeedbackCollector {
  private config: FineTuningConfig;
  private store: FeedbackStore;

  constructor(config: FineTuningConfig) {
    this.config = config;
    this.store = new FeedbackStore(config.feedbackDir);
  }

  /**
   * Collect feedback from a completed phase result
   */
  collectFromPhaseResult(
    suiteName: string,
    phaseResult: PhaseResult,
    promptText: string,
    modelUsed: string
  ): FeedbackRecord {
    const record: FeedbackRecord = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      suiteName,
      phaseId: phaseResult.phase.id,
      phaseName: phaseResult.phase.name,
      screenshotPath: this.getScreenshotPath(phaseResult),
      promptText,
      originalResponse: this.extractAIResponse(phaseResult),
      modelUsed,
      label: 'pending',
      reviewStatus: 'unreviewed',
    };

    this.store.append(record);
    return record;
  }

  /**
   * Get the feedback store for direct access (review CLI, etc.)
   */
  getStore(): FeedbackStore {
    return this.store;
  }

  private generateId(): string {
    return `fb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private getScreenshotPath(phaseResult: PhaseResult): string {
    // Return the first screenshot from artifacts, or the one from decision metadata
    if (phaseResult.artifacts.screenshots.length > 0) {
      return phaseResult.artifacts.screenshots[phaseResult.artifacts.screenshots.length - 1];
    }
    return phaseResult.decision.metadata.screenshotPath;
  }

  private extractAIResponse(phaseResult: PhaseResult): VertexAIResponse {
    const decision = phaseResult.decision;
    return {
      decision: decision.state,
      confidence: decision.confidence,
      reason: decision.reason,
      issues: decision.issues,
      rtlIssues: [],
      hardcodedText: [],
      imageText: [],
      currencyIssues: [],
      dateIssues: [],
      score: decision.state === 'PASS' ? 8 : decision.state === 'FAIL' ? 3 : 5,
    };
  }
}
