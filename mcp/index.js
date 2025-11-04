#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const dotenv = require('dotenv');
const ToolsAPI = require('./tools.js');

dotenv.config();

const toolsApi = new ToolsAPI();

const server = new Server(
    {
        name: 'casper-network-mcp-server',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Casper Network MCP tools definition
const TOOLS = [
    {
        name: 'create_wallet',
        description: 'Creates a new Casper Network wallet with ED25519 key pair. Generates public key, account hash, and private key for mainnet use.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'transfer_cspr',
        description: 'Transfer native CSPR tokens to another address on Casper Network mainnet. Creates, signs, and broadcasts the transfer deploy.',
        inputSchema: {
            type: 'object',
            properties: {
                toPublicKey: {
                    type: 'string',
                    description: 'Recipient public key in hexadecimal format (e.g., 01abc123...)',
                },
                amount: {
                    type: 'number',
                    description: 'Amount in CSPR to transfer (e.g., 100 for 100 CSPR)',
                },
                transferId: {
                    type: 'number',
                    description: 'Optional unique transfer ID for tracking (auto-generated if not provided)',
                },
                fromPrivateKeyPem: {
                    type: 'string',
                    description: 'Optional sender private key in PEM format (uses CASPER_PRIVATE_KEY from env if not provided)',
                },
            },
            required: ['toPublicKey', 'amount'],
        },
    },
    {
        name: 'get_balance',
        description: 'Get CSPR balance for a wallet address on Casper Network mainnet. Queries the current balance from the blockchain.',
        inputSchema: {
            type: 'object',
            properties: {
                publicKey: {
                    type: 'string',
                    description: 'Optional public key in hexadecimal format (e.g., 01abc123...). If not provided, uses CASPER_PUBLIC_KEY from environment',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_account_info',
        description: 'Get detailed account information from Casper Network mainnet including associated keys, action thresholds, main purse, and named keys.',
        inputSchema: {
            type: 'object',
            properties: {
                publicKey: {
                    type: 'string',
                    description: 'Optional public key in hexadecimal format (e.g., 01abc123...). If not provided, uses CASPER_PUBLIC_KEY from environment',
                },
            },
            required: [],
        },
    },
    {
        name: 'delegate_stake',
        description: 'Delegate CSPR tokens to a validator for staking rewards on Casper Network mainnet. Creates, signs, and broadcasts the delegation transaction.',
        inputSchema: {
            type: 'object',
            properties: {
                validatorPublicKey: {
                    type: 'string',
                    description: 'Validator public key in hexadecimal format (e.g., 017d96b9a63abc...)',
                },
                amount: {
                    type: 'number',
                    description: 'Amount in CSPR to delegate (e.g., 1000 for 1000 CSPR)',
                },
                delegatorPrivateKeyPem: {
                    type: 'string',
                    description: 'Optional delegator private key in PEM format (uses CASPER_PRIVATE_KEY from env if not provided)',
                },
            },
            required: ['validatorPublicKey', 'amount'],
        },
    },
    {
        name: 'undelegate_stake',
        description: 'Undelegate CSPR tokens from a validator on Casper Network mainnet. Creates, signs, and broadcasts the undelegation transaction. Tokens go through ~14 days unbonding period.',
        inputSchema: {
            type: 'object',
            properties: {
                validatorPublicKey: {
                    type: 'string',
                    description: 'Validator public key in hexadecimal format (e.g., 017d96b9a63abc...)',
                },
                amount: {
                    type: 'number',
                    description: 'Amount in CSPR to undelegate (e.g., 500 for 500 CSPR)',
                },
                delegatorPrivateKeyPem: {
                    type: 'string',
                    description: 'Optional delegator private key in PEM format (uses CASPER_PRIVATE_KEY from env if not provided)',
                },
            },
            required: ['validatorPublicKey', 'amount'],
        },
    },
    {
        name: 'get_staking_rewards',
        description: 'Get staking rewards and delegation information for an account on Casper Network mainnet. Shows total staked amount, validators, and delegation details.',
        inputSchema: {
            type: 'object',
            properties: {
                publicKey: {
                    type: 'string',
                    description: 'Optional public key in hexadecimal format (e.g., 01abc123...). If not provided, uses CASPER_PUBLIC_KEY from environment',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_validator_info',
        description: 'Get detailed information about a Casper Network validator including stake amounts, delegation rate, delegator count, and performance metrics.',
        inputSchema: {
            type: 'object',
            properties: {
                validatorPublicKey: {
                    type: 'string',
                    description: 'Validator public key in hexadecimal format (e.g., 012bac1d0ff9240ff...)',
                },
            },
            required: ['validatorPublicKey'],
        },
    },
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result;

        switch (name) {
            case 'create_wallet':
                result = await toolsApi.createWallet();
                break;

            case 'transfer_cspr':
                result = await toolsApi.transferCspr(
                    args.toPublicKey,
                    args.amount,
                    args.transferId,
                    args.fromPrivateKeyPem
                );
                break;

            case 'get_balance':
                result = await toolsApi.getBalance(args.publicKey);
                break;

            case 'get_account_info':
                result = await toolsApi.getAccountInfo(args.publicKey);
                break;

            case 'delegate_stake':
                result = await toolsApi.delegateStake(
                    args.validatorPublicKey,
                    args.amount,
                    args.delegatorPrivateKeyPem
                );
                break;

            case 'undelegate_stake':
                result = await toolsApi.undelegateStake(
                    args.validatorPublicKey,
                    args.amount,
                    args.delegatorPrivateKeyPem
                );
                break;

            case 'get_staking_rewards':
                result = await toolsApi.getStakingRewards(args.publicKey);
                break;

            case 'get_validator_info':
                result = await toolsApi.getValidatorInfo(args.validatorPublicKey);
                break;

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Casper Network MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
