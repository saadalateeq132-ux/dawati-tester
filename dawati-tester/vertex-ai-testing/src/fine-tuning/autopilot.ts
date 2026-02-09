import * as fs from 'fs';
import { TestConfig, AutopilotState, FeedbackRecord } from '../types';
import { FeedbackStore } from './feedback-store';
import { DatasetBuilder } from './dataset-builder';
import { FineTuningJobManager } from './fine-tuning-job-manager';

/**
 * Autopilot: Fully automatic fine-tuning loop.
 *
 * After each test suite completes:
 * 1. Auto-review: Mark high-confidence responses as correct, low-confidence as incorrect
 * 2. Auto-build: When enough reviewed records accumulate, build training dataset
 * 3. Auto-tune: Submit fine-tuning job to Vertex AI
 * 4. Auto-switch: When tuning completes, update config to use the tuned model
 */
export class Autopilot {
  private config: TestConfig;
  private store: FeedbackStore;
  private state: AutopilotState;
  private stateFilePath: string;

  constructor(config: TestConfig) {
    this.config = config;
    this.store = new FeedbackStore(config.fineTuning!.feedbackDir);
    this.stateFilePath = config.fineTuning!.autopilot.stateFilePath;
    this.state = this.loadState();
  }

  /**
   * Run the full autopilot cycle after a test suite completes.
   * Called automatically by the TestOrchestrator.
   */
  async runCycle(): Promise<void> {
    const autopilotConfig = this.config.fineTuning!.autopilot;

    console.log(`\n[Autopilot] Starting automatic cycle...`);

    // Step 1: Auto-review unreviewed feedback
    const autoReviewCount = this.autoReview();

    // Step 2: Check if there's an active tuning job and poll its status
    await this.checkActiveTuningJob();

    // Step 3: Check if we have enough reviewed records to build + tune
    const stats = this.store.getStats();
    const reviewedReady = stats.reviewed;

    console.log(`[Autopilot] Feedback: ${stats.total} total, ${stats.unreviewed} unreviewed, ${reviewedReady} reviewed, ${stats.exported} exported`);

    if (reviewedReady >= autopilotConfig.autoTuneAtCount && !this.state.activeTuningJob) {
      // We have enough data and no active job - build dataset and submit tuning
      await this.autoBuildAndTune();
    } else if (reviewedReady < autopilotConfig.autoTuneAtCount) {
      const remaining = autopilotConfig.autoTuneAtCount - reviewedReady;
      console.log(`[Autopilot] Need ${remaining} more reviewed records before auto-tuning (${reviewedReady}/${autopilotConfig.autoTuneAtCount})`);
    } else if (this.state.activeTuningJob) {
      console.log(`[Autopilot] Tuning job already active: ${this.state.activeTuningJob}`);
    }

    console.log(`[Autopilot] Cycle complete.\n`);
  }

  /**
   * Step 1: Auto-review feedback records based on confidence thresholds
   */
  private autoReview(): number {
    const autopilotConfig = this.config.fineTuning!.autopilot;
    const unreviewed = this.store.readByStatus('unreviewed');
    let approved = 0;
    let rejected = 0;
    let skipped = 0;

    for (const record of unreviewed) {
      const confidence = record.originalResponse.confidence;
      const decision = record.originalResponse.decision;

      if (confidence >= autopilotConfig.autoApproveThreshold && decision !== 'UNKNOWN') {
        // High confidence + clear decision → auto-approve as correct
        this.store.updateRecord(record.id, {
          label: 'correct',
          reviewStatus: 'reviewed',
          reviewedAt: new Date().toISOString(),
          reviewerNotes: `Autopilot: approved (confidence ${confidence.toFixed(2)} >= ${autopilotConfig.autoApproveThreshold})`,
        });
        approved++;
        this.state.totalAutoApproved++;
      } else if (confidence <= autopilotConfig.autoRejectThreshold) {
        // Very low confidence → auto-reject (mark incorrect, use inverse decision)
        const correctedDecision = decision === 'PASS' ? 'FAIL' : decision === 'FAIL' ? 'PASS' : 'UNKNOWN';
        this.store.updateRecord(record.id, {
          label: 'incorrect',
          correctedResponse: {
            ...record.originalResponse,
            decision: correctedDecision as any,
            confidence: 0.9,
            reason: `Autopilot correction: original confidence ${confidence.toFixed(2)} was too low, inverted decision from ${decision} to ${correctedDecision}`,
          },
          reviewStatus: 'reviewed',
          reviewedAt: new Date().toISOString(),
          reviewerNotes: `Autopilot: rejected (confidence ${confidence.toFixed(2)} <= ${autopilotConfig.autoRejectThreshold})`,
        });
        rejected++;
        this.state.totalAutoRejected++;
      } else {
        // Medium confidence → skip (leave for manual review or next cycle)
        skipped++;
      }
    }

    if (approved + rejected > 0) {
      console.log(`[Autopilot] Auto-reviewed ${unreviewed.length}: ${approved} approved, ${rejected} rejected, ${skipped} skipped`);
    }

    this.state.lastAutoReviewAt = new Date().toISOString();
    this.saveState();

    return approved + rejected;
  }

  /**
   * Step 2: Check if an active tuning job has completed
   */
  private async checkActiveTuningJob(): Promise<void> {
    if (!this.state.activeTuningJob) return;

    try {
      const manager = new FineTuningJobManager(this.config);
      const job = await manager.getJobStatus(this.state.activeTuningJob);

      console.log(`[Autopilot] Active tuning job: ${job.state}`);

      if (job.state === 'JOB_STATE_SUCCEEDED') {
        console.log(`[Autopilot] Tuning job succeeded!`);

        if (job.tunedModelEndpoint) {
          console.log(`[Autopilot] Tuned model endpoint: ${job.tunedModelEndpoint}`);

          if (this.config.fineTuning!.autopilot.autoSwitchModel) {
            // Auto-switch to tuned model
            this.updateEnvFile('TUNED_MODEL_ENDPOINT', job.tunedModelEndpoint);
            this.state.lastTunedEndpoint = job.tunedModelEndpoint;
            console.log(`[Autopilot] AUTO-SWITCHED to tuned model: ${job.tunedModelEndpoint}`);
            console.log(`[Autopilot] .env updated. New model active on next test run.`);
          } else {
            console.log(`[Autopilot] Auto-switch disabled. Add to .env manually:`);
            console.log(`  TUNED_MODEL_ENDPOINT=${job.tunedModelEndpoint}`);
          }
        }

        this.state.activeTuningJob = undefined;
        this.state.tuningJobsCompleted++;
        this.saveState();
      } else if (job.state === 'JOB_STATE_FAILED') {
        console.error(`[Autopilot] Tuning job FAILED: ${job.error}`);
        this.state.activeTuningJob = undefined;
        this.saveState();
      } else if (job.state === 'JOB_STATE_CANCELLED') {
        console.warn(`[Autopilot] Tuning job was cancelled`);
        this.state.activeTuningJob = undefined;
        this.saveState();
      }
      // PENDING or RUNNING → do nothing, check again next cycle
    } catch (err: any) {
      console.warn(`[Autopilot] Failed to check tuning job status: ${err.message}`);
    }
  }

  /**
   * Step 3: Auto-build dataset and submit tuning job
   */
  private async autoBuildAndTune(): Promise<void> {
    const fineTuningConfig = this.config.fineTuning!;

    if (!fineTuningConfig.gcsBucket) {
      console.warn(`[Autopilot] Cannot auto-tune: GCS_TRAINING_BUCKET not set`);
      return;
    }

    try {
      // Build dataset
      console.log(`[Autopilot] Building training dataset...`);
      const builder = new DatasetBuilder(fineTuningConfig);
      const manifest = await builder.build(false);

      this.state.lastDatasetBuildAt = new Date().toISOString();

      if (!manifest.validation.valid) {
        console.warn(`[Autopilot] Dataset validation failed. Skipping tuning.`);
        for (const err of manifest.validation.errors) {
          console.warn(`  - ${err}`);
        }
        this.saveState();
        return;
      }

      console.log(`[Autopilot] Dataset built: ${manifest.exampleCount} examples`);

      // Submit tuning job
      console.log(`[Autopilot] Submitting fine-tuning job...`);
      const manager = new FineTuningJobManager(this.config);
      const job = await manager.submitJob(manifest);

      this.state.activeTuningJob = job.name;
      this.saveState();

      console.log(`[Autopilot] Tuning job submitted: ${job.name}`);
      console.log(`[Autopilot] Status will be checked on next test run.`);
    } catch (err: any) {
      console.error(`[Autopilot] Auto build/tune failed: ${err.message}`);
    }
  }

  /**
   * Update a value in the .env file
   */
  private updateEnvFile(key: string, value: string): void {
    const envPath = require('path').resolve(__dirname, '../../.env');

    try {
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
      }

      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        // Update existing key
        content = content.replace(regex, `${key}=${value}`);
      } else {
        // Add new key
        content += `\n${key}=${value}\n`;
      }

      fs.writeFileSync(envPath, content, 'utf-8');
      console.log(`[Autopilot] Updated .env: ${key}=${value}`);
    } catch (err: any) {
      console.warn(`[Autopilot] Failed to update .env: ${err.message}`);
      console.log(`[Autopilot] Manually set: ${key}=${value}`);
    }
  }

  /**
   * Load autopilot state from disk
   */
  private loadState(): AutopilotState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        return JSON.parse(fs.readFileSync(this.stateFilePath, 'utf-8'));
      }
    } catch {
      // Start fresh
    }

    return {
      totalAutoApproved: 0,
      totalAutoRejected: 0,
      tuningJobsCompleted: 0,
    };
  }

  /**
   * Save autopilot state to disk
   */
  private saveState(): void {
    const dir = require('path').dirname(this.stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  /**
   * Get current autopilot state (for status display)
   */
  getState(): AutopilotState {
    return { ...this.state };
  }
}
