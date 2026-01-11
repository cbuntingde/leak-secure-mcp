/**
 * Copyright 2025 Chris Bunting <cbuntingde@gmail.com>
 * 
 * Helper script to find the installation path for MCP configuration
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('\n📍 Finding Leak Secure MCP installation path...\n');

// Check if installed globally
try {
  const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  const globalPath = join(globalRoot, 'leak-secure-mcp', 'dist', 'index.js');
  
  if (existsSync(globalPath)) {
    console.log('✅ Found global installation:');
    console.log(`   ${globalPath}\n`);
    console.log('Use this path in your MCP client configuration.\n');
    process.exit(0);
  }
} catch (error) {
  // Not installed globally or npm not found
}

// Check local installation
const localPath = join(projectRoot, 'dist', 'index.js');
if (existsSync(localPath)) {
  console.log('✅ Found local installation:');
  console.log(`   ${localPath}\n`);
  console.log('Use this path in your MCP client configuration.\n');
  process.exit(0);
}

// Check node_modules
const nodeModulesPath = join(projectRoot, 'node_modules', 'leak-secure-mcp', 'dist', 'index.js');
if (existsSync(nodeModulesPath)) {
  console.log('✅ Found in node_modules:');
  console.log(`   ${nodeModulesPath}\n`);
  console.log('Use this path in your MCP client configuration.\n');
  process.exit(0);
}

console.log('❌ Installation not found.');
console.log('   Make sure you have:');
console.log('   1. Run "npm install" or "npm install -g leak-secure-mcp"');
console.log('   2. Run "npm run build" if installing from source\n');
