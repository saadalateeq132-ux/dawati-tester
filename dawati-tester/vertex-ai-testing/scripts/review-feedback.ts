import * as readline from 'readline';
import { FeedbackStore } from '../src/fine-tuning/feedback-store';
import { FeedbackRecord, VertexAIResponse } from '../src/types';
import { loadConfig } from '../src/config/default-config';

const config = loadConfig();
const feedbackDir = config.fineTuning?.feedbackDir || 'feedback';
const store = new FeedbackStore(feedbackDir);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function showStats(): Promise<void> {
  const stats = store.getStats();
  console.log('\n=== Feedback Statistics ===');
  console.log(`Total records:   ${stats.total}`);
  console.log(`Unreviewed:      ${stats.unreviewed}`);
  console.log(`Reviewed:        ${stats.reviewed}`);
  console.log(`Exported:        ${stats.exported}`);
  console.log(`Marked correct:  ${stats.correct}`);
  console.log(`Marked incorrect: ${stats.incorrect}`);
  console.log('==========================\n');
}

function displayRecord(record: FeedbackRecord, index: number, total: number): void {
  console.log(`\n--- Record ${index + 1}/${total} ---`);
  console.log(`ID:          ${record.id}`);
  console.log(`Phase:       ${record.phaseName}`);
  console.log(`Suite:       ${record.suiteName}`);
  console.log(`Screenshot:  ${record.screenshotPath}`);
  console.log(`Model:       ${record.modelUsed}`);
  console.log(`Timestamp:   ${record.timestamp}`);
  console.log(`\nAI Decision: ${record.originalResponse.decision}`);
  console.log(`Confidence:  ${record.originalResponse.confidence}`);
  console.log(`Score:       ${record.originalResponse.score}/10`);
  console.log(`Reason:      ${record.originalResponse.reason}`);

  if (record.originalResponse.issues.length > 0) {
    console.log(`\nIssues (${record.originalResponse.issues.length}):`);
    for (const issue of record.originalResponse.issues) {
      console.log(`  [${issue.severity}] ${issue.title}: ${issue.description}`);
    }
  }

  if (record.originalResponse.rtlIssues.length > 0) {
    console.log(`\nRTL Issues: ${record.originalResponse.rtlIssues.join(', ')}`);
  }

  if (record.originalResponse.hardcodedText.length > 0) {
    console.log(`Hardcoded Text: ${record.originalResponse.hardcodedText.join(', ')}`);
  }
}

async function reviewRecords(): Promise<void> {
  const unreviewed = store.readByStatus('unreviewed');

  if (unreviewed.length === 0) {
    console.log('\nNo unreviewed feedback records found.');
    return;
  }

  console.log(`\nFound ${unreviewed.length} unreviewed record(s). Starting review...\n`);

  for (let i = 0; i < unreviewed.length; i++) {
    const record = unreviewed[i];
    displayRecord(record, i, unreviewed.length);

    const action = await ask('\n[c]orrect / [i]ncorrect / [s]kip / [q]uit: ');

    switch (action.toLowerCase().trim()) {
      case 'c':
        store.updateRecord(record.id, {
          label: 'correct',
          reviewStatus: 'reviewed',
          reviewedAt: new Date().toISOString(),
        });
        console.log('Marked as CORRECT.');
        break;

      case 'i': {
        // Ask for corrected decision
        const correctedDecision = await ask(
          'Corrected decision [PASS/FAIL/UNKNOWN]: '
        );
        const decision = correctedDecision.toUpperCase().trim() as 'PASS' | 'FAIL' | 'UNKNOWN';

        if (!['PASS', 'FAIL', 'UNKNOWN'].includes(decision)) {
          console.log('Invalid decision. Skipping.');
          break;
        }

        const notes = await ask('Notes (optional, press Enter to skip): ');

        // Build corrected response based on original + corrections
        const correctedResponse: VertexAIResponse = {
          ...record.originalResponse,
          decision,
          confidence: 0.95, // High confidence for human-corrected data
          reason: notes || `Human corrected from ${record.originalResponse.decision} to ${decision}`,
        };

        // Ask if issues should be cleared (for false positives)
        if (decision === 'PASS' && record.originalResponse.issues.length > 0) {
          const clearIssues = await ask(
            `Clear ${record.originalResponse.issues.length} reported issues? [y/n]: `
          );
          if (clearIssues.toLowerCase().trim() === 'y') {
            correctedResponse.issues = [];
            correctedResponse.score = 9;
          }
        }

        store.updateRecord(record.id, {
          label: 'incorrect',
          correctedResponse,
          reviewerNotes: notes || undefined,
          reviewStatus: 'reviewed',
          reviewedAt: new Date().toISOString(),
        });
        console.log(`Marked as INCORRECT. Corrected to ${decision}.`);
        break;
      }

      case 's':
        console.log('Skipped.');
        break;

      case 'q':
        console.log('Quitting review.');
        rl.close();
        return;

      default:
        console.log('Unknown action. Skipping.');
    }
  }

  console.log('\nReview complete!');
  await showStats();
}

async function autoReview(): Promise<void> {
  const threshold = parseFloat(process.argv[3] || '0.9');
  const unreviewed = store.readByStatus('unreviewed');
  let autoApproved = 0;

  for (const record of unreviewed) {
    if (record.originalResponse.confidence >= threshold) {
      store.updateRecord(record.id, {
        label: 'correct',
        reviewStatus: 'reviewed',
        reviewedAt: new Date().toISOString(),
        reviewerNotes: `Auto-approved: confidence ${record.originalResponse.confidence} >= ${threshold}`,
      });
      autoApproved++;
    }
  }

  console.log(`\nAuto-approved ${autoApproved}/${unreviewed.length} records (confidence >= ${threshold})`);
  await showStats();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--stats')) {
    await showStats();
  } else if (args.includes('--auto')) {
    await autoReview();
  } else {
    await showStats();
    await reviewRecords();
  }

  rl.close();
}

main().catch((err) => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});
