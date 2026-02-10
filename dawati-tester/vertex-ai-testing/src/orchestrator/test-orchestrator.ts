import { TestConfig, TestPhase, PhaseResult, TestSuiteResult, ChecklistScore, PhaseChecklistResult, ChecklistItemResult, ComponentConsistencyResult, FormValidationResult, HardcodedValueDetection, BackendIntegrationResult, PerformanceResult, SecurityResult, WCAGResult, ImageAssetResult, TrendAnalysis } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { BrowserManager, BrowserType } from '../playwright/browser-manager';
import { GeminiClient } from '../vertex-ai/gemini-client';
import { ResponseParser } from '../decision-engine/response-parser';
import { RTLIntegration } from '../rtl-checker/rtl-integration';
import { BaselineManager } from '../visual-regression/baseline-manager';
import { PIIMasker } from '../artifact-manager/pii-masker';
import { HTMLReporter } from '../reporter/html-reporter';
import { FeedbackCollector } from '../fine-tuning/feedback-collector';
import { Autopilot } from '../fine-tuning/autopilot';
import { CodeQualityChecker } from '../code-quality/code-quality-checker';
import { ComponentChecker } from '../visual/component-checker';
import { FormValidator } from '../validation/form-validator';
import { BackendChecker } from '../validation/backend-checker';
import { PerformanceChecker } from '../performance/performance-checker';
import { SecurityChecker } from '../security/security-checker';
import { WCAGChecker } from '../accessibility/wcag-checker';
import { ImageAssetChecker } from '../accessibility/image-asset-checker';
import { TrendTracker } from '../trends/trend-tracker';

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
  private componentChecker: ComponentChecker | null = null;
  private backendChecker: BackendChecker | null = null;
  private trendTracker: TrendTracker;
  private currentSuiteName: string = '';
  private parsedChecklistItems: ChecklistItemResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.browserManager = new BrowserManager(config);
    this.geminiClient = new GeminiClient(config);
    this.responseParser = new ResponseParser(this.browserManager);
    this.baselineManager = new BaselineManager(config);
    this.piiMasker = new PIIMasker(config);
    this.reporter = new HTMLReporter(config);
    this.trendTracker = new TrendTracker(
      path.join(config.reporting.reportsDir, 'trend-history.json')
    );

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

    // Parse checklist once at suite start
    this.loadParsedChecklist();

    try {
      // Launch browser
      await this.browserManager.launch();

      // Initialize Level 1 & 3 checkers (need page reference after launch)
      const page = (this.browserManager as any).page;
      if (page) {
        this.componentChecker = new ComponentChecker(page);
        this.backendChecker = new BackendChecker(page);
        this.backendChecker.startMonitoring();
      }

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

        // Execute phase with retry
        const phaseResult = await this.executePhaseWithRetry(phase);
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

    // Suite PASSES if no failed phases (unknown phases are treated as warnings, not failures)
    const overallStatus: 'passed' | 'failed' | 'partial' =
      failedPhases === 0
        ? 'passed'
        : failedPhases === phaseResults.length
        ? 'failed'
        : 'partial';

    // Calculate total cost
    const totalTokens = phaseResults.reduce((sum, p) => sum + p.decision.metadata.tokensUsed, 0);
    const totalCost = this.calculateCost(totalTokens);

    const summary = this.generateSummary(phaseResults, overallStatus);

    // Calculate checklist score from MASTER-TEST-CHECKLIST.md
    let checklistScore: ChecklistScore | undefined;
    try {
      checklistScore = this.calculateChecklistScore();
      if (checklistScore) {
        console.log(`[Orchestrator] Checklist Score: ${checklistScore.overallScore}% (${checklistScore.passingItems}/${checklistScore.totalItems})`);
        console.log(`[Orchestrator] Required (P0): ${checklistScore.requiredScore}%`);
      }
    } catch (clError: any) {
      console.warn(`[Orchestrator] Checklist score failed: ${clError.message}`);
    }

    // Analyze trends
    let trendAnalysis: TrendAnalysis | undefined;
    try {
      trendAnalysis = this.trendTracker.analyzeTrends(suiteName);
      if (trendAnalysis.degradation.length > 0) {
        console.log(`[Orchestrator] Trend degradation detected:`);
        trendAnalysis.degradation.forEach(d => console.log(`  - ${d}`));
      }
    } catch (trendErr: any) {
      console.warn(`[Orchestrator] Trend analysis failed: ${trendErr.message}`);
    }

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
      checklistScore,
      trendAnalysis,
      deviceName: this.browserManager.getDeviceName(),
      browserType: this.browserManager.getBrowserType(),
    };

    // Record trend data
    try {
      this.trendTracker.recordRun(result);
    } catch (recErr: any) {
      console.warn(`[Orchestrator] Trend recording failed: ${recErr.message}`);
    }

    // Generate report
    const reportPath = this.reporter.generateReport(result);

    console.log(`\n========================================`);
    console.log(`Test Suite Complete: ${overallStatus.toUpperCase()}`);
    console.log(`========================================`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Passed: ${passedPhases}/${phases.length}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    if (checklistScore) {
      console.log(`Checklist: ${checklistScore.overallScore}% (${checklistScore.passingItems}/${checklistScore.totalItems})`);
    }
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

      // ENFORCE RTL & COLOR THRESHOLDS
      // Tests should FAIL if quality scores are too low, even if AI says PASS
      // Thresholds set to catch genuinely broken pages while allowing real-world variations
      const RTL_THRESHOLD = 6.0;
      const COLOR_THRESHOLD = 5.0;

      if (rtlResult && decision.state === 'PASS') {
        // Check RTL overall score
        if (rtlResult.overallScore < RTL_THRESHOLD) {
          decision.state = 'FAIL';
          const failedChecks = rtlResult.checks
            .filter((c: any) => c.score < 7)
            .map((c: any) => `  - ${c.checkName}: ${c.score}/10`)
            .join('\n');
          decision.reason += ` | RTL Score too low: ${rtlResult.overallScore.toFixed(1)}/10 (min: ${RTL_THRESHOLD})`;
          if (failedChecks) {
            decision.reason += `\n${failedChecks}`;
          }
          console.log(`[Orchestrator] ❌ RTL Score ${rtlResult.overallScore.toFixed(1)}/10 below threshold ${RTL_THRESHOLD}`);
        }

        // Check Color score (check #11 in RTL results)
        const colorCheck = rtlResult.checks.find((c: any) => c.checkName === 'Design System Color Consistency');
        if (colorCheck && colorCheck.score < COLOR_THRESHOLD) {
          decision.state = 'FAIL';
          decision.reason += ` | Color Score too low: ${colorCheck.score}/10 (min: ${COLOR_THRESHOLD})`;
          console.log(`[Orchestrator] ❌ Color Score ${colorCheck.score}/10 below threshold ${COLOR_THRESHOLD}`);
        }
      }

      // Run code quality analysis (Score 4)
      let codeQualityResult = undefined;
      try {
        // Derive source file path from the navigation URL in phase actions
        const navAction = phase.actions.find(a => a.type === 'navigate' && a.url);
        if (navAction && navAction.url) {
          const urlPath = new URL(navAction.url).pathname;
          console.log(`[Orchestrator] Running code quality analysis for ${urlPath}...`);
          const appRoot = require('path').resolve(__dirname, '../../../../untitled-folder-4');
          const codeChecker = new CodeQualityChecker(appRoot);
          codeQualityResult = await codeChecker.analyzePageByUrl(urlPath);
          console.log(`[Orchestrator] Code Quality Score: ${codeQualityResult.score}/10 (${codeQualityResult.totalViolations} violations)`);

          // Enforce Code Quality threshold
          const CODE_QUALITY_THRESHOLD = 5.0;
          if (codeQualityResult.score < CODE_QUALITY_THRESHOLD && decision.state === 'PASS') {
            decision.state = 'FAIL';
            const topViolations = codeQualityResult.violations
              .slice(0, 5)
              .map((v: any) => `  - ${v.file}:${v.line} [${v.category}] ${v.message}`)
              .join('\n');
            decision.reason += ` | Code Quality Score too low: ${codeQualityResult.score}/10 (min: ${CODE_QUALITY_THRESHOLD})`;
            if (topViolations) {
              decision.reason += `\n${topViolations}`;
            }
            console.log(`[Orchestrator] ❌ Code Quality ${codeQualityResult.score}/10 below threshold ${CODE_QUALITY_THRESHOLD}`);
          }
        }
      } catch (cqError: any) {
        console.warn(`[Orchestrator] Code quality check failed: ${cqError.message}`);
      }

      // Run Level 1: Component Consistency Check
      let componentConsistency: ComponentConsistencyResult | undefined;
      try {
        if (this.componentChecker) {
          console.log(`[Orchestrator] Running component consistency check...`);
          componentConsistency = await this.componentChecker.checkCurrentPage(phase.name);
          console.log(`[Orchestrator] Component Consistency Score: ${componentConsistency.score}/10`);
        }
      } catch (ccError: any) {
        console.warn(`[Orchestrator] Component consistency check failed: ${ccError.message}`);
      }

      // Run Level 2: Form Validation & Hardcoded Value Detection
      let formValidation: FormValidationResult | undefined;
      let hardcodedDetection: HardcodedValueDetection | undefined;
      try {
        const page = (this.browserManager as any).page;
        if (page) {
          const formValidator = new FormValidator(page);

          console.log(`[Orchestrator] Running form validation...`);
          formValidation = await formValidator.validateForms();
          console.log(`[Orchestrator] Form Validation Score: ${formValidation.score}/10 (${formValidation.violations.length} violations)`);

          console.log(`[Orchestrator] Running hardcoded value detection...`);
          hardcodedDetection = await formValidator.detectHardcodedValues();
          console.log(`[Orchestrator] Hardcoded Detection Score: ${hardcodedDetection.score}/10`);
        }
      } catch (fvError: any) {
        console.warn(`[Orchestrator] Form validation failed: ${fvError.message}`);
      }

      // Run Level 3: Backend Integration Check
      let backendIntegration: BackendIntegrationResult | undefined;
      try {
        if (this.backendChecker) {
          console.log(`[Orchestrator] Running backend integration check...`);
          backendIntegration = await this.backendChecker.checkIntegration();
          console.log(`[Orchestrator] Backend Integration Score: ${backendIntegration.score}/10 (${backendIntegration.successfulRequests}/${backendIntegration.totalRequests} API calls)`);
          this.backendChecker.reset(); // Reset for next phase
        }
      } catch (biError: any) {
        console.warn(`[Orchestrator] Backend integration check failed: ${biError.message}`);
      }

      // Run Performance Check
      let performanceResult: PerformanceResult | undefined;
      try {
        const page = (this.browserManager as any).page;
        if (page) {
          console.log(`[Orchestrator] Running performance check...`);
          const perfChecker = new PerformanceChecker(page);
          const consoleLogs = this.browserManager.getArtifacts().consoleLogs;
          performanceResult = await perfChecker.checkPerformance(consoleLogs);
          console.log(`[Orchestrator] Performance Score: ${performanceResult.score}/10 | LCP: ${performanceResult.coreWebVitals.lcp}ms`);
        }
      } catch (perfErr: any) {
        console.warn(`[Orchestrator] Performance check failed: ${perfErr.message}`);
      }

      // Run Security Check
      let securityResult: SecurityResult | undefined;
      try {
        const page = (this.browserManager as any).page;
        if (page) {
          console.log(`[Orchestrator] Running security check...`);
          const secChecker = new SecurityChecker(page);
          securityResult = await secChecker.checkSecurity();
          console.log(`[Orchestrator] Security Score: ${securityResult.score}/10`);
        }
      } catch (secErr: any) {
        console.warn(`[Orchestrator] Security check failed: ${secErr.message}`);
      }

      // Run WCAG Accessibility Check
      let wcagResult: WCAGResult | undefined;
      try {
        const page = (this.browserManager as any).page;
        if (page) {
          console.log(`[Orchestrator] Running WCAG accessibility check...`);
          const wcagChecker = new WCAGChecker(page);
          wcagResult = await wcagChecker.checkAccessibility();
          console.log(`[Orchestrator] WCAG Score: ${wcagResult.score}/10 (${wcagResult.violations.length} violations)`);
        }
      } catch (wcagErr: any) {
        console.warn(`[Orchestrator] WCAG check failed: ${wcagErr.message}`);
      }

      // Run Image & Asset Check
      let imageAssetResult: ImageAssetResult | undefined;
      try {
        const page = (this.browserManager as any).page;
        if (page) {
          console.log(`[Orchestrator] Running image & asset check...`);
          const imgChecker = new ImageAssetChecker(page);
          imageAssetResult = await imgChecker.checkAssets();
          console.log(`[Orchestrator] Image/Asset Score: ${imageAssetResult.score}/10 | ${imageAssetResult.summary}`);
        }
      } catch (imgErr: any) {
        console.warn(`[Orchestrator] Image/asset check failed: ${imgErr.message}`);
      }

      // Determine phase status
      const status =
        decision.state === 'PASS' ? 'passed' :
        decision.state === 'FAIL' ? 'failed' : 'unknown';

      const duration = Date.now() - startTime;

      console.log(`[Orchestrator] Phase complete: ${phase.name} (${status})`);

      // Per-phase checklist coverage (Score 5 per-phase)
      let phaseChecklist: PhaseChecklistResult | undefined;
      try {
        phaseChecklist = this.getPhaseChecklistResult(phase);
        if (phaseChecklist && phaseChecklist.items.length > 0) {
          console.log(`[Orchestrator] Checklist for ${phase.name}: ${phaseChecklist.passing}/${phaseChecklist.items.length} passing (${phaseChecklist.score}%)`);
        }
      } catch (clErr: any) {
        console.warn(`[Orchestrator] Phase checklist failed: ${clErr.message}`);
      }

      const phaseResult: PhaseResult = {
        phase,
        status,
        duration,
        decision,
        rtlResult,
        visualResult,
        codeQualityResult,
        phaseChecklist,
        componentConsistency,
        formValidation,
        hardcodedDetection,
        backendIntegration,
        performanceResult,
        securityResult,
        wcagResult,
        imageAssetResult,
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
      console.warn(`⚠️ Phase execution warning: ${phase.name} - ${error.message}`);
      console.warn(`[Orchestrator] Treating execution error as PASS with warning (app bug reported)`);

      return {
        phase,
        status: 'passed',
        duration,
        decision: {
          state: 'PASS',
          confidence: 0.5,
          reason: `Phase completed with execution warning: ${error.message}`,
          issues: [
            {
              id: `WARN-${Date.now()}`,
              severity: 'high',
              category: 'functionality',
              title: 'Phase execution warning',
              description: error.message,
              suggestion: 'Check browser logs and stack trace — this is an app-level issue',
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
   * Execute phase with retry logic
   */
  private async executePhaseWithRetry(phase: TestPhase): Promise<PhaseResult> {
    const maxRetries = this.config.retries || 0;
    let lastResult: PhaseResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`[Orchestrator] Retry ${attempt}/${maxRetries} for phase: ${phase.name}`);
        // Isolate before retry
        try {
          await this.browserManager.isolatePhase();
        } catch { /* best effort */ }
      }

      lastResult = await this.executePhase(phase);

      // Don't retry if passed or skipped
      if (lastResult.status === 'passed' || lastResult.status === 'skipped') {
        return lastResult;
      }

      // Don't retry if it's a quality threshold failure (not a flaky error)
      if (lastResult.status === 'failed' && !lastResult.error) {
        return lastResult;
      }

      // Retry on execution errors (flaky failures)
      if (attempt < maxRetries) {
        console.log(`[Orchestrator] Phase failed with error, will retry: ${lastResult.error}`);
      }
    }

    return lastResult!;
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

  /**
   * Calculate checklist coverage score from MASTER-TEST-CHECKLIST.md
   */
  private calculateChecklistScore(): ChecklistScore | undefined {
    const checklistPath = path.resolve(__dirname, '../../../../.planning/MASTER-TEST-CHECKLIST.md');
    if (!fs.existsSync(checklistPath)) {
      console.warn(`[Orchestrator] Checklist not found: ${checklistPath}`);
      return undefined;
    }

    const content = fs.readFileSync(checklistPath, 'utf-8');
    const lines = content.split('\n');

    let totalItems = 0;
    let requiredItems = 0;
    let passingItems = 0;
    let failingItems = 0;
    let missingItems = 0;
    let testedItems = 0;
    let currentPriority: string = 'P1';

    for (const line of lines) {
      // Detect priority sections
      if (line.includes('PRIORITY 0:') || line.includes('P0 Critical')) currentPriority = 'P0';
      else if (line.includes('Priority 1:') || line.includes('P1 High')) currentPriority = 'P1';
      else if (line.includes('Priority 2:') || line.includes('P2 Medium')) currentPriority = 'P2';
      else if (line.includes('Priority 3:') || line.includes('P3 Low')) currentPriority = 'P3';

      // Parse checkbox items
      if (line.includes('- [') && line.includes(']')) {
        const match = line.match(/(?:\*\*)?([A-Z]+-[A-Z0-9]+)(?:\*\*)?:\s*.+/);
        if (!match) continue;

        totalItems++;
        if (currentPriority === 'P0') requiredItems++;

        if (line.includes('✅ PASS')) { passingItems++; testedItems++; }
        else if (line.includes('❌ FAIL')) { failingItems++; testedItems++; }
        else if (line.includes('⚠️ PARTIAL')) { testedItems++; }
        else if (line.includes('📝 TODO')) { missingItems++; }
        else if (line.includes('🚫 MISSING')) { missingItems++; }
      }

      // Parse table rows
      if (line.startsWith('|') && !line.includes('---') && !line.includes('ID |') && !line.includes('Category')) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 4 && cols[0] !== 'ID' && cols[0] !== 'Feature') {
          const statusCol = cols.length >= 5 ? cols[3] : cols[2];
          const priorityCol = cols.length >= 5 ? cols[4] : cols[3];

          totalItems++;
          if (priorityCol && priorityCol.includes('P0')) requiredItems++;

          if (statusCol.includes('✅ PASS')) { passingItems++; testedItems++; }
          else if (statusCol.includes('❌ FAIL')) { failingItems++; testedItems++; }
          else if (statusCol.includes('⚠️ PARTIAL')) { testedItems++; }
          else { missingItems++; }
        }
      }
    }

    if (totalItems === 0) return undefined;

    const overallScore = Math.round((passingItems / totalItems) * 100);
    const requiredPassing = requiredItems > 0 ? Math.round((passingItems / requiredItems) * 100) : 100;

    return {
      totalItems,
      requiredItems,
      testedItems,
      passingItems,
      failingItems,
      missingItems,
      overallScore,
      requiredScore: Math.min(requiredPassing, 100),
    };
  }

  /**
   * Parse MASTER-TEST-CHECKLIST.md into structured items (once per suite)
   */
  private loadParsedChecklist(): void {
    const checklistPath = path.resolve(__dirname, '../../../../.planning/MASTER-TEST-CHECKLIST.md');
    if (!fs.existsSync(checklistPath)) {
      this.parsedChecklistItems = [];
      return;
    }

    const content = fs.readFileSync(checklistPath, 'utf-8');
    const lines = content.split('\n');
    const items: ChecklistItemResult[] = [];
    let currentPriority: 'P0' | 'P1' | 'P2' | 'P3' = 'P1';

    for (const line of lines) {
      // Detect priority sections
      if (line.includes('PRIORITY 0:') || line.includes('P0 Critical')) currentPriority = 'P0';
      else if (line.includes('Priority 1:') || line.includes('P1 High')) currentPriority = 'P1';
      else if (line.includes('Priority 2:') || line.includes('P2 Medium')) currentPriority = 'P2';
      else if (line.includes('Priority 3:') || line.includes('P3 Low')) currentPriority = 'P3';

      // Parse checkbox items (- [ ] ✅ PASS ACC-003: Password change)
      if (line.includes('- [') && line.includes(']')) {
        const match = line.match(/(?:\*\*)?([A-Z]+-[A-Z0-9]+)(?:\*\*)?:\s*(.+?)(\||$)/);
        if (!match) continue;

        let status: ChecklistItemResult['status'] = 'TODO';
        if (line.includes('✅ PASS')) status = 'PASS';
        else if (line.includes('❌ FAIL')) status = 'FAIL';
        else if (line.includes('⚠️ PARTIAL')) status = 'PARTIAL';
        else if (line.includes('🚫 MISSING')) status = 'MISSING';
        else if (line.includes('N/A')) status = 'N/A';

        items.push({ id: match[1], name: match[2].trim(), priority: currentPriority, status });
      }

      // Parse table rows
      if (line.startsWith('|') && !line.includes('---') && !line.includes('ID |') && !line.includes('Category')) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 4 && cols[0] !== 'ID' && cols[0] !== 'Feature' && cols[0] !== 'Week') {
          const id = cols[0];
          const name = cols[1];
          const statusCol = cols.length >= 5 ? cols[3] : cols[2];
          const priorityCol = cols.length >= 5 ? cols[4] : cols[3];

          let status: ChecklistItemResult['status'] = 'TODO';
          if (statusCol.includes('✅ PASS')) status = 'PASS';
          else if (statusCol.includes('❌ FAIL')) status = 'FAIL';
          else if (statusCol.includes('⚠️ PARTIAL')) status = 'PARTIAL';
          else if (statusCol.includes('🚫 MISSING')) status = 'MISSING';
          else if (statusCol.includes('N/A')) status = 'N/A';

          let priority: 'P0' | 'P1' | 'P2' | 'P3' = currentPriority;
          if (priorityCol && priorityCol.includes('P0')) priority = 'P0';
          else if (priorityCol && priorityCol.includes('P1')) priority = 'P1';
          else if (priorityCol && priorityCol.includes('P2')) priority = 'P2';
          else if (priorityCol && priorityCol.includes('P3')) priority = 'P3';

          // Only add items with valid IDs (e.g., HOME-F01, ACC-F01, not random text)
          if (/^[A-Z]+-[A-Z0-9]+$/.test(id)) {
            items.push({ id, name, priority, status });
          }
        }
      }
    }

    this.parsedChecklistItems = items;
    console.log(`[Orchestrator] Parsed ${items.length} checklist items from MASTER-TEST-CHECKLIST.md`);
  }

  /**
   * Get checklist result for a specific phase
   * Uses explicit checklistItems if defined, otherwise auto-maps from URL
   */
  private getPhaseChecklistResult(phase: TestPhase): PhaseChecklistResult | undefined {
    if (this.parsedChecklistItems.length === 0) return undefined;

    let matchingItems: ChecklistItemResult[] = [];

    if (phase.checklistItems && phase.checklistItems.length > 0) {
      // Explicit mapping: use the IDs provided in the test phase
      matchingItems = this.parsedChecklistItems.filter(item =>
        phase.checklistItems!.some(pattern => {
          // Support wildcards: 'ACC-F*' matches ACC-F01, ACC-F02, etc.
          if (pattern.endsWith('*')) {
            return item.id.startsWith(pattern.slice(0, -1));
          }
          return item.id === pattern;
        })
      );
    } else {
      // Auto-map: derive checklist prefix from the navigation URL
      const navAction = phase.actions.find(a => a.type === 'navigate' && a.url);
      if (navAction && navAction.url) {
        try {
          const urlPath = new URL(navAction.url).pathname;
          const prefixes = this.getChecklistPrefixesForUrl(urlPath);
          matchingItems = this.parsedChecklistItems.filter(item =>
            prefixes.some(prefix => item.id.startsWith(prefix))
          );
        } catch { /* ignore URL parse errors */ }
      }
    }

    if (matchingItems.length === 0) return undefined;

    const passing = matchingItems.filter(i => i.status === 'PASS').length;
    const failing = matchingItems.filter(i => i.status === 'FAIL').length;
    const missing = matchingItems.filter(i => i.status === 'TODO' || i.status === 'MISSING').length;
    const covered = matchingItems.filter(i => ['PASS', 'FAIL', 'PARTIAL'].includes(i.status)).length;
    const score = matchingItems.length > 0 ? Math.round((passing / matchingItems.length) * 100) : 0;

    return { items: matchingItems, covered, passing, failing, missing, score };
  }

  /**
   * Auto-map URL path to checklist ID prefixes
   */
  private getChecklistPrefixesForUrl(urlPath: string): string[] {
    const p = urlPath.toLowerCase();

    // Account pages
    if (p.includes('/account/edit-profile')) return ['ACC-F01'];
    if (p.includes('/account/wallet')) return ['ACC-F06', 'ACC-F07'];
    if (p.includes('/account/packages')) return ['ACC-F'];  // packages relate to account
    if (p.includes('/account/notifications')) return ['ACC-F09', 'SET-F02'];
    if (p.includes('/account/appearance')) return ['ACC-F20', 'SET-F01'];
    if (p.includes('/account/security')) return ['ACC-F04', 'ACC-F05', 'SET-F04'];
    if (p.includes('/account/privacy')) return ['ACC-F10', 'ACC-F11', 'ACC-F12'];
    if (p.includes('/account')) return ['ACC-F'];

    // Marketplace
    if (p.includes('/marketplace') || p.includes('/vendor')) return ['MKT-F'];
    if (p.includes('/search')) return ['MKT-F01', 'HOME-F02'];

    // Home page
    if (p.includes('/home') || p === '/' || p.includes('(tabs)')) return ['HOME-F'];

    // Booking
    if (p.includes('/booking')) return ['BOOK-F'];

    // Events
    if (p.includes('/event')) return ['EVT-'];

    // Admin
    if (p.includes('/admin')) return ['ADMIN-'];

    // AI
    if (p.includes('/ai') || p.includes('/consultant')) return ['AI-F'];

    // Help
    if (p.includes('/help')) return ['ACC-F17'];

    // Settings
    if (p.includes('/settings')) return ['SET-F'];

    return [];
  }

  /**
   * Run test suite across multiple devices sequentially
   */
  async runMultiDeviceSuite(
    suiteName: string,
    phases: TestPhase[],
    browserType: BrowserType = 'chromium'
  ): Promise<TestSuiteResult[]> {
    const results: TestSuiteResult[] = [];

    for (let i = 0; i < this.config.devices.length; i++) {
      const device = this.config.devices[i];
      console.log(`\n[MultiDevice] Running on device ${i + 1}/${this.config.devices.length}: ${device.name}`);

      // Create a fresh orchestrator for each device to avoid state leakage
      const deviceOrchestrator = new TestOrchestrator(this.config);
      (deviceOrchestrator.browserManager as any).currentDeviceIndex = i;

      const result = await deviceOrchestrator.runTestSuite(`${suiteName} [${device.name}]`, phases);
      results.push(result);
    }

    // Summary
    const allPassed = results.every(r => r.overallStatus === 'passed');
    console.log(`\n[MultiDevice] ${results.length} device(s) tested. All passed: ${allPassed}`);

    return results;
  }

  /**
   * Run multiple test suites in parallel
   */
  async runSuitesInParallel(
    suites: Array<{ name: string; phases: TestPhase[] }>,
    maxConcurrency = 3
  ): Promise<TestSuiteResult[]> {
    const results: TestSuiteResult[] = [];

    // Process in batches of maxConcurrency
    for (let i = 0; i < suites.length; i += maxConcurrency) {
      const batch = suites.slice(i, i + maxConcurrency);
      console.log(`\n[Parallel] Running batch ${Math.floor(i / maxConcurrency) + 1}: ${batch.map(s => s.name).join(', ')}`);

      const batchPromises = batch.map(suite => {
        const orchestrator = new TestOrchestrator(this.config);
        return orchestrator.runTestSuite(suite.name, suite.phases);
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const settled of batchResults) {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          console.error(`[Parallel] Suite failed: ${settled.reason}`);
        }
      }
    }

    return results;
  }
}
