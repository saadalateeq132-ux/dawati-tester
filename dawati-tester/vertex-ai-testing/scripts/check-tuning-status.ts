import { FineTuningJobManager } from '../src/fine-tuning/fine-tuning-job-manager';
import { loadConfig } from '../src/config/default-config';

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.fineTuning) {
    console.error('Fine-tuning config not found. Check your .env file.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const manager = new FineTuningJobManager(config);

  if (args.includes('--list')) {
    // List all jobs
    const jobs = await manager.listJobs();

    if (jobs.length === 0) {
      console.log('No tuning jobs found.');
      return;
    }

    console.log('=== Fine-Tuning Jobs ===\n');
    for (const job of jobs) {
      console.log(`Name:     ${job.name}`);
      console.log(`Status:   ${job.state}`);
      console.log(`Model:    ${job.baseModel}`);
      console.log(`Created:  ${job.createTime}`);
      if (job.endTime) console.log(`Ended:    ${job.endTime}`);
      if (job.tunedModelEndpoint) console.log(`Endpoint: ${job.tunedModelEndpoint}`);
      if (job.error) console.log(`Error:    ${job.error}`);
      console.log('---');
    }
    return;
  }

  // Check specific job
  const jobArg = args.indexOf('--job');
  if (jobArg !== -1 && args[jobArg + 1]) {
    const jobName = args[jobArg + 1];
    const job = await manager.getJobStatus(jobName);

    console.log('=== Job Status ===');
    console.log(`Name:     ${job.name}`);
    console.log(`Status:   ${job.state}`);
    console.log(`Model:    ${job.baseModel}`);
    console.log(`Created:  ${job.createTime}`);
    console.log(`Epochs:   ${job.hyperParameters.epochCount}`);
    console.log(`Adapter:  ${job.hyperParameters.adapterSize}`);
    if (job.endTime) console.log(`Ended:    ${job.endTime}`);
    if (job.tunedModelEndpoint) {
      console.log(`\nTuned Model Endpoint: ${job.tunedModelEndpoint}`);
      console.log(`\nAdd to .env: TUNED_MODEL_ENDPOINT=${job.tunedModelEndpoint}`);
    }
    if (job.error) console.log(`\nError: ${job.error}`);

    // Optionally wait
    if (args.includes('--wait') && (job.state === 'JOB_STATE_PENDING' || job.state === 'JOB_STATE_RUNNING')) {
      console.log('\nWaiting for completion...');
      const completed = await manager.pollUntilComplete(jobName);
      console.log(`\nFinal Status: ${completed.state}`);
      if (completed.tunedModelEndpoint) {
        console.log(`Tuned Model Endpoint: ${completed.tunedModelEndpoint}`);
      }
    }
    return;
  }

  // Default: list latest
  const jobs = await manager.listJobs();
  if (jobs.length === 0) {
    console.log('No tuning jobs found. Run: npm run tuning:submit');
    return;
  }

  const latest = jobs[0];
  console.log('=== Latest Job ===');
  console.log(`Name:     ${latest.name}`);
  console.log(`Status:   ${latest.state}`);
  console.log(`Model:    ${latest.baseModel}`);
  console.log(`Created:  ${latest.createTime}`);
  if (latest.tunedModelEndpoint) {
    console.log(`\nTuned Model Endpoint: ${latest.tunedModelEndpoint}`);
    console.log(`\nAdd to .env: TUNED_MODEL_ENDPOINT=${latest.tunedModelEndpoint}`);
  }
  if (latest.error) console.log(`\nError: ${latest.error}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
