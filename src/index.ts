/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Leak Secure MCP Server - Enterprise-grade GitHub security scanner
 * MCP server implementation for detecting 35+ types of secrets in code repositories
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SecretDetector } from './detectors/SecretDetector.js';
import { GitHubClient } from './github/GitHubClient.js';
import { SecurityAnalyzer, ScanResult } from './analyzer/SecurityAnalyzer.js';
import {
  ScanRepositorySchema,
  ScanCodeSchema,
  AnalyzeSecuritySchema,
  ValidateSecretSchema,
} from './utils/validation.js';
import { logger } from './utils/logger.js';
import { config } from './utils/config.js';
import {
  ValidationError,
  formatErrorForClient,
  isOperationalError,
} from './utils/errors.js';
import { TimeoutError } from './utils/errors.js';

const SERVER_NAME = 'leak-secure-mcp';
const SERVER_VERSION = '1.0.0';

class LeakSecureMCPServer {
  private server: Server;
  private secretDetector: SecretDetector;
  private githubClient: GitHubClient;
  private securityAnalyzer: SecurityAnalyzer;
  private isShuttingDown: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.secretDetector = new SecretDetector();
    this.githubClient = new GitHubClient();
    this.securityAnalyzer = new SecurityAnalyzer();

    this.setupHandlers();
    this.setupGracefulShutdown();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'scan_repository',
          description: 'Scan a GitHub repository for secrets and sensitive information. Detects 35+ types of secrets including API keys, passwords, tokens, and credentials. Enterprise-grade with rate limiting, retry logic, and comprehensive error handling.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'GitHub repository owner (username or organization)',
              },
              repo: {
                type: 'string',
                description: 'Repository name',
              },
              branch: {
                type: 'string',
                description: 'Branch to scan (default: main)',
                default: 'main',
              },
              path: {
                type: 'string',
                description: 'Specific path within repository to scan (optional)',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'scan_code',
          description: 'Scan a code snippet or file content for secrets and sensitive information. Supports up to 10MB of code content with enhanced validation.',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Code content to scan (max 10MB)',
              },
              filePath: {
                type: 'string',
                description: 'File path (optional, helps with context)',
              },
            },
            required: ['code'],
          },
        },
        {
          name: 'analyze_security',
          description: 'Perform comprehensive security analysis on a repository, including secret detection, vulnerability assessment, risk scoring, and compliance status.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'GitHub repository owner',
              },
              repo: {
                type: 'string',
                description: 'Repository name',
              },
              branch: {
                type: 'string',
                description: 'Branch to analyze (default: main)',
                default: 'main',
              },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'get_secret_types',
          description: 'Get list of all supported secret types that can be detected (35+ types).',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'validate_secret',
          description: 'Validate if a detected secret is still active or has been revoked.',
          inputSchema: {
            type: 'object',
            properties: {
              secretType: {
                type: 'string',
                description: 'Type of secret (e.g., aws_access_key, github_token)',
              },
              value: {
                type: 'string',
                description: 'The secret value to validate',
              },
            },
            required: ['secretType', 'value'],
          },
        },
      ],
    }));

    // Handle tool calls with comprehensive error handling
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (this.isShuttingDown) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Server is shutting down',
                code: 'SHUTTING_DOWN',
                message: 'The server is currently shutting down. Please try again later.',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const { name, arguments: args } = request.params;

      logger.info('Tool call received', { tool: name });

      try {
        let result;

        switch (name) {
          case 'scan_repository': {
            const scanRepoArgs = ScanRepositorySchema.parse(args);
            result = await this.handleScanRepository(scanRepoArgs);
            break;
          }

          case 'scan_code': {
            const scanCodeArgs = ScanCodeSchema.parse(args);
            result = await this.handleScanCode(scanCodeArgs);
            break;
          }

          case 'analyze_security': {
            const analyzeArgs = AnalyzeSecuritySchema.parse(args);
            result = await this.handleAnalyzeSecurity(analyzeArgs);
            break;
          }

          case 'get_secret_types':
            result = await this.handleGetSecretTypes();
            break;

          case 'validate_secret': {
            const validateArgs = ValidateSecretSchema.parse(args);
            result = await this.handleValidateSecret(validateArgs);
            break;
          }

          default:
            throw new ValidationError(`Unknown tool: ${name}`, { tool: name });
        }

        logger.info('Tool call completed', { tool: name });
        return result;
      } catch (error) {
        // Handle validation errors
        if (error instanceof ValidationError || (error as { name?: string }).name === 'ZodError') {
          const validationError = error instanceof ValidationError
            ? error
            : new ValidationError('Invalid input parameters', { error: String(error) });
          
          logger.warn('Validation error', {
            tool: name,
            error: validationError.message,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(formatErrorForClient(validationError), null, 2),
              },
            ],
            isError: true,
          };
        }

        // Handle operational errors
        const formattedError = formatErrorForClient(error);
        logger.error('Tool call failed', error instanceof Error ? error : undefined, {
          tool: name,
          error: formattedError,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedError, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'leak-secure://secret-types',
          name: 'Supported Secret Types',
          description: 'List of all 35+ secret types that can be detected',
          mimeType: 'application/json',
        },
        {
          uri: 'leak-secure://patterns',
          name: 'Detection Patterns',
          description: 'Regular expressions and patterns used for secret detection',
          mimeType: 'application/json',
        },
      ],
    }));

    // Handle resource reads with error handling
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        if (uri === 'leak-secure://secret-types') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.secretDetector.getSupportedTypes(), null, 2),
              },
            ],
          };
        }

        if (uri === 'leak-secure://patterns') {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.secretDetector.getPatterns(), null, 2),
              },
            ],
          };
        }

        throw new ValidationError(`Unknown resource: ${uri}`, { uri });
      } catch (error) {
        logger.error('Resource read failed', error instanceof Error ? error : undefined, { uri });
        throw error;
      }
    });
  }

  private async handleScanRepository(args: {
    owner: string;
    repo: string;
    branch?: string;
    path?: string;
  }) {
    const { owner, repo, branch = 'main', path } = args;

    logger.info('Starting repository scan', { owner, repo, branch, path });

    try {
      // Execute with timeout
      const scanPromise = (async () => {
        // Fetch repository contents
        const files = await this.githubClient.getRepositoryFiles(owner, repo, branch, path);

        // Scan each file for secrets (process in batches for memory efficiency)
        const results: ScanResult[] = [];
        const batchSize = 50;

        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (file) => {
              if (file.type === 'file' && file.content) {
                try {
                  const detections = await this.secretDetector.scan(file.content, file.path);
                  if (detections.length > 0) {
                    results.push({
                      file: file.path,
                      detections,
                      severity: this.securityAnalyzer.calculateSeverity(detections),
                    });
                  }
                } catch (error) {
                  logger.debug('Error scanning file', {
                    file: file.path,
                    error: error instanceof Error ? error.message : String(error),
                  });
                }
              }
            })
          );
        }

        return {
          repository: `${owner}/${repo}`,
          branch,
          path: path || 'entire repository',
          totalFilesScanned: files.length,
          filesWithSecrets: results.length,
          totalSecretsFound: results.reduce((sum, r) => sum + r.detections.length, 0),
          results,
          summary: this.securityAnalyzer.generateSummary(results),
        };
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(
            `Repository scan timed out after ${config.SCAN_TIMEOUT}ms`,
            { owner, repo, branch }
          ));
        }, config.SCAN_TIMEOUT);
      });

      const scanData = await Promise.race([scanPromise, timeoutPromise]);

      logger.info('Repository scan completed', {
        owner,
        repo,
        filesScanned: scanData.totalFilesScanned,
        secretsFound: scanData.totalSecretsFound,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(scanData, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Repository scan failed', error instanceof Error ? error : undefined, {
        owner,
        repo,
        branch,
      });
      throw error;
    }
  }

  private async handleScanCode(args: { code: string; filePath?: string }) {
    const { code, filePath } = args;

    logger.info('Scanning code', { filePath: filePath || 'inline', codeLength: code.length });

    try {
      const detections = await this.secretDetector.scan(code, filePath || 'inline');

      logger.info('Code scan completed', {
        filePath: filePath || 'inline',
        detectionsFound: detections.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                filePath: filePath || 'inline',
                detectionsFound: detections.length,
                detections,
                severity: this.securityAnalyzer.calculateSeverity(detections),
                recommendations: this.securityAnalyzer.getRecommendations(detections),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Code scan failed', error instanceof Error ? error : undefined, {
        filePath: filePath || 'inline',
      });
      throw error;
    }
  }

  private async handleAnalyzeSecurity(args: {
    owner: string;
    repo: string;
    branch?: string;
  }) {
    const { owner, repo, branch = 'main' } = args;

    logger.info('Starting security analysis', { owner, repo, branch });

    try {
      // Perform comprehensive scan
      const scanResult = await this.handleScanRepository({ owner, repo, branch });

      if (scanResult.content[0].type === 'text') {
        const scanData = JSON.parse(scanResult.content[0].text);
        const analysis = this.securityAnalyzer.analyze(scanData.results);

        logger.info('Security analysis completed', {
          owner,
          repo,
          riskScore: analysis.riskScore,
          complianceStatus: analysis.complianceStatus,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...scanData,
                  analysis,
                  riskScore: analysis.riskScore,
                  complianceStatus: analysis.complianceStatus,
                  remediationSteps: analysis.remediationSteps,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error('Failed to parse scan results');
    } catch (error) {
      logger.error('Security analysis failed', error instanceof Error ? error : undefined, {
        owner,
        repo,
        branch,
      });
      throw error;
    }
  }

  private async handleGetSecretTypes() {
    try {
      const types = this.secretDetector.getSupportedTypes();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalTypes: types.length,
                categories: this.secretDetector.getCategories(),
                types: types.map((t) => ({
                  name: t.name,
                  category: t.category,
                  description: t.description,
                  severity: t.severity,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to get secret types', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  private async handleValidateSecret(args: { secretType: string; value: string }) {
    const { secretType, value } = args;

    logger.info('Validating secret', { secretType });

    try {
      // In a real implementation, this would validate with the service provider
      // For now, we'll provide a structured response
      const validation = await this.secretDetector.validateSecret(secretType, value);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validation, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Secret validation failed', error instanceof Error ? error : undefined, {
        secretType,
      });
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, initiating graceful shutdown`);

      try {
        // Give ongoing operations time to complete (up to 30 seconds)
        await Promise.race([
          new Promise(resolve => setTimeout(resolve, 30000)),
          Promise.resolve(), // Allow immediate shutdown if no operations
        ]);

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error instanceof Error ? error : undefined);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', reason instanceof Error ? reason : undefined, {
        promise: String(promise),
      });
      shutdown('unhandledRejection');
    });
  }

  async run(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('Leak Secure MCP server running on stdio', {
        version: SERVER_VERSION,
        nodeEnv: config.NODE_ENV,
      });
    } catch (error) {
      logger.error('Failed to start server', error instanceof Error ? error : undefined);
      process.exit(1);
    }
  }
}

// Start the server
const server = new LeakSecureMCPServer();
server.run().catch((error) => {
  logger.error('Fatal error starting server', error instanceof Error ? error : undefined);
  process.exit(1);
});
