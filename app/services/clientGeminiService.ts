// Gemini Service - Client-side wrapper for secure API calls
// All AI calls are proxied through Next.js API routes to protect the API key

import { logger } from '@/app/utils/logger';

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
      const error = await response.json();
      throw new Error(error.error || 'Failed to review code');
    }

    const data = await response.json();
    return data.feedback || '';
  } catch (error) {
    logger.error("Error calling review API:", error);
    if (error instanceof Error) {
        throw new Error(`Error during code review: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}

/**
 * Review an entire repository
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to review repository');
    }

    const data = await response.json();
    return data.feedback || '';
  } catch (error) {
    logger.error("Error calling repository review API:", error);
    if (error instanceof Error) {
        throw new Error(`Error during repository review: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}

/**
 * Generate refactored code based on review feedback
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate modified code');
    }

    const data = await response.json();
    const newCode = data.modifiedCode || '';

    return newCode.trim();
  } catch (error) {
    logger.error("Error calling generate diff API:", error);
    if (error instanceof Error) {
        throw new Error(`Error generating refactored code: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI.");
  }
}
