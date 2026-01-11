/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Secret Detection Patterns - 35+ patterns for detecting various types of secrets
 */

export interface SecretPattern {
  name: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: RegExp;
  minLength?: number;
  validator?: (value: string) => boolean;
  recommendation: string;
}

/**
 * Comprehensive list of secret detection patterns
 * Covers 35+ types of secrets commonly found in code repositories
 */
export const secretPatterns: SecretPattern[] = [
  // AWS Secrets
  {
    name: 'aws_access_key_id',
    category: 'Cloud Provider',
    description: 'AWS Access Key ID',
    severity: 'critical',
    pattern: /AKIA[0-9A-Z]{16}/i,
    recommendation: 'Rotate AWS access keys immediately and remove from codebase',
  },
  {
    name: 'aws_secret_access_key',
    category: 'Cloud Provider',
    description: 'AWS Secret Access Key',
    severity: 'critical',
    pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i,
    recommendation: 'Rotate AWS secret access keys immediately',
  },
  {
    name: 'aws_session_token',
    category: 'Cloud Provider',
    description: 'AWS Session Token',
    severity: 'high',
    pattern: /aws[_-]?session[_-]?token\s*[=:]\s*['"]?([A-Za-z0-9/+=]{100,})['"]?/i,
    recommendation: 'Revoke session token and regenerate',
  },

  // GitHub Secrets
  {
    name: 'github_token',
    category: 'Version Control',
    description: 'GitHub Personal Access Token or OAuth Token',
    severity: 'critical',
    pattern: /ghp_[A-Za-z0-9]{36}|gho_[A-Za-z0-9]{36}|ghu_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36}|ghr_[A-Za-z0-9]{36}/i,
    recommendation: 'Revoke GitHub token immediately and create a new one',
  },
  {
    name: 'github_oauth',
    category: 'Version Control',
    description: 'GitHub OAuth Token',
    severity: 'critical',
    pattern: /github[_-]?oauth[_-]?token\s*[=:]\s*['"]?([A-Za-z0-9]{40})['"]?/i,
    recommendation: 'Revoke OAuth token and regenerate',
  },

  // Google Cloud
  {
    name: 'google_api_key',
    category: 'Cloud Provider',
    description: 'Google Cloud API Key',
    severity: 'high',
    pattern: /AIza[0-9A-Za-z_-]{35}/i,
    recommendation: 'Regenerate Google API key and restrict usage',
  },
  {
    name: 'google_oauth',
    category: 'Cloud Provider',
    description: 'Google OAuth Client Secret',
    severity: 'critical',
    pattern: /['"]client_secret['"]\s*:\s*['"]([A-Za-z0-9_-]{24,})['"]/i,
    recommendation: 'Regenerate OAuth client secret',
  },

  // Azure
  {
    name: 'azure_storage_key',
    category: 'Cloud Provider',
    description: 'Azure Storage Account Key',
    severity: 'critical',
    pattern: /AccountKey\s*[=:]\s*['"]?([A-Za-z0-9+/=]{86}==)['"]?/i,
    recommendation: 'Rotate Azure storage account keys',
  },
  {
    name: 'azure_shared_access_key',
    category: 'Cloud Provider',
    description: 'Azure Shared Access Signature',
    severity: 'high',
    pattern: /sig=[A-Za-z0-9%]{20,}/i,
    recommendation: 'Regenerate Azure SAS token',
  },

  // Database Credentials
  {
    name: 'postgresql_connection_string',
    category: 'Database',
    description: 'PostgreSQL Connection String with Password',
    severity: 'critical',
    pattern: /postgres:\/\/[^:]+:([^@]+)@/i,
    recommendation: 'Change database password and use environment variables',
  },
  {
    name: 'mysql_connection_string',
    category: 'Database',
    description: 'MySQL Connection String with Password',
    severity: 'critical',
    pattern: /mysql:\/\/[^:]+:([^@]+)@/i,
    recommendation: 'Change MySQL password and use secure connection strings',
  },
  {
    name: 'mongodb_connection_string',
    category: 'Database',
    description: 'MongoDB Connection String with Password',
    severity: 'critical',
    pattern: /mongodb[+srv]*:\/\/[^:]+:([^@]+)@/i,
    recommendation: 'Change MongoDB password and rotate credentials',
  },

  // API Keys
  {
    name: 'stripe_api_key',
    category: 'Payment',
    description: 'Stripe API Key',
    severity: 'critical',
    pattern: /sk_live_[0-9a-zA-Z]{24,}|rk_live_[0-9a-zA-Z]{24,}/i,
    recommendation: 'Regenerate Stripe API keys and review charges',
  },
  {
    name: 'paypal_client_secret',
    category: 'Payment',
    description: 'PayPal Client Secret',
    severity: 'critical',
    pattern: /paypal[_-]?client[_-]?secret\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/i,
    recommendation: 'Regenerate PayPal client secret',
  },
  {
    name: 'twilio_api_key',
    category: 'Communication',
    description: 'Twilio API Key',
    severity: 'high',
    pattern: /SK[0-9a-fA-F]{32}/i,
    recommendation: 'Regenerate Twilio API key',
  },
  {
    name: 'sendgrid_api_key',
    category: 'Communication',
    description: 'SendGrid API Key',
    severity: 'high',
    pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/i,
    recommendation: 'Regenerate SendGrid API key',
  },
  {
    name: 'mailgun_api_key',
    category: 'Communication',
    description: 'Mailgun API Key',
    severity: 'high',
    pattern: /key-[0-9a-zA-Z]{32}/i,
    recommendation: 'Regenerate Mailgun API key',
  },

  // Social Media API Keys
  {
    name: 'twitter_api_key',
    category: 'Social Media',
    description: 'Twitter/X API Key',
    severity: 'high',
    pattern: /twitter[_-]?api[_-]?key\s*[=:]\s*['"]?([A-Za-z0-9]{25,})['"]?/i,
    recommendation: 'Regenerate Twitter API keys',
  },
  {
    name: 'facebook_access_token',
    category: 'Social Media',
    description: 'Facebook Access Token',
    severity: 'high',
    pattern: /EAAB[a-zA-Z0-9]{100,}/i,
    recommendation: 'Revoke Facebook access token',
  },

  // Generic API Keys
  {
    name: 'api_key_generic',
    category: 'API',
    description: 'Generic API Key Pattern',
    severity: 'medium',
    pattern: /api[_-]?key\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/i,
    recommendation: 'Review and rotate API key if exposed',
  },
  {
    name: 'api_secret',
    category: 'API',
    description: 'Generic API Secret',
    severity: 'high',
    pattern: /api[_-]?secret\s*[=:]\s*['"]?([A-Za-z0-9_-]{16,})['"]?/i,
    recommendation: 'Rotate API secret immediately',
  },

  // JWT Tokens
  {
    name: 'jwt_token',
    category: 'Authentication',
    description: 'JSON Web Token',
    severity: 'high',
    pattern: /eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{10,}/i,
    validator: (value) => {
      try {
        const parts = value.split('.');
        return parts.length === 3;
      } catch {
        return false;
      }
    },
    recommendation: 'Revoke JWT token and regenerate',
  },

  // Private Keys
  {
    name: 'rsa_private_key',
    category: 'Cryptography',
    description: 'RSA Private Key',
    severity: 'critical',
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
    recommendation: 'Revoke and regenerate RSA key pair',
  },
  {
    name: 'ssh_private_key',
    category: 'Cryptography',
    description: 'SSH Private Key',
    severity: 'critical',
    pattern: /-----BEGIN\s+(OPENSSH\s+)?PRIVATE\s+KEY-----/i,
    recommendation: 'Revoke SSH key and generate new key pair',
  },
  {
    name: 'ecdsa_private_key',
    category: 'Cryptography',
    description: 'ECDSA Private Key',
    severity: 'critical',
    pattern: /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/i,
    recommendation: 'Revoke ECDSA key and regenerate',
  },

  // Passwords
  {
    name: 'password_in_code',
    category: 'Credentials',
    description: 'Hardcoded Password',
    severity: 'high',
    pattern: /password\s*[=:]\s*['"]([^'"]{8,})['"]/i,
    recommendation: 'Move password to secure environment variables or secret manager',
  },
  {
    name: 'password_hash',
    category: 'Credentials',
    description: 'Password Hash (potentially exposed)',
    severity: 'medium',
    pattern: /\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}/i,
    recommendation: 'Review if password hash should be in codebase',
  },

  // OAuth and Tokens
  {
    name: 'oauth_token',
    category: 'Authentication',
    description: 'OAuth Token',
    severity: 'high',
    pattern: /oauth[_-]?token\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/i,
    recommendation: 'Revoke OAuth token',
  },
  {
    name: 'access_token',
    category: 'Authentication',
    description: 'Access Token',
    severity: 'high',
    pattern: /access[_-]?token\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/i,
    recommendation: 'Revoke access token',
  },
  {
    name: 'refresh_token',
    category: 'Authentication',
    description: 'Refresh Token',
    severity: 'high',
    pattern: /refresh[_-]?token\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/i,
    recommendation: 'Revoke refresh token',
  },

  // Slack
  {
    name: 'slack_token',
    category: 'Communication',
    description: 'Slack API Token',
    severity: 'high',
    pattern: /xox[baprs]-[0-9a-zA-Z-]{10,48}/i,
    recommendation: 'Revoke Slack token and regenerate',
  },
  {
    name: 'slack_webhook',
    category: 'Communication',
    description: 'Slack Webhook URL',
    severity: 'high',
    pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/i,
    recommendation: 'Regenerate Slack webhook URL',
  },

  // Docker
  {
    name: 'dockerhub_password',
    category: 'Container',
    description: 'Docker Hub Password',
    severity: 'high',
    pattern: /docker[_-]?hub[_-]?password\s*[=:]\s*['"]?([^'"]{8,})['"]?/i,
    recommendation: 'Change Docker Hub password',
  },

  // Heroku
  {
    name: 'heroku_api_key',
    category: 'Platform',
    description: 'Heroku API Key',
    severity: 'high',
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    validator: (value) => {
      // Additional context needed - this pattern is too generic alone
      return false; // Would need additional context
    },
    recommendation: 'Regenerate Heroku API key',
  },

  // Generic Secrets
  {
    name: 'secret_key',
    category: 'Generic',
    description: 'Generic Secret Key',
    severity: 'medium',
    pattern: /secret[_-]?key\s*[=:]\s*['"]?([A-Za-z0-9_-]{16,})['"]?/i,
    recommendation: 'Review and rotate secret key',
  },
  {
    name: 'private_key',
    category: 'Cryptography',
    description: 'Private Key (Generic)',
    severity: 'critical',
    pattern: /private[_-]?key\s*[=:]\s*['"]?([A-Za-z0-9+/=\s]{50,})['"]?/i,
    recommendation: 'Revoke and regenerate private key',
  },
];
