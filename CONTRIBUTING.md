<div align="center">

# Contributing to Casper Network MCP Server

**Thank you for your interest in contributing to the Casper Network MCP Server!**

This document provides guidelines and instructions for contributing to this project.

</div>

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community for all developers interested in building MCP integrations.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with the following information:

- A clear, descriptive title
- A detailed description of the bug
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Any relevant logs or screenshots
- Your environment (OS, Node.js version, npm version)
- MCP client used (Claude Desktop, HTTP API, etc.)
- Casper Network RPC endpoint used
- Whether using mainnet or testnet

### Suggesting Enhancements

If you have an idea for an enhancement, please create an issue on GitHub with the following information:

- A clear, descriptive title
- A detailed description of the enhancement
- Any relevant examples or mockups
- Why this enhancement would be useful for Casper Network integration
- Potential implementation approach
- Casper SDK or RPC considerations
- Impact on mainnet operations

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature or bugfix (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request. Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) as your PR's title

## Development Setup

1. Clone your fork of the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Casper Network credentials (see README.md)
4. Add your cspr.cloud API key to `.env`
5. Test the HTTP server: `npm start`
6. Test the MCP server: `npm run mcp`
7. Configure Casper Network integration in `mcp/tools.js`

## Coding Standards

- Follow the existing code style (JavaScript/Node.js conventions)
- Write clear, descriptive commit messages using Conventional Commits
- Add JSDoc comments to your code where necessary
- Write tests for new features when applicable
- Update documentation when necessary
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Handle API errors gracefully with user-friendly messages

## Adding New MCP Tools

If you want to add a new tool to the MCP server, follow these steps:

### 1. Define Tool in `mcp/index.js`

Add your tool to the TOOLS array:

```javascript
// Add to TOOLS array
{
    name: 'your_tool_name',
    description: 'Clear description of what your tool does',
    inputSchema: {
        type: 'object',
        properties: {
            param1: {
                type: 'string',
                description: 'Description of parameter',
            },
            param2: {
                type: 'number',
                description: 'Optional parameter',
            },
        },
        required: ['param1'],
    },
},

// Add case in switch statement
case 'your_tool_name':
    result = await toolsApi.yourMethod(
        args.param1,
        args.param2
    );
    break;
```

### 2. Implement in `mcp/tools.js`

Add your method to the `ToolsAPI` class:

```javascript
/**
 * Your new tool method
 * @param {string} publicKey - Casper Network public key
 * @param {number} amount - Optional amount parameter
 * @returns {Object} Result object
 */
async yourMethod(publicKey, amount = null) {
    try {
        // Validate inputs
        if (!publicKey) {
            throw new Error('publicKey is required');
        }

        // Make Casper RPC call
        const response = await axios.post(this.rpcUrl, {
            jsonrpc: '2.0',
            method: 'info_get_status',
            params: [],
            id: 1
        }, {
            headers: { 'Authorization': this.apiKey }
        });

        return {
            success: true,
            data: response.data.result,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return handleError(error);
    }
}
```

### 3. Add Helper Functions in `mcp/utils.js`

If your tool needs utility functions:

```javascript
/**
 * Helper function for your tool
 * @param {string} input - Input to process
 * @returns {string} Processed output
 */
function yourHelper(input) {
    // Process input
    return processed;
}

module.exports = {
    // ... existing exports
    yourHelper
};
```

### 4. Add Tests

Create test cases for your new tool:

```javascript
// test-your-tool.js
const ToolsAPI = require('./mcp/tools');

const testYourTool = async () => {
  const api = new ToolsAPI();

  try {
    const result = await api.yourMethod('test-param');
    console.log('Tool result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testYourTool();
```

### 5. Update Documentation

- Add your tool to the README.md tools table
- Include example usage
- Document parameters and return values
- Add example prompts for AI assistants

## Testing Guidelines

### Running Tests

```bash
# Test MCP server
npm run mcp

# Test HTTP server
npm start

# In another terminal, test with curl
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "create_wallet", "arguments": {}}, "id": 1}'

# Test balance check
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_balance", "arguments": {"publicKey": "01abc123..."}}, "id": 1}'
```

### Writing Tests

- Test both success and failure cases
- Include edge cases (invalid inputs, missing parameters)
- Test with various parameter combinations
- Verify error messages are helpful
- Mock Casper RPC responses for unit testing
- Test with actual cspr.cloud API when appropriate
- Test with mainnet data carefully (use small amounts)

## Environment Variables

When adding new environment variables:

1. Update the `.env.example` file with clear comments
2. Document in README.md environment section
3. Add validation in tools.js constructor
4. Provide sensible defaults where appropriate

Example:
```javascript
// In tools.js constructor
this.apiKey = process.env.CASPER_API_KEY || '';
this.rpcUrl = process.env.CASPER_RPC_URL || 'https://node.cspr.cloud/rpc';
this.networkName = process.env.CASPER_NETWORK_NAME || 'casper';
this.privateKey = process.env.CASPER_PRIVATE_KEY || null;
this.publicKey = process.env.CASPER_PUBLIC_KEY || null;

if (!this.apiKey) {
  console.warn('CASPER_API_KEY not set - some features may not work');
}
```

## Documentation

- Keep README.md up to date with all changes
- Use clear, concise language
- Include code examples for new tools
- Document Casper RPC methods used
- Add comments explaining complex Casper SDK logic
- Include response examples with actual mainnet data
- Update prompts section if adding new capabilities
- Document deploy hashes and transaction examples

## Security Considerations

- **Never commit API keys, private keys, or secrets**
- **Protect private keys** - These control real CSPR tokens on mainnet
- Validate all public keys and amounts before processing
- Sanitize user-provided data (addresses, amounts)
- Implement proper input validation for Casper addresses
- Follow security best practices for blockchain operations
- Review npm dependencies for vulnerabilities
- Don't log sensitive information (API keys, private keys, PEM files)
- Use HTTPS for all Casper RPC calls
- **Mainnet caution** - This server operates with real CSPR tokens
- Never expose private keys in error messages or logs
- Validate transaction amounts to prevent accidental large transfers

## Performance Guidelines

- Optimize Casper RPC request batching when possible
- Implement caching for frequently accessed blockchain data
- Cache auction state data to reduce RPC calls
- Monitor cspr.cloud API rate limits
- Profile code for bottlenecks (especially stake queries)
- Consider response time requirements for blockchain queries
- Cache validator information appropriately
- Be mindful of large auction state responses (276+ validators)

## Submitting Your Contribution

Before submitting:

1. Ensure all tests pass
2. Update README.md with new tools
3. Check for linting issues (if configured)
4. Verify no API keys, private keys, or secrets are included
5. Write a clear PR description with examples
6. Test with actual Casper Network mainnet integration
7. Include sample responses with deploy hashes in PR
8. Update tool count in README if adding new tools
9. Test with cspr.cloud API before submitting

## Getting Help

If you need help with your contribution:

- Check existing issues and PRs on GitHub
- Ask questions in the issue tracker
- Review MCP Protocol documentation at https://modelcontextprotocol.io
- Check the MCP SDK documentation
- Review Casper Network documentation at https://docs.casper.network
- Check Casper JavaScript SDK docs
- Test with Claude Desktop or other MCP clients
- Explore cspr.live blockchain explorer for mainnet data

## Recognition

Contributors will be recognized in:

- The project README contributors section
- GitHub release notes
- Special thanks in major version releases

Thank you for helping improve the Casper Network MCP Server!

---

<div align="center">

**Built by [Tairon.ai](https://tairon.ai) team with help from Claude**

</div>
