import * as fs from 'fs';
import * as path from 'path';
import { FeedbackRecord, FeedbackReviewStatus } from '../types';

export class FeedbackStore {
  private feedbackDir: string;
  private filePath: string;

  constructor(feedbackDir: string) {
    this.feedbackDir = feedbackDir;
    this.filePath = path.join(feedbackDir, 'feedback-records.jsonl');

    // Create feedback directory if it doesn't exist
    if (!fs.existsSync(this.feedbackDir)) {
      fs.mkdirSync(this.feedbackDir, { recursive: true });
    }

    // Create reviewed subdirectory
    const reviewedDir = path.join(this.feedbackDir, 'reviewed');
    if (!fs.existsSync(reviewedDir)) {
      fs.mkdirSync(reviewedDir, { recursive: true });
    }
  }

  /**
   * Append a feedback record to the JSONL file
   */
  append(record: FeedbackRecord): void {
    const line = JSON.stringify(record) + '\n';
    fs.appendFileSync(this.filePath, line, 'utf-8');
    console.log(`[FeedbackStore] Recorded feedback: ${record.id} (${record.phaseName})`);
  }

  /**
   * Read all feedback records
   */
  readAll(): FeedbackRecord[] {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    const content = fs.readFileSync(this.filePath, 'utf-8').trim();
    if (!content) {
      return [];
    }

    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as FeedbackRecord);
  }

  /**
   * Read records filtered by review status
   */
  readByStatus(status: FeedbackReviewStatus): FeedbackRecord[] {
    return this.readAll().filter((r) => r.reviewStatus === status);
  }

  /**
   * Update a single record by ID
   */
  updateRecord(id: string, updates: Partial<FeedbackRecord>): boolean {
    const records = this.readAll();
    const index = records.findIndex((r) => r.id === id);

    if (index === -1) {
      console.warn(`[FeedbackStore] Record not found: ${id}`);
      return false;
    }

    records[index] = { ...records[index], ...updates };
    this.writeAll(records);
    console.log(`[FeedbackStore] Updated record: ${id}`);
    return true;
  }

  /**
   * Get statistics about feedback records
   */
  getStats(): { total: number; unreviewed: number; reviewed: number; exported: number; correct: number; incorrect: number } {
    const records = this.readAll();
    return {
      total: records.length,
      unreviewed: records.filter((r) => r.reviewStatus === 'unreviewed').length,
      reviewed: records.filter((r) => r.reviewStatus === 'reviewed').length,
      exported: records.filter((r) => r.reviewStatus === 'exported').length,
      correct: records.filter((r) => r.label === 'correct').length,
      incorrect: records.filter((r) => r.label === 'incorrect').length,
    };
  }

  /**
   * Rewrite the entire JSONL file (used after updates)
   */
  private writeAll(records: FeedbackRecord[]): void {
    const content = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(this.filePath, content, 'utf-8');
  }
}
