/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Configuration Management - Centralized configuration with validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration schema
 */
const ConfigSchema = z.object({
  // GitHub Configuration
  GITHUB_TOKEN: z.string().optional(),
  
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  
  // Rate Limiting
  GITHUB_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5000),
  GITHUB_RATE_LIMIT_BURST: z.coerce.number().int().positive().default(100),
  
  // Timeouts (in milliseconds)
  GITHUB_REQUEST_TIMEOUT: z.coerce.number().int().positive().default(30000),
  SCAN_TIMEOUT: z.coerce.number().int().positive().default(300000), // 5 minutes
  
  // Retry Configuration
  MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  RETRY_DELAY_BASE: z.coerce.number().int().positive().default(1000),
  RETRY_DELAY_MAX: z.coerce.number().int().positive().default(30000),
  
  // File Processing
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024), // 10MB
  MAX_FILES_PER_SCAN: z.coerce.number().int().positive().default(10000),
  
  // Circuit Breaker
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().positive().default(5),
  CIRCUIT_BREAKER_TIMEOUT: z.coerce.number().int().positive().default(60000), // 1 minute
});

type Config = z.infer<typeof ConfigSchema>;

/**
 * Parse and validate configuration
 */
function loadConfig(): Config {
  try {
    const rawConfig = {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      NODE_ENV: process.env.NODE_ENV || 'production',
      LOG_LEVEL: process.env.LOG_LEVEL,
      GITHUB_RATE_LIMIT_PER_HOUR: process.env.GITHUB_RATE_LIMIT_PER_HOUR,
      GITHUB_RATE_LIMIT_BURST: process.env.GITHUB_RATE_LIMIT_BURST,
      GITHUB_REQUEST_TIMEOUT: process.env.GITHUB_REQUEST_TIMEOUT,
      SCAN_TIMEOUT: process.env.SCAN_TIMEOUT,
      MAX_RETRIES: process.env.MAX_RETRIES,
      RETRY_DELAY_BASE: process.env.RETRY_DELAY_BASE,
      RETRY_DELAY_MAX: process.env.RETRY_DELAY_MAX,
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
      MAX_FILES_PER_SCAN: process.env.MAX_FILES_PER_SCAN,
      CIRCUIT_BREAKER_THRESHOLD: process.env.CIRCUIT_BREAKER_THRESHOLD,
      CIRCUIT_BREAKER_TIMEOUT: process.env.CIRCUIT_BREAKER_TIMEOUT,
    };

    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Configuration validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

export const config = loadConfig();
