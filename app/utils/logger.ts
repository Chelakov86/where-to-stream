/**
 * Simple logging utility for the application.
 *
 * Provides a centralized logging interface that can be easily extended
 * to use external logging services in the future. Currently uses console
 * methods for development and production.
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/app/utils/logger';
 *
 * logger.error('API request failed', { endpoint: '/api/search', status: 500 });
 * logger.info('Search performed', { query: 'Inception', results: 10 });
 * ```
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  /**
   * Logs an error message with optional context.
   * Use for errors that need attention (API failures, unexpected exceptions).
   *
   * @param message - Error message
   * @param context - Optional context object with additional information
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Logs a warning message with optional context.
   * Use for situations that are not errors but may need attention.
   *
   * @param message - Warning message
   * @param context - Optional context object with additional information
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Logs an informational message with optional context.
   * Use for general information about application flow (search events, etc.).
   *
   * @param message - Info message
   * @param context - Optional context object with additional information
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Logs a debug message with optional context.
   * Use for detailed debugging information (only in development).
   *
   * @param message - Debug message
   * @param context - Optional context object with additional information
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  /**
   * Internal method to handle logging with consistent format.
   * Can be extended to send logs to external services (e.g., Sentry, LogRocket).
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional context object
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(context && { context }),
    };

    // Use appropriate console method based on level
    switch (level) {
      case 'error':
        console.error(`[${timestamp}] ERROR:`, message, context || '');
        break;
      case 'warn':
        console.warn(`[${timestamp}] WARN:`, message, context || '');
        break;
      case 'info':
        console.info(`[${timestamp}] INFO:`, message, context || '');
        break;
      case 'debug':
        console.debug(`[${timestamp}] DEBUG:`, message, context || '');
        break;
    }

    // Future: Send to external logging service
    // if (process.env.NODE_ENV === 'production') {
    //   sendToLoggingService(logEntry);
    // }
  }
}

// Export singleton instance
export const logger = new Logger();
