import { TrainingExample, DatasetValidationResult } from '../types';

export class DatasetValidator {
  private minExamples: number;

  constructor(minExamples: number = 100) {
    this.minExamples = minExamples;
  }

  /**
   * Validate a set of training examples before submitting to Vertex AI
   */
  validate(examples: TrainingExample[]): DatasetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const labelDistribution = { pass: 0, fail: 0, unknown: 0 };

    // Check minimum count
    if (examples.length < this.minExamples) {
      errors.push(
        `Insufficient examples: ${examples.length} (minimum: ${this.minExamples})`
      );
    }

    // Validate each example
    const seenHashes = new Set<string>();

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      const prefix = `Example ${i + 1}`;

      // Check system instruction
      if (!example.systemInstruction?.parts?.[0]?.text) {
        errors.push(`${prefix}: Missing system instruction`);
      }

      // Check contents structure
      if (!example.contents || example.contents.length < 2) {
        errors.push(`${prefix}: Must have at least user and model turns`);
        continue;
      }

      // Check user turn
      const userTurn = example.contents.find((c) => c.role === 'user');
      if (!userTurn) {
        errors.push(`${prefix}: Missing user turn`);
        continue;
      }

      // Check for image in user turn
      const hasImage = userTurn.parts.some(
        (p) => 'fileData' in p && p.fileData?.fileUri
      );
      if (!hasImage) {
        errors.push(`${prefix}: User turn must contain an image (fileData)`);
      }

      // Check for text prompt in user turn
      const hasText = userTurn.parts.some((p) => 'text' in p && p.text);
      if (!hasText) {
        errors.push(`${prefix}: User turn must contain a text prompt`);
      }

      // Check model turn
      const modelTurn = example.contents.find((c) => c.role === 'model');
      if (!modelTurn) {
        errors.push(`${prefix}: Missing model turn`);
        continue;
      }

      // Validate model response is valid JSON
      const modelText = modelTurn.parts.find((p) => 'text' in p);
      if (modelText && 'text' in modelText) {
        try {
          const parsed = JSON.parse(modelText.text);

          // Track label distribution
          const decision = (parsed.decision || '').toUpperCase();
          if (decision === 'PASS') labelDistribution.pass++;
          else if (decision === 'FAIL') labelDistribution.fail++;
          else labelDistribution.unknown++;

          // Validate response structure
          if (!parsed.decision) {
            warnings.push(`${prefix}: Model response missing 'decision' field`);
          }
          if (typeof parsed.confidence !== 'number') {
            warnings.push(`${prefix}: Model response missing 'confidence' field`);
          }
        } catch {
          errors.push(`${prefix}: Model response is not valid JSON`);
        }
      }

      // Check for duplicates
      const imageUri = userTurn.parts
        .filter((p) => 'fileData' in p)
        .map((p) => ('fileData' in p ? p.fileData?.fileUri : ''))
        .join(',');
      if (seenHashes.has(imageUri)) {
        warnings.push(`${prefix}: Duplicate screenshot URI detected`);
      }
      seenHashes.add(imageUri);
    }

    // Check label distribution balance
    const total = labelDistribution.pass + labelDistribution.fail + labelDistribution.unknown;
    if (total > 0) {
      const passRatio = labelDistribution.pass / total;
      const failRatio = labelDistribution.fail / total;
      if (passRatio > 0.9) {
        warnings.push(
          `Label imbalance: ${(passRatio * 100).toFixed(0)}% PASS. Consider adding more FAIL examples.`
        );
      }
      if (failRatio > 0.9) {
        warnings.push(
          `Label imbalance: ${(failRatio * 100).toFixed(0)}% FAIL. Consider adding more PASS examples.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      exampleCount: examples.length,
      errors,
      warnings,
      labelDistribution,
    };
  }
}
