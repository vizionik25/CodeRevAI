/**
 * Conditional logging utility
 * Only logs in development mode to avoid console noise in production
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log error messages
   * Only logs in development mode
   */
  error: (...args: any[]): void => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
  },

  /**
   * Log warning messages
   * Only logs in development mode
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log info messages
   * Only logs in development mode
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log debug messages
   * Only logs in development mode
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log messages regardless of environment
   * Use sparingly - only for critical information that must always be shown
   */
  always: (...args: any[]): void => {
    console.log(...args);
  },
};

export default logger;
