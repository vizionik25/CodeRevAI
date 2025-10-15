import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenAI } from '@google/genai';
import {
  sanitizeInput,
  validateCodeInput,
  validateCustomPrompt,
  validateLanguage,
  validateReviewModes,
  checkRateLimit,
} from '@/app/utils/security';

// Lazy initialize Gemini AI to avoid build-time errors
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

// Import prompt instructions
const PROMPT_INSTRUCTIONS: Record<string, string> = {
  comprehensive: `
    Provide a comprehensive review covering the following aspects:
    1.  **Bugs and Errors**: Identify any potential bugs, logic errors, or edge cases that might have been missed.
    2.  **Performance**: Suggest optimizations for performance bottlenecks, inefficient algorithms, or excessive resource usage.
    3.  **Security**: Point out any security vulnerabilities such as injection flaws, insecure handling of credentials, or other common weaknesses.
    4.  **Best Practices & Readability**: Comment on code style, naming conventions, and overall readability. Suggest improvements based on established {language} best practices.
    5.  **Maintainability**: Assess the code's structure for long-term maintainability and suggest refactoring where necessary.

    Format your feedback clearly using Markdown. Use code blocks for suggestions. Be constructive and provide actionable advice.
  `,
  bug_fixes: `
    Focus exclusively on identifying potential bugs, logic errors, and edge cases that might have been missed.
    Provide clear explanations for each bug and suggest a corrected code snippet.
    Do not comment on code style, performance, or other aspects unless they are directly causing a bug.
    Format your feedback clearly using Markdown.
  `,
  performance: `
    Focus exclusively on performance optimization.
    Identify any performance bottlenecks, inefficient algorithms, or excessive resource usage (CPU, memory).
    For each issue, explain why it's a performance concern and provide a more performant code alternative.
    Format your feedback clearly using Markdown.
  `,
  security: `
    Focus exclusively on security vulnerabilities and potential exploits.
    Look for: injection flaws (SQL, XSS, etc.), insecure handling of credentials, authentication issues, authorization bypasses, insecure deserialization, and other common security weaknesses.
    For each issue, explain the potential impact and provide a secure code alternative.
    Format your feedback clearly using Markdown.
  `,
  best_practices: `
    Focus exclusively on code style, best practices, and readability.
    Comment on: naming conventions, code structure, design patterns, idiomatic {language} usage, comments, documentation, and overall code clarity.
    Suggest improvements based on established {language} best practices and community standards.
    Format your feedback clearly using Markdown.
  `,
  test_generation: `
    Generate comprehensive unit tests for the provided code.
    Cover: edge cases, error handling, happy paths, and boundary conditions.
    Use the most appropriate testing framework for {language} (e.g., Jest/Vitest for JavaScript/TypeScript, pytest for Python, JUnit for Java, etc.).
    Include test setup, assertions, and clear test descriptions.
    Format your tests clearly using Markdown and code blocks.
  `,
};

function buildPrompt(code: string, language: string, customPrompt: string, modes: string[]): string {
  const activeModes = modes.length > 0 ? modes : ['comprehensive'];
  const modeLabels = activeModes.map(m => m.replace(/_/g, ' ')).join(', ');

  const instructions = activeModes.map(mode => {
      const instruction = PROMPT_INSTRUCTIONS[mode] || '';
      return `--- INSTRUCTIONS FOR ${mode.replace(/_/g, ' ').toUpperCase()} ---\n${instruction.replace(/{language}/g, language)}`;
  }).join('\n\n');

  let prompt = `As an expert code reviewer specializing in ${modeLabels}, review the following ${language} code.

Your primary instructions are below. You must follow all sets of instructions provided.
${instructions}

---
**Code to Review:**
\`\`\`${language}
${code}
\`\`\`
---
`;
  
  if (customPrompt && customPrompt.trim()) {
      prompt += `
\nIn addition to the primary analysis, please follow these specific custom instructions:
---
${customPrompt.trim()}
---
`;
  }

  return prompt;
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting - 20 requests per minute per user
    const rateLimit = checkRateLimit(`review-code:${userId}`, 20, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          }
        }
      );
    }

    // Parse request body
    const { code, language, customPrompt, reviewModes } = await req.json();

    // Validate inputs
    const codeValidation = validateCodeInput(code);
    if (!codeValidation.valid) {
      return NextResponse.json(
        { error: codeValidation.error },
        { status: 400 }
      );
    }

    const languageValidation = validateLanguage(language);
    if (!languageValidation.valid) {
      return NextResponse.json(
        { error: languageValidation.error },
        { status: 400 }
      );
    }

    const promptValidation = validateCustomPrompt(customPrompt || '');
    if (!promptValidation.valid) {
      return NextResponse.json(
        { error: promptValidation.error },
        { status: 400 }
      );
    }

    const modesValidation = validateReviewModes(reviewModes || []);
    if (!modesValidation.valid) {
      return NextResponse.json(
        { error: modesValidation.error },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedCode = sanitizeInput(code);
    const sanitizedLanguage = sanitizeInput(language);
    const sanitizedPrompt = customPrompt ? sanitizeInput(customPrompt) : '';

    // Build prompt with sanitized inputs
    const prompt = buildPrompt(
      sanitizedCode,
      sanitizedLanguage,
      sanitizedPrompt,
      reviewModes || ['comprehensive']
    );

    // Call Gemini AI
    const aiInstance = getAI();
    if (!aiInstance) {
      throw new Error('Gemini API key not configured');
    }

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const feedback = response.text || '';

    return NextResponse.json(
      { feedback },
      {
        headers: {
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        }
      }
    );
  } catch (error: any) {
    console.error('Error in code review API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to review code' },
      { status: 500 }
    );
  }
}
