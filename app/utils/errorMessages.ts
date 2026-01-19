/**
 * Enhanced error message utility for providing user-friendly error feedback.
 * Maps technical errors to clear, actionable messages for end users.
 */

import { TmdbError } from '@/app/tmdbClient';

/**
 * Standardized error messages for common error scenarios
 */
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR:
    'Unable to connect. Please check your internet connection and try again.',
  TIMEOUT: 'Request took too long. Please try again.',

  // API errors
  RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',
  NOT_FOUND: "We couldn't find what you're looking for.",
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  TMDB_ERROR: 'Unable to fetch data from TMDB. Please try again later.',

  // Input validation errors
  INVALID_INPUT: 'Please check your input and try again.',
  SEARCH_QUERY_TOO_SHORT: 'Please enter at least 2 characters to search.',

  // Generic fallback
  GENERIC_ERROR: "We're having trouble right now. Please try again later.",
} as const;

/**
 * Error categories for logging and analytics
 */
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

/**
 * Enhanced error object with user-friendly message and metadata
 */
export interface EnhancedError {
  message: string;
  category: ErrorCategory;
  originalError?: unknown;
  statusCode?: number;
}

/**
 * Extract user-friendly error message from various error types
 *
 * @param error - The error to process (can be Error, TmdbError, or unknown)
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  // Handle TMDB-specific errors
  if (error instanceof TmdbError) {
    if (error.statusCode === 404) {
      return ERROR_MESSAGES.NOT_FOUND;
    }
    if (error.statusCode === 429) {
      return ERROR_MESSAGES.RATE_LIMIT;
    }
    if (error.statusCode >= 500) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
    return ERROR_MESSAGES.TMDB_ERROR;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Network-related errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('failed to fetch')
    ) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return ERROR_MESSAGES.TIMEOUT;
    }

    // AbortError (user-initiated cancellation, shouldn't show as error)
    if (error.name === 'AbortError') {
      return ''; // Return empty string to suppress error display
    }
  }

  // Fallback for unknown errors
  return ERROR_MESSAGES.GENERIC_ERROR;
}

/**
 * Get enhanced error information including category and metadata
 * Useful for logging and analytics
 *
 * @param error - The error to process
 * @returns Enhanced error object with message, category, and metadata
 */
export function getEnhancedError(error: unknown): EnhancedError {
  // Handle TMDB-specific errors
  if (error instanceof TmdbError) {
    return {
      message: getErrorMessage(error),
      category: ErrorCategory.API,
      originalError: error,
      statusCode: error.statusCode,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Determine category
    let category = ErrorCategory.UNKNOWN;
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout')
    ) {
      category = ErrorCategory.NETWORK;
    } else if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
      category = ErrorCategory.VALIDATION;
    }

    return {
      message: getErrorMessage(error),
      category,
      originalError: error,
    };
  }

  // Unknown error type
  return {
    message: ERROR_MESSAGES.GENERIC_ERROR,
    category: ErrorCategory.UNKNOWN,
    originalError: error,
  };
}

/**
 * Check if error message should be displayed to user
 * Some errors (like AbortError) shouldn't be shown
 *
 * @param error - The error to check
 * @returns True if error should be displayed to user
 */
export function shouldDisplayError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }
  return true;
}

/**
 * Format error for logging (includes stack trace and details)
 *
 * @param error - The error to format
 * @param context - Additional context about where error occurred
 * @returns Formatted error string for logging
 */
export function formatErrorForLogging(
  error: unknown,
  context?: Record<string, unknown>
): string {
  const enhanced = getEnhancedError(error);

  let logMessage = `[${enhanced.category.toUpperCase()}] ${enhanced.message}`;

  if (enhanced.statusCode) {
    logMessage += ` (Status: ${enhanced.statusCode})`;
  }

  if (context) {
    logMessage += `\nContext: ${JSON.stringify(context, null, 2)}`;
  }

  if (enhanced.originalError instanceof Error && enhanced.originalError.stack) {
    logMessage += `\nStack: ${enhanced.originalError.stack}`;
  }

  return logMessage;
}
