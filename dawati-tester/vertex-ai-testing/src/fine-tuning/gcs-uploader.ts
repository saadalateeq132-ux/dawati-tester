import { Storage } from '@google-cloud/storage';
import { FineTuningConfig } from '../types';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

export class GCSUploader {
  private storage: Storage;
  private config: FineTuningConfig;
  private uploadCache: Map<string, string> = new Map();

  constructor(config: FineTuningConfig) {
    this.config = config;
    this.storage = new Storage();
  }

  /**
   * Upload a screenshot to GCS with content-addressable naming (SHA-256)
   * Returns the gs:// URI
   */
  async uploadScreenshot(localPath: string): Promise<string> {
    // Check cache first
    const cached = this.uploadCache.get(localPath);
    if (cached) {
      return cached;
    }

    const fileBuffer = fs.readFileSync(localPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const ext = path.extname(localPath) || '.png';
    const gcsPath = `${this.config.gcsPrefix}/screenshots/${hash}${ext}`;

    const bucket = this.storage.bucket(this.config.gcsBucket);
    const file = bucket.file(gcsPath);

    // Check if already uploaded (deduplication)
    const [exists] = await file.exists();
    if (!exists) {
      await file.save(fileBuffer, {
        contentType: `image/${ext.replace('.', '')}`,
        metadata: {
          originalPath: localPath,
          uploadedAt: new Date().toISOString(),
        },
      });
      console.log(`[GCS] Uploaded: ${gcsPath}`);
    } else {
      console.log(`[GCS] Already exists (dedup): ${gcsPath}`);
    }

    const gcsUri = `gs://${this.config.gcsBucket}/${gcsPath}`;
    this.uploadCache.set(localPath, gcsUri);
    return gcsUri;
  }

  /**
   * Upload a JSONL training file to GCS
   */
  async uploadTrainingFile(localPath: string, gcsFileName: string): Promise<string> {
    const gcsPath = `${this.config.gcsPrefix}/training/${gcsFileName}`;
    const bucket = this.storage.bucket(this.config.gcsBucket);
    const file = bucket.file(gcsPath);

    await file.save(fs.readFileSync(localPath), {
      contentType: 'application/jsonl',
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    const gcsUri = `gs://${this.config.gcsBucket}/${gcsPath}`;
    console.log(`[GCS] Training file uploaded: ${gcsUri}`);
    return gcsUri;
  }

  /**
   * Check if a file exists in GCS
   */
  async fileExists(gcsUri: string): Promise<boolean> {
    const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) return false;

    const [, bucketName, filePath] = match;
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  }
}
