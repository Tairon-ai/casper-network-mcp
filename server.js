#!/usr/bin/env node
// Load .env file if it exists
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const { randomUUID } = require('crypto')

const app = express()
const PORT = process.env.PORT || 8080

const mcpName = 'Casper Network MCP Server'
const mcpDescription = 'Production-ready Model Context Protocol (MCP) server for Casper Network'
const mcpVersion = '0.1.0'

console.log(`🚀 Starting ${mcpName}...`)
console.log(`📍 Port: ${PORT}`)
console.log(`🌐 RPC URL: ${process.env.CASPER_RPC_URL || 'https://node.cspr.cloud/rpc'}`)
console.log(`🔗 Network: ${process.env.CASPER_NETWORK_NAME || 'casper'}`)
console.log(`🔑 API Key: ${process.env.CASPER_API_KEY ? 'Configured' : 'Not set'}`)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

let mcpProcess = null
let mcpInitialized = false
const pendingRequests = new Map()

async function initializeMCP () {
  return new Promise((resolve, reject) => {
    console.log('Initializing MCP...')
    console.log('Environment for MCP:', {
      CASPER_RPC_URL: process.env.CASPER_RPC_URL || 'https://node.cspr.cloud/rpc',
      CASPER_NETWORK_NAME: process.env.CASPER_NETWORK_NAME || 'casper',
      CASPER_API_KEY: process.env.CASPER_API_KEY ? 'Set' : 'Not set'
    })

    mcpProcess = spawn('node', ['./mcp/index.js'], {
      env: {
        ...process.env,
        CASPER_RPC_URL: process.env.CASPER_RPC_URL || 'https://node.cspr.cloud/rpc',
        CASPER_NETWORK_NAME: process.env.CASPER_NETWORK_NAME || 'casper',
        CASPER_API_KEY: process.env.CASPER_API_KEY || ''
      },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let buffer = ''
    let initTimeout = setTimeout(() => {
      reject(new Error('MCP initialization timeout'))
    }, 30000)

    mcpProcess.stdout.on('data', (data) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line)

            if (response.id === 'init' && response.result) {
              clearTimeout(initTimeout)
              console.log('✅ MCP initialized')

              // Send initialized notification
              mcpProcess.stdin.write(JSON.stringify({
                jsonrpc: '2.0',
                method: 'notifications/initialized',
                params: {}
              }) + '\n')

              // Mark as initialized after notification
              setTimeout(() => {
                mcpInitialized = true
                console.log('✅ MCP ready for requests')
              }, 500)

              resolve(response.result)
            }

            if (response.id && pendingRequests.has(response.id)) {
              const { resolve } = pendingRequests.get(response.id)
              pendingRequests.delete(response.id)
              resolve(response)
            }
          } catch (e) {
            // Ignore parse errors for non-JSON lines
          }
        }
      }
    })

    mcpProcess.stderr.on('data', (data) => {
      console.error('MCP stderr:', data.toString())
    })

    mcpProcess.on('error', (err) => {
      clearTimeout(initTimeout)
      console.error('MCP error:', err)
      reject(err)
    })

    mcpProcess.on('exit', (code) => {
      console.log(`MCP exited: ${code}`)
      mcpInitialized = false
    })

    // Send initialize request
    setTimeout(() => {
      mcpProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'mcp-http-server',
            version: mcpVersion
          }
        },
        id: 'init'
      }) + '\n')
    }, 1000)
  })
}

async function sendMCPRequest (method, params = {}) {
  if (!mcpInitialized) {
    throw new Error('MCP not initialized')
  }

  return new Promise((resolve, reject) => {
    const id = randomUUID()
    const timeout = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new Error('Request timeout'))
    }, 30000)

    pendingRequests.set(id, {
      resolve: (response) => {
        clearTimeout(timeout)
        resolve(response)
      },
      reject
    })

    mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id
    }) + '\n')
  })
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: mcpName,
    version: mcpVersion,
    status: mcpInitialized ? 'operational' : 'offline',
    description: mcpDescription,
    protocol: 'MCP',
    endpoints: ['/health', '/info', '/mcp']
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  const healthy = mcpInitialized || mcpProcess !== null
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: mcpName,
    version: mcpVersion,
    timestamp: new Date().toISOString()
  })
})

// Info endpoint
app.get('/info', (req, res) => {
  res.json({
    name: mcpName,
    description: mcpDescription,
    version: mcpVersion,
    rpcUrl: process.env.CASPER_RPC_URL || 'https://node.cspr.cloud/rpc',
    networkName: process.env.CASPER_NETWORK_NAME || 'casper',
    apiKeyConfigured: !!process.env.CASPER_API_KEY,
    explorer: 'https://cspr.live',
    capabilities: [
      'Wallet generation (ED25519)',
      'CSPR token transfers',
      'Balance and account queries',
      'Staking delegation and undelegation',
      'Validator information and discovery',
      'Real-time mainnet data'
    ]
  })
})

// MCP Protocol endpoint (JSON-RPC)
app.post('/mcp', async (req, res) => {
  try {
    const { jsonrpc, method, params, id, tool } = req.body

    // Handle legacy format (tool + params)
    if (tool && !method) {
      if (!mcpInitialized) {
        return res.status(503).json({
          error: 'MCP not ready',
          message: 'Please wait for initialization'
        })
      }

      try {
        const response = await sendMCPRequest('tools/call', {
          name: tool,
          arguments: params || {}
        })

        return res.json({
          result: response.result,
          error: response.error || null
        })
      } catch (error) {
        return res.status(500).json({
          error: error.message
        })
      }
    }

    // Handle standard JSON-RPC format
    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: id || null
      })
    }

    switch (method) {
      case 'initialize':
        res.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: mcpName,
              version: mcpVersion
            },
            capabilities: { tools: {} }
          },
          id
        })
        break

      case 'tools/list':
        if (!mcpInitialized) throw new Error('MCP not ready')
        const listResponse = await sendMCPRequest('tools/list')
        res.json({
          jsonrpc: '2.0',
          result: listResponse.result,
          id
        })
        break

      case 'tools/call':
        if (!mcpInitialized) throw new Error('MCP not ready')
        const callResponse = await sendMCPRequest('tools/call', params)
        res.json({
          jsonrpc: '2.0',
          result: callResponse.result,
          id
        })
        break

      default:
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id
        })
    }
  } catch (error) {
    console.error('MCP error:', error)
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message },
      id: req.body.id || null
    })
  }
})

// MCP Discovery endpoint (GET)
app.get('/mcp', (req, res) => {
  res.json({
    name: mcpName,
    version: mcpVersion,
    protocol_version: '2024-11-05',
    endpoint: '/mcp',
    status: mcpInitialized ? 'ready' : 'offline',
    description: mcpDescription,
    features: [
      'Casper Network mainnet integration',
      'Wallet management and CSPR transfers',
      'Staking and delegation operations',
      'Real-time blockchain data via cspr.cloud'
    ]
  })
})

// Initialize MCP
initializeMCP()
  .then(() => console.log('✅ MCP ready'))
  .catch((error) => {
    console.error('⚠️ MCP init failed:', error.message)
    console.log('Server will run with limited functionality')
  })

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 ${mcpName} running on port ${PORT}`)
  console.log('📍 Health check: http://localhost:' + PORT + '/health')
  console.log('📍 Info: http://localhost:' + PORT + '/info')
  console.log('📍 MCP endpoint: http://localhost:' + PORT + '/mcp')
  console.log('\n✨ Ready for MCP connections!\n')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  server.close(() => console.log('HTTP server closed'))
  if (mcpProcess) mcpProcess.kill('SIGTERM')
  setTimeout(() => process.exit(0), 5000)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  server.close(() => console.log('HTTP server closed'))
  if (mcpProcess) mcpProcess.kill('SIGTERM')
  setTimeout(() => process.exit(0), 5000)
})
