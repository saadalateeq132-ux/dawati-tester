import { VertexAI } from '@google-cloud/vertexai';
import { TestConfig, VertexAIResponse, BatchAnalysisRequest, BatchAnalysisResponse, AIIssue } from '../types';
import * as fs from 'fs';

export class GeminiClient {
  private vertexAI: VertexAI;
  private config: TestConfig;
  private model: any;
  private tunedModel: any | null = null;
  private lastPromptText: string = '';

  constructor(config: TestConfig) {
    this.config = config;

    // Initialize Vertex AI with Application Default Credentials
    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    });

    const generationConfig = {
      temperature: config.vertexAI.temperature,
      topP: config.vertexAI.topP,
      topK: config.vertexAI.topK,
      maxOutputTokens: config.vertexAI.maxOutputTokens,
    };

    this.model = this.vertexAI.getGenerativeModel({
      model: config.model,
      generationConfig,
    });

    // Initialize tuned model if configured
    if (config.fineTuning?.tunedModelEndpoint) {
      this.tunedModel = this.vertexAI.getGenerativeModel({
        model: config.fineTuning.tunedModelEndpoint,
        generationConfig,
      });
      console.log(`[Vertex AI] Tuned model loaded: ${config.fineTuning.tunedModelEndpoint}`);
    }

    console.log(`[Vertex AI] Initialized: ${config.model} in ${config.location}`);
  }

  /**
   * Get the prompt text that would be used for a given phase (for feedback collection)
   */
  getPromptForPhase(phase: string): string {
    return this.buildSinglePrompt(phase);
  }

  /**
   * Get the last prompt text that was sent to the model
   */
  getLastPromptText(): string {
    return this.lastPromptText;
  }

  /**
   * Check if a tuned model is available
   */
  hasTunedModel(): boolean {
    return this.tunedModel !== null;
  }

  /**
   * Analyze with a specific model (base or tuned). Used by ModelSwitcher for A/B testing.
   */
  async analyzeWithModel(
    screenshotPath: string,
    phase: string,
    useTuned: boolean
  ): Promise<{ response: VertexAIResponse; tokensUsed: number; latencyMs: number }> {
    const targetModel = useTuned && this.tunedModel ? this.tunedModel : this.model;
    const startTime = Date.now();

    const imageBase64 = this.imageToBase64(screenshotPath);
    const prompt = this.buildSinglePrompt(phase);
    this.lastPromptText = prompt;

    const result = await targetModel.generateContent({
      contents: [{ role: 'user', parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/png', data: imageBase64 } },
      ]}],
    });

    const apiResponse = await result.response;
    const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = apiResponse.usageMetadata?.totalTokenCount || 0;
    const latencyMs = Date.now() - startTime;

    return { response: this.parseResponse(text), tokensUsed, latencyMs };
  }

  /**
   * Batch analysis: Analyze 5-10 screenshots in one request for 80% cost reduction
   */
  async analyzeBatch(request: BatchAnalysisRequest): Promise<BatchAnalysisResponse> {
    console.log(`[Vertex AI] Starting batch analysis: ${request.screenshots.length} screenshots`);
    const startTime = Date.now();

    try {
      // Prepare image parts
      const imageParts = request.screenshots.map((base64Image) => ({
        inlineData: {
          mimeType: 'image/png',
          data: base64Image,
        },
      }));

      // Build comprehensive prompt
      const prompt = this.buildBatchPrompt(request);

      // Call Vertex AI with proper contents format
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
      });

      const response = await result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse Vertex AI response as JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Extract analyses for each screenshot
      const analyses: VertexAIResponse[] = parsed.screenshots.map((item: any, index: number) => {
        const issues: AIIssue[] = (item.issues || []).map((issue: any, issueIndex: number) => ({
          id: `VERTEX-${Date.now()}-${index}-${issueIndex}`,
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          suggestion: issue.suggestion,
          location: issue.location,
          confidence: issue.confidence || 0.8,
        }));

        return {
          decision: item.decision || 'UNKNOWN',
          confidence: item.confidence || 0.5,
          reason: item.reason || '',
          issues,
          rtlIssues: item.rtlIssues || [],
          hardcodedText: item.hardcodedText || [],
          imageText: item.imageText || [],
          currencyIssues: item.currencyIssues || [],
          dateIssues: item.dateIssues || [],
          score: item.score || 5,
        };
      });

      const latencyMs = Date.now() - startTime;
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      console.log(`[Vertex AI] Batch analysis complete: ${latencyMs}ms, ${tokensUsed} tokens`);

      return {
        analyses,
        batchId: `batch-${Date.now()}`,
        tokensUsed,
        latencyMs,
      };
    } catch (error: any) {
      console.error(`[Vertex AI] Batch analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Single screenshot analysis with streaming for real-time feedback
   */
  async analyzeSingle(screenshotPath: string, phase: string): Promise<VertexAIResponse> {
    console.log(`[Vertex AI] Analyzing single screenshot: ${screenshotPath}`);
    const startTime = Date.now();

    try {
      const imageBase64 = this.imageToBase64(screenshotPath);

      const prompt = this.buildSinglePrompt(phase);
      this.lastPromptText = prompt;

      if (this.config.vertexAI.streaming) {
        // Streaming response for real-time feedback
        const streamingResult = await this.model.generateContentStream({
          contents: [{ role: 'user', parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          ]}],
        });

        let fullText = '';
        for await (const chunk of streamingResult.stream) {
          const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
          fullText += chunkText;
          process.stdout.write(chunkText); // Real-time output
        }

        const response = await streamingResult.response;
        const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
        const latencyMs = Date.now() - startTime;

        console.log(`\n[Vertex AI] Analysis complete: ${latencyMs}ms, ${tokensUsed} tokens`);

        return this.parseResponse(fullText);
      } else {
        // Non-streaming response
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          ]}],
        });

        const response = await result.response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
        const latencyMs = Date.now() - startTime;

        console.log(`[Vertex AI] Analysis complete: ${latencyMs}ms, ${tokensUsed} tokens`);

        return this.parseResponse(text);
      }
    } catch (error: any) {
      console.error(`[Vertex AI] Analysis failed: ${error.message}`);
      throw error;
    }
  }

  private buildBatchPrompt(request: BatchAnalysisRequest): string {
    return `You are an expert QA tester analyzing ${request.screenshots.length} screenshots from the Dawati event planning app (Saudi Arabia).

⚠️ CRITICAL: First check each screenshot for error pages (404, NOT_FOUND, deployment error). If found, report as CRITICAL issue.

For EACH screenshot, analyze:

1. **UI/UX Issues**: Layout problems, visual bugs, text overflow, truncated text, missing elements
2. **Functionality Issues**: Broken elements, error pages, 404s, incomplete states
3. **RTL Issues** (Saudi Arabia app - COMPREHENSIVE):
   - Text direction (must be right-to-left for Arabic)
   - Hardcoded English text: Submit, Cancel, Save, Delete, Edit, Add, Search, Loading, Error, Login, etc.
   - Hardcoded Arabic text (should use i18n keys): إرسال, إلغاء, حفظ, حذف, تعديل, إضافة, بحث, تحميل, خطأ, etc.
   - BiDi text handling: Mixed Arabic/English without proper isolation (phone numbers, emails in Arabic context)
   - Currency formatting: Hardcoded text (SAR/sar/ريال/ر.س/س.ر/سر/رس) should be replaced with SVG icon. In RTL layout, the currency icon appears to the LEFT of the number on screen — this is CORRECT because Arabic reads right-to-left (number first, then symbol). Do NOT flag this as "symbol before number."
   - Date formatting: Hijri calendar support. Month names like رمضان/شعبان/ذو الحجة ARE Hijri months — do NOT flag as Gregorian.
   - Number formatting: Consistency (Western 0-9 or Arabic ٠-٩)
   - Layout expansion: Elements too small for Arabic text (30% longer than English)
   - Icon alignment: Directional icons should flip in RTL
4. **Image Text (OCR)**: Read ALL text visible in images/graphics and report if not localized
5. **Mobile UI Issues** (App for iOS/Android):
   - Tap targets too small (minimum 44x44px for iOS, 48x48dp for Android)
   - Tap targets too large (buttons > 300px width on mobile)
   - Text too small to read on mobile (< 14px)
   - Elements cut off on small screens
   - Horizontal scrolling (should be vertical only on mobile)
6. **Accessibility**: Missing labels, poor contrast, small touch targets

Phase context: ${request.phase}
Expected elements: ${request.expectedElements.join(', ')}

Respond in this JSON format:
{
  "screenshots": [
    {
      "index": 0,
      "decision": "PASS" | "FAIL" | "UNKNOWN",
      "confidence": 0.0-1.0,
      "reason": "Brief explanation",
      "issues": [
        {
          "severity": "critical" | "high" | "medium" | "low",
          "category": "ui" | "functionality" | "rtl" | "accessibility",
          "title": "Brief title",
          "description": "What's wrong",
          "suggestion": "How to fix",
          "location": "Where on screen",
          "confidence": 0.0-1.0
        }
      ],
      "rtlIssues": ["List of RTL problems"],
      "hardcodedText": ["List of hardcoded strings"],
      "imageText": ["Text visible in images"],
      "currencyIssues": ["Currency formatting problems"],
      "dateIssues": ["Date/calendar problems"],
      "score": 0-10
    }
  ]
}

IMPORTANT: Saudi Arabia uses Arabic RTL. Currency: replace hardcoded SAR/ريال/ر.س text with SVG icon. In RTL the icon appears LEFT of number on screen — this is correct (Arabic reads R-to-L). Hijri calendar: months like رمضان are Hijri, not Gregorian.`;
  }

  private buildSinglePrompt(phase: string): string {
    return `You are an expert QA tester analyzing a screenshot from Dawati event planning app (Saudi Arabia).

⚠️ CRITICAL: First check if this is an error page (404, NOT_FOUND, deployment error). If so, report as CRITICAL issue.

Analyze this screenshot for ALL THREE testing levels:

**LEVEL 1 — Visual & User Experience:**
1. **UI/UX Issues**: Layout problems, visual bugs, text overflow, missing elements, overlapping elements
2. **Component Consistency**: Back button position, header uniformity, tab bar alignment, primary button consistency
3. **Notifications/Alerts**: Pop-ups, in-app alerts visible and properly rendered
4. **Mobile Responsiveness**: Portrait layout correctness, touch gesture areas, no visual distortions

**LEVEL 2 — Data Validation & Components:**
5. **Hardcoded Values Detection**:
   - English strings: Submit, Cancel, Save, Delete, Edit, Add, Remove, Search, Filter, Sort, View, Back, Next, Previous, Loading, Error, Success, Welcome, Hello, Sign In, Sign Up, Log In, Log Out, Profile, Settings, Home, Continue, OK, Yes, No, Menu, Cart, Book Now, Upload Photo, Event Details, Vendor List, Availability, Confirm, Reset
   - Currency text: SAR/sar/ريال/ر.س (should use SVG icon). In RTL, icon LEFT of number = CORRECT.
   - Number format: Flag Arabic-Eastern numerals (١٢٣٤) if used instead of Western (1234) in UI
6. **Form Validation**: Email (@+domain), phone (+966), password complexity, required markers
7. **Mock/Placeholder Data**: lorem ipsum, test@test.com, placeholder images, TODO text

**LEVEL 3 — Backend & Data Flow:**
8. **Functionality Issues**: Broken elements, error pages, incomplete states, disconnected buttons
9. **State Management**: Data loss indicators, empty states that should have content

**RTL Issues** (COMPREHENSIVE — 21 checks):
   - Text direction, alignment, margin/padding direction
   - BiDi handling: Mixed Arabic/English without isolation
   - Hijri calendar: Month names like رمضان/شعبان/ذو الحجة ARE Hijri — do NOT flag
   - Layout expansion (30% rule), icon alignment, flexbox direction
   - Typography: lineHeight >= fontSize for Arabic
   - Accessibility: lang="ar", ARIA labels, contrast
10. **Image Text (OCR)**: Read ALL text in images/graphics, flag if not localized
11. **Mobile UI**: Tap targets (min 44x44px iOS, 48x48dp Android), text >= 14px

Phase: ${phase}

Respond in JSON:
{
  "decision": "PASS" | "FAIL" | "UNKNOWN",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation",
  "issues": [{"severity":"critical|high|medium|low","category":"ui|functionality|rtl|accessibility|performance","title":"...","description":"...","suggestion":"...","location":"...","confidence":0.8}],
  "rtlIssues": ["..."],
  "hardcodedText": ["..."],
  "imageText": ["..."],
  "currencyIssues": ["..."],
  "dateIssues": ["..."],
  "score": 0-10
}`;
  }

  private parseResponse(text: string): VertexAIResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return this.createEmptyResponse();
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Handle issues that may be strings or objects
      const rawIssues = parsed.issues || [];
      const issues: AIIssue[] = rawIssues.map((issue: any, index: number) => {
        if (typeof issue === 'string') {
          return {
            id: `VERTEX-${Date.now()}-${index}`,
            severity: 'medium' as const,
            category: 'ui' as const,
            title: issue,
            description: issue,
            suggestion: 'Review and fix this issue',
            confidence: 0.7,
          };
        }
        return {
          id: `VERTEX-${Date.now()}-${index}`,
          severity: issue.severity || 'medium',
          category: issue.category || 'ui',
          title: issue.title || 'Unknown issue',
          description: issue.description || issue.title || '',
          suggestion: issue.suggestion || 'Review this issue',
          location: issue.location,
          confidence: issue.confidence || 0.8,
        };
      });

      return {
        decision: parsed.decision || 'UNKNOWN',
        confidence: parsed.confidence || 0.5,
        reason: parsed.reason || '',
        issues,
        rtlIssues: parsed.rtlIssues || [],
        hardcodedText: parsed.hardcodedText || [],
        imageText: parsed.imageText || [],
        currencyIssues: parsed.currencyIssues || [],
        dateIssues: parsed.dateIssues || [],
        score: parsed.score || 5,
      };
    } catch {
      console.error('[Vertex AI] Failed to parse JSON response');
      return this.createEmptyResponse();
    }
  }

  private createEmptyResponse(): VertexAIResponse {
    return {
      decision: 'UNKNOWN',
      confidence: 0.0,
      reason: 'Failed to parse response',
      issues: [],
      rtlIssues: [],
      hardcodedText: [],
      imageText: [],
      currencyIssues: [],
      dateIssues: [],
      score: 0,
    };
  }

  private imageToBase64(filepath: string): string {
    const imageBuffer = fs.readFileSync(filepath);
    return imageBuffer.toString('base64');
  }
}
