/**
 * Conditional logging utility with request ID support
 * Only logs in development mode to avoid console noise in production
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Format log message with optional request ID and metadata
 */
function formatMessage(requestId: string | null, metadata: Record<string, any> | null, ...args: any[]): any[] {
  const parts: any[] = [];
  
  if (requestId) {
    parts.push(`[${requestId}]`);
  }
  
  parts.push(...args);
  
  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(metadata);
  }
  
  return parts;
}

export const logger = {
  /**
   * Log error messages with optional request ID and metadata
   * Always logs errors regardless of environment
   */
  error: (message: string, errorOrMetadata?: Error | Record<string, any>, requestId?: string): void => {
    const metadata = errorOrMetadata instanceof Error 
      ? { error: errorOrMetadata.message, stack: errorOrMetadata.stack }
      : errorOrMetadata || null;
    
    console.error('[ERROR]', ...formatMessage(requestId || null, metadata, message));
  },

  /**
   * Log warning messages with optional request ID and metadata
   * Only logs in development mode
   */
  warn: (message: string, metadata?: Record<string, any>, requestId?: string): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...formatMessage(requestId || null, metadata || null, message));
    }
  },

  /**
   * Log info messages with optional request ID and metadata
   * Only logs in development mode
   */
  info: (message: string, metadata?: Record<string, any>, requestId?: string): void => {
    if (isDevelopment) {
      console.log('[INFO]', ...formatMessage(requestId || null, metadata || null, message));
    }
  },

  /**
   * Log debug messages with optional request ID and metadata
   * Only logs in development mode
   */
  debug: (message: string, metadata?: Record<string, any>, requestId?: string): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...formatMessage(requestId || null, metadata || null, message));
    }
  },

  /**
   * Log messages regardless of environment
   * Use sparingly - only for critical information that must always be shown
   */
  always: (message: string, metadata?: Record<string, any>, requestId?: string): void => {
    console.log('[ALWAYS]', ...formatMessage(requestId || null, metadata || null, message));
  },
};

export default logger;
