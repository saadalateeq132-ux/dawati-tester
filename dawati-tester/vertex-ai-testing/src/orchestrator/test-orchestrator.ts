import { TestConfig, TestPhase, PhaseResult, TestSuiteResult } from '../types';
import { BrowserManager } from '../playwright/browser-manager';
import { GeminiClient } from '../vertex-ai/gemini-client';
import { ResponseParser } from '../decision-engine/response-parser';
import { RTLIntegration } from '../rtl-checker/rtl-integration';
import { BaselineManager } from '../visual-regression/baseline-manager';
import { PIIMasker } from '../artifact-manager/pii-masker';
import { HTMLReporter } from '../reporter/html-reporter';
import { FeedbackCollector } from '../fine-tuning/feedback-collector';
import { Autopilot } from '../fine-tuning/autopilot';

/**
 * Main orchestrator that coordinates all testing components
 */
export class TestOrchestrator {
  private config: TestConfig;
  private browserManager: BrowserManager;
  private geminiClient: GeminiClient;
  private responseParser: ResponseParser;
  private baselineManager: BaselineManager;
  private piiMasker: PIIMasker;
  private reporter: HTMLReporter;
  private feedbackCollector: FeedbackCollector | null = null;
  private autopilot: Autopilot | null = null;
  private currentSuiteName: string = '';

  constructor(config: TestConfig) {
    this.config = config;
    this.browserManager = new BrowserManager(config);
    this.geminiClient = new GeminiClient(config);
    this.responseParser = new ResponseParser(this.browserManager);
    this.baselineManager = new BaselineManager(config);
    this.piiMasker = new PIIMasker(config);
    this.reporter = new HTMLReporter(config);

    // Initialize feedback collector if fine-tuning is enabled
    if (config.fineTuning?.enabled) {
      this.feedbackCollector = new FeedbackCollector(config.fineTuning);
      console.log(`[Orchestrator] Feedback collection enabled`);

      // Initialize autopilot if enabled
      if (config.fineTuning.autopilot?.enabled) {
        this.autopilot = new Autopilot(config);
        console.log(`[Orchestrator] Autopilot enabled (auto-review + auto-tune)`);
      }
    }
  }

  /**
   * Run complete test suite
   */
  async runTestSuite(suiteName: string, phases: TestPhase[]): Promise<TestSuiteResult> {
    console.log(`\n========================================`);
    console.log(`🧪 Starting Test Suite: ${suiteName}`);
    console.log(`========================================\n`);

    const startTime = new Date();
    const phaseResults: PhaseResult[] = [];
    this.currentSuiteName = suiteName;

    try {
      // Launch browser
      await this.browserManager.launch();

      // Execute phases sequentially (respecting dependencies)
      for (const phase of phases) {
        console.log(`\n--- Phase: ${phase.name} ---`);

        // Check dependencies
        if (phase.dependencies && phase.dependencies.length > 0) {
          const dependenciesMet = this.checkDependencies(phase.dependencies, phaseResults);
          if (!dependenciesMet) {
            console.log(`⏭️  Skipping phase: Dependencies not met`);
            phaseResults.push(this.createSkippedResult(phase, 'Dependencies not met'));
            continue;
          }
        }

        // Execute phase
        const phaseResult = await this.executePhase(phase);
        phaseResults.push(phaseResult);

        // Stop if critical failure
        if (
          phaseResult.status === 'failed' &&
          phaseResult.decision.issues.some((i) => i.severity === 'critical')
        ) {
          console.log(`❌ Critical failure detected. Stopping test suite.`);
          break;
        }
      }
    } catch (error: any) {
      console.error(`❌ Test suite failed: ${error.message}`);
    } finally {
      // Close browser
      await this.browserManager.close();
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Calculate statistics
    const passedPhases = phaseResults.filter((p) => p.status === 'passed').length;
    const failedPhases = phaseResults.filter((p) => p.status === 'failed').length;
    const unknownPhases = phaseResults.filter((p) => p.status === 'unknown').length;
    const skippedPhases = phaseResults.filter((p) => p.status === 'skipped').length;

    const overallStatus: 'passed' | 'failed' | 'partial' =
      failedPhases === 0 && unknownPhases === 0
        ? 'passed'
        : failedPhases === phaseResults.length
        ? 'failed'
        : 'partial';

    // Calculate total cost
    const totalTokens = phaseResults.reduce((sum, p) => sum + p.decision.metadata.tokensUsed, 0);
    const totalCost = this.calculateCost(totalTokens);

    const summary = this.generateSummary(phaseResults, overallStatus);

    const result: TestSuiteResult = {
      suiteName,
      startTime,
      endTime,
      duration,
      phaseResults,
      overallStatus,
      totalPhases: phases.length,
      passedPhases,
      failedPhases,
      unknownPhases,
      skippedPhases,
      totalCost,
      totalTokens,
      summary,
    };

    // Generate report
    const reportPath = this.reporter.generateReport(result);

    console.log(`\n========================================`);
    console.log(`Test Suite Complete: ${overallStatus.toUpperCase()}`);
    console.log(`========================================`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Passed: ${passedPhases}/${phases.length}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`Report: ${reportPath}`);
    console.log(`========================================\n`);

    // Run autopilot cycle (auto-review, auto-build, auto-tune)
    if (this.autopilot) {
      try {
        await this.autopilot.runCycle();
      } catch (apError: any) {
        console.warn(`[Orchestrator] Autopilot cycle failed: ${apError.message}`);
      }
    }

    return result;
  }

  /**
   * Execute a single test phase
   */
  private async executePhase(phase: TestPhase): Promise<PhaseResult> {
    const startTime = Date.now();

    try {
      this.browserManager.clearArtifacts();

      // Execute actions
      for (const action of phase.actions) {
        await this.browserManager.executeAction(action);
      }

      // Capture screenshot
      const screenshotPath = await this.browserManager.captureScreenshot(phase.name);

      // Capture HTML for PII masking
      const htmlPath = await this.browserManager.captureHTML();

      // Mask PII in HTML
      const maskedHtmlPath = htmlPath.replace('.html', '-masked.html');
      this.piiMasker.saveMaskedHTML(
        require('fs').readFileSync(htmlPath, 'utf-8'),
        maskedHtmlPath
      );

      // Analyze with Vertex AI
      console.log(`[Orchestrator] Analyzing with Vertex AI...`);
      const aiResponse = await this.geminiClient.analyzeSingle(screenshotPath, phase.name);

      // Parse to decision
      const decision = await this.responseParser.parseToDecision(
        aiResponse,
        phase.name,
        screenshotPath,
        0, // Token count updated below
        Date.now() - startTime
      );

      // Run RTL checks if enabled
      let rtlResult = undefined;
      if (this.config.rtl.enabled) {
        console.log(`[Orchestrator] Running RTL checks...`);
        const page = await this.browserManager['page']; // Access private page
        const rtlChecker = new RTLIntegration(page!);
        rtlResult = await rtlChecker.runComprehensiveChecks();
      }

      // Run visual regression if enabled
      let visualResult = undefined;
      if (this.config.visualRegression.enabled) {
        console.log(`[Orchestrator] Running visual regression...`);
        const baselineName = phase.id;
        visualResult = await this.baselineManager.compareWithBaseline(
          screenshotPath,
          baselineName
        );
      }

      // Determine phase status
      const status =
        decision.state === 'PASS' ? 'passed' :
        decision.state === 'FAIL' ? 'failed' : 'unknown';

      const duration = Date.now() - startTime;

      console.log(`[Orchestrator] Phase complete: ${phase.name} (${status})`);

      const phaseResult: PhaseResult = {
        phase,
        status,
        duration,
        decision,
        rtlResult,
        visualResult,
        artifacts: this.browserManager.getArtifacts(),
      };

      // Collect feedback for fine-tuning pipeline
      if (this.feedbackCollector) {
        try {
          const promptText = this.geminiClient.getLastPromptText();
          this.feedbackCollector.collectFromPhaseResult(
            this.currentSuiteName,
            phaseResult,
            promptText,
            this.config.model
          );
        } catch (fbError: any) {
          console.warn(`[Orchestrator] Feedback collection failed: ${fbError.message}`);
        }
      }

      return phaseResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Phase failed: ${phase.name} - ${error.message}`);

      return {
        phase,
        status: 'failed',
        duration,
        decision: {
          state: 'FAIL',
          confidence: 1.0,
          reason: `Phase execution failed: ${error.message}`,
          issues: [
            {
              id: `ERROR-${Date.now()}`,
              severity: 'critical',
              category: 'functionality',
              title: 'Phase execution error',
              description: error.message,
              suggestion: 'Check browser logs and stack trace',
              confidence: 1.0,
            },
          ],
          metadata: {
            timestamp: new Date(),
            phase: phase.name,
            screenshotPath: '',
            modelUsed: 'none',
            tokensUsed: 0,
            latencyMs: duration,
          },
        },
        artifacts: this.browserManager.getArtifacts(),
        error: error.message,
      };
    }
  }

  /**
   * Check if phase dependencies are met
   */
  private checkDependencies(dependencies: string[], phaseResults: PhaseResult[]): boolean {
    for (const depId of dependencies) {
      const depResult = phaseResults.find((r) => r.phase.id === depId);
      // Only skip if dependency was skipped or had a critical execution error
      // AI-detected issues (failed/unknown) should NOT block dependent phases
      if (!depResult || depResult.status === 'skipped') {
        return false;
      }
      // Block only if there was a critical execution error (page crash, 404, etc.)
      if (depResult.status === 'failed' && depResult.error) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create skipped phase result
   */
  private createSkippedResult(phase: TestPhase, reason: string): PhaseResult {
    return {
      phase,
      status: 'skipped',
      duration: 0,
      decision: {
        state: 'UNKNOWN',
        confidence: 0,
        reason,
        issues: [],
        metadata: {
          timestamp: new Date(),
          phase: phase.name,
          screenshotPath: '',
          modelUsed: 'none',
          tokensUsed: 0,
          latencyMs: 0,
        },
      },
      artifacts: {
        screenshots: [],
        htmlSnapshots: [],
        networkLogs: [],
        consoleLogs: [],
        errors: [],
      },
    };
  }

  /**
   * Calculate cost based on tokens used
   * Gemini 2.0 Flash pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens
   */
  private calculateCost(totalTokens: number): number {
    // Assume 70% input, 30% output
    const inputTokens = totalTokens * 0.7;
    const outputTokens = totalTokens * 0.3;

    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.3;

    return inputCost + outputCost;
  }

  /**
   * Generate summary text
   */
  private generateSummary(phaseResults: PhaseResult[], overallStatus: string): string {
    const criticalIssues = phaseResults.flatMap((p) =>
      p.decision.issues.filter((i) => i.severity === 'critical')
    );

    if (overallStatus === 'passed') {
      return '🎉 All phases passed successfully! No critical issues detected.';
    } else if (criticalIssues.length > 0) {
      return `❌ Test suite failed with ${criticalIssues.length} critical issue(s). Review the report for details.`;
    } else {
      return `⚠️  Test suite completed with some issues. Review the report for details.`;
    }
  }
}
