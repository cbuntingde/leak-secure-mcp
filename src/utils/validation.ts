/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Input Validation Schemas - Enterprise-grade validation using Zod
 */

import { z } from 'zod';

/**
 * Validation schema for scan_repository tool
 */
export const ScanRepositorySchema = z.object({
  owner: z.string()
    .min(1, 'Owner cannot be empty')
    .max(100, 'Owner name too long')
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, 'Invalid owner format'),
  repo: z.string()
    .min(1, 'Repository name cannot be empty')
    .max(100, 'Repository name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid repository name format'),
  branch: z.string()
    .min(1, 'Branch name cannot be empty')
    .max(255, 'Branch name too long')
    .regex(/^[a-zA-Z0-9._/-]+$/, 'Invalid branch name format')
    .optional()
    .default('main'),
  path: z.string()
    .max(1000, 'Path too long')
    .optional(),
});

/**
 * Validation schema for scan_code tool
 */
export const ScanCodeSchema = z.object({
  code: z.string()
    .min(1, 'Code cannot be empty')
    .max(10 * 1024 * 1024, 'Code content too large (max 10MB)'),
  filePath: z.string()
    .max(1000, 'File path too long')
    .optional(),
});

/**
 * Validation schema for analyze_security tool
 */
export const AnalyzeSecuritySchema = z.object({
  owner: z.string()
    .min(1, 'Owner cannot be empty')
    .max(100, 'Owner name too long')
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, 'Invalid owner format'),
  repo: z.string()
    .min(1, 'Repository name cannot be empty')
    .max(100, 'Repository name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid repository name format'),
  branch: z.string()
    .min(1, 'Branch name cannot be empty')
    .max(255, 'Branch name too long')
    .regex(/^[a-zA-Z0-9._/-]+$/, 'Invalid branch name format')
    .optional()
    .default('main'),
});

/**
 * Validation schema for validate_secret tool
 */
export const ValidateSecretSchema = z.object({
  secretType: z.string()
    .min(1, 'Secret type cannot be empty')
    .max(100, 'Secret type too long'),
  value: z.string()
    .min(1, 'Secret value cannot be empty')
    .max(10000, 'Secret value too long'),
});

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove null bytes and control characters (except newlines and tabs)
  return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validate and sanitize repository owner/name
 */
export function sanitizeRepositoryName(name: string): string {
  return sanitizeInput(name.trim());
}
