import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  sanitizeInput,
  sanitizeForAIPrompt,
  validateCustomPrompt,
  validateReviewModes,
  validateRepoUrl,
  validateFileSize,
  filterSensitiveFiles,
} from '@/app/utils/security';
import { checkRateLimitRedis } from '@/app/utils/redis';
import { PROMPT_INSTRUCTIONS } from '@/app/data/prompts';
import { getGeminiAI } from '@/app/utils/apiClients';
import { FILE_SIZE_LIMITS } from '@/app/data/constants';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

function buildRepoPrompt(files: Array<{ path: string; content: string }>, repoUrl: string, customPrompt: string, modes: string[]): string {
  const fileManifest = files.map(f => `- ${f.path}`).join('\n');
  
  const allCode = files.map(f => `
// FILE: ${f.path}
\`\`\`
${f.content}
\`\`\`
`).join('\n---\n');

  const activeModes = modes.length > 0 ? modes : ['comprehensive'];
  const modeLabels = activeModes.map(m => m.replace(/_/g, ' ')).join(', ');

  const instructions = activeModes.map(mode => {
      const instruction = PROMPT_INSTRUCTIONS[mode] || '';
      return `--- INSTRUCTIONS FOR ${mode.replace(/_/g, ' ').toUpperCase()} ---\n${instruction}`;
  }).join('\n\n');

  let prompt = `As an expert code reviewer specializing in ${modeLabels}, perform a holistic review of the entire codebase from ${repoUrl}.

Your review should be at the repository level. Focus on high-level feedback, architectural patterns, cross-file issues, and overall code quality. When referring to specific code, mention the file path.

Here is a manifest of all the files:
${fileManifest}

And here is the content of all the files:
---
${allCode}
---

Your primary instructions are below. You must follow all sets of instructions provided.
${instructions}

IMPORTANT: For every suggested change, please include a code snippet showing how to properly implement the change. Include a comment at the top of each snippet stating the path/to/file.ts & starting Line# - ending Line#. This will make the implementation process more efficient and less of a headache for the developer implementing the changes.
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
  const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;
  const startTime = Date.now();

  try {
    logger.info('Repo review request started', { endpoint: '/api/review-repo' }, requestId);
    // Check authentication
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      logger.warn('Unauthorized repo review attempt', {}, requestId);
      return NextResponse.json(
        createErrorResponse(error),
        { status: 401, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Rate limiting - 5 requests per minute for repo reviews (more intensive, fail-closed)
    const rateLimit = await checkRateLimitRedis(`review-repo:${userId}`, 5, 60000, true);
    
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
        'Rate limit exceeded. Repository reviews are limited to 5 per minute.',
        undefined,
        true
      );
      return NextResponse.json(
        createErrorResponse(error),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
            'X-Request-ID': requestId,
          }
        }
      );
    }

    // Parse request body
    const { files, repoUrl, customPrompt, reviewModes } = await req.json();

    // Validate inputs
    if (!files || !Array.isArray(files) || files.length === 0) {
      const error = new AppError('INVALID_INPUT', 'Files array is required and must not be empty');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const urlValidation = validateRepoUrl(repoUrl);
    if (!urlValidation.valid) {
      const error = new AppError('INVALID_INPUT', urlValidation.error || 'Invalid repository URL');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const promptValidation = validateCustomPrompt(customPrompt || '');
    if (!promptValidation.valid) {
      const error = new AppError('INVALID_INPUT', promptValidation.error || 'Invalid custom prompt');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const modesValidation = validateReviewModes(reviewModes || []);
    if (!modesValidation.valid) {
      const error = new AppError('INVALID_INPUT', modesValidation.error || 'Invalid review modes');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Filter out sensitive files
    const safeFiles = filterSensitiveFiles(files);
    
    if (safeFiles.length === 0) {
      const error = new AppError('INVALID_INPUT', 'No valid files to review after filtering sensitive files');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Sanitize file contents and check total size
    let totalSize = 0;
    const sanitizedFiles = safeFiles.map(file => {
      const sanitizedContent = sanitizeInput(file.content || '');
      totalSize += sanitizedContent.length;
      return {
        path: sanitizeInput(file.path),
        content: sanitizedContent,
      };
    });

    // Check total repository size
    const sizeValidation = validateFileSize(sanitizedFiles.map(f => f.content).join(''), FILE_SIZE_LIMITS.REPO_TOTAL_MAX);
    if (!sizeValidation.valid) {
      const error = new AppError('REPO_TOO_LARGE', sizeValidation.error || 'Repository exceeds size limit');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    const sanitizedPrompt = customPrompt ? sanitizeForAIPrompt(customPrompt) : '';
    const sanitizedRepoUrl = sanitizeInput(repoUrl);

    // Build prompt
    const prompt = buildRepoPrompt(
      sanitizedFiles,
      sanitizedRepoUrl,
      sanitizedPrompt,
      reviewModes || ['comprehensive']
    );

    // Call Gemini AI
    const aiStartTime = Date.now();
    const aiInstance = getGeminiAI();

    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const aiDuration = Date.now() - aiStartTime;
    const feedback = response.text || '';

    logger.info('AI repo request completed', {
      model: 'gemini-2.5-flash',
      aiDuration: `${aiDuration}ms`,
      feedbackLength: feedback.length,
      userId
    }, requestId);

    const totalDuration = Date.now() - startTime;
    logger.info('Repo request completed successfully', {
      totalDuration: `${totalDuration}ms`,
      aiDuration: `${aiDuration}ms`
    }, requestId);

    return NextResponse.json(
      { feedback },
      {
        headers: {
          'X-RateLimit-Limit': '5',
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
    
    logger.error('Error in repository review API', errorInfo, requestId);
    logger.info('Request completed with error', { duration: `${duration}ms` }, requestId);
    
    const apiError = createErrorResponse(error, 'AI_SERVICE_ERROR');
    const statusCode = error instanceof AppError && error.code === 'AI_SERVICE_ERROR' ? 503 : 500;
    
    return NextResponse.json(
      apiError,
      { status: statusCode, headers: { 'X-Request-ID': requestId } }
    );
  }
}
