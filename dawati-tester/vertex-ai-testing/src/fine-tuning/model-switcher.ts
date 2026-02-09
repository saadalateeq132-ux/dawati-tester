import { TestConfig, VertexAIResponse, ABTestResult } from '../types';
import { GeminiClient } from '../vertex-ai/gemini-client';

export class ModelSwitcher {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  /**
   * Check if a tuned model is configured
   */
  hasTunedModel(): boolean {
    return !!this.config.fineTuning?.tunedModelEndpoint;
  }

  /**
   * Check if A/B testing should run
   */
  shouldRunABTest(): boolean {
    return (
      !!this.config.fineTuning?.abTestingEnabled &&
      this.hasTunedModel()
    );
  }

  /**
   * Get which model to use for analysis
   */
  getActiveModel(): { model: string; isTuned: boolean } {
    if (this.hasTunedModel()) {
      return {
        model: this.config.fineTuning!.tunedModelEndpoint!,
        isTuned: true,
      };
    }
    return {
      model: this.config.model,
      isTuned: false,
    };
  }

  /**
   * Run both base and tuned models in parallel for comparison
   */
  async runABComparison(
    screenshotPath: string,
    phase: string,
    phaseId: string,
    client: GeminiClient
  ): Promise<ABTestResult> {
    console.log(`[ModelSwitcher] Running A/B test for phase: ${phase}`);

    // Run both models in parallel
    const [baseResult, tunedResult] = await Promise.all([
      client.analyzeWithModel(screenshotPath, phase, false),
      client.analyzeWithModel(screenshotPath, phase, true).catch((err) => {
        console.warn(`[ModelSwitcher] Tuned model failed, using base: ${err.message}`);
        return null;
      }),
    ]);

    // If tuned model failed, fall back to base model result
    if (!tunedResult) {
      return {
        phaseId,
        baseModelResponse: baseResult.response,
        tunedModelResponse: baseResult.response,
        baseModelLatencyMs: baseResult.latencyMs,
        tunedModelLatencyMs: 0,
        baseModelTokens: baseResult.tokensUsed,
        tunedModelTokens: 0,
        selectedModel: 'base',
        agreement: 'agree',
      };
    }

    // Compare decisions
    const agreement =
      baseResult.response.decision === tunedResult.response.decision
        ? 'agree' as const
        : 'disagree' as const;

    // Select best response
    const selectedModel = this.selectBestModel(baseResult.response, tunedResult.response);

    console.log(
      `[ModelSwitcher] A/B result: base=${baseResult.response.decision}(${baseResult.response.confidence.toFixed(2)}), ` +
      `tuned=${tunedResult.response.decision}(${tunedResult.response.confidence.toFixed(2)}), ` +
      `selected=${selectedModel}, agreement=${agreement}`
    );

    return {
      phaseId,
      baseModelResponse: baseResult.response,
      tunedModelResponse: tunedResult.response,
      baseModelLatencyMs: baseResult.latencyMs,
      tunedModelLatencyMs: tunedResult.latencyMs,
      baseModelTokens: baseResult.tokensUsed,
      tunedModelTokens: tunedResult.tokensUsed,
      selectedModel,
      agreement,
    };
  }

  /**
   * Select the best response between base and tuned models
   */
  private selectBestModel(
    baseResponse: VertexAIResponse,
    tunedResponse: VertexAIResponse
  ): 'base' | 'tuned' {
    // Prefer tuned model unless it returns UNKNOWN or has significantly lower confidence
    if (tunedResponse.decision === 'UNKNOWN' && baseResponse.decision !== 'UNKNOWN') {
      return 'base';
    }

    if (tunedResponse.confidence < baseResponse.confidence - 0.2) {
      return 'base';
    }

    // Default: prefer tuned model (it was trained on corrected data)
    return 'tuned';
  }
}
