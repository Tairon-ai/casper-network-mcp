<div align="center">

# 🔗 Casper Network MCP Server v0.1.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-blue)](https://modelcontextprotocol.io)
[![Casper Network](https://img.shields.io/badge/Casper-Mainnet-blue)](https://cspr.live)

**Production-ready Model Context Protocol (MCP) server for Casper Network blockchain**

[Features](#-features) • [Quick Start](#-quick-start) • [Tools](#-available-tools) • [Prompts](#-prompts) • [Security](#-security) • [Contributing](#-contributing)

</div>

---

## 🚀 Features

### 🏗️ **Dual-Server Architecture**
- HTTP server (Express) for REST API access
- MCP stdio server for Claude Desktop integration
- Seamless communication between both servers
- Process management with graceful shutdown
- Health monitoring endpoints

### 🛠️ **Professional Structure**
- Modular tool system with separate tools.js
- Utility helpers in dedicated utils.js file
- Clean separation of concerns
- Easy to extend and maintain
- Production-tested components

### 🔧 **Developer-Friendly**
- Simple JSON-RPC interface
- Comprehensive error handling
- Environment-based configuration
- Docker containerization support
- MCP protocol 2024-11-05 implementation
- Zero-configuration deployment with sensible defaults

### 🎯 **Casper Network Integration**
- Wallet creation and management
- CSPR token transfers
- Staking and delegation operations
- Real-time blockchain data from mainnet
- Curated validator database (50+ top validators)
- Full integration with Casper JavaScript SDK

---

## 📦 Quick Start

### ✅ Prerequisites
```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0

# Casper Network API Key from cspr.cloud
# Get your free API key at: https://cspr.cloud
```

### 🔑 Configuration

Create a `.env` file with your Casper Network configuration:

- **CASPER_API_KEY:** Your API key from cspr.cloud (required)
- **CASPER_RPC_URL:** RPC endpoint (default: https://node.cspr.cloud/rpc)
- **CASPER_NETWORK_NAME:** Network name (default: casper for mainnet)
- **PORT:** HTTP server port (default: 8080)
- **CASPER_PRIVATE_KEY:** Optional default wallet private key (PEM format)
- **CASPER_PUBLIC_KEY:** Optional default wallet public key

### 📥 Installation

```bash
# Clone the repository
git clone https://github.com/Tairon-ai/casper-network-mcp.git
cd casper-network-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your CASPER_API_KEY from cspr.cloud

# Start the HTTP server
npm start

# MCP stdio server for Claude Desktop
npm run mcp
```

### 🤖 Claude Desktop Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "casper-network": {
      "command": "node",
      "args": ["/path/to/casper-network-mcp/mcp/index.js"],
      "env": {
        "CASPER_API_KEY": "your_api_key_from_cspr_cloud",
        "CASPER_RPC_URL": "https://node.cspr.cloud/rpc",
        "CASPER_NETWORK_NAME": "casper"
      }
    }
  }
}
```

> **Note:** Get your API key from https://cspr.cloud for mainnet access

---

## 🛠 Available Tools

### 📋 **Casper Network Blockchain Tools**

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `create_wallet` | Generate new ED25519 wallet | None | Public key, private key (PEM), account hash |
| `get_balance` | Check CSPR balance | `publicKey` (optional) | Balance in CSPR and motes |
| `get_account_info` | Get account details | `publicKey` (optional) | Account hash, keys, thresholds, purse |
| `transfer_cspr` | Send CSPR tokens | `toPublicKey`, `amount`, `transferId` (opt), `fromPrivateKeyPem` (opt) | Deploy hash, transaction details |
| `delegate_stake` | Delegate to validator | `validatorPublicKey`, `amount`, `delegatorPrivateKeyPem` (opt) | Deploy hash, staking details |
| `undelegate_stake` | Undelegate from validator | `validatorPublicKey`, `amount`, `delegatorPrivateKeyPem` (opt) | Deploy hash, unbonding info |
| `get_staking_rewards` | View staking info | `publicKey` (optional) | Total staked, delegations, validators |
| `get_validator_info` | Get validator details | `validatorPublicKey` | Name, stake, delegators, commission |

---

## 🤖 Prompts

### 💬 Example Prompts for AI Assistants

**Wallet Management:**
```
"Create a new Casper wallet for me"
"What's my CSPR balance?"
"Check the balance of wallet 01abc123..."
"Show me my Casper account details"
```

**Transfers:**
```
"Send 100 CSPR to wallet 01abc123..."
"Transfer 50 CSPR to 01def456... with transfer ID 12345"
```

**Staking:**
```
"Delegate 1000 CSPR to validator 012bac..."
"Stake 500 CSPR with Everstake validator"
"Undelegate 500 CSPR from validator 012bac..."
"Show me my staking rewards and delegations"
```

**Validator Info:**
```
"Tell me about Everstake validator 012bac..."
"What's the commission rate and total stake of validator 01c377...?"
"Find validators with 0% commission"
```

### 🔧 Testing Tools

```bash
# Test wallet creation
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "create_wallet", "arguments": {}}, "id": 1}'

# Test balance check
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_balance", "arguments": {"publicKey": "01abc..."}}, "id": 1}'
```

---

## 🔒 Security

### 🛡️ Security Best Practices

- **Private Key Protection** - Never commit `.env` files or private keys to version control
- **Environment Variables** - Store sensitive data (API keys, private keys) in environment variables
- **API Key Security** - Keep your cspr.cloud API key secure and don't share it
- **Input Validation** - All public keys and amounts are validated before processing
- **Mainnet Caution** - This server operates on Casper mainnet with real CSPR tokens
- **Error Handling** - Errors don't expose sensitive wallet information
- **Secure Communication** - All RPC calls use HTTPS to cspr.cloud

---

## 🚀 Deployment

### 🏭 Production Deployment

```bash
# Start production server
NODE_ENV=production npm start

# With PM2
pm2 start server.js --name casper-mcp

# With Docker
docker build -t casper-mcp .
docker run -d -p 8080:8080 --env-file .env casper-mcp
```

### 🔑 Environment Variables

```env
# Casper Network Configuration
CASPER_RPC_URL=https://node.cspr.cloud/rpc
CASPER_API_KEY=your_api_key_from_cspr_cloud
CASPER_NETWORK_NAME=casper

# Optional: Default Wallet
CASPER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
CASPER_PUBLIC_KEY=01abc123...

# Server Configuration
PORT=8080
NODE_ENV=production
```

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our development process.

```bash
# Fork the repository
git clone https://github.com/Tairon-ai/casper-network-mcp.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m 'feat: add amazing feature'
git push origin feature/amazing-feature

# Open Pull Request
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📚 Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/docs/getting-started/intro)
- [MCP GitHub Organization](https://github.com/modelcontextprotocol)
- [Casper Network Documentation](https://docs.casper.network/)
- [Casper JavaScript SDK](https://docs.casper.network/developers/dapps/sdk/script-sdk/)
- [cspr.live Explorer](https://cspr.live)
- [cspr.cloud RPC](https://cspr.cloud)
- [Express.js Documentation](https://expressjs.com/)

---

<div align="center">

**Built by [Tairon.ai](https://tairon.ai) team with help from Claude**

</div>
