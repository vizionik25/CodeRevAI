import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  sanitizeInput,
  sanitizeForAIPrompt,
  validateCodeInput,
  validateCustomPrompt,
  validateLanguage,
  validateReviewModes,
} from '@/app/utils/security';
import { checkRateLimitRedis } from '@/app/utils/redis';
import { PROMPT_INSTRUCTIONS } from '@/app/data/prompts';
import { getGeminiAI } from '@/app/utils/apiClients';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

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
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 401 }
      );
    }

    // Rate limiting - 20 requests per minute per user (fail-closed for cost protection)
    const rateLimit = await checkRateLimitRedis(`review-code:${userId}`, 20, 60000, true);
    
    if (!rateLimit.allowed) {
      // Check if circuit breaker caused the rejection
      if (rateLimit.circuitOpen) {
        const error = new AppError(
          'SERVICE_UNAVAILABLE',
          'Rate limiting service temporarily unavailable. Please try again in a few moments.',
          'Circuit breaker open',
          true
        );
        return NextResponse.json(
          createErrorResponse(error),
          { status: 503 }
        );
      }
      
      const error = new AppError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please try again later.',
        undefined,
        true
      );
      return NextResponse.json(
        createErrorResponse(error),
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
      const error = new AppError('INVALID_INPUT', codeValidation.error || 'Invalid code input');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400 }
      );
    }

    const languageValidation = validateLanguage(language);
    if (!languageValidation.valid) {
      const error = new AppError('INVALID_INPUT', languageValidation.error || 'Invalid language');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400 }
      );
    }

    const promptValidation = validateCustomPrompt(customPrompt || '');
    if (!promptValidation.valid) {
      const error = new AppError('INVALID_INPUT', promptValidation.error || 'Invalid custom prompt');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400 }
      );
    }

    const modesValidation = validateReviewModes(reviewModes || []);
    if (!modesValidation.valid) {
      const error = new AppError('INVALID_INPUT', modesValidation.error || 'Invalid review modes');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedCode = sanitizeInput(code);
    const sanitizedLanguage = sanitizeInput(language);
    const sanitizedPrompt = customPrompt ? sanitizeForAIPrompt(customPrompt) : '';

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
  } catch (error: unknown) {
    logger.error('Error in code review API:', error);
    
    const apiError = error instanceof AppError 
      ? createErrorResponse(error)
      : createErrorResponse(error, 'AI_SERVICE_ERROR');
    
    const statusCode = error instanceof AppError && error.code === 'AI_SERVICE_ERROR' ? 503 : 500;
    
    return NextResponse.json(
      apiError,
      { status: statusCode }
    );
  }
}
