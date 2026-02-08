import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { createChildLogger } from './logger';
import { Screenshot } from './screenshot-manager';

const log = createChildLogger('ai-analyzer');

export interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'ui' | 'functionality' | 'performance' | 'rtl' | 'accessibility';
  title: string;
  description: string;
  suggestion: string;
  screenshot: string;
  location?: string;
}

export interface AnalysisResult {
  screenshot: Screenshot;
  issues: Issue[];
  summary: string;
  score: number; // 1-10
  rtlIssues: string[];
  hardcodedText: string[];
  missingStates: string[];
  timestamp: Date;
}

let genAI: GoogleGenerativeAI | null = null;
let issueCounter = 0;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

function imageToBase64(filepath: string): string {
  const imageBuffer = fs.readFileSync(filepath);
  return imageBuffer.toString('base64');
}

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/png';
}

export async function analyzeScreenshot(screenshot: Screenshot): Promise<AnalysisResult> {
  log.info({ filename: screenshot.filename }, 'Analyzing screenshot with Gemini');

  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: config.aiModel });

  const imageBase64 = imageToBase64(screenshot.filepath);
  const mimeType = getMimeType(screenshot.filepath);

  const prompt = `You are an expert QA tester analyzing a screenshot from a marketplace mobile app (Dawati - an event planning app for Saudi Arabia).

Analyze this screenshot and identify issues in these categories:

1. **UI/UX Issues**: Layout problems, visual bugs, missing elements, poor spacing, unclear buttons
2. **Functionality Issues**: Broken elements, incomplete states, missing interactions
3. **Performance Issues**: Signs of slow loading, jank, unresponsive elements
4. **RTL Issues**: Text should be right-to-left (Arabic). Check for:
   - Text flowing left-to-right when it should be RTL
   - Icons/buttons misaligned for RTL layout
   - Hardcoded English text that should be Arabic
5. **Accessibility Issues**: Missing labels, poor contrast, small touch targets

For each issue found, provide:
- Severity: critical (app-breaking), high (major UX problem), medium (noticeable issue), low (minor polish)
- Category: ui, functionality, performance, rtl, accessibility
- Title: Brief description (5-10 words)
- Description: What's wrong
- Suggestion: How to fix it
- Location: Where on the screen (if applicable)

Also identify:
- Any hardcoded English text visible (should be Arabic)
- Missing UI states (loading, error, empty states that should exist)

Respond in this JSON format:
{
  "issues": [
    {
      "severity": "high",
      "category": "rtl",
      "title": "English text in Arabic context",
      "description": "The button label 'Submit' is in English instead of Arabic",
      "suggestion": "Replace with Arabic translation 'إرسال'",
      "location": "Bottom of form"
    }
  ],
  "summary": "Brief overall assessment of the screen quality",
  "score": 8,
  "rtlIssues": ["List of RTL-specific problems"],
  "hardcodedText": ["List of hardcoded English strings found"],
  "missingStates": ["List of potentially missing UI states"]
}

If the screenshot looks good with no issues, return an empty issues array and a high score.
Be thorough but avoid false positives. Only report actual problems visible in the screenshot.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.warn({ filename: screenshot.filename }, 'Could not parse AI response as JSON');
      return createEmptyResult(screenshot);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Add IDs to issues
    const issues: Issue[] = (parsed.issues || []).map((issue: Omit<Issue, 'id' | 'screenshot'>) => {
      issueCounter++;
      return {
        ...issue,
        id: `ISS-${String(issueCounter).padStart(3, '0')}`,
        screenshot: screenshot.filename,
      };
    });

    const analysisResult: AnalysisResult = {
      screenshot,
      issues,
      summary: parsed.summary || 'Analysis complete',
      score: parsed.score || 5,
      rtlIssues: parsed.rtlIssues || [],
      hardcodedText: parsed.hardcodedText || [],
      missingStates: parsed.missingStates || [],
      timestamp: new Date(),
    };

    log.info(
      { filename: screenshot.filename, issueCount: issues.length, score: analysisResult.score },
      'Analysis complete'
    );

    return analysisResult;
  } catch (error) {
    log.error({ error, filename: screenshot.filename }, 'Error analyzing screenshot');
    return createEmptyResult(screenshot);
  }
}

function createEmptyResult(screenshot: Screenshot): AnalysisResult {
  return {
    screenshot,
    issues: [],
    summary: 'Analysis failed or no issues detected',
    score: 5,
    rtlIssues: [],
    hardcodedText: [],
    missingStates: [],
    timestamp: new Date(),
  };
}

export async function analyzeAllScreenshots(screenshots: Screenshot[]): Promise<AnalysisResult[]> {
  log.info({ count: screenshots.length }, 'Starting batch analysis');
  const results: AnalysisResult[] = [];

  for (const screenshot of screenshots) {
    try {
      const result = await analyzeScreenshot(screenshot);
      results.push(result);

      // Rate limiting: wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      log.error({ error, filename: screenshot.filename }, 'Error in batch analysis');
      results.push(createEmptyResult(screenshot));
    }
  }

  log.info({ analyzed: results.length }, 'Batch analysis complete');
  return results;
}

export function aggregateIssues(results: AnalysisResult[]): Issue[] {
  const allIssues: Issue[] = [];
  for (const result of results) {
    allIssues.push(...result.issues);
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return allIssues;
}

export function calculateOverallScore(results: AnalysisResult[]): number {
  if (results.length === 0) return 0;

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  return Math.round((totalScore / results.length) * 10) / 10;
}

export function getIssueSummary(issues: Issue[]): Record<string, number> {
  const summary: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: issues.length,
  };

  for (const issue of issues) {
    summary[issue.severity]++;
  }

  return summary;
}
