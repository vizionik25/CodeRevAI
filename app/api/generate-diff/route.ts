import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  sanitizeInput,
  validateCodeInput,
  validateLanguage,
} from '@/app/utils/security';
import { INPUT_LIMITS } from '@/app/data/constants';
import { checkRateLimitRedis } from '@/app/utils/redis';
import { cleanMarkdownFences } from '@/app/utils/markdown';
import { getGeminiAI } from '@/app/utils/apiClients';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

export async function POST(req: Request) {
  const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    logger.info('Generate diff request started', { endpoint: '/api/generate-diff' }, requestId);
    // Check authentication
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      logger.warn('Unauthorized generate diff attempt', {}, requestId);
      return NextResponse.json(
        createErrorResponse(error),
        { status: 401, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Rate limiting - 15 requests per minute per user (fail-closed for cost protection)
    const rateLimit = await checkRateLimitRedis(`generate-diff:${userId}`, 15, 60000, true);
    
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
          { status: 503, headers: { 'X-Request-ID': requestId } }
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
            'X-RateLimit-Limit': '15',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
            'X-Request-ID': requestId,
          }
        }
      );
    }

    // Parse request body
    const { originalCode, language, feedback } = await req.json();

    // Validate inputs
    const codeValidation = validateCodeInput(originalCode);
    if (!codeValidation.valid) {
      const error = new AppError('INVALID_INPUT', codeValidation.error || 'Invalid code input');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const languageValidation = validateLanguage(language);
    if (!languageValidation.valid) {
      const error = new AppError('INVALID_INPUT', languageValidation.error || 'Invalid language');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    if (!feedback || typeof feedback !== 'string') {
      const error = new AppError('INVALID_INPUT', 'Feedback is required');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    if (feedback.length > INPUT_LIMITS.FEEDBACK_MAX) {
      const error = new AppError('INVALID_INPUT', 'Feedback text is too long');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
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
    const aiStartTime = Date.now();
    const aiInstance = getGeminiAI();

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const aiDuration = Date.now() - aiStartTime;
    let modifiedCode = response.text || '';

    // Clean up potential markdown fences using utility function
    modifiedCode = cleanMarkdownFences(modifiedCode, sanitizedLanguage);

    logger.info('AI generate diff request completed', {
      model: 'gemini-2.5-flash',
      aiDuration: `${aiDuration}ms`,
      modifiedCodeLength: modifiedCode.length,
      userId
    }, requestId);

    const totalDuration = Date.now() - startTime;
    logger.info('Generate diff request completed successfully', {
      totalDuration: `${totalDuration}ms`,
      aiDuration: `${aiDuration}ms`
    }, requestId);

    return NextResponse.json(
      { modifiedCode: modifiedCode.trim() },
      {
        headers: {
          'X-RateLimit-Limit': '15',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          'X-Request-ID': requestId,
        }
      }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorInfo = error instanceof Error 
      ? error
      : { message: 'Unknown error', error: String(error) };

    logger.error('Error in generate diff API', errorInfo, requestId);
    logger.info('Request completed with error', { duration: `${duration}ms` }, requestId);
    
    const apiError = createErrorResponse(error, 'AI_SERVICE_ERROR');
    const statusCode = error instanceof AppError && error.code === 'AI_SERVICE_ERROR' ? 503 : 500;
    
    return NextResponse.json(
      apiError,
      { status: statusCode, headers: { 'X-Request-ID': requestId } }
    );
  }
}
