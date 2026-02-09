import * as fs from 'fs';
import * as path from 'path';
import { FineTuningConfig, FeedbackRecord, TrainingExample, DatasetManifest } from '../types';
import { FeedbackStore } from './feedback-store';
import { GCSUploader } from './gcs-uploader';
import { DatasetValidator } from './dataset-validator';

const SYSTEM_INSTRUCTION = `You are an expert QA tester analyzing screenshots from the Dawati event planning app (Saudi Arabia). Analyze each screenshot for:

1. UI/UX Issues: Layout problems, visual bugs, text overflow, missing elements
2. Functionality Issues: Error pages (404, 500), broken elements, incomplete states
3. RTL Issues (COMPREHENSIVE for Saudi Arabia):
   - Text direction (right-to-left for Arabic)
   - Hardcoded English/Arabic text (should use i18n keys)
   - BiDi text handling (mixed Arabic/English)
   - Currency: SAR/ر.س MUST be after number
   - Dates: Hijri calendar support, DD/MM/YYYY
   - Layout expansion: 30% for Arabic text
   - Icon alignment: Directional icons should flip in RTL
4. Image Text (OCR): Read text in images/graphics
5. Accessibility: Labels, contrast, touch targets

Respond in JSON with: decision (PASS/FAIL/UNKNOWN), confidence, reason, issues array, rtlIssues, hardcodedText, imageText, currencyIssues, dateIssues, score (0-10).`;

export class DatasetBuilder {
  private config: FineTuningConfig;
  private store: FeedbackStore;
  private uploader: GCSUploader;
  private validator: DatasetValidator;

  constructor(config: FineTuningConfig) {
    this.config = config;
    this.store = new FeedbackStore(config.feedbackDir);
    this.uploader = new GCSUploader(config);
    this.validator = new DatasetValidator(config.minTrainingExamples);
  }

  /**
   * Build a training dataset from reviewed feedback records
   */
  async build(dryRun: boolean = false): Promise<DatasetManifest> {
    console.log('[DatasetBuilder] Starting dataset build...');

    // Get reviewed records
    const reviewed = this.store.readByStatus('reviewed');
    console.log(`[DatasetBuilder] Found ${reviewed.length} reviewed records`);

    // Filter to usable records (correct + incorrect with corrections)
    const usable = reviewed.filter(
      (r) => r.label === 'correct' || (r.label === 'incorrect' && r.correctedResponse)
    );
    console.log(`[DatasetBuilder] ${usable.length} usable for training`);

    // Build training examples
    const examples: TrainingExample[] = [];
    const gcsImageUris: string[] = [];
    const feedbackRecordIds: string[] = [];

    for (const record of usable) {
      try {
        // Upload screenshot to GCS (or skip in dry run)
        let gcsUri = `gs://${this.config.gcsBucket}/${this.config.gcsPrefix}/screenshots/placeholder.png`;

        if (!dryRun) {
          if (!fs.existsSync(record.screenshotPath)) {
            console.warn(`[DatasetBuilder] Screenshot not found: ${record.screenshotPath}, skipping`);
            continue;
          }
          gcsUri = await this.uploader.uploadScreenshot(record.screenshotPath);
        }

        gcsImageUris.push(gcsUri);

        // Determine the ground truth response
        const groundTruth = record.label === 'incorrect' && record.correctedResponse
          ? record.correctedResponse
          : record.originalResponse;

        // Build training example
        const example: TrainingExample = {
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    mimeType: 'image/png',
                    fileUri: gcsUri,
                  },
                },
                {
                  text: record.promptText,
                },
              ],
            },
            {
              role: 'model',
              parts: [
                {
                  text: JSON.stringify(groundTruth),
                },
              ],
            },
          ],
        };

        examples.push(example);
        feedbackRecordIds.push(record.id);
      } catch (err: any) {
        console.warn(`[DatasetBuilder] Failed to process record ${record.id}: ${err.message}`);
      }
    }

    // Validate
    const validation = this.validator.validate(examples);
    console.log(`\n[DatasetBuilder] Validation:`);
    console.log(`  Valid: ${validation.valid}`);
    console.log(`  Examples: ${validation.exampleCount}`);
    console.log(`  Distribution: PASS=${validation.labelDistribution.pass}, FAIL=${validation.labelDistribution.fail}, UNKNOWN=${validation.labelDistribution.unknown}`);

    if (validation.errors.length > 0) {
      console.log(`  Errors:`);
      for (const err of validation.errors) {
        console.log(`    - ${err}`);
      }
    }
    if (validation.warnings.length > 0) {
      console.log(`  Warnings:`);
      for (const warn of validation.warnings) {
        console.log(`    - ${warn}`);
      }
    }

    // Write JSONL file
    const buildId = `build-${Date.now()}`;
    const buildDir = path.join(this.config.trainingDataDir, buildId);

    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    const jsonlPath = path.join(buildDir, 'training.jsonl');
    const jsonlContent = examples.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(jsonlPath, jsonlContent, 'utf-8');
    console.log(`[DatasetBuilder] JSONL written: ${jsonlPath} (${examples.length} examples)`);

    // Upload JSONL to GCS
    let gcsTrainingFileUri = '';
    if (!dryRun && validation.valid) {
      gcsTrainingFileUri = await this.uploader.uploadTrainingFile(
        jsonlPath,
        `${buildId}/training.jsonl`
      );

      // Mark records as exported
      for (const id of feedbackRecordIds) {
        this.store.updateRecord(id, { reviewStatus: 'exported' });
      }
    }

    // Write manifest
    const manifest: DatasetManifest = {
      buildId,
      builtAt: new Date().toISOString(),
      exampleCount: examples.length,
      screenshotCount: new Set(gcsImageUris).size,
      gcsTrainingFileUri,
      gcsImageUris: [...new Set(gcsImageUris)],
      feedbackRecordIds,
      validation,
    };

    const manifestPath = path.join(buildDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`[DatasetBuilder] Manifest written: ${manifestPath}`);

    return manifest;
  }
}
