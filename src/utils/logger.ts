/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Structured Logging System - Enterprise-grade logging with secret sanitization
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Secret sanitization patterns - matches common secret formats
 */
const SECRET_PATTERNS = [
  /(?:password|passwd|pwd|secret|token|key|credential|api[_-]?key)\s*[=:]\s*['"]?([^'"\s]{8,})['"]?/gi,
  /(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36}/gi,
  /AKIA[0-9A-Z]{16}/gi,
  /sk_live_[0-9a-zA-Z]{24,}/gi,
  /AIza[0-9A-Za-z_-]{35}/gi,
  /xox[baprs]-[0-9a-zA-Z-]{10,48}/gi,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
];

/**
 * Sanitize secrets from log messages
 */
function sanitizeSecrets(message: string): string {
  let sanitized = message;
  
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.length <= 8) {
        return '****';
      }
      return match.substring(0, 4) + '****' + match.substring(match.length - 4);
    });
  }
  
  return sanitized;
}

/**
 * Sanitize secrets from context objects
 */
function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) {
    return context;
  }
  
  const sanitized: Record<string, unknown> = {};
  const secretKeys = ['password', 'secret', 'token', 'key', 'credential', 'apiKey', 'api_key', 'value'];
  
  for (const [key, value] of Object.entries(context)) {
    if (secretKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = value.length <= 8 ? '****' : value.substring(0, 4) + '****' + value.substring(value.length - 4);
      } else {
        sanitized[key] = '****';
      }
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeSecrets(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

class Logger {
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.minLevel = process.env.LOG_LEVEL 
      ? (LogLevel[process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO)
      : LogLevel.INFO;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private log(level: LogLevel, levelName: string, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message: sanitizeSecrets(message),
      context: sanitizeContext(context),
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: sanitizeSecrets(error.message),
        stack: this.isProduction ? undefined : error.stack,
      };
    }

    // In production, use structured JSON logging
    if (this.isProduction) {
      console.error(JSON.stringify(entry));
    } else {
      // In development, use readable format
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const errorStr = entry.error ? ` Error: ${entry.error.name}: ${entry.error.message}` : '';
      console.error(`[${entry.timestamp}] ${entry.level}: ${entry.message}${contextStr}${errorStr}`);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context, error);
  }
}

export const logger = new Logger();
