/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Retry Logic - Exponential backoff with jitter
 */

import { config } from './config.js';
import { logger } from './logger.js';
import { isOperationalError } from './errors.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryable?: (error: Error) => boolean;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = config.MAX_RETRIES,
    baseDelay = config.RETRY_DELAY_BASE,
    maxDelay = config.RETRY_DELAY_MAX,
    retryable = (error: Error) => {
      // Retry on network errors, timeouts, and rate limits
      if (!isOperationalError(error)) {
        return false; // Don't retry programming errors
      }
      const message = error.message.toLowerCase();
      return message.includes('timeout') ||
             message.includes('rate limit') ||
             message.includes('network') ||
             message.includes('econnreset') ||
             message.includes('etimedout') ||
             message.includes('503') ||
             message.includes('429');
    },
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if error is not retryable
      if (!retryable(lastError)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt >= maxRetries) {
        break;
      }

      const delay = calculateDelay(attempt, baseDelay, maxDelay);
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: lastError.message,
        attempt: attempt + 1,
        delay,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}
