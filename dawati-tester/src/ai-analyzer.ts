
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { createChildLogger } from './logger';
import { Screenshot } from './screenshot-manager';

const log = createChildLogger('ai-analyzer');

// --- TYPE DEFINITIONS ---
export interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'ui' | 'functionality' | 'performance' | 'rtl' | 'accessibility' | 'text' | 'color' | 'clarity';
  title: string;
  description: string;
  suggestion: string;
  location?: string;
  screenshot?: string;
  isBug: boolean;
}

export interface AnalysisScores {
  overall: number;
  rtl: number;
  color: number;
  clarity: number;
}

export interface AnalysisResult {
  screenshot: Screenshot;
  issues: Issue[];
  summary: string;
  scores: AnalysisScores;
  confidence: number; // The AI's confidence in its own analysis (0-1)
  hardcodedText: string[];
  imageText: string[];
  missingStates: string[];
  timestamp: Date;
}

// --- MODULE STATE ---
let genAI: GoogleGenerativeAI | null = null;
let issueCounter = 0;

// --- PRIVATE HELPERS ---
function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required for AI analysis. Set it or run with --skip-ai.');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

async function imageToBase64(filepath: string): Promise<string> {
  const imageBuffer = await fs.promises.readFile(filepath);
  return imageBuffer.toString('base64');
}

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return mimeTypes[ext] || 'image/png';
}

function createEmptyResult(screenshot: Screenshot): AnalysisResult {
  return {
    screenshot,
    issues: [],
    summary: 'Analysis failed or was skipped',
    scores: { overall: 0, rtl: 0, color: 0, clarity: 0 },
    confidence: 0,
    hardcodedText: [],
    imageText: [],
    missingStates: [],
    timestamp: new Date(),
  };
}

// --- CORE PROMPT ---
const GEMINI_PROMPT = `
You are a world-class QA automation expert specializing in mobile app testing for the Saudi Arabian market. Your task is to analyze a screenshot from the "Dawati" event planning app and provide a rigorous, structured quality assessment.

**Primary Directives:**
1.  **Error Page Detection:** First, check if the screen is a system-level error (e.g., 404, "Not Found", deployment error, server error). If it is, flag a single 'critical' issue and stop.
2.  **Comprehensive Analysis:** Analyze the screenshot against the following categories. Be extremely harsh and detail-oriented.
    *   **RTL & Localization:** (Highest Importance for this market)
        *   **Layout:** Is everything perfectly mirrored for a Right-to-Left (RTL) experience? Check headers, icons, navigation, and all UI components.
        *   **Hardcoded Text:** Identify ANY English text (e.g., "Submit", "Cancel", "Loading") or hardcoded Arabic text. All text must come from a localization key (like \\\`t('key')\\\`).
        *   **BiDi Formatting:** Check for issues with mixed English/Arabic text. Pay close attention to currency (SAR, ريال), dates, and numbers. Currency symbols must appear *after* the number.
    *   **Color & Theme:**
        *   Does the color scheme adhere to a consistent, professional theme?
        *   Are there any colors that clash or violate branding guidelines? (Primary color is a shade of purple).
    *   **Clarity & UI/UX:**
        *   Is the layout clean, intuitive, and uncluttered?
        *   Is all text legible and easy to understand?
        *   Are buttons and interactive elements clearly defined?
    *   **Accessibility (A11y):** Check for low-contrast text, small touch targets, or missing element labels.
    *   **OCR - Text in Images:** Read and report ALL text embedded within images, icons, or graphics. This text must also be localized.

**Output Format (Strict JSON):**
You MUST respond with a single JSON object. Do not include markdown formatting like \\\`\\\`\\\`json.

{
  "issues": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "category": "rtl" | "color" | "clarity" | "accessibility" | "text",
      "title": "Short (5-10 word) summary of the issue.",
      "description": "Detailed explanation of what is wrong.",
      "suggestion": "A specific recommendation on how to fix it (e.g., 'Use theme.colors.primary' or 'Localize with t(\\\\"forms.submit\\\\")').",
      "isBug": true | false
    }
  ],
  "scores": {
    "overall": 0-10,  // Holistic score based on all factors.
    "rtl": 0-10,      // **STRICT:** Score 10 only if RTL is PERFECT. Deduct heavily for any layout or text issue.
    "color": 0-10,    // Score 10 only if colors are perfectly consistent and on-brand.
    "clarity": 0-10   // Score based on layout, legibility, and intuitive design.
  },
  "confidence": 0.0-1.0, // Your confidence in this analysis (e.g., 0.98).
  "summary": "A brief, one-sentence overall assessment.",
  "hardcodedText": ["List ALL hardcoded English or Arabic strings found."],
  "imageText": ["List ALL text found inside images or graphics."]
}

**Scoring Guidelines:**
*   **10:** Flawless. No issues found in the category.
*   **9.0-9.9:** Near perfect, maybe one very minor cosmetic issue.
*   **7.0-8.9:** Good, but has a few noticeable (medium severity) issues.
*   **4.0-6.9:** Usable, but has significant issues (high severity) that harm the user experience.
*   **0-3.9:** Broken, unusable, or has critical issues. A single critical issue should result in a score below 2.
`;


// --- PUBLIC FUNCTIONS ---
export async function analyzeScreenshot(screenshot: Screenshot): Promise<AnalysisResult> {
  log.info({ filename: screenshot.filename }, 'Analyzing screenshot with Gemini');
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: config.aiModel });
    
    const imageBase64 = await imageToBase64(screenshot.filepath);
    const mimeType = getMimeType(screenshot.filepath);

    const result = await model.generateContent([{ inlineData: { mimeType, data: imageBase64 }}, { text: GEMINI_PROMPT }]);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
    if (!jsonMatch) {
      log.warn({ filename: screenshot.filename, response: text }, 'Could not parse AI response as JSON');
      throw new Error('Invalid JSON response from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const issues: Issue[] = (parsed.issues || []).map((issue: Omit<Issue, 'id' | 'screenshot'>) => ({
      ...issue,
      id: `ISS-${String(++issueCounter).padStart(4, '0')}`,
      screenshot: screenshot.filename,
    }));

    const analysisResult: AnalysisResult = {
      screenshot,
      issues,
      summary: parsed.summary || 'No summary provided.',
      scores: parsed.scores || { overall: 0, rtl: 0, color: 0, clarity: 0 },
      confidence: parsed.confidence || 0,
      hardcodedText: parsed.hardcodedText || [],
      imageText: parsed.imageText || [],
      missingStates: parsed.missingStates || [],
      timestamp: new Date(),
    };

    log.info(
      { filename: screenshot.filename, issueCount: issues.length, score: analysisResult.scores.overall },
      'Analysis complete'
    );

    return analysisResult;
  } catch (error) {
    log.error({ error, filename: screenshot.filename }, 'Error analyzing screenshot with Gemini');
    return createEmptyResult(screenshot); // Return a neutral result on error
  }
}


export async function analyzeAllScreenshots(screenshots: Screenshot[]): Promise<AnalysisResult[]> {
  return Promise.all(screenshots.map((s) => analyzeScreenshot(s)));
}

export function aggregateIssues(results: AnalysisResult[]): Issue[] {
  return results.flatMap((r) => r.issues);
}

export function calculateOverallScore(results: AnalysisResult[]): number {
  if (results.length === 0) {
    return 0;
  }
  const total = results.reduce((sum, r) => sum + (r.scores?.overall ?? 0), 0);
  return Number((total / results.length).toFixed(2));
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
    summary[issue.severity] = (summary[issue.severity] || 0) + 1;
  }
  return summary;
}
