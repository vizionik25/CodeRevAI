// Gemini Service - Client-side wrapper for secure API calls
// All AI calls are proxied through Next.js API routes to protect the API key

import { logger } from '@/app/utils/logger';
import { AppError, ApiError, ErrorCode } from '@/app/types/errors';

/**
 * Deserialize API error response and throw AppError
 */
import { handleApiError } from '@/app/utils/apiErrorHandling';

/**
 * Retry a fetch request with exponential backoff
 * Useful for handling transient network issues or temporary service unavailability
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 3,
  delay: number = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // Retry on server errors (5xx) if retries remaining
    if (!response.ok && response.status >= 500 && retries > 0) {
      logger.warn(`Retrying ${url} due to ${response.status} status. Retries left: ${retries}`);
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }

    return response;
  } catch (error) {
    // Retry on network errors if retries remaining
    if (retries > 0) {
      logger.warn(`Retrying ${url} due to network error. Retries left: ${retries}`, error);
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Review a single code file
 * @throws {AppError} With proper error code and message
 */
export async function reviewCode(code: string, language: string, customPrompt: string, modes: string[]): Promise<string> {
  try {
    const response = await fetchWithRetry('/api/review-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        language,
        customPrompt,
        reviewModes: modes,
      }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    return data.feedback || '';
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      logger.error('Code review error:', { code: error.code, message: error.message });
      throw error;
    }

    // Network or other errors
    logger.error('Unexpected error during code review:', error);
    throw new AppError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'Network or client-side error',
      true // Network errors are retryable
    );
  }
}

/**
 * Review an entire repository
 * @throws {AppError} With proper error code and message
 */
export async function reviewRepository(files: { path: string, content: string }[], repoUrl: string, customPrompt: string, modes: string[]): Promise<string> {
  try {
    const response = await fetchWithRetry('/api/review-repo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files,
        repoUrl,
        customPrompt,
        reviewModes: modes,
      }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    return data.feedback || '';
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      logger.error('Repository review error:', { code: error.code, message: error.message });
      throw error;
    }

    // Network or other errors
    logger.error('Unexpected error during repository review:', error);
    throw new AppError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'Network or client-side error',
      true // Network errors are retryable
    );
  }
}

/**
 * Generate refactored code based on review feedback
 * @throws {AppError} With proper error code and message
 */
export async function generateFullCodeFromReview(originalCode: string, language: string, feedback: string): Promise<string> {
  try {
    const response = await fetchWithRetry('/api/generate-diff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalCode,
        language,
        feedback,
      }),
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    const newCode = data.modifiedCode || '';

    return newCode.trim();
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      logger.error('Code generation error:', { code: error.code, message: error.message });
      throw error;
    }

    // Network or other errors
    logger.error('Unexpected error during code generation:', error);
    throw new AppError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred',
      'Network or client-side error',
      true // Network errors are retryable
    );
  }
}
