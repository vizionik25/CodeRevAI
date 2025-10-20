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

/**
 * Convert unknown error to Error or metadata object
 */
function normalizeError(error: unknown): Error | Record<string, any> {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    return error as Record<string, any>;
  }
  return { error: String(error) };
}

export const logger = {
  /**
   * Log error messages with optional request ID and metadata
   * Always logs errors regardless of environment
   * Can accept unknown errors and will normalize them
   */
  error: (message: string, errorOrMetadata?: unknown, requestId?: string): void => {
    const normalized = errorOrMetadata ? normalizeError(errorOrMetadata) : null;
    const metadata = normalized instanceof Error 
      ? { error: normalized.message, stack: normalized.stack }
      : normalized;
    
    console.error('[ERROR]', ...formatMessage(requestId || null, metadata, message));
  },

  /**
   * Log warning messages with optional metadata and/or request ID
   * Only logs in development mode
   * Flexible signature: warn(message), warn(message, metadata), warn(message, metadata, requestId)
   */
  warn: (...args: any[]): void => {
    if (!isDevelopment) return;
    
    const [message, metadataOrRequestId, requestId] = args;
    const isRequestIdOnly = typeof metadataOrRequestId === 'string' && !requestId;
    const metadata = isRequestIdOnly ? null : (metadataOrRequestId || null);
    const reqId = isRequestIdOnly ? metadataOrRequestId : requestId;
    
    console.warn('[WARN]', ...formatMessage(reqId || null, metadata, message));
  },

  /**
   * Log info messages with optional metadata and/or request ID
   * Only logs in development mode
   * Flexible signature: info(message), info(message, metadata), info(message, metadata, requestId)
   */
  info: (...args: any[]): void => {
    if (!isDevelopment) return;
    
    const [message, metadataOrRequestId, requestId] = args;
    const isRequestIdOnly = typeof metadataOrRequestId === 'string' && !requestId;
    const metadata = isRequestIdOnly ? null : (metadataOrRequestId || null);
    const reqId = isRequestIdOnly ? metadataOrRequestId : requestId;
    
    console.log('[INFO]', ...formatMessage(reqId || null, metadata, message));
  },

  /**
   * Log debug messages with optional metadata and/or request ID
   * Only logs in development mode
   * Flexible signature: debug(message), debug(message, metadata), debug(message, metadata, requestId)
   */
  debug: (...args: any[]): void => {
    if (!isDevelopment) return;
    
    const [message, metadataOrRequestId, requestId] = args;
    const isRequestIdOnly = typeof metadataOrRequestId === 'string' && !requestId;
    const metadata = isRequestIdOnly ? null : (metadataOrRequestId || null);
    const reqId = isRequestIdOnly ? metadataOrRequestId : requestId;
    
    console.log('[DEBUG]', ...formatMessage(reqId || null, metadata, message));
  },

  /**
   * Log messages regardless of environment
   * Use sparingly - only for critical information that must always be shown
   * Flexible signature: always(message), always(message, metadata), always(message, metadata, requestId)
   */
  always: (...args: any[]): void => {
    const [message, metadataOrRequestId, requestId] = args;
    const isRequestIdOnly = typeof metadataOrRequestId === 'string' && !requestId;
    const metadata = isRequestIdOnly ? null : (metadataOrRequestId || null);
    const reqId = isRequestIdOnly ? metadataOrRequestId : requestId;
    
    console.log('[ALWAYS]', ...formatMessage(reqId || null, metadata, message));
  },
};

export default logger;
