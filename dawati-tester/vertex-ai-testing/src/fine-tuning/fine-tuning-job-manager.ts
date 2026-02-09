import { TestConfig, TuningJob, TuningJobStatus, DatasetManifest } from '../types';
import { GoogleAuth } from 'google-auth-library';

export class FineTuningJobManager {
  private config: TestConfig;
  private auth: GoogleAuth;

  constructor(config: TestConfig) {
    this.config = config;
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  /**
   * Submit a new fine-tuning job to Vertex AI
   */
  async submitJob(manifest: DatasetManifest): Promise<TuningJob> {
    const tuningConfig = this.config.fineTuning!;
    const region = tuningConfig.tuningRegion;
    const projectId = this.config.projectId;

    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/tuningJobs`;

    const displayName = `dawati-qa-${manifest.buildId}`;

    // Map adapter size to API enum
    const adapterSizeMap: Record<number, string> = {
      1: 'ADAPTER_SIZE_ONE',
      4: 'ADAPTER_SIZE_FOUR',
      8: 'ADAPTER_SIZE_EIGHT',
      16: 'ADAPTER_SIZE_SIXTEEN',
    };

    const body = {
      baseModel: tuningConfig.tuningBaseModel,
      supervisedTuningSpec: {
        trainingDatasetUri: manifest.gcsTrainingFileUri,
        hyperParameters: {
          epochCount: tuningConfig.epochs,
          learningRateMultiplier: tuningConfig.learningRateMultiplier,
          adapterSize: adapterSizeMap[tuningConfig.adapterSize] || 'ADAPTER_SIZE_FOUR',
        },
      },
      tunedModelDisplayName: displayName,
    };

    console.log(`[FineTuning] Submitting job to ${region}...`);
    console.log(`[FineTuning] Base model: ${tuningConfig.tuningBaseModel}`);
    console.log(`[FineTuning] Training data: ${manifest.gcsTrainingFileUri}`);
    console.log(`[FineTuning] Epochs: ${tuningConfig.epochs}, Adapter: ${tuningConfig.adapterSize}`);

    const client = await this.auth.getClient();
    const response = await client.request({
      url,
      method: 'POST',
      data: body,
    });

    const data = response.data as any;

    const job: TuningJob = {
      name: data.name,
      state: data.state || 'JOB_STATE_PENDING',
      createTime: data.createTime,
      baseModel: tuningConfig.tuningBaseModel,
      trainingDatasetUri: manifest.gcsTrainingFileUri,
      tunedModelDisplayName: displayName,
      hyperParameters: {
        epochCount: tuningConfig.epochs,
        learningRateMultiplier: tuningConfig.learningRateMultiplier,
        adapterSize: tuningConfig.adapterSize,
      },
    };

    console.log(`[FineTuning] Job submitted: ${job.name}`);
    return job;
  }

  /**
   * Get the status of a fine-tuning job
   */
  async getJobStatus(jobName: string): Promise<TuningJob> {
    const url = `https://${this.config.fineTuning!.tuningRegion}-aiplatform.googleapis.com/v1/${jobName}`;

    const client = await this.auth.getClient();
    const response = await client.request({ url, method: 'GET' });
    const data = response.data as any;

    return {
      name: data.name,
      state: data.state as TuningJobStatus,
      createTime: data.createTime,
      endTime: data.endTime,
      baseModel: data.baseModel,
      trainingDatasetUri: data.supervisedTuningSpec?.trainingDatasetUri || '',
      tunedModelEndpoint: data.tunedModelEndpointName || data.tunedModel?.endpoint,
      tunedModelDisplayName: data.tunedModelDisplayName,
      error: data.error?.message,
      hyperParameters: {
        epochCount: data.supervisedTuningSpec?.hyperParameters?.epochCount || 0,
        learningRateMultiplier: data.supervisedTuningSpec?.hyperParameters?.learningRateMultiplier || 0,
        adapterSize: data.supervisedTuningSpec?.hyperParameters?.adapterSize || 0,
      },
    };
  }

  /**
   * Poll until job completes
   */
  async pollUntilComplete(jobName: string, intervalMs: number = 30000): Promise<TuningJob> {
    console.log(`[FineTuning] Polling job status every ${intervalMs / 1000}s...`);

    while (true) {
      const job = await this.getJobStatus(jobName);
      console.log(`[FineTuning] Status: ${job.state} (${new Date().toISOString()})`);

      if (
        job.state === 'JOB_STATE_SUCCEEDED' ||
        job.state === 'JOB_STATE_FAILED' ||
        job.state === 'JOB_STATE_CANCELLED'
      ) {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * List all tuning jobs for this project
   */
  async listJobs(): Promise<TuningJob[]> {
    const tuningConfig = this.config.fineTuning!;
    const region = tuningConfig.tuningRegion;
    const projectId = this.config.projectId;

    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/tuningJobs`;

    const client = await this.auth.getClient();
    const response = await client.request({ url, method: 'GET' });
    const data = response.data as any;

    return (data.tuningJobs || []).map((j: any) => ({
      name: j.name,
      state: j.state as TuningJobStatus,
      createTime: j.createTime,
      endTime: j.endTime,
      baseModel: j.baseModel,
      trainingDatasetUri: j.supervisedTuningSpec?.trainingDatasetUri || '',
      tunedModelEndpoint: j.tunedModelEndpointName || j.tunedModel?.endpoint,
      tunedModelDisplayName: j.tunedModelDisplayName,
      error: j.error?.message,
      hyperParameters: {
        epochCount: j.supervisedTuningSpec?.hyperParameters?.epochCount || 0,
        learningRateMultiplier: j.supervisedTuningSpec?.hyperParameters?.learningRateMultiplier || 0,
        adapterSize: j.supervisedTuningSpec?.hyperParameters?.adapterSize || 0,
      },
    }));
  }

  /**
   * Cancel a running fine-tuning job
   */
  async cancelJob(jobName: string): Promise<void> {
    const url = `https://${this.config.fineTuning!.tuningRegion}-aiplatform.googleapis.com/v1/${jobName}:cancel`;

    const client = await this.auth.getClient();
    await client.request({ url, method: 'POST' });
    console.log(`[FineTuning] Job cancelled: ${jobName}`);
  }
}
