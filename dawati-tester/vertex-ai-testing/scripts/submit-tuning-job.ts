import * as fs from 'fs';
import * as path from 'path';
import { FineTuningJobManager } from '../src/fine-tuning/fine-tuning-job-manager';
import { DatasetManifest } from '../src/types';
import { loadConfig } from '../src/config/default-config';

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.fineTuning) {
    console.error('Fine-tuning config not found. Check your .env file.');
    process.exit(1);
  }

  const args = process.argv.slice(2);

  // Find the manifest to use
  let manifestPath: string;

  const manifestArg = args.indexOf('--manifest');
  if (manifestArg !== -1 && args[manifestArg + 1]) {
    manifestPath = args[manifestArg + 1];
  } else {
    // Find the latest build
    const trainingDir = config.fineTuning.trainingDataDir;
    if (!fs.existsSync(trainingDir)) {
      console.error(`No training data directory found: ${trainingDir}`);
      console.error('Run: npm run dataset:build first');
      process.exit(1);
    }

    const builds = fs.readdirSync(trainingDir)
      .filter((d) => d.startsWith('build-'))
      .sort()
      .reverse();

    if (builds.length === 0) {
      console.error('No builds found. Run: npm run dataset:build first');
      process.exit(1);
    }

    manifestPath = path.join(trainingDir, builds[0], 'manifest.json');
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifest: DatasetManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log('=== Fine-Tuning Job Submission ===');
  console.log(`Build:      ${manifest.buildId}`);
  console.log(`Examples:   ${manifest.exampleCount}`);
  console.log(`GCS File:   ${manifest.gcsTrainingFileUri}`);
  console.log(`Valid:      ${manifest.validation.valid}`);

  if (!manifest.validation.valid) {
    console.error('\nDataset is not valid. Fix errors before submitting.');
    process.exit(1);
  }

  if (!manifest.gcsTrainingFileUri) {
    console.error('\nNo GCS training file URI. Run: npm run dataset:build (without --dry-run)');
    process.exit(1);
  }

  const manager = new FineTuningJobManager(config);
  const job = await manager.submitJob(manifest);

  console.log('\n=== Job Submitted ===');
  console.log(`Job Name:   ${job.name}`);
  console.log(`Status:     ${job.state}`);
  console.log(`Created:    ${job.createTime}`);
  console.log('\nTo check status: npm run tuning:status');

  // Optionally wait for completion
  if (args.includes('--wait')) {
    console.log('\nWaiting for job to complete...');
    const completed = await manager.pollUntilComplete(job.name);

    console.log('\n=== Job Complete ===');
    console.log(`Status:     ${completed.state}`);
    console.log(`End Time:   ${completed.endTime}`);

    if (completed.state === 'JOB_STATE_SUCCEEDED' && completed.tunedModelEndpoint) {
      console.log(`\nTuned Model Endpoint: ${completed.tunedModelEndpoint}`);
      console.log(`\nAdd to .env: TUNED_MODEL_ENDPOINT=${completed.tunedModelEndpoint}`);
    } else if (completed.error) {
      console.error(`\nError: ${completed.error}`);
    }
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
