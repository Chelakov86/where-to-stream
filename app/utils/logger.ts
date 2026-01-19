/**
 * Enhanced logging utility for the application with configurable log levels.
 *
 * Provides a centralized logging interface that can be easily extended
 * to use external logging services in the future. Supports log level filtering
 * to reduce noise in production environments.
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/app/utils/logger';
 *
 * logger.error('API request failed', { endpoint: '/api/search', status: 500 });
 * logger.info('Search performed', { query: 'Inception', results: 10 });
 * logger.debug('Detailed debugging info', { data: complexObject });
 * ```
 *
 * Environment Variables:
 * - LOG_LEVEL: Minimum log level to output (debug|info|warn|error). Defaults to 'info'.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private minLevel: LogLevel;
  private readonly levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  constructor() {
    // Get minimum log level from environment, default to 'info'
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
    this.minLevel = this.levels.includes(envLevel as LogLevel)
      ? (envLevel as LogLevel)
      : 'info';
  }

  /**
   * Check if a log level should be outputted based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levels.indexOf(level) >= this.levels.indexOf(this.minLevel);
  }

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
   * Use for detailed debugging information.
   *
   * @param message - Debug message
   * @param context - Optional context object with additional information
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
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
    // Skip logging if level is below minimum
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      ...(context && { context }),
    };

    // Format message for console output
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context ? JSON.stringify(context, null, 2) : '';

    // Use appropriate console method based on level
    switch (level) {
      case 'error':
        console.error(prefix, message, contextStr);
        break;
      case 'warn':
        console.warn(prefix, message, contextStr);
        break;
      case 'info':
        console.info(prefix, message, contextStr);
        break;
      case 'debug':
        console.debug(prefix, message, contextStr);
        break;
    }

    // Future: Send to external logging service in production
    // if (process.env.NODE_ENV === 'production') {
    //   this.sendToExternalService(logEntry);
    // }
  }

  /**
   * Placeholder for external logging service integration
   * @private
   */
  // private sendToExternalService(logEntry: LogEntry): void {
  //   // Example: Send to Sentry, LogRocket, DataDog, etc.
  //   // Sentry.captureMessage(logEntry.message, {
  //   //   level: logEntry.level,
  //   //   extra: logEntry.context,
  //   // });
  // }
}

// Export singleton instance
export const logger = new Logger();
