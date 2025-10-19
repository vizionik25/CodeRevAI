/**
 * Standardized error types and codes for API responses
 * Provides consistent error handling across the application
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'REPO_TOO_LARGE'
  | 'AI_SERVICE_ERROR'
  | 'GITHUB_API_ERROR'
  | 'DATABASE_ERROR'
  | 'PAYMENT_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: string;
  retryable?: boolean;
}

export class AppError extends Error {
  code: ErrorCode;
  details?: string;
  retryable: boolean;

  constructor(code: ErrorCode, message: string, details?: string, retryable = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

/**
 * Helper function to create error responses
 */
export function createErrorResponse(
  error: AppError | Error | unknown,
  fallbackCode: ErrorCode = 'INTERNAL_ERROR'
): ApiError {
  if (error instanceof AppError) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
      retryable: false,
    };
  }

  return {
    code: fallbackCode,
    message: 'An unknown error occurred',
    retryable: false,
  };
}
