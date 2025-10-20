import { HistoryItem } from '@/app/types';
import { AppError, ApiError } from '@/app/types/errors';
import { logger } from '@/app/utils/logger';

/**
 * Client-side history service
 * These functions call the API routes which handle database operations
 */

/**
 * Deserialize API error response and throw AppError
 */
async function handleApiError(response: Response): Promise<never> {
  try {
    const errorData: ApiError = await response.json();
    
    // Check if we received a structured error response
    if (errorData.code && errorData.message) {
      throw new AppError(
        errorData.code,
        errorData.message,
        errorData.details,
        errorData.retryable
      );
    }
    
    // Fallback for non-structured errors
    throw new AppError(
      'INTERNAL_ERROR',
      errorData.message || `Request failed with status ${response.status}`,
      undefined,
      false
    );
  } catch (parseError) {
    // If JSON parsing fails, create a generic error
    if (parseError instanceof AppError) {
      throw parseError;
    }
    
    throw new AppError(
      'INTERNAL_ERROR',
      `Request failed with status ${response.status}`,
      response.statusText,
      false
    );
  }
}

/**
 * Get review history for the current user from database
 * @throws {AppError} With proper error code and message
 */
export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const response = await fetch('/api/history');
    
    if (!response.ok) {
      await handleApiError(response);
    }
    
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      logger.error('History fetch error:', { code: error.code, message: error.message });
      throw error;
    }
    
    // Network or other errors
    logger.error('Unexpected error fetching history:', error);
    throw new AppError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch history',
      'Network or client-side error',
      true // Network errors are retryable
    );
  }
}

/**
 * Add a new review to history
 * @throws {AppError} With proper error code and message
 */
export async function addHistoryItem(item: HistoryItem): Promise<void> {
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      await handleApiError(response);
    }
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      logger.error('Add history error:', { code: error.code, message: error.message });
      throw error;
    }
    
    // Network or other errors - don't throw, just log
    // History addition is not critical, shouldn't block user workflow
    logger.warn('Failed to add history item (non-critical):', error);
  }
}

/**
 * Clear all history for the current user
 * @throws {AppError} With proper error code and message
 */
export async function clearHistory(): Promise<void> {
  try {
    const response = await fetch('/api/history', {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      await handleApiError(response);
    }
  } catch (error) {
    // If it's already an AppError, re-throw it
    if (error instanceof AppError) {
      logger.error('Clear history error:', { code: error.code, message: error.message });
      throw error;
    }
    
    // Network or other errors
    logger.error('Unexpected error clearing history:', error);
    throw new AppError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to clear history',
      'Network or client-side error',
      true // Network errors are retryable
    );
  }
}

