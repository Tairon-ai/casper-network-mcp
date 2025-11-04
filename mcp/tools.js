const axios = require('axios');
const {
    RpcClient,
    PublicKey,
    PrivateKey,
    KeyAlgorithm,
    makeCsprTransferDeploy,
    makeAuctionManagerDeploy,
    AuctionManagerEntryPoint,
    NativeUndelegateBuilder
} = require('casper-js-sdk');
const { handleError } = require('./utils');

/**
 * ToolsAPI - Casper Network MCP tool implementations
 *
 * This class handles all Casper Network blockchain operations for the MCP server.
 * Implements wallet management, transfers, staking, and network queries.
 */
class ToolsAPI {
    constructor() {
        // Load Casper Network configuration from environment
        this.rpcUrl = process.env.CASPER_RPC_URL || 'https://node.cspr.cloud/rpc';
        this.networkName = process.env.CASPER_NETWORK_NAME || 'casper';
        this.apiKey = process.env.CASPER_API_KEY || '';

        // Initialize Casper RPC client
        this.rpcClient = new RpcClient(this.rpcUrl);

        console.error('Casper Network ToolsAPI initialized');
        console.error(`RPC URL: ${this.rpcUrl}`);
        console.error(`Network: ${this.networkName}`);
        console.error(`API Key configured: ${this.apiKey ? 'Yes' : 'No'}`);
    }

    /**
     * Creates a new Casper Network wallet with ED25519 key pair
     *
     * Generates a fresh keypair for use on Casper Network mainnet.
     * Returns public key, account hash, and private key in PEM format.
     *
     * @returns {Object} Wallet creation result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.publicKey - Public key in hexadecimal format
     * @returns {string} result.accountHash - Casper account hash derived from public key
     * @returns {string} result.privateKey - Private key in PEM format (STORE SECURELY!)
     * @returns {string} result.explorerUrl - Direct link to view account on cspr.live explorer
     * @returns {string} result.timestamp - ISO timestamp of wallet creation
     */
    async createWallet() {
        try {
            // Generate new ED25519 key pair
            const privateKey = PrivateKey.generate(KeyAlgorithm.ED25519);
            const publicKey = privateKey.publicKey;

            // Export keys to standard formats
            const publicKeyHex = publicKey.toHex();
            const accountHash = publicKey.accountHash().toPrefixedString();
            const privateKeyPem = privateKey.toPem();

            console.error(`New wallet created: ${accountHash}`);

            return {
                success: true,
                publicKey: publicKeyHex,
                accountHash: accountHash,
                privateKey: privateKeyPem,
                explorerUrl: `https://cspr.live/account/${publicKeyHex}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Transfer CSPR tokens to another address on Casper Network mainnet
     *
     * Creates, signs, and sends a native CSPR transfer deploy to the network.
     * Requires a private key for signing (from environment or parameter).
     *
     * @param {string} toPublicKey - Recipient's public key in hexadecimal format
     * @param {number} amount - Amount in CSPR to transfer (will be converted to motes)
     * @param {number} [transferId] - Optional unique transfer ID (auto-generated if not provided)
     * @param {string} [fromPrivateKeyPem] - Optional sender's private key in PEM format (uses env if not provided)
     * @returns {Object} Transfer result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.deployHash - Deploy hash for tracking transaction
     * @returns {number} result.amount - Amount transferred in CSPR
     * @returns {string} result.recipient - Recipient's public key
     * @returns {string} result.sender - Sender's public key
     * @returns {number} result.transferId - Transfer ID used for this transaction
     * @returns {string} result.explorerUrl - Direct link to view transaction on cspr.live explorer
     * @returns {string} result.senderExplorerUrl - Direct link to view sender account on cspr.live
     * @returns {string} result.recipientExplorerUrl - Direct link to view recipient account on cspr.live
     * @returns {string} result.timestamp - ISO timestamp of transfer creation
     */
    async transferCspr(toPublicKey, amount, transferId = null, fromPrivateKeyPem = null) {
        try {
            // Validate inputs
            if (!toPublicKey) {
                throw new Error('Recipient public key is required');
            }
            if (!amount || amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Get sender's private key from parameter or environment
            const privateKeyPem = fromPrivateKeyPem || process.env.CASPER_PRIVATE_KEY;
            if (!privateKeyPem) {
                throw new Error('Private key not provided. Set CASPER_PRIVATE_KEY in environment or pass as parameter');
            }

            // Parse private key from PEM format (ED25519 is the default algorithm for Casper)
            const senderPrivateKey = PrivateKey.fromPem(privateKeyPem, KeyAlgorithm.ED25519);
            const senderPublicKey = senderPrivateKey.publicKey;

            // Parse recipient public key
            const recipientPublicKey = PublicKey.fromHex(toPublicKey);

            // Convert CSPR to motes (1 CSPR = 1,000,000,000 motes)
            const amountInMotes = BigInt(Math.floor(amount * 1_000_000_000));

            // Generate unique transfer ID if not provided
            const id = transferId || Date.now();

            console.error(`Creating CSPR transfer: ${amount} CSPR to ${toPublicKey}`);

            // Create transfer deploy using SDK helper
            const deploy = makeCsprTransferDeploy({
                recipientPublicKey: recipientPublicKey,
                amount: amountInMotes,
                chainName: this.networkName,
                sourceSenderPublicKey: senderPublicKey,
                transferId: id
            });

            // Sign the deploy
            const signedDeploy = deploy.sign([senderPrivateKey]);

            // Send deploy to network
            const deployHash = await this.rpcClient.deploy(signedDeploy);

            console.error(`Transfer deploy sent: ${deployHash}`);

            return {
                success: true,
                deployHash: deployHash,
                amount: amount,
                amountMotes: amountInMotes.toString(),
                recipient: toPublicKey,
                sender: senderPublicKey.toHex(),
                transferId: id,
                explorerUrl: `https://cspr.live/transaction/${deployHash}`,
                senderExplorerUrl: `https://cspr.live/account/${senderPublicKey.toHex()}`,
                recipientExplorerUrl: `https://cspr.live/account/${toPublicKey}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get CSPR balance for a wallet address on Casper Network mainnet
     *
     * Queries the current balance for a given public key.
     * If no public key is provided, uses the default wallet from environment.
     *
     * @param {string} [publicKey] - Optional public key in hexadecimal format (uses env if not provided)
     * @returns {Object} Balance query result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.publicKey - Public key that was queried
     * @returns {string} result.balance - Balance in CSPR (human-readable)
     * @returns {string} result.balanceMotes - Balance in motes (raw value)
     * @returns {string} result.accountHash - Account hash for the public key
     * @returns {string} result.explorerUrl - Direct link to view account on cspr.live
     * @returns {string} result.timestamp - ISO timestamp of balance query
     */
    async getBalance(publicKey = null) {
        try {
            // Get public key from parameter or environment
            const pubKeyHex = publicKey || process.env.CASPER_PUBLIC_KEY;

            if (!pubKeyHex) {
                throw new Error('Public key not provided. Pass publicKey parameter or set CASPER_PUBLIC_KEY in environment');
            }

            // Parse public key to get account hash
            const accountPublicKey = PublicKey.fromHex(pubKeyHex);
            const accountHash = accountPublicKey.accountHash().toPrefixedString();

            console.error(`Querying balance for: ${accountHash}`);

            // Query balance using direct RPC call
            const rpcRequest = {
                jsonrpc: '2.0',
                method: 'query_balance',
                params: {
                    purse_identifier: {
                        main_purse_under_public_key: pubKeyHex
                    }
                },
                id: 1
            };

            // Prepare headers with API key if available
            const headers = { 'Content-Type': 'application/json' };
            if (this.apiKey) {
                // cspr.cloud requires API key directly in Authorization header (no Bearer prefix)
                headers['Authorization'] = this.apiKey;
            }

            const response = await axios.post(this.rpcUrl, rpcRequest, {
                headers: headers
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
            }

            // Extract balance from response
            const balanceMotes = response.data.result.balance;
            const balanceCspr = (Number(balanceMotes) / 1_000_000_000).toFixed(9);

            console.error(`Balance: ${balanceCspr} CSPR (${balanceMotes} motes)`);

            return {
                success: true,
                publicKey: pubKeyHex,
                accountHash: accountHash,
                balance: balanceCspr,
                balanceMotes: balanceMotes,
                explorerUrl: `https://cspr.live/account/${pubKeyHex}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get detailed account information for a Casper Network address
     *
     * Retrieves comprehensive account data including associated keys, action thresholds,
     * main purse, and named keys from the Casper Network mainnet.
     *
     * @param {string} [publicKey] - Optional public key in hexadecimal format (uses env if not provided)
     * @returns {Object} Account information result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.publicKey - Public key queried
     * @returns {string} result.accountHash - Account hash
     * @returns {string} result.mainPurse - Main purse URef
     * @returns {Array} result.namedKeys - Associated named keys
     * @returns {Array} result.associatedKeys - List of associated keys with weights
     * @returns {Object} result.actionThresholds - Deployment and key management thresholds
     * @returns {string} result.explorerUrl - Direct link to view account on cspr.live
     * @returns {string} result.timestamp - ISO timestamp of query
     */
    async getAccountInfo(publicKey = null) {
        try {
            // Get public key from parameter or environment
            const pubKeyHex = publicKey || process.env.CASPER_PUBLIC_KEY;

            if (!pubKeyHex) {
                throw new Error('Public key not provided. Pass publicKey parameter or set CASPER_PUBLIC_KEY in environment');
            }

            // Parse public key to get account hash
            const accountPublicKey = PublicKey.fromHex(pubKeyHex);
            const accountHash = accountPublicKey.accountHash().toPrefixedString();

            console.error(`Querying account info for: ${accountHash}`);

            // Query account info using direct RPC call
            const rpcRequest = {
                jsonrpc: '2.0',
                method: 'state_get_account_info',
                params: {
                    public_key: pubKeyHex
                },
                id: 1
            };

            // Prepare headers with API key if available
            const headers = { 'Content-Type': 'application/json' };
            if (this.apiKey) {
                headers['Authorization'] = this.apiKey;
            }

            const response = await axios.post(this.rpcUrl, rpcRequest, {
                headers: headers
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
            }

            // Extract account data from response
            const account = response.data.result.account;

            console.error(`Account info retrieved for: ${account.account_hash}`);

            return {
                success: true,
                publicKey: pubKeyHex,
                accountHash: account.account_hash,
                mainPurse: account.main_purse,
                namedKeys: account.named_keys,
                associatedKeys: account.associated_keys,
                actionThresholds: account.action_thresholds,
                explorerUrl: `https://cspr.live/account/${pubKeyHex}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Delegate CSPR tokens to a validator for staking rewards
     *
     * Creates, signs, and sends a delegation transaction to the Casper Network auction system.
     * Delegating tokens supports network validators and earns staking rewards.
     *
     * @param {string} validatorPublicKey - Validator's public key in hexadecimal format
     * @param {number} amount - Amount in CSPR to delegate (will be converted to motes)
     * @param {string} [delegatorPrivateKeyPem] - Optional delegator's private key in PEM format (uses env if not provided)
     * @returns {Object} Delegation result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.deployHash - Deploy hash for tracking delegation
     * @returns {number} result.amount - Amount delegated in CSPR
     * @returns {string} result.amountMotes - Amount delegated in motes
     * @returns {string} result.validator - Validator's public key
     * @returns {string} result.delegator - Delegator's public key
     * @returns {string} result.explorerUrl - Direct link to view transaction on cspr.live explorer
     * @returns {string} result.validatorExplorerUrl - Direct link to view validator on cspr.live
     * @returns {string} result.delegatorExplorerUrl - Direct link to view delegator account on cspr.live
     * @returns {string} result.timestamp - ISO timestamp of delegation creation
     */
    async delegateStake(validatorPublicKey, amount, delegatorPrivateKeyPem = null) {
        try {
            // Validate inputs
            if (!validatorPublicKey) {
                throw new Error('Validator public key is required');
            }
            if (!amount || amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Get delegator's private key from parameter or environment
            const privateKeyPem = delegatorPrivateKeyPem || process.env.CASPER_PRIVATE_KEY;
            if (!privateKeyPem) {
                throw new Error('Private key not provided. Set CASPER_PRIVATE_KEY in environment or pass as parameter');
            }

            // Parse private key from PEM format (ED25519 is the default algorithm for Casper)
            const delegatorPrivateKey = PrivateKey.fromPem(privateKeyPem, KeyAlgorithm.ED25519);
            const delegatorPublicKey = delegatorPrivateKey.publicKey;

            // Parse validator public key
            const validatorPubKey = PublicKey.fromHex(validatorPublicKey);

            // Convert CSPR to motes (1 CSPR = 1,000,000,000 motes)
            const amountInMotes = BigInt(Math.floor(amount * 1_000_000_000));

            // Standard payment for delegation (3 CSPR)
            const paymentAmount = '3000000000'; // 3 CSPR in motes as string

            console.error(`Creating delegation: ${amount} CSPR to validator ${validatorPublicKey}`);

            // Create delegation deploy using makeAuctionManagerDeploy helper
            const deploy = makeAuctionManagerDeploy({
                entryPoint: AuctionManagerEntryPoint.Delegate,
                paymentAmount: paymentAmount,
                chainName: this.networkName,
                senderPublicKey: delegatorPublicKey,
                delegator: delegatorPublicKey,
                validator: validatorPubKey,
                amount: amountInMotes
            });

            // Sign the deploy
            const signedDeploy = deploy.sign([delegatorPrivateKey]);

            // Send deploy to network
            const deployHash = await this.rpcClient.deploy(signedDeploy);

            console.error(`Delegation deploy sent: ${deployHash}`);

            return {
                success: true,
                deployHash: deployHash,
                amount: amount,
                amountMotes: amountInMotes.toString(),
                validator: validatorPublicKey,
                delegator: delegatorPublicKey.toHex(),
                explorerUrl: `https://cspr.live/deploy/${deployHash}`,
                validatorExplorerUrl: `https://cspr.live/validator/${validatorPublicKey}`,
                delegatorExplorerUrl: `https://cspr.live/account/${delegatorPublicKey.toHex()}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Undelegate CSPR tokens from a validator
     *
     * Creates, signs, and sends an undelegation deploy to remove staked tokens from a validator.
     * Undelegated tokens go through an unbonding period (~14 days) before becoming available.
     *
     * @param {string} validatorPublicKey - Validator's public key in hexadecimal format
     * @param {number} amount - Amount in CSPR to undelegate (will be converted to motes)
     * @param {string} [delegatorPrivateKeyPem] - Optional delegator's private key in PEM format (uses env if not provided)
     * @returns {Object} Undelegation result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.deployHash - Deploy hash for tracking undelegation
     * @returns {number} result.amount - Amount undelegated in CSPR
     * @returns {string} result.amountMotes - Amount undelegated in motes
     * @returns {string} result.validator - Validator's public key
     * @returns {string} result.delegator - Delegator's public key
     * @returns {string} result.explorerUrl - Direct link to view transaction on cspr.live explorer
     * @returns {string} result.validatorExplorerUrl - Direct link to view validator on cspr.live
     * @returns {string} result.delegatorExplorerUrl - Direct link to view delegator account on cspr.live
     * @returns {string} result.unbondingNote - Note about unbonding period
     * @returns {string} result.timestamp - ISO timestamp of undelegation creation
     */
    async undelegateStake(validatorPublicKey, amount, delegatorPrivateKeyPem = null) {
        try {
            // Validate inputs
            if (!validatorPublicKey) {
                throw new Error('Validator public key is required');
            }
            if (!amount || amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            // Get delegator's private key from parameter or environment
            const privateKeyPem = delegatorPrivateKeyPem || process.env.CASPER_PRIVATE_KEY;
            if (!privateKeyPem) {
                throw new Error('Private key not provided. Set CASPER_PRIVATE_KEY in environment or pass as parameter');
            }

            // Parse private key from PEM format (ED25519 is the default algorithm for Casper)
            const delegatorPrivateKey = PrivateKey.fromPem(privateKeyPem, KeyAlgorithm.ED25519);
            const delegatorPublicKey = delegatorPrivateKey.publicKey;

            // Parse validator public key
            const validatorPubKey = PublicKey.fromHex(validatorPublicKey);

            // Convert CSPR to motes (1 CSPR = 1,000,000,000 motes)
            const amountInMotes = BigInt(Math.floor(amount * 1_000_000_000));

            // Standard payment for undelegation (3 CSPR)
            const paymentAmount = BigInt(3_000_000_000);

            console.error(`Creating undelegation: ${amount} CSPR from validator ${validatorPublicKey}`);

            // Build undelegation transaction using the builder pattern
            const builder = new NativeUndelegateBuilder();
            const transaction = builder
                .from(delegatorPublicKey)
                .validator(validatorPubKey)
                .amount(amountInMotes)
                .chainName(this.networkName)
                .payment(paymentAmount)
                .build();

            // Sign the transaction with delegator's private key
            transaction.sign(delegatorPrivateKey);

            // Get the transaction hash for tracking
            const transactionWrapper = transaction.getTransactionWrapper();
            const transactionHash = transactionWrapper.transactionV1.hash.toHex();

            console.error(`Transaction signed: ${transactionHash}`);

            // Send transaction to network using direct RPC call with hex-encoded bytes
            const transactionBytes = transaction.toBytes();
            const hexTransaction = Buffer.from(transactionBytes).toString('hex');

            const rpcRequest = {
                jsonrpc: '2.0',
                method: 'account_put_transaction',
                params: {
                    transaction: hexTransaction
                },
                id: 1
            };

            // Prepare headers with API key if available
            const headers = { 'Content-Type': 'application/json' };
            if (this.apiKey) {
                headers['Authorization'] = this.apiKey;
            }

            const response = await axios.post(this.rpcUrl, rpcRequest, {
                headers: headers
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
            }

            console.error(`Undelegation transaction sent: ${transactionHash}`);

            return {
                success: true,
                deployHash: transactionHash,
                amount: amount,
                amountMotes: amountInMotes.toString(),
                validator: validatorPublicKey,
                delegator: delegatorPublicKey.toHex(),
                explorerUrl: `https://cspr.live/transaction/${transactionHash}`,
                validatorExplorerUrl: `https://cspr.live/validator/${validatorPublicKey}`,
                delegatorExplorerUrl: `https://cspr.live/account/${delegatorPublicKey.toHex()}`,
                unbondingNote: 'Undelegated tokens will be available after ~14 days (7 eras) unbonding period',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get staking rewards information for an account
     *
     * Queries the Casper Network auction system to find all active delegations,
     * total staked amount, and validator information for a given account.
     *
     * @param {string} [publicKey] - Optional public key in hexadecimal format (uses env if not provided)
     * @returns {Object} Staking rewards result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.publicKey - Public key queried
     * @returns {string} result.accountHash - Account hash
     * @returns {string} result.totalStaked - Total staked amount in CSPR
     * @returns {string} result.totalStakedMotes - Total staked amount in motes
     * @returns {number} result.validatorCount - Number of validators delegated to
     * @returns {Array} result.delegations - Array of delegation details
     * @returns {string} result.delegations[].validator - Validator public key
     * @returns {string} result.delegations[].stakedAmount - Amount staked in CSPR
     * @returns {string} result.delegations[].stakedAmountMotes - Amount staked in motes
     * @returns {number} result.delegations[].delegationRate - Validator's delegation rate (commission %)
     * @returns {string} result.delegations[].bondingPurse - Bonding purse URef
     * @returns {string} result.delegations[].validatorExplorerUrl - Link to validator on cspr.live
     * @returns {string} result.explorerUrl - Direct link to view account on cspr.live
     * @returns {string} result.timestamp - ISO timestamp of query
     */
    async getStakingRewards(publicKey = null) {
        try {
            // Get public key from parameter or environment
            const pubKeyHex = publicKey || process.env.CASPER_PUBLIC_KEY;

            if (!pubKeyHex) {
                throw new Error('Public key not provided. Pass publicKey parameter or set CASPER_PUBLIC_KEY in environment');
            }

            // Parse public key to get account hash
            const accountPublicKey = PublicKey.fromHex(pubKeyHex);
            const accountHash = accountPublicKey.accountHash().toPrefixedString();

            console.error(`Querying staking rewards for: ${accountHash}`);

            // Query auction info using direct RPC call
            const rpcRequest = {
                jsonrpc: '2.0',
                method: 'state_get_auction_info',
                params: {},
                id: 1
            };

            // Prepare headers with API key if available
            const headers = { 'Content-Type': 'application/json' };
            if (this.apiKey) {
                headers['Authorization'] = this.apiKey;
            }

            const response = await axios.post(this.rpcUrl, rpcRequest, {
                headers: headers
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
            }

            // Extract auction state from response
            const auctionState = response.data.result.auction_state;

            console.error(`Scanning ${auctionState.bids.length} validators for delegations...`);

            // Find all delegations for this public key
            let totalStaked = BigInt(0);
            const delegations = [];

            for (const bid of auctionState.bids) {
                if (bid.bid.delegators) {
                    for (const delegatorEntry of bid.bid.delegators) {
                        // Delegator info can be in nested 'delegator' object or at top level
                        const delegatorData = delegatorEntry.delegator || delegatorEntry;
                        const delegatorKey = delegatorEntry.delegator_public_key;

                        if (delegatorKey === pubKeyHex) {
                            const stakedAmountMotes = BigInt(delegatorData.staked_amount);
                            const stakedAmountCspr = (Number(stakedAmountMotes) / 1_000_000_000).toFixed(9);

                            delegations.push({
                                validator: bid.public_key,
                                stakedAmount: stakedAmountCspr,
                                stakedAmountMotes: delegatorData.staked_amount,
                                delegationRate: bid.bid.delegation_rate,
                                bondingPurse: delegatorData.bonding_purse,
                                validatorExplorerUrl: `https://cspr.live/validator/${bid.public_key}`
                            });

                            totalStaked += stakedAmountMotes;
                        }
                    }
                }
            }

            const totalStakedCspr = (Number(totalStaked) / 1_000_000_000).toFixed(9);

            console.error(`Found ${delegations.length} delegations with total ${totalStakedCspr} CSPR staked`);

            return {
                success: true,
                publicKey: pubKeyHex,
                accountHash: accountHash,
                totalStaked: totalStakedCspr,
                totalStakedMotes: totalStaked.toString(),
                validatorCount: delegations.length,
                delegations: delegations,
                explorerUrl: `https://cspr.live/account/${pubKeyHex}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get detailed validator information from Casper Network
     *
     * Queries the auction system to retrieve comprehensive validator details including
     * stake amounts, delegation rate, delegator count, and performance metrics.
     *
     * @param {string} validatorPublicKey - Validator's public key in hexadecimal format
     * @returns {Object} Validator information result
     * @returns {boolean} result.success - Operation success status
     * @returns {string} result.publicKey - Validator public key
     * @returns {string} result.name - Validator name (from local database if available)
     * @returns {string} result.selfStake - Validator's self-staked amount in CSPR
     * @returns {string} result.selfStakeMotes - Validator's self-staked amount in motes
     * @returns {number} result.delegationRate - Commission rate (%)
     * @returns {number} result.delegatorsCount - Number of delegators
     * @returns {string} result.totalDelegated - Total amount delegated by others in CSPR
     * @returns {string} result.totalDelegatedMotes - Total amount delegated in motes
     * @returns {string} result.totalStake - Combined self-stake + delegations in CSPR
     * @returns {string} result.totalStakeMotes - Combined total in motes
     * @returns {string} result.bondingPurse - Bonding purse URef
     * @returns {boolean} result.isActive - Whether validator is active
     * @returns {string} result.explorerUrl - Direct link to validator on cspr.live
     * @returns {string} result.timestamp - ISO timestamp of query
     */
    async getValidatorInfo(validatorPublicKey) {
        try {
            // Validate input
            if (!validatorPublicKey) {
                throw new Error('Validator public key is required');
            }

            console.error(`Querying validator info for: ${validatorPublicKey}`);

            // Query auction info using direct RPC call
            const rpcRequest = {
                jsonrpc: '2.0',
                method: 'state_get_auction_info',
                params: {},
                id: 1
            };

            // Prepare headers with API key if available
            const headers = { 'Content-Type': 'application/json' };
            if (this.apiKey) {
                headers['Authorization'] = this.apiKey;
            }

            const response = await axios.post(this.rpcUrl, rpcRequest, {
                headers: headers
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
            }

            // Extract auction state from response
            const auctionState = response.data.result.auction_state;

            // Find the validator's bid
            const validatorBid = auctionState.bids.find(b => b.public_key === validatorPublicKey);

            if (!validatorBid) {
                throw new Error('Validator not found in auction state. The validator may be inactive or the public key is incorrect.');
            }

            const bid = validatorBid.bid;

            // Calculate self-stake
            const selfStakeMotes = BigInt(bid.staked_amount);
            const selfStakeCspr = (Number(selfStakeMotes) / 1_000_000_000).toFixed(9);

            // Calculate total delegated amount
            let totalDelegatedMotes = BigInt(0);
            const delegatorsCount = bid.delegators ? bid.delegators.length : 0;

            if (bid.delegators) {
                for (const delegatorEntry of bid.delegators) {
                    const delegatorData = delegatorEntry.delegator || delegatorEntry;
                    totalDelegatedMotes += BigInt(delegatorData.staked_amount);
                }
            }

            const totalDelegatedCspr = (Number(totalDelegatedMotes) / 1_000_000_000).toFixed(9);

            // Calculate total stake (self + delegated)
            const totalStakeMotes = selfStakeMotes + totalDelegatedMotes;
            const totalStakeCspr = (Number(totalStakeMotes) / 1_000_000_000).toFixed(9);

            // Try to get validator name from local database
            const { getValidatorByPublicKey } = require('./validators.js');
            const validatorData = getValidatorByPublicKey(validatorPublicKey);
            const validatorName = validatorData ? validatorData.name : 'Unknown';

            console.error(`Validator found: ${validatorName} - ${delegatorsCount} delegators, ${totalStakeCspr} CSPR total stake`);

            return {
                success: true,
                publicKey: validatorPublicKey,
                name: validatorName,
                selfStake: selfStakeCspr,
                selfStakeMotes: bid.staked_amount,
                delegationRate: bid.delegation_rate,
                delegatorsCount: delegatorsCount,
                totalDelegated: totalDelegatedCspr,
                totalDelegatedMotes: totalDelegatedMotes.toString(),
                totalStake: totalStakeCspr,
                totalStakeMotes: totalStakeMotes.toString(),
                bondingPurse: bid.bonding_purse,
                isActive: true,
                explorerUrl: `https://cspr.live/validator/${validatorPublicKey}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }
}

module.exports = ToolsAPI;
