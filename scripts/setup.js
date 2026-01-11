/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Setup script - Interactive configuration for Leak Secure MCP Server
 * Prompts user for GitHub Personal Access Token during installation
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const envPath = join(projectRoot, '.env');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setup() {
  // Skip in non-interactive environments (CI/CD)
  if (!process.stdin.isTTY) {
    console.log('⚠️  Non-interactive environment detected. Skipping setup.');
    console.log('   Run "npm run setup" manually to configure your GitHub token.\n');
    return;
  }

  console.log('\n🔐 Leak Secure MCP Server - Setup\n');
  console.log('This script will help you configure your GitHub Personal Access Token.');
  console.log('The token is optional but recommended for accessing private repositories.\n');

  // Check if .env already exists
  let existingToken = null;
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const tokenMatch = envContent.match(/GITHUB_TOKEN=(.+)/);
      if (tokenMatch && tokenMatch[1] && tokenMatch[1] !== 'your_github_token_here') {
        existingToken = tokenMatch[1].trim();
        console.log('⚠️  Found existing GitHub token in .env file.\n');
      }
    } catch (error) {
      // Ignore errors reading .env
    }
  }

  let githubToken = existingToken;

  if (existingToken) {
    const update = await question('Do you want to update your GitHub token? (y/N): ');
    if (update.toLowerCase() !== 'y' && update.toLowerCase() !== 'yes') {
      console.log('\n✅ Keeping existing GitHub token.');
      rl.close();
      return;
    }
  }

  console.log('\n📝 GitHub Personal Access Token Setup:');
  console.log('   1. Go to: https://github.com/settings/tokens');
  console.log('   2. Click "Generate new token (classic)"');
  console.log('   3. Select scopes:');
  console.log('      - repo (for private repositories)');
  console.log('      - public_repo (for public repositories only)');
  console.log('   4. Copy the generated token\n');

  const tokenInput = await question('Enter your GitHub Personal Access Token (or press Enter to skip): ');

  if (tokenInput.trim()) {
    githubToken = tokenInput.trim();
  } else if (!existingToken) {
    console.log('\n⚠️  No token provided. You can add it later by editing the .env file.');
    githubToken = '';
  }

  // Create or update .env file
  const envContent = `# GitHub API Token (optional but recommended for private repositories)
# Get your token from: https://github.com/settings/tokens
# Required scopes: repo (for private repos), public_repo (for public repos)
GITHUB_TOKEN=${githubToken || 'your_github_token_here'}

# Server Configuration
NODE_ENV=production
PORT=3000
`;

  try {
    writeFileSync(envPath, envContent, 'utf-8');
    console.log('\n✅ Configuration saved to .env file');
    
    if (githubToken && githubToken !== 'your_github_token_here') {
      console.log('✅ GitHub token configured successfully!');
    } else {
      console.log('⚠️  GitHub token not set. You can add it later by editing .env');
    }
  } catch (error) {
    console.error('\n❌ Error writing .env file:', error.message);
    process.exit(1);
  }

  rl.close();
}

setup().catch((error) => {
  console.error('❌ Setup error:', error);
  rl.close();
  process.exit(1);
});
