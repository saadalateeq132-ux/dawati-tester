import { VertexAI } from '@google-cloud/vertexai';
import { TestConfig, VertexAIResponse, BatchAnalysisRequest, BatchAnalysisResponse, AIIssue } from '../types';
import * as fs from 'fs';

export class GeminiClient {
  private vertexAI: VertexAI;
  private config: TestConfig;
  private model: any;

  constructor(config: TestConfig) {
    this.config = config;

    // Initialize Vertex AI with Application Default Credentials
    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    });

    this.model = this.vertexAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.vertexAI.temperature,
        topP: config.vertexAI.topP,
        topK: config.vertexAI.topK,
        maxOutputTokens: config.vertexAI.maxOutputTokens,
      },
    });

    console.log(`[Vertex AI] Initialized: ${config.model} in ${config.location}`);
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

      // Call Vertex AI with function calling for guaranteed JSON
      const result = await this.model.generateContent([
        { text: prompt },
        ...imageParts,
      ]);

      const response = await result.response;
      const text = response.text();

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

      if (this.config.vertexAI.streaming) {
        // Streaming response for real-time feedback
        const streamingResult = await this.model.generateContentStream([
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64,
            },
          },
        ]);

        let fullText = '';
        for await (const chunk of streamingResult.stream) {
          const chunkText = chunk.text();
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
        const result = await this.model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64,
            },
          },
        ]);

        const response = await result.response;
        const text = response.text();
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
   - Currency formatting: SAR/ريال/ر.س MUST be after number ("100 ر.س" not "ر.س 100")
   - Date formatting: Hijri calendar support, DD/MM/YYYY format
   - Number formatting: Consistency (Western 0-9 or Arabic ٠-٩)
   - Layout expansion: Elements too small for Arabic text (30% longer than English)
   - Icon alignment: Directional icons should flip in RTL
4. **Image Text (OCR)**: Read ALL text visible in images/graphics and report if not localized
5. **Accessibility**: Missing labels, poor contrast, small touch targets

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

IMPORTANT: Saudi Arabia uses Arabic RTL, SAR currency (ر.س after number), Hijri calendar, DD/MM/YYYY format.`;
  }

  private buildSinglePrompt(phase: string): string {
    return `You are an expert QA tester analyzing a screenshot from Dawati event planning app (Saudi Arabia).

⚠️ CRITICAL: First check if this is an error page (404, NOT_FOUND, deployment error). If so, report as CRITICAL issue.

Analyze this screenshot for:

1. **UI/UX Issues**: Layout problems, visual bugs, text overflow, missing elements
2. **Functionality Issues**: Broken elements, error pages, incomplete states
3. **RTL Issues** (COMPREHENSIVE - Saudi Arabia):
   - Text direction (right-to-left for Arabic)
   - Hardcoded English: Submit, Cancel, Save, Delete, Edit, Add, Search, Loading, Error, etc.
   - Hardcoded Arabic: إرسال, إلغاء, حفظ, حذف, تعديل, إضافة, بحث, تحميل, خطأ, etc.
   - BiDi handling: Mixed Arabic/English
   - Currency: SAR/ريال/ر.س MUST be after number ("100 ر.س" not "ر.س 100")
   - Dates: Hijri calendar, DD/MM/YYYY
   - Numbers: Consistency
   - Layout: 30% expansion for Arabic
4. **Image Text (OCR)**: Read text in images/graphics
5. **Accessibility**: Labels, contrast, touch targets

Phase: ${phase}

Respond in JSON:
{
  "decision": "PASS" | "FAIL" | "UNKNOWN",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation",
  "issues": [...],
  "rtlIssues": [...],
  "hardcodedText": [...],
  "imageText": [...],
  "currencyIssues": [...],
  "dateIssues": [...],
  "score": 0-10
}`;
  }

  private parseResponse(text: string): VertexAIResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return this.createEmptyResponse();
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const issues: AIIssue[] = (parsed.issues || []).map((issue: any, index: number) => ({
      id: `VERTEX-${Date.now()}-${index}`,
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      description: issue.description,
      suggestion: issue.suggestion,
      location: issue.location,
      confidence: issue.confidence || 0.8,
    }));

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
