/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Custom Error Types - Enterprise-grade error handling
 */

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
  }
}

/**
 * GitHub API error
 */
export class GitHubAPIError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GITHUB_API_ERROR', 502, true, context);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, context);
    this.retryAfter = retryAfter;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', 504, true, context);
  }
}

/**
 * Repository access error
 */
export class RepositoryAccessError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'REPOSITORY_ACCESS_ERROR', 403, true, context);
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CIRCUIT_BREAKER_ERROR', 503, true, context);
  }
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for client response (sanitized, no sensitive data)
 */
export function formatErrorForClient(error: unknown): {
  error: string;
  code: string;
  message: string;
  context?: Record<string, unknown>;
} {
  if (error instanceof AppError) {
    return {
      error: error.name,
      code: error.code,
      message: error.message,
      context: error.context,
    };
  }

  if (error instanceof Error) {
    return {
      error: 'InternalError',
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    };
  }

  return {
    error: 'UnknownError',
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
  };
}
