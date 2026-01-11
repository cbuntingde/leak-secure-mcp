/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Circuit Breaker Pattern - Prevents cascading failures
 */

import { config } from './config.js';
import { CircuitBreakerError, TimeoutError } from './errors.js';
import { logger } from './logger.js';

enum CircuitState {
  CLOSED = 'CLOSED',    // Normal operation
  OPEN = 'OPEN',        // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly timeout: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? config.CIRCUIT_BREAKER_THRESHOLD;
    this.resetTimeout = options.resetTimeout ?? config.CIRCUIT_BREAKER_TIMEOUT;
    this.timeout = options.timeout ?? config.GITHUB_REQUEST_TIMEOUT;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        logger.info('Circuit breaker transitioning to HALF_OPEN', { state: this.state });
      } else {
        throw new CircuitBreakerError(
          'Circuit breaker is OPEN. Service is unavailable.',
          { state: this.state, failureCount: this.failureCount }
        );
      }
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new TimeoutError(`Operation timed out after ${this.timeout}ms`)), this.timeout)
        ),
      ]);

      // Success - reset failure count
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      // If we get enough successes in HALF_OPEN, close the circuit
      if (this.successCount >= this.failureThreshold) {
        this.state = CircuitState.CLOSED;
        logger.info('Circuit breaker CLOSED - service recovered', { state: this.state });
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in HALF_OPEN, go back to OPEN
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker OPEN - service still failing', { state: this.state });
    } else if (this.failureCount >= this.failureThreshold) {
      // Too many failures, open the circuit
      this.state = CircuitState.OPEN;
      logger.error('Circuit breaker OPEN - too many failures', undefined, {
        state: this.state,
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
      });
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker reset', { state: this.state });
  }
}

export const circuitBreaker = new CircuitBreaker();
