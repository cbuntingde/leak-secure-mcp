# MCP Server Configuration

**Copyright 2025 Chris Bunting <cbuntingde@gmail.com>**

## Configuration for MCP Clients

This document describes how to configure the Leak Secure MCP server with various MCP clients.

### Installation

#### Install from npm (Recommended)

```bash
# Global installation
npm install -g leak-secure-mcp

# Or local installation
npm install leak-secure-mcp
```

#### Install from Source

```bash
git clone <repository-url>
cd leak-secure-mcp
npm install
npm run build
```

### Environment Variables

The setup script will automatically prompt for your GitHub token during installation. Alternatively, you can:

1. **Automatic Setup (Recommended)**: Run `npm run setup` to interactively configure your token
2. **Manual Setup**: Create a `.env` file in the project root:

```env
GITHUB_TOKEN=your_github_token_here
NODE_ENV=production
```

The setup script runs automatically after `npm install`, or you can run it manually anytime with:
```bash
npm run setup
```

### Claude Desktop Configuration

Add to your Claude Desktop configuration file (typically `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

**For npm global installation:**
```json
{
  "mcpServers": {
    "leak-secure": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/leak-secure-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

**For npm local installation or source build:**
```json
{
  "mcpServers": {
    "leak-secure": {
      "command": "node",
      "args": ["C:\\chris-apps\\leak-secure-mcp\\dist\\index.js"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

**Note:** On Windows, the global path is typically `%APPDATA%\npm\node_modules\leak-secure-mcp\dist\index.js`. On macOS/Linux, use `$(npm root -g)/leak-secure-mcp/dist/index.js` or find it with `npm root -g`.

### Cursor IDE Configuration

If using Cursor IDE with MCP support, add to your MCP configuration:

**For npm global installation:**
```json
{
  "mcpServers": {
    "leak-secure": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\AppData\\Roaming\\npm\\node_modules\\leak-secure-mcp\\dist\\index.js"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

**For npm local installation or source build:**
```json
{
  "mcpServers": {
    "leak-secure": {
      "command": "node",
      "args": ["C:\\chris-apps\\leak-secure-mcp\\dist\\index.js"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

**Finding the installation path:**
- Global npm: Run `npm root -g` to find your global node_modules directory
- Local npm: Use the path to your project's `node_modules/leak-secure-mcp/dist/index.js`

### Verification

After configuration, the MCP server should be available with the following tools:
- `scan_repository` - Scan GitHub repositories
- `scan_code` - Scan code snippets
- `analyze_security` - Comprehensive security analysis
- `get_secret_types` - List supported secret types
- `validate_secret` - Validate detected secrets

### Finding Installation Path

To find the installation path for MCP configuration, run:

```bash
npm run find-path
```

This will show you the exact path to use in your MCP client configuration.

### Testing

Test the server by running:

```bash
npm run build
npm start
```

The server communicates via stdio using the Model Context Protocol.
