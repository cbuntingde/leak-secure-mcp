/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Secret Detection Engine - Enterprise-grade secret detection with 35+ pattern types
 */

import { SecretPattern } from './patterns/SecretPatterns.js';
import { secretPatterns } from './patterns/SecretPatterns.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

export interface SecretDetection {
  type: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  value: string;
  line: number;
  column: number;
  context: string;
  pattern: string;
  recommendation: string;
}

export interface SecretType {
  name: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export class SecretDetector {
  private patterns: SecretPattern[];

  constructor() {
    this.patterns = secretPatterns;
  }

  /**
   * Scan code content for secrets with enhanced security and validation
   */
  async scan(code: string, filePath: string = ''): Promise<SecretDetection[]> {
    if (!code || code.length === 0) {
      return [];
    }

    // Limit code size to prevent memory issues
    if (code.length > config.MAX_FILE_SIZE) {
      logger.warn('Code content exceeds maximum size, truncating', {
        filePath,
        size: code.length,
        maxSize: config.MAX_FILE_SIZE,
      });
      code = code.substring(0, config.MAX_FILE_SIZE);
    }

    const detections: SecretDetection[] = [];
    const lines = code.split('\n');
    const maxLines = 100000; // Prevent processing extremely large files
    const linesToProcess = Math.min(lines.length, maxLines);

    logger.debug('Scanning code for secrets', {
      filePath,
      lineCount: linesToProcess,
      totalLines: lines.length,
    });

    for (let lineIndex = 0; lineIndex < linesToProcess; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      // Skip empty lines and comments-only lines for performance
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0 || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
        continue;
      }

      for (const pattern of this.patterns) {
        try {
          const matches = this.matchPattern(line, pattern);

          for (const match of matches) {
            // Additional validation to reduce false positives
            if (this.isValidSecret(match.value, pattern, filePath)) {
              detections.push({
                type: pattern.name,
                category: pattern.category,
                severity: pattern.severity,
                value: this.maskSecret(match.value),
                line: lineNumber,
                column: match.index + 1,
                context: this.getContext(lines, lineIndex, 2),
                pattern: pattern.pattern.source,
                recommendation: pattern.recommendation,
              });
            }
          }
        } catch (error) {
          // Log pattern matching errors but continue scanning
          logger.debug('Error matching pattern', {
            pattern: pattern.name,
            line: lineNumber,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (detections.length > 0) {
      logger.info('Secrets detected', {
        filePath,
        count: detections.length,
        types: [...new Set(detections.map(d => d.type))],
      });
    }

    return detections;
  }

  /**
   * Match a pattern against a line of code
   */
  private matchPattern(line: string, pattern: SecretPattern): Array<{ value: string; index: number }> {
    const matches: Array<{ value: string; index: number }> = [];
    const regex = new RegExp(pattern.pattern, 'gi');

    let match;
    while ((match = regex.exec(line)) !== null) {
      matches.push({
        value: match[0],
        index: match.index,
      });
    }

    return matches;
  }

  /**
   * Validate if a detected match is likely a real secret with enhanced false positive reduction
   */
  private isValidSecret(
    value: string,
    pattern: SecretPattern,
    filePath: string
  ): boolean {
    if (!value || value.length === 0) {
      return false;
    }

    // Skip common false positives
    const falsePositives = [
      'example',
      'sample',
      'test',
      'dummy',
      'placeholder',
      'your_key_here',
      'your_secret_here',
      'changeme',
      'xxx',
      '00000000',
      '12345678',
      'password',
      'secret',
      'key',
      'token',
      'api_key',
      'api_secret',
      'not_a_real',
      'fake',
      'mock',
      'stub',
    ];

    const lowerValue = value.toLowerCase().trim();
    
    // Check against false positive list
    for (const fp of falsePositives) {
      if (lowerValue === fp || lowerValue.includes(fp)) {
        return false;
      }
    }

    // Check for all same characters (e.g., "aaaaaaaa")
    if (/^(.)\1+$/.test(value)) {
      return false;
    }

    // Check minimum length requirements
    if (pattern.minLength && value.length < pattern.minLength) {
      return false;
    }

    // Check maximum length (very long strings are likely not secrets)
    if (value.length > 10000) {
      return false;
    }

    // Check if it's in a test file - still detect but could be marked differently
    const isTestFile = filePath.includes('/test/') || 
                       filePath.includes('/tests/') ||
                       filePath.includes('__tests__') ||
                       filePath.includes('.test.') ||
                       filePath.includes('.spec.');

    // Additional pattern-specific validation
    if (pattern.validator) {
      try {
        return pattern.validator(value);
      } catch (error) {
        logger.debug('Pattern validator error', {
          pattern: pattern.name,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Mask secret value for safe display with enhanced security
   */
  private maskSecret(secret: string): string {
    if (!secret || secret.length === 0) {
      return '****';
    }

    // For very short secrets, mask completely
    if (secret.length <= 4) {
      return '****';
    }

    // For short secrets, show only first 2 chars
    if (secret.length <= 8) {
      return secret.substring(0, 2) + '****';
    }

    // For medium secrets, show first 4 and last 4
    if (secret.length <= 32) {
      return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4);
    }

    // For long secrets (like private keys), show only first 6 and last 6
    return secret.substring(0, 6) + '****' + secret.substring(secret.length - 6);
  }

  /**
   * Get context around a line
   */
  private getContext(lines: string[], lineIndex: number, contextLines: number): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Get all supported secret types
   */
  getSupportedTypes(): SecretType[] {
    return this.patterns.map((p) => ({
      name: p.name,
      category: p.category,
      description: p.description,
      severity: p.severity,
    }));
  }

  /**
   * Get categories of secrets
   */
  getCategories(): string[] {
    const categories = new Set(this.patterns.map((p) => p.category));
    return Array.from(categories).sort();
  }

  /**
   * Get all detection patterns
   */
  getPatterns(): Array<Omit<SecretPattern, 'pattern'> & { pattern: string }> {
    return this.patterns.map((p) => ({
      ...p,
      pattern: p.pattern.source, // Convert RegExp to string for JSON serialization
    }));
  }

  /**
   * Validate a secret (check if it's still active)
   */
  async validateSecret(secretType: string, value: string): Promise<{
    valid: boolean;
    message: string;
    recommendations: string[];
  }> {
    // In a production system, this would make API calls to validate
    // For now, we provide a structured response
    const pattern = this.patterns.find((p) => p.name === secretType);

    if (!pattern) {
      return {
        valid: false,
        message: `Unknown secret type: ${secretType}`,
        recommendations: ['Verify the secret type is supported'],
      };
    }

    return {
      valid: true,
      message: `Secret type ${secretType} detected. Manual validation recommended.`,
      recommendations: [
        pattern.recommendation,
        'Check if the secret is still in use',
        'Rotate the secret if it has been exposed',
        'Review access logs for unauthorized usage',
      ],
    };
  }
}
