# Leak Secure MCP Server

**Copyright 2025 Chris Bunting <cbuntingde@gmail.com>**

[![npm version](https://img.shields.io/npm/v/leak-secure-mcp.svg)](https://www.npmjs.com/package/leak-secure-mcp)
[![npm downloads](https://img.shields.io/npm/dm/leak-secure-mcp.svg)](https://www.npmjs.com/package/leak-secure-mcp)

Enterprise-grade MCP (Model Context Protocol) server for detecting secrets and sensitive information in code repositories. This server provides AI agents with powerful tools to scan GitHub repositories and code snippets for over 35 types of secrets, including API keys, passwords, tokens, and credentials.

## Features

- **35+ Secret Types Detection**: Comprehensive pattern matching for AWS keys, GitHub tokens, database credentials, API keys, private keys, and more
- **GitHub Integration**: Scan entire repositories or specific paths with automatic file traversal
- **Security Analysis**: Risk scoring, compliance status, and detailed remediation recommendations
- **Enterprise-Grade Architecture**: Production-ready with enterprise-level reliability and security
- **MCP Protocol**: Standardized interface for AI agents to interact with security scanning tools

### Enterprise-Grade Features

- **Rate Limiting**: Token bucket algorithm for GitHub API calls with configurable limits (default: 5000/hour, burst: 100)
- **Retry Logic**: Exponential backoff with jitter for automatic retry of failed requests (configurable: 3 retries, 1s-30s delays)
- **Circuit Breaker**: Prevents cascading failures with automatic recovery detection (CLOSED/OPEN/HALF_OPEN states)
- **Timeout Handling**: Configurable timeouts for API requests (30s) and scan operations (5 minutes)
- **Input Validation**: Zod-based schema validation for all tool inputs with sanitization
- **Structured Logging**: Enterprise logging system with automatic secret sanitization and log levels
- **Error Handling**: Custom error types with operational vs programming error distinction
- **Memory Efficiency**: Batch processing, file size limits, and maximum file count protection
- **Graceful Shutdown**: Handles SIGTERM/SIGINT with proper cleanup and operation completion
- **Enhanced Security**: Advanced secret masking, input sanitization, and secure error messages

## Supported Secret Types

The server detects secrets across multiple categories:

- **Cloud Provider**: AWS, Google Cloud, Azure credentials
- **Version Control**: GitHub tokens, OAuth tokens
- **Database**: PostgreSQL, MySQL, MongoDB connection strings
- **Payment**: Stripe, PayPal API keys
- **Communication**: Twilio, SendGrid, Mailgun, Slack tokens
- **Social Media**: Twitter, Facebook API keys
- **Cryptography**: RSA, SSH, ECDSA private keys
- **Authentication**: JWT tokens, OAuth tokens, access tokens
- **Generic**: API keys, secrets, passwords

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- GitHub Personal Access Token (optional, for private repositories)

### Install from npm (Recommended)

Install the package globally or locally:

```bash
# Global installation
npm install -g leak-secure-mcp

# Or local installation
npm install leak-secure-mcp
```

The setup script will automatically run after installation and prompt you for your GitHub Personal Access Token. You can:
- Enter your token when prompted (recommended)
- Press Enter to skip and configure it later
- Run `npm run setup` manually at any time to configure or update your token

### Install from Source

1. Clone the repository:
```bash
git clone <repository-url>
cd leak-secure-mcp
```

2. Install dependencies:
```bash
npm install
```

The setup script will automatically run after installation and prompt you for your GitHub Personal Access Token.

3. Build the project:
```bash
npm run build
```

## Usage

### Running the Server

The MCP server runs on stdio and communicates via the Model Context Protocol:

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### MCP Tools

The server provides the following tools:

#### 1. `scan_repository`
Scan a GitHub repository for secrets with enterprise-grade reliability features including rate limiting, retry logic, and circuit breaker protection.

**Parameters:**
- `owner` (required): GitHub repository owner (username or organization) - validated and sanitized
- `repo` (required): Repository name - validated and sanitized
- `branch` (optional): Branch to scan (default: "main") - validated format
- `path` (optional): Specific path within repository to scan

**Features:**
- Automatic rate limiting to respect GitHub API limits
- Retry logic with exponential backoff for transient failures
- Circuit breaker protection against cascading failures
- Batch processing for memory efficiency (50 files per batch)
- Timeout protection (5 minute default)
- Maximum file limit protection (10,000 files default)

**Example:**
```json
{
  "owner": "octocat",
  "repo": "Hello-World",
  "branch": "main"
}
```

#### 2. `scan_code`
Scan a code snippet or file content for secrets with enhanced validation and false positive reduction.

**Parameters:**
- `code` (required): Code content to scan (max 10MB) - validated size
- `filePath` (optional): File path for context - helps with false positive reduction

**Features:**
- Input size validation (10MB maximum)
- Enhanced false positive detection
- Adaptive secret masking based on length
- Performance optimizations (skips empty lines and comments)

**Example:**
```json
{
  "code": "const apiKey = 'sk_live_1234567890abcdef'",
  "filePath": "config.js"
}
```

#### 3. `analyze_security`
Perform comprehensive security analysis on a repository with risk scoring, compliance status, and remediation steps.

**Parameters:**
- `owner` (required): GitHub repository owner
- `repo` (required): Repository name
- `branch` (optional): Branch to analyze (default: "main")

**Returns:**
- Risk score (0-100)
- Compliance status (compliant/at_risk/non_compliant)
- Severity breakdown (critical/high/medium/low)
- Detailed remediation steps
- Security recommendations

#### 4. `get_secret_types`
Get list of all supported secret types (35+ types) with categories, descriptions, and severity levels.

#### 5. `validate_secret`
Validate if a detected secret is still active with structured recommendations.

**Parameters:**
- `secretType` (required): Type of secret (validated against supported types)
- `value` (required): The secret value to validate (max 10KB, sanitized)

### MCP Resources

The server provides the following resources:

- `leak-secure://secret-types`: List of all supported secret types
- `leak-secure://patterns`: Detection patterns and regular expressions

## Configuration

### Environment Variables

The server can be configured using environment variables in a `.env` file or system environment:

#### Required
- `GITHUB_TOKEN` (optional): GitHub Personal Access Token for accessing repositories

#### Optional Configuration

**Server Configuration:**
- `NODE_ENV`: Environment mode (`development`, `production`, `test`) - default: `production`
- `LOG_LEVEL`: Logging level (`DEBUG`, `INFO`, `WARN`, `ERROR`) - default: `INFO`

**Rate Limiting:**
- `GITHUB_RATE_LIMIT_PER_HOUR`: Maximum API calls per hour - default: `5000`
- `GITHUB_RATE_LIMIT_BURST`: Burst capacity for rate limiter - default: `100`

**Timeouts (milliseconds):**
- `GITHUB_REQUEST_TIMEOUT`: Timeout for individual GitHub API requests - default: `30000` (30s)
- `SCAN_TIMEOUT`: Timeout for entire repository scans - default: `300000` (5 minutes)

**Retry Configuration:**
- `MAX_RETRIES`: Maximum retry attempts for failed requests - default: `3`
- `RETRY_DELAY_BASE`: Base delay for exponential backoff (ms) - default: `1000` (1s)
- `RETRY_DELAY_MAX`: Maximum delay between retries (ms) - default: `30000` (30s)

**File Processing:**
- `MAX_FILE_SIZE`: Maximum file size to process (bytes) - default: `10485760` (10MB)
- `MAX_FILES_PER_SCAN`: Maximum files to scan per repository - default: `10000`

**Circuit Breaker:**
- `CIRCUIT_BREAKER_THRESHOLD`: Failure threshold before opening circuit - default: `5`
- `CIRCUIT_BREAKER_TIMEOUT`: Time before attempting recovery (ms) - default: `60000` (1 minute)

### GitHub Token

A GitHub Personal Access Token is optional but recommended for:
- Accessing private repositories
- Higher rate limits (5000/hour vs 60/hour unauthenticated)
- Better reliability and reduced rate limit errors

To create a token:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (for private repos) or `public_repo` (for public repos)
4. Copy the token and add it to your `.env` file:
   ```env
   GITHUB_TOKEN=your_token_here
   ```

### Configuration Example

Create a `.env` file in the project root:

```env
# GitHub Configuration
GITHUB_TOKEN=ghp_your_token_here

# Server Configuration
NODE_ENV=production
LOG_LEVEL=INFO

# Rate Limiting
GITHUB_RATE_LIMIT_PER_HOUR=5000
GITHUB_RATE_LIMIT_BURST=100

# Timeouts (milliseconds)
GITHUB_REQUEST_TIMEOUT=30000
SCAN_TIMEOUT=300000

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY_BASE=1000
RETRY_DELAY_MAX=30000

# File Processing
MAX_FILE_SIZE=10485760
MAX_FILES_PER_SCAN=10000

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
```

## Security Considerations

### Secret Protection
- **Adaptive Secret Masking**: Secrets are automatically masked with adaptive length (shows first 4-6 and last 4-6 characters based on secret length)
- **Log Sanitization**: All secrets are automatically sanitized in logs - never logged in full
- **Secure Error Messages**: Error messages never expose sensitive data or full secret values
- **Input Sanitization**: All inputs are sanitized to prevent injection attacks

### False Positive Reduction
- **Enhanced Validation**: Multiple layers of validation to reduce false positives
- **Pattern-Specific Validators**: Custom validators for specific secret types
- **Context-Aware Detection**: File path context helps improve accuracy
- **Common False Positive Filtering**: Filters out example, test, placeholder values

### API Security
- **Rate Limiting**: Automatic rate limiting respects GitHub API limits and prevents abuse
- **Retry Logic**: Smart retry only for operational errors, prevents infinite loops
- **Circuit Breaker**: Prevents cascading failures and protects against API outages
- **Timeout Protection**: Prevents hanging requests and resource exhaustion
- **Access Control**: Use GitHub tokens with minimal required permissions (principle of least privilege)

### Operational Security
- **Structured Logging**: All logs are structured and sanitized for security compliance
- **Error Classification**: Distinguishes between operational and programming errors
- **Graceful Degradation**: Server continues operating even when some operations fail
- **Memory Protection**: Limits on file sizes and counts prevent memory exhaustion attacks

## Development

### Project Structure

```
leak-secure-mcp/
├── src/
│   ├── index.ts                 # Main MCP server entry point
│   ├── detectors/
│   │   ├── SecretDetector.ts    # Core detection engine with enhanced security
│   │   └── patterns/
│   │       └── SecretPatterns.ts # 35+ secret detection patterns
│   ├── github/
│   │   └── GitHubClient.ts      # GitHub API integration with rate limiting & retries
│   ├── analyzer/
│   │   └── SecurityAnalyzer.ts  # Security analysis and risk assessment
│   └── utils/                   # Enterprise-grade utilities
│       ├── validation.ts        # Zod-based input validation schemas
│       ├── logger.ts            # Structured logging with secret sanitization
│       ├── config.ts            # Centralized configuration management
│       ├── errors.ts            # Custom error types and error handling
│       ├── rateLimiter.ts       # Token bucket rate limiting
│       ├── retry.ts             # Exponential backoff retry logic
│       └── circuitBreaker.ts    # Circuit breaker pattern implementation
├── dist/                        # Compiled JavaScript
├── scripts/                     # Setup and utility scripts
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## API Response Format

### Scan Results

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "path": "entire repository",
  "totalFilesScanned": 150,
  "filesWithSecrets": 5,
  "totalSecretsFound": 12,
  "results": [
    {
      "file": "config.js",
      "detections": [
        {
          "type": "aws_access_key_id",
          "category": "Cloud Provider",
          "severity": "critical",
          "value": "AKIA****1234",
          "line": 42,
          "column": 15,
          "context": "...",
          "pattern": "AKIA[0-9A-Z]{16}",
          "recommendation": "Rotate AWS access keys immediately"
        }
      ],
      "severity": "critical"
    }
  ],
  "summary": {
    "totalFiles": 5,
    "filesWithSecrets": 5,
    "totalSecrets": 12,
    "severityBreakdown": {
      "critical": 3,
      "high": 5,
      "medium": 4,
      "low": 0
    },
    "topSecretTypes": [
      { "type": "aws_access_key_id", "count": 3 },
      { "type": "github_token", "count": 2 }
    ]
  }
}
```

### Security Analysis Results

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "totalFilesScanned": 150,
  "filesWithSecrets": 5,
  "totalSecretsFound": 12,
  "results": [...],
  "analysis": {
    "riskScore": 75,
    "complianceStatus": "non_compliant",
    "criticalIssues": 3,
    "highIssues": 5,
    "mediumIssues": 4,
    "lowIssues": 0,
    "remediationSteps": [
      "URGENT: Address critical security issues immediately",
      "Rotate all exposed critical secrets",
      "Implement secret management solution"
    ],
    "recommendations": [
      "Most common secret types found: aws_access_key_id, github_token",
      "Consider implementing a security review process",
      "Enable secret scanning in your development workflow"
    ]
  },
  "riskScore": 75,
  "complianceStatus": "non_compliant",
  "remediationSteps": [...]
}
```

### Error Response Format

```json
{
  "error": "ValidationError",
  "code": "VALIDATION_ERROR",
  "message": "Invalid input parameters",
  "context": {
    "field": "owner",
    "issue": "Invalid owner format"
  }
}
```

## Performance & Reliability

### Rate Limiting
- **Token Bucket Algorithm**: Efficient rate limiting with automatic token refill
- **Configurable Limits**: Adjustable per-hour and burst limits
- **Automatic Waiting**: Server automatically waits for rate limit tokens when needed

### Retry Logic
- **Exponential Backoff**: Smart retry delays increase exponentially (1s → 2s → 4s → 8s...)
- **Jitter**: Random jitter prevents thundering herd problems
- **Selective Retry**: Only retries operational errors (network, timeouts, rate limits)
- **Maximum Retries**: Configurable retry attempts (default: 3)

### Circuit Breaker
- **Three States**: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
- **Automatic Recovery**: Detects when service has recovered
- **Failure Threshold**: Configurable failure count before opening circuit
- **Timeout Protection**: Prevents hanging on unresponsive services

### Memory Management
- **Batch Processing**: Files processed in batches (50 per batch) to manage memory
- **File Size Limits**: Configurable maximum file size (default: 10MB)
- **File Count Limits**: Maximum files per scan (default: 10,000)
- **Efficient Scanning**: Skips binary files, large files, and common directories

### Timeout Protection
- **Request Timeouts**: Individual API requests timeout after 30 seconds
- **Operation Timeouts**: Full repository scans timeout after 5 minutes
- **Graceful Handling**: Timeouts return proper error responses

## Error Handling

The server implements comprehensive error handling with custom error types:

- **ValidationError**: Input validation failures (400)
- **GitHubAPIError**: GitHub API communication errors (502)
- **RateLimitError**: Rate limit exceeded (429)
- **TimeoutError**: Operation timeout (504)
- **RepositoryAccessError**: Repository access denied (403)
- **CircuitBreakerError**: Circuit breaker open (503)

All errors are:
- Properly typed and classified
- Sanitized (no sensitive data)
- Structured for easy handling
- Logged with appropriate levels

## Contributing

This is an enterprise-grade, production-ready implementation. When contributing:

1. **Code Quality**: Maintain high code quality and security standards
2. **Testing**: Add comprehensive tests for new features
3. **Documentation**: Update documentation for all changes
4. **TypeScript**: Follow TypeScript best practices and strict typing
5. **Security**: Ensure all secrets are properly masked in outputs and logs
6. **Error Handling**: Use custom error types from `utils/errors.ts`
7. **Logging**: Use structured logging from `utils/logger.ts` (never log secrets)
8. **Validation**: Use Zod schemas from `utils/validation.ts` for all inputs
9. **Configuration**: Add new config options to `utils/config.ts` with validation
10. **Performance**: Consider memory and performance implications of changes

## License

MIT License

## Support

For issues, questions, or contributions, please contact: cbuntingde@gmail.com

## Architecture Highlights

### Enterprise Patterns Implemented

1. **Rate Limiting**: Token bucket algorithm for API call management
2. **Retry Logic**: Exponential backoff with jitter for resilience
3. **Circuit Breaker**: Prevents cascading failures
4. **Input Validation**: Zod schemas for type-safe validation
5. **Structured Logging**: JSON logging with secret sanitization
6. **Error Handling**: Custom error types with proper classification
7. **Configuration Management**: Centralized, validated configuration
8. **Graceful Shutdown**: Proper cleanup and operation completion
9. **Memory Management**: Batch processing and resource limits
10. **Timeout Protection**: Prevents resource exhaustion

### Security Features

- Zero-trust secret handling (never logged, always masked)
- Input sanitization and validation
- Secure error messages (no sensitive data)
- Rate limiting to prevent abuse
- Memory protection against DoS attacks
- Timeout protection against hanging operations

## Acknowledgments

Built with:
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol) - MCP protocol implementation
- [Octokit](https://github.com/octokit/rest.js) - GitHub API integration
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- Enterprise security and reliability best practices
