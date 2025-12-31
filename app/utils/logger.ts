
import type { Logging as LoggingType } from '@google-cloud/logging';

/**
 * Enhanced logging utility with request ID support and Google Cloud Logging integration.
 * - In 'development', it logs to the console.
 * - In 'production', it attempts to send structured logs to Google Cloud Logging.
 * - If GCP Logging fails to initialize (e.g. on Vercel), it gracefully falls back to console logging.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';
const isServer = typeof window === 'undefined';

// --- Google Cloud Logging Setup ---
let gcpLogging: LoggingType | null = null;
let gcpLog: any = null; // This will be a LogSync instance

if (!isDevelopment && isServer) {
  try {
    // Dynamically require Google Cloud Logging to avoid client-side bundle errors
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Logging } = require('@google-cloud/logging');
    const loggingInstance = new Logging();
    gcpLogging = loggingInstance;
    // Name of the log as it appears in Google Cloud Logging
    gcpLog = loggingInstance.log('coderevai-logs');
  } catch (error) {
    // Graceful fallback for Vercel/non-GCP environments
    // We suppress the error to a simple warning to avoid noise in logs
    console.warn('[WARN] Google Cloud Logging failed to initialize (falling back to console logging):',
      error instanceof Error ? error.message : String(error)
    );
    gcpLogging = null;
    gcpLog = null;
  }
}

/**
 * Formats a console log message with an optional request ID.
 */
function formatConsoleMessage(requestId: string | null, ...args: any[]): any[] {
  return requestId ? [`[${requestId}]`, ...args] : args;
}

/**
 * Prepares a metadata object for Google Cloud Logging.
 */
function prepareGcpMetadata(
  severity: LogLevel,
  requestId: string | null,
  metadata: Record<string, any> | null
) {
  const entryMetadata = {
    severity: severity.toUpperCase(),
    resource: { type: 'global' }, // Or more specific resource type
    ...(requestId && { httpRequest: { requestId } }),
    ...metadata,
  };
  return entryMetadata;
}

/**
 * Normalizes an unknown error into a structured object for logging.
 */
function normalizeError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    };
  }
  if (typeof error === 'object' && error !== null) {
    return { error: error };
  }
  return { error: { message: String(error) } };
}

/**
 * Core logging function that routes logs to console or Google Cloud.
 */
function log(level: LogLevel, message: string, metadata: Record<string, any> | null, requestId: string | null) {
  // Always log to console in dev OR if GCP logging is unavailable
  if (isDevelopment || !gcpLog) {
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

    // For Vercel in production, we might want JSON output for easier parsing, 
    // but standard console format is safer and readable.
    const logParts = formatConsoleMessage(requestId, `[${level.toUpperCase()}]`, message);
    if (metadata && Object.keys(metadata).length > 0) {
      logParts.push(metadata);
    }
    consoleMethod(...logParts);
  } else if (gcpLog) {
    // Write to GCP Logging
    const entryMetadata = prepareGcpMetadata(level, requestId, metadata);
    const entry = gcpLog.entry(entryMetadata, message);
    gcpLog.write(entry).catch((err: Error) => {
      // If writing to GCP fails drastically, fallback to console once
      console.error('Failed to write log to Google Cloud:', err);
    });
  }
}

export const logger = {
  /**
   * Logs an error message. Always logged, regardless of environment.
   * Normalizes error objects for structured logging.
   */
  error: (message: string, errorOrMetadata?: unknown, requestId?: string): void => {
    const normalized = errorOrMetadata ? normalizeError(errorOrMetadata) : {};
    log('error', message, normalized, requestId || null);
  },

  /**
   * Logs a warning message.
   * Flexible signature: warn(message, metadata?, requestId?)
   */
  warn: (message: string, errorOrMetadata?: unknown, requestId?: string): void => {
    const normalized = errorOrMetadata ? normalizeError(errorOrMetadata) : {};
    log('warn', message, normalized, requestId || null);
  },

  /**
   * Logs an info message.
   * Flexible signature: info(message, metadata?, requestId?)
   */
  info: (message: string, metadata?: Record<string, any>, requestId?: string): void => {
    log('info', message, metadata || null, requestId || null);
  },

  /**
   * Logs a debug message.
   * In production, this will be logged with INFO severity.
   * Flexible signature: debug(message, metadata?, requestId?)
   */
  debug: (message: string, metadata?: Record<string, any>, requestId?: string): void => {
    // GCP Logging doesn't have a 'debug' severity in the same way.
    // It's often handled by setting a log level filter in the log viewer.
    // We'll log it as INFO and let the developer filter by payload content if needed.
    log('info', message, { ...metadata, debug: true }, requestId || null);
  },

  /**
   * Logs a message that should always be visible, regardless of environment.
   * In production, this is logged with INFO severity.
   */
  always: (message: string, metadata?: Record<string, any>, requestId?: string): void => {
    log('info', message, metadata || null, requestId || null);
  },
};

export default logger;
