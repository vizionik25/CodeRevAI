import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  sanitizeInput,
  validateCodeInput,
  validateCustomPrompt,
  validateLanguage,
  validateReviewModes,
  checkRateLimit,
} from '@/app/utils/security';
import { PROMPT_INSTRUCTIONS } from '@/app/data/prompts';
import { getGeminiAI } from '@/app/utils/apiClients';

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
    const aiInstance = getGeminiAI();

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
