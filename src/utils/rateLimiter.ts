/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Rate Limiter - Token bucket algorithm for API rate limiting
 */

import { config } from './config.js';
import { RateLimitError } from './errors.js';
import { logger } from './logger.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per millisecond
}

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(capacity: number, tokensPerHour: number) {
    this.capacity = capacity;
    // Convert tokens per hour to tokens per millisecond
    this.refillRate = tokensPerHour / (60 * 60 * 1000);
  }

  /**
   * Try to consume a token from the bucket
   * @returns true if token was consumed, false if rate limit exceeded
   */
  tryConsume(key: string = 'default'): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
        capacity: this.capacity,
        refillRate: this.refillRate,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const timeElapsed = now - bucket.lastRefill;
    const tokensToAdd = timeElapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Try to consume a token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Wait until a token is available
   */
  async waitForToken(key: string = 'default', maxWait: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (!this.tryConsume(key)) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWait) {
        throw new RateLimitError('Rate limit exceeded: maximum wait time reached', undefined, { key, maxWait });
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, Math.floor(elapsed / 5000)), 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get remaining tokens
   */
  getRemainingTokens(key: string = 'default'): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return this.capacity;
    }
    
    const now = Date.now();
    const timeElapsed = now - bucket.lastRefill;
    const tokensToAdd = timeElapsed * bucket.refillRate;
    const currentTokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    
    return Math.max(0, Math.floor(currentTokens));
  }

  /**
   * Reset bucket for a key
   */
  reset(key: string = 'default'): void {
    this.buckets.delete(key);
  }
}

export const rateLimiter = new RateLimiter(
  config.GITHUB_RATE_LIMIT_BURST,
  config.GITHUB_RATE_LIMIT_PER_HOUR
);
