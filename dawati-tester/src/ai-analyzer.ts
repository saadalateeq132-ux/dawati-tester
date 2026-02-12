import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { createChildLogger } from './logger';
import { Screenshot } from './screenshot-manager';

const log = createChildLogger('ai-analyzer');

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
  confidence: number;
  hardcodedText: string[];
  imageText: string[];
  missingStates: string[];
  timestamp: Date;
}

let genAI: GoogleGenerativeAI | null = null;
let issueCounter = 0;
let vertexAuth: GoogleAuth | null = null;

function hasVertexConfig(): boolean {
  return Boolean(config.gcpProjectId && config.gcpLocation);
}

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set. Configure GEMINI_API_KEY or Vertex (GCP_PROJECT_ID + GCP_LOCATION).');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

function getVertexAuth(): GoogleAuth {
  if (!vertexAuth) {
    vertexAuth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  return vertexAuth;
}

async function getVertexAccessToken(): Promise<string> {
  const client = await getVertexAuth().getClient();
  const token = await client.getAccessToken();
  if (!token?.token) {
    throw new Error('Could not obtain Vertex access token. Check GOOGLE_APPLICATION_CREDENTIALS / ADC setup.');
  }
  return token.token;
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

const GEMINI_PROMPT = `
You are a world-class QA automation expert specializing in mobile app testing for the Saudi Arabian market. Your task is to analyze a screenshot from the "Dawati" event planning app and provide a rigorous, structured quality assessment.

**Primary Directives:**
1.  **Error Page Detection:** First, check if the screen is a system-level error (e.g., 404, "Not Found", deployment error, server error). If it is, flag a single 'critical' issue and stop.
2.  **Comprehensive Analysis:** Analyze the screenshot against the following categories. Be extremely harsh and detail-oriented.
    *   **RTL & Localization:** (Highest Importance for this market)
        *   **Layout:** Is everything perfectly mirrored for a Right-to-Left (RTL) experience? Check headers, icons, navigation, and all UI components.
        *   **Hardcoded Text:** Identify ANY English text (e.g., "Submit", "Cancel", "Loading") or hardcoded Arabic text. All text must come from a localization key (like \`t('key')\`).
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
You MUST respond with a single JSON object. Do not include markdown formatting like \`\`\`json.

{
  "issues": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "category": "rtl" | "color" | "clarity" | "accessibility" | "text",
      "title": "Short (5-10 word) summary of the issue.",
      "description": "Detailed explanation of what is wrong.",
      "suggestion": "A specific recommendation on how to fix it.",
      "isBug": true | false
    }
  ],
  "scores": {
    "overall": 0-10,
    "rtl": 0-10,
    "color": 0-10,
    "clarity": 0-10
  },
  "confidence": 0.0-1.0,
  "summary": "A brief, one-sentence overall assessment.",
  "hardcodedText": ["List ALL hardcoded English or Arabic strings found."],
  "imageText": ["List ALL text found inside images or graphics."]
}
`;

async function generateWithGeminiApi(imageBase64: string, mimeType: string): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: config.aiModel });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: imageBase64 } },
    { text: GEMINI_PROMPT },
  ]);
  const response = await result.response;
  return response.text();
}

async function generateWithVertex(imageBase64: string, mimeType: string): Promise<string> {
  if (!hasVertexConfig()) {
    throw new Error('Vertex config missing. Set GCP_PROJECT_ID and GCP_LOCATION.');
  }

  const accessToken = await getVertexAccessToken();
  const endpoint = `https://${config.gcpLocation}-aiplatform.googleapis.com/v1/projects/${config.gcpProjectId}/locations/${config.gcpLocation}/publishers/google/models/${config.aiModel}:generateContent`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: GEMINI_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: config.aiTemperature,
        maxOutputTokens: config.aiMaxTokens,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Vertex generateContent failed (${res.status}): ${errorText}`);
  }

  const payload = await res.json() as any;
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Vertex response had no text candidate.');
  }

  return text;
}

export async function analyzeScreenshot(screenshot: Screenshot): Promise<AnalysisResult> {
  log.info({ filename: screenshot.filename }, 'Analyzing screenshot');
  try {
    const imageBase64 = await imageToBase64(screenshot.filepath);
    const mimeType = getMimeType(screenshot.filepath);

    const text = config.geminiApiKey
      ? await generateWithGeminiApi(imageBase64, mimeType)
      : await generateWithVertex(imageBase64, mimeType);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.warn({ filename: screenshot.filename, response: text }, 'Could not parse AI response as JSON');
      throw new Error('Invalid JSON response from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const issues: Issue[] = (parsed.issues || []).map((issue: Omit<Issue, 'id'>) => ({
      ...issue,
      id: `ISS-${String(++issueCounter).padStart(4, '0')}`,
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

    log.info({ filename: screenshot.filename, issueCount: issues.length, score: analysisResult.scores.overall }, 'Analysis complete');
    return analysisResult;
  } catch (error) {
    log.error({ error, filename: screenshot.filename }, 'Error analyzing screenshot');
    return createEmptyResult(screenshot);
  }
}

export async function analyzeAllScreenshots(screenshots: Screenshot[]): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  for (const screenshot of screenshots) {
    const result = await analyzeScreenshot(screenshot);
    results.push(result);
  }
  return results;
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

export function aggregateIssues(results: AnalysisResult[]): Issue[] {
  return results.flatMap((r) => r.issues);
}

export function calculateOverallScore(results: AnalysisResult[]): number {
  if (results.length === 0) return 0;
  const totalScore = results.reduce((sum, r) => sum + r.scores.overall, 0);
  return totalScore / results.length;
}
