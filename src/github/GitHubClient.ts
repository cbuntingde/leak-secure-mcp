/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * GitHub Client - Enterprise-grade GitHub API client with rate limiting, retries, and circuit breaker
 */

import { Octokit } from '@octokit/rest';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import { retry } from '../utils/retry.js';
import { circuitBreaker } from '../utils/circuitBreaker.js';
import {
  GitHubAPIError,
  RepositoryAccessError,
  RateLimitError,
  TimeoutError,
} from '../utils/errors.js';
import { sanitizeRepositoryName } from '../utils/validation.js';

export interface RepositoryFile {
  path: string;
  type: 'file' | 'dir';
  content?: string;
  size?: number;
}

export class GitHubClient {
  private octokit: Octokit;
  private readonly maxFileSize: number;
  private readonly maxFilesPerScan: number;

  constructor() {
    const token = config.GITHUB_TOKEN;
    
    if (!token) {
      logger.warn('GITHUB_TOKEN not set. Some features may be limited.');
    }

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'leak-secure-mcp/1.0.0',
      request: {
        timeout: config.GITHUB_REQUEST_TIMEOUT,
      },
    });

    this.maxFileSize = config.MAX_FILE_SIZE;
    this.maxFilesPerScan = config.MAX_FILES_PER_SCAN;
  }

  /**
   * Get all files from a repository with rate limiting and error handling
   */
  async getRepositoryFiles(
    owner: string,
    repo: string,
    branch: string = 'main',
    path?: string
  ): Promise<RepositoryFile[]> {
    // Sanitize inputs
    owner = sanitizeRepositoryName(owner);
    repo = sanitizeRepositoryName(repo);
    branch = sanitizeRepositoryName(branch);

    logger.info('Fetching repository files', { owner, repo, branch, path });

    try {
      const files: RepositoryFile[] = [];

      if (path) {
        // Get specific file or directory
        const fileData = await this.getFileContent(owner, repo, path, branch);
        if (fileData) {
          files.push(fileData);
        }
      } else {
        // Get all files recursively with progress tracking
        await this.getFilesRecursive(owner, repo, branch, '', files);
      }

      logger.info('Repository files fetched', {
        owner,
        repo,
        fileCount: files.length,
      });

      return files;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Not Found') || error.message.includes('404')) {
          throw new RepositoryAccessError(
            `Repository ${owner}/${repo} not found or not accessible`,
            { owner, repo, branch }
          );
        }
        if (error.message.includes('rate limit') || error.message.includes('403')) {
          throw new RateLimitError(
            'GitHub API rate limit exceeded',
            undefined,
            { owner, repo }
          );
        }
        if (error.message.includes('timeout')) {
          throw new TimeoutError(
            'Request to GitHub API timed out',
            { owner, repo }
          );
        }
      }
      throw new GitHubAPIError(
        `Failed to fetch repository files: ${error instanceof Error ? error.message : String(error)}`,
        { owner, repo, branch }
      );
    }
  }

  /**
   * Recursively get all files from a repository with rate limiting and memory management
   */
  private async getFilesRecursive(
    owner: string,
    repo: string,
    branch: string,
    currentPath: string,
    files: RepositoryFile[]
  ): Promise<void> {
    // Check file limit to prevent memory issues
    if (files.length >= this.maxFilesPerScan) {
      logger.warn('Maximum file limit reached, stopping scan', {
        owner,
        repo,
        fileCount: files.length,
        maxFiles: this.maxFilesPerScan,
      });
      return;
    }

    try {
      // Wait for rate limit token
      await rateLimiter.waitForToken('github-api');

      // Execute with circuit breaker and retry logic
      const { data } = await circuitBreaker.execute(() =>
        retry(() =>
          this.octokit.repos.getContent({
            owner,
            repo,
            path: currentPath || '.',
            ref: branch,
          })
        )
      );

      if (Array.isArray(data)) {
        // It's a directory - process items in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(async (item) => {
              if (files.length >= this.maxFilesPerScan) {
                return;
              }

              if (item.type === 'file') {
                const fileContent = await this.getFileContent(owner, repo, item.path, branch);
                if (fileContent) {
                  files.push(fileContent);
                }
              } else if (item.type === 'dir') {
                // Recursively get files from subdirectory
                await this.getFilesRecursive(owner, repo, branch, item.path, files);
              }
            })
          );
        }
      } else if (data.type === 'file') {
        // It's a single file
        const fileContent = await this.getFileContent(owner, repo, data.path, branch);
        if (fileContent) {
          files.push(fileContent);
        }
      }
    } catch (error) {
      // Skip files that can't be accessed (e.g., binary files, large files, permission issues)
      if (error instanceof Error) {
        if (!error.message.includes('Not Found') && !error.message.includes('404')) {
          logger.debug(`Skipping ${currentPath}`, {
            error: error.message,
            owner,
            repo,
            path: currentPath,
          });
        }
      }
    }
  }

  /**
   * Get content of a specific file with validation and size limits
   */
  private async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string
  ): Promise<RepositoryFile | null> {
    try {
      // Skip binary files and large files
      const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
        '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll',
        '.so', '.dylib', '.bin', '.woff', '.woff2', '.ttf',
        '.mp4', '.mp3', '.avi', '.mov', '.webm',
        '.jar', '.war', '.ear', '.class', '.pyc',
      ];

      const isBinary = binaryExtensions.some((ext) => path.toLowerCase().endsWith(ext));
      if (isBinary) {
        logger.debug('Skipping binary file', { path });
        return null;
      }

      // Skip common non-code directories
      const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '__pycache__'];
      if (skipDirs.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) {
        logger.debug('Skipping directory', { path });
        return null;
      }

      // Wait for rate limit token
      await rateLimiter.waitForToken('github-api');

      // Execute with circuit breaker and retry logic
      const { data } = await circuitBreaker.execute(() =>
        retry(() =>
          this.octokit.repos.getContent({
            owner,
            repo,
            path,
            ref: branch,
          })
        )
      );

      if ('content' in data && data.content) {
        // Decode base64 content
        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        // Skip very large files (configurable limit)
        if (content.length > this.maxFileSize) {
          logger.debug('Skipping large file', { path, size: content.length, maxSize: this.maxFileSize });
          return null;
        }

        return {
          path: data.path,
          type: 'file',
          content,
          size: data.size,
        };
      }

      return null;
    } catch (error) {
      // File might be too large, binary, or inaccessible
      logger.debug('Failed to get file content', {
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get repository information with rate limiting and error handling
   */
  async getRepositoryInfo(owner: string, repo: string): Promise<{
    name: string;
    fullName: string;
    description: string | null;
    defaultBranch: string;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
  }> {
    owner = sanitizeRepositoryName(owner);
    repo = sanitizeRepositoryName(repo);

    try {
      // Wait for rate limit token
      await rateLimiter.waitForToken('github-api');

      // Execute with circuit breaker and retry logic
      const { data } = await circuitBreaker.execute(() =>
        retry(() =>
          this.octokit.repos.get({
            owner,
            repo,
          })
        )
      );

      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Not Found') || error.message.includes('404')) {
          throw new RepositoryAccessError(
            `Repository ${owner}/${repo} not found or not accessible`,
            { owner, repo }
          );
        }
        if (error.message.includes('rate limit') || error.message.includes('403')) {
          throw new RateLimitError(
            'GitHub API rate limit exceeded',
            undefined,
            { owner, repo }
          );
        }
      }
      throw new GitHubAPIError(
        `Failed to get repository info: ${error instanceof Error ? error.message : String(error)}`,
        { owner, repo }
      );
    }
  }

  /**
   * Check if repository is accessible with proper error handling
   */
  async isAccessible(owner: string, repo: string): Promise<boolean> {
    owner = sanitizeRepositoryName(owner);
    repo = sanitizeRepositoryName(repo);

    try {
      // Wait for rate limit token
      await rateLimiter.waitForToken('github-api');

      // Execute with circuit breaker and retry logic
      await circuitBreaker.execute(() =>
        retry(() =>
          this.octokit.repos.get({
            owner,
            repo,
          })
        )
      );
      return true;
    } catch (error) {
      logger.debug('Repository not accessible', {
        owner,
        repo,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
