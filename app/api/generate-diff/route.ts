import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  sanitizeInput,
  validateCodeInput,
  validateLanguage,
} from '@/app/utils/security';
import { checkRateLimitRedis } from '@/app/utils/redis';
import { cleanMarkdownFences } from '@/app/utils/markdown';
import { getGeminiAI } from '@/app/utils/apiClients';

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

    // Rate limiting - 15 requests per minute per user
    const rateLimit = await checkRateLimitRedis(`generate-diff:${userId}`, 15, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '15',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          }
        }
      );
    }

    // Parse request body
    const { originalCode, language, feedback } = await req.json();

    // Validate inputs
    const codeValidation = validateCodeInput(originalCode);
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

    if (!feedback || typeof feedback !== 'string') {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      );
    }

    if (feedback.length > 50000) {
      return NextResponse.json(
        { error: 'Feedback is too large' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedCode = sanitizeInput(originalCode);
    const sanitizedLanguage = sanitizeInput(language);
    const sanitizedFeedback = sanitizeInput(feedback);

    // Build prompt
    const prompt = `
You are an expert code refactoring assistant. Your task is to apply code review suggestions to produce the complete, final version of the code.

**Instructions:**
1. Carefully read the original ${sanitizedLanguage} code.
2. Carefully read the code review feedback.
3. Apply ALL the suggestions from the feedback to the original code.
4. Return ONLY the complete, final, and refactored code.
5. Do NOT include any explanations, comments, or Markdown formatting (like \`\`\`) in your output. Your response must be only the raw code itself.

---
**Original Code:**
\`\`\`${sanitizedLanguage}
${sanitizedCode}
\`\`\`
---
**Code Review Feedback:**
${sanitizedFeedback}
---

Return the complete, refactored code now.
`;

    // Call Gemini AI
    const aiInstance = getGeminiAI();

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let modifiedCode = response.text || '';

    // Clean up potential markdown fences using utility function
    modifiedCode = cleanMarkdownFences(modifiedCode, sanitizedLanguage);

    return NextResponse.json(
      { modifiedCode: modifiedCode.trim() },
      {
        headers: {
          'X-RateLimit-Limit': '15',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        }
      }
    );
  } catch (error: unknown) {
    console.error('Error in generate diff API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while generating modified code';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
