import { DatasetBuilder } from '../src/fine-tuning/dataset-builder';
import { loadConfig } from '../src/config/default-config';

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.fineTuning) {
    console.error('Fine-tuning config not found. Check your .env file.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('[build-dataset] DRY RUN mode - no uploads will be performed\n');
  }

  if (!dryRun && !config.fineTuning.gcsBucket) {
    console.error('GCS_TRAINING_BUCKET is required. Set it in your .env file.');
    process.exit(1);
  }

  const builder = new DatasetBuilder(config.fineTuning);
  const manifest = await builder.build(dryRun);

  console.log('\n=== Build Summary ===');
  console.log(`Build ID:       ${manifest.buildId}`);
  console.log(`Examples:       ${manifest.exampleCount}`);
  console.log(`Screenshots:    ${manifest.screenshotCount}`);
  console.log(`Valid:          ${manifest.validation.valid}`);

  if (manifest.gcsTrainingFileUri) {
    console.log(`GCS JSONL:      ${manifest.gcsTrainingFileUri}`);
  }

  if (!manifest.validation.valid) {
    console.log('\nDataset is NOT valid. Fix errors before submitting a tuning job.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDry run complete. Remove --dry-run to upload to GCS.');
  } else {
    console.log('\nDataset ready. Run: npm run tuning:submit');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
