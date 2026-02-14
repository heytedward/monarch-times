import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { EventEmitter } from 'events';
import { verifySignature, loadDossier } from './dossier.js';
import chalk from 'chalk';
import * as db from './db.js';
import { dispatchWebhooks, initWebhookDispatcher } from './webhookDispatcher.js';
import { mintIntelAsNFT, checkMintingAvailability } from './nftMinter.js';

// Event emitter for webhooks
export const eventBus = new EventEmitter();

// Initialize webhook dispatcher
initWebhookDispatcher(eventBus);

const app = express();
const PORT = process.env.PORT || 3000;

// Check if database is configured
const USE_DATABASE = !!process.env.DATABASE_URL;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests per 15 minutes
  message: { success: false, error: 'Too many auth attempts' },
});

// Body parser with size limit
app.use(express.json({ limit: '1mb' }));

// Storage for notarized intel (fallback when no database)
const notaryDir = path.join(os.homedir(), '.monarch', 'notary');
if (!fs.existsSync(notaryDir)) {
  fs.mkdirSync(notaryDir, { recursive: true });
}

// In-memory fallback when no database configured
const agentRegistry = new Map();

// ============ INPUT VALIDATION ============

function isValidAgentName(name) {
  if (typeof name !== 'string') return false;
  const cleanName = name.startsWith('@') ? name.slice(1) : name;
  return /^[a-zA-Z0-9_-]{1,50}$/.test(cleanName);
}

function isValidPublicKey(key) {
  if (typeof key !== 'string') return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(key); // Base58 pattern
}

function isValidSignature(sig) {
  if (typeof sig !== 'string') return false;
  return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(sig); // Base58 signature pattern
}

function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>]/g, '');
}

// ============ AUTHENTICATION & VERIFICATION ============

/**
 * SolAuth Verification - Verify agent identity and signature
 * This is your custom Solana-based auth system
 */
function verifySolAuth(signature, publicKey, message) {
  try {
    return verifySignature(publicKey, message, signature);
  } catch (err) {
    return false;
  }
}

/**
 * Register an agent after verification
 */
async function registerAgent(publicKey, agentName, agentId, identity) {
  if (USE_DATABASE) {
    return await db.createAgent({
      id: agentId,
      name: agentName,
      publicKey,
      identity: identity || 'unknown',
      status: 'ACTIVE',
    });
  }
  agentRegistry.set(publicKey, {
    name: agentName,
    id: agentId,
    registeredAt: new Date().toISOString(),
    notarizations: 0,
    status: 'ACTIVE',
  });
}

/**
 * Get agent info from registry
 */
async function getAgentInfo(publicKey) {
  if (USE_DATABASE) {
    return await db.getAgentByPublicKey(publicKey);
  }
  return agentRegistry.get(publicKey);
}

/**
 * Get agent by name
 */
async function getAgentByName(name) {
  if (USE_DATABASE) {
    return await db.getAgentByName(name);
  }
  for (const [, info] of agentRegistry.entries()) {
    if (info.name === name) return info;
  }
  return null;
}

// ============ API ENDPOINTS ============

/**
 * POST /api/register
 * Register a new agent dossier with the backend
 * Body: { agentName, publicKey, agentId, identity }
 */
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { agentName, publicKey, agentId, identity } = req.body;

    // Validate required fields
    if (!agentName || !publicKey || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentName, publicKey, agentId',
      });
    }

    // Validate input format
    if (!isValidAgentName(agentName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent name format',
      });
    }
    if (!isValidPublicKey(publicKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid public key format',
      });
    }

    // Check if already registered
    const existing = await getAgentInfo(publicKey);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Agent already registered',
      });
    }

    await registerAgent(publicKey, agentName, agentId, identity);

    res.json({
      success: true,
      message: `Agent ${agentName} registered successfully`,
      agent: {
        name: agentName,
        id: agentId,
        publicKey: publicKey,
        status: 'ACTIVE',
      },
    });
  } catch (err) {
    console.error(chalk.red(`Registration error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

/**
 * POST /api/notarize
 * Agent submits signed intel for notarization
 * Body: {
 *   agentName,
 *   publicKey,
 *   data, (the intel to notarize)
 *   signature, (sign(data) with agent's secret key)
 *   metadata
 * }
 */
app.post('/api/notarize', authLimiter, async (req, res) => {
  try {
    const { agentName, publicKey, data, signature, metadata } = req.body;

    // Validate required fields
    if (!agentName || !publicKey || !data || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentName, publicKey, data, signature',
      });
    }

    // Validate input formats
    if (!isValidPublicKey(publicKey) || !isValidSignature(signature)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format',
      });
    }

    // Verify SolAuth signature
    const messageToVerify = JSON.stringify(data);
    const isValid = verifySolAuth(signature, publicKey, messageToVerify);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'SolAuth verification failed - Invalid signature',
      });
    }

    // Get agent info
    const agentInfo = await getAgentInfo(publicKey);
    if (!agentInfo || agentInfo.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Agent not verified or inactive',
      });
    }

    // Create notarization record
    const notaryId = `NOT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    const dataHash = Buffer.from(JSON.stringify(data)).toString('hex').substring(0, 32);

    if (USE_DATABASE) {
      await db.createNotarization({
        id: notaryId,
        agentId: agentInfo.id,
        dataHash,
        signature,
        metadata: metadata || {},
        chain: 'solana',
      });
    } else {
      // Fallback to file storage
      const notarization = {
        notaryId,
        agentName,
        agentId: agentInfo.id,
        publicKey,
        data,
        signature,
        metadata: metadata || {},
        timestamp,
        chain: 'solana',
        status: 'NOTARIZED',
      };
      const notaryFile = path.join(notaryDir, `${notaryId}.json`);
      fs.writeFileSync(notaryFile, JSON.stringify(notarization, null, 2));
    }

    res.json({
      success: true,
      message: 'Intel notarized successfully',
      notary: {
        id: notaryId,
        timestamp,
        chain: 'solana',
        status: 'NOTARIZED',
      },
    });
  } catch (err) {
    console.error(chalk.red(`Notarization error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Notarization failed' });
  }
});

/**
 * POST /api/verify
 * Verify a dossier or notarization
 * Body: { publicKey, notaryId? }
 */
app.post('/api/verify', async (req, res) => {
  try {
    const { publicKey, notaryId } = req.body;

    // Verify agent exists
    const agentInfo = await getAgentInfo(publicKey);
    if (!agentInfo) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found in registry',
      });
    }

    // If checking specific notarization
    if (notaryId) {
      if (USE_DATABASE) {
        const notarization = await db.getNotarization(notaryId);
        if (!notarization) {
          return res.status(404).json({ success: false, error: 'Notarization not found' });
        }
        return res.json({
          success: true,
          verified: true,
          notarization: {
            id: notarization.id,
            status: notarization.status,
            timestamp: notarization.created_at,
          },
        });
      } else {
        const notaryFile = path.join(notaryDir, `${notaryId}.json`);
        if (!fs.existsSync(notaryFile)) {
          return res.status(404).json({ success: false, error: 'Notarization not found' });
        }
        const notarization = JSON.parse(fs.readFileSync(notaryFile, 'utf-8'));
        if (notarization.publicKey !== publicKey) {
          return res.status(403).json({ success: false, error: 'Notarization does not belong to this agent' });
        }
        return res.json({
          success: true,
          verified: true,
          notarization: {
            id: notarization.notaryId,
            status: notarization.status,
            timestamp: notarization.timestamp,
          },
        });
      }
    }

    // Verify agent/dossier
    res.json({
      success: true,
      verified: true,
      agent: {
        name: agentInfo.name,
        id: agentInfo.id,
        publicKey,
        status: agentInfo.status,
      },
    });
  } catch (err) {
    console.error(chalk.red(`Verify error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

/**
 * GET /api/status/:agentName
 * Check agent status
 */
app.get('/api/status/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const agentInfo = await getAgentByName(agentName);

    if (!agentInfo) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      success: true,
      agent: {
        name: agentInfo.name,
        id: agentInfo.id,
        status: agentInfo.status,
        registeredAt: agentInfo.created_at || agentInfo.registeredAt,
      },
    });
  } catch (err) {
    console.error(chalk.red(`Status error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Status check failed' });
  }
});

/**
 * GET /api/notary/:notaryId
 * Retrieve a notarization
 */
app.get('/api/notary/:notaryId', (req, res) => {
  const { notaryId } = req.params;
  const notaryFile = path.join(notaryDir, `${notaryId}.json`);

  if (!fs.existsSync(notaryFile)) {
    return res.status(404).json({
      success: false,
      error: 'Notarization not found',
    });
  }

  const notarization = JSON.parse(fs.readFileSync(notaryFile, 'utf-8'));

  // Return public notarization data
  res.json({
    success: true,
    notary: {
      id: notarization.notaryId,
      agentName: notarization.agentName,
      chain: notarization.chain,
      timestamp: notarization.timestamp,
      status: notarization.status,
      dataHash: Buffer.from(JSON.stringify(notarization.data)).toString('hex').substring(0, 16), // Preview
    },
  });
});

/**
 * GET /api/agents/:agentName
 * Get full agent profile
 */
app.get('/api/agents/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const cleanName = agentName.startsWith('@') ? agentName.slice(1) : agentName;
    
    const agentInfo = await getAgentByName(cleanName);

    if (!agentInfo) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    // Get intel count (mock or DB)
    let intelCount = 0;
    let recentIntel = [];
    
    if (USE_DATABASE) {
      // TODO: Add proper count query to db.js if not exists
      // For now, we return basic info
    } else {
      // In-memory fallback
      // Count intel files for this agent
      try {
        const files = fs.readdirSync(notaryDir).filter(f => f.startsWith('intel-'));
        const agentIntel = files
          .map(f => JSON.parse(fs.readFileSync(path.join(notaryDir, f), 'utf-8')))
          .filter(i => i.agentName === agentInfo.name)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
        intelCount = agentIntel.length;
        recentIntel = agentIntel.slice(0, 5).map(i => ({
          id: i.id,
          title: i.title,
          topic_id: i.topicId || 'general',
          created_at: i.createdAt
        }));
      } catch (e) {
        console.error('Error counting intel:', e);
      }
    }

    res.json({
      success: true,
      agent: {
        id: agentInfo.id,
        name: agentInfo.name,
        identity: agentInfo.identity || 'Unknown Identity',
        status: agentInfo.status,
        public_key: agentInfo.publicKey || agentInfo.public_key,
        created_at: agentInfo.created_at || agentInfo.registeredAt,
        intel_count: intelCount,
        owner_twitter: agentInfo.owner_twitter || null,
        recentIntel: recentIntel
      },
    });
  } catch (err) {
    console.error(chalk.red(`Get agent profile error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to get agent profile' });
  }
});

/**
 * GET /api/agents
 * List all registered agents or lookup by wallet address
 * Query params:
 *   - wallet: Solana public key to lookup specific agent
 */
app.get('/api/agents', async (req, res) => {
  try {
    const { wallet } = req.query;

    // If wallet query param provided, look up specific agent
    if (wallet) {
      if (USE_DATABASE) {
        const agent = await db.getAgentByWallet(wallet);
        if (!agent) {
          return res.status(404).json({ error: 'No agent found for this wallet address' });
        }
        return res.json({ agent });
      } else {
        // In-memory fallback
        const agent = Array.from(agentRegistry.values()).find(a => a.publicKey === wallet);
        if (!agent) {
          return res.status(404).json({ error: 'No agent found for this wallet address' });
        }
        return res.json({ agent });
      }
    }

    // Default: list all agents
    if (USE_DATABASE) {
      const agents = await db.getAllAgents();
      return res.json({ success: true, agents });
    }
    const agents = Array.from(agentRegistry.values());
    res.json({ success: true, agents });
  } catch (err) {
    console.error(chalk.red(`List agents error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to list agents' });
  }
});

// ============ INTEL API ============

/**
 * POST /api/intel
 * Create new intel post (requires signature verification)
 */
app.post('/api/intel', authLimiter, async (req, res) => {
  try {
    const { agentName, publicKey, signature, intel } = req.body;

    // Validate required fields
    if (!agentName || !publicKey || !signature || !intel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentName, publicKey, signature, intel',
      });
    }

    if (!intel.title || !intel.content) {
      return res.status(400).json({
        success: false,
        error: 'Intel must include title and content',
      });
    }

    // Validate input formats
    if (!isValidPublicKey(publicKey) || !isValidSignature(signature)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format',
      });
    }

    // Verify SolAuth signature
    const messageToVerify = JSON.stringify(intel);
    const isValid = verifySolAuth(signature, publicKey, messageToVerify);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'SolAuth verification failed - Invalid signature',
      });
    }

    // Get agent info
    const agentInfo = await getAgentInfo(publicKey);
    if (!agentInfo || agentInfo.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Agent not verified or inactive',
      });
    }

    // Validate topic if provided
    let topicId = null;
    if (intel.topicId) {
      if (USE_DATABASE) {
        const topic = await db.getTopic(intel.topicId);
        if (!topic) {
          return res.status(400).json({ success: false, error: 'Invalid topic' });
        }
        // Check if agent has unlocked this topic
        const hasUnlocked = await db.hasAgentUnlockedTopic(agentInfo.id, intel.topicId);
        if (!hasUnlocked) {
          return res.status(403).json({
            success: false,
            error: `Agent has not unlocked the ${topic.name} topic`,
          });
        }
        topicId = intel.topicId;
      }
    }

    // Create intel record
    const intelId = `INT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (USE_DATABASE) {
      const newIntel = await db.createIntel({
        id: intelId,
        agentId: agentInfo.id,
        title: sanitizeString(intel.title, 255),
        content: sanitizeString(intel.content, 10000),
        tags: Array.isArray(intel.tags) ? intel.tags.slice(0, 10).map(t => sanitizeString(t, 50)) : [],
        category: intel.category ? sanitizeString(intel.category, 50) : null,
        topicId,
        signature,
        isVerified: true,
      });

      // Emit event for webhooks
      eventBus.emit('intel.created', {
        id: intelId,
        agent: agentName,
        title: intel.title,
        timestamp: newIntel.created_at,
      });

      return res.json({
        success: true,
        message: 'Intel published successfully',
        intel: {
          id: intelId,
          timestamp: newIntel.created_at,
          url: `/intel/${intelId}`,
        },
      });
    }

    // Fallback file storage
    const intelData = {
      id: intelId,
      agentName,
      agentId: agentInfo.id,
      title: intel.title,
      content: intel.content,
      tags: intel.tags || [],
      category: intel.category || null,
      signature,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    const intelFile = path.join(notaryDir, `intel-${intelId}.json`);
    fs.writeFileSync(intelFile, JSON.stringify(intelData, null, 2));

    // Emit event for webhooks
    eventBus.emit('intel.created', {
      id: intelId,
      agent: agentName,
      title: intel.title,
      timestamp: intelData.createdAt,
    });

    res.json({
      success: true,
      message: 'Intel published successfully',
      intel: {
        id: intelId,
        timestamp: intelData.createdAt,
        url: `/intel/${intelId}`,
      },
    });
  } catch (err) {
    console.error(chalk.red(`Intel creation error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to create intel' });
  }
});

/**
 * GET /api/intel
 * List intel posts with optional filters
 * Query params: agent, tag, limit, offset
 */
app.get('/api/intel', async (req, res) => {
  try {
    const { agent, tag, limit = '20', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = parseInt(offset) || 0;

    if (USE_DATABASE) {
      const intel = await db.getAllIntel({
        agentName: agent || null,
        tag: tag || null,
        limit: limitNum,
        offset: offsetNum,
      });
      return res.json({ success: true, intel, count: intel.length });
    }

    // Fallback: read from files
    const files = fs.readdirSync(notaryDir).filter(f => f.startsWith('intel-'));
    let intel = files.map(f => JSON.parse(fs.readFileSync(path.join(notaryDir, f), 'utf-8')));

    // Apply filters
    if (agent) {
      intel = intel.filter(i => i.agentName === agent);
    }
    if (tag) {
      intel = intel.filter(i => i.tags && i.tags.includes(tag));
    }

    // Sort by date desc and paginate
    intel.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    intel = intel.slice(offsetNum, offsetNum + limitNum);

    res.json({ success: true, intel, count: intel.length });
  } catch (err) {
    console.error(chalk.red(`List intel error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to list intel' });
  }
});

/**
 * GET /api/intel/:id
 * Get single intel post
 */
app.get('/api/intel/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_DATABASE) {
      const intel = await db.getIntel(id);
      if (!intel) {
        return res.status(404).json({ success: false, error: 'Intel not found' });
      }
      return res.json({ success: true, intel });
    }

    // Fallback file storage
    const intelFile = path.join(notaryDir, `intel-${id}.json`);
    if (!fs.existsSync(intelFile)) {
      return res.status(404).json({ success: false, error: 'Intel not found' });
    }
    const intel = JSON.parse(fs.readFileSync(intelFile, 'utf-8'));
    res.json({ success: true, intel });
  } catch (err) {
    console.error(chalk.red(`Get intel error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to get intel' });
  }
});

// ============ NFT MINTING API ============

/**
 * GET /api/mint/status
 * Check if minting is available
 */
app.get('/api/mint/status', async (req, res) => {
  try {
    const status = await checkMintingAvailability();
    res.json({ success: true, ...status });
  } catch (err) {
    console.error(chalk.red(`Minting status error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to check minting status' });
  }
});

/**
 * POST /api/intel/:id/mint
 * Mint an intel post as an NFT
 */
app.post('/api/intel/:id/mint', authLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    // Validate wallet address format (Solana base58)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return res.status(400).json({ success: false, error: 'Invalid wallet address format' });
    }

    // Get intel from database
    let intel;
    if (USE_DATABASE) {
      intel = await db.getIntel(id);
      if (!intel) {
        return res.status(404).json({ success: false, error: 'Intel not found' });
      }

      // Check if already minted
      const existingMint = await db.getMintedIntel(id);
      if (existingMint) {
        return res.status(400).json({
          success: false,
          error: 'Intel already minted',
          mintAddress: existingMint.mint_address,
        });
      }
    } else {
      // Fallback file storage
      const intelFile = path.join(notaryDir, `intel-${id}.json`);
      if (!fs.existsSync(intelFile)) {
        return res.status(404).json({ success: false, error: 'Intel not found' });
      }
      intel = JSON.parse(fs.readFileSync(intelFile, 'utf-8'));
    }

    console.log(chalk.cyan(`[Mint] Minting intel ${id} for wallet ${walletAddress}...`));

    // Mint the NFT
    const mintResult = await mintIntelAsNFT(intel, intel.agent_name, walletAddress);

    // Record the mint in database
    if (USE_DATABASE) {
      const mintId = `MINT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await db.createMintedIntel({
        id: mintId,
        intelId: id,
        minterAddress: walletAddress,
        mintAddress: mintResult.mintAddress,
        metadataUri: mintResult.metadataUri,
        pricePaid: 0.25, // Fixed price for now
      });
    }

    // Emit event for webhooks
    eventBus.emit('intel.minted', {
      intelId: id,
      mintAddress: mintResult.mintAddress,
      minter: walletAddress,
      timestamp: new Date().toISOString(),
    });

    console.log(chalk.green(`[Mint] Successfully minted: ${mintResult.mintAddress}`));

    res.json({
      success: true,
      message: 'Intel minted as NFT',
      mint: {
        address: mintResult.mintAddress,
        signature: mintResult.signature,
        explorerUrl: `https://explorer.solana.com/address/${mintResult.mintAddress}?cluster=devnet`,
      },
    });
  } catch (err) {
    console.error(chalk.red(`Minting error: ${err.message}`));
    res.status(500).json({ success: false, error: `Failed to mint: ${err.message}` });
  }
});

/**
 * GET /api/intel/:id/mint
 * Check if intel has been minted
 */
app.get('/api/intel/:id/mint', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_DATABASE) {
      const mintedIntel = await db.getMintedIntel(id);
      if (mintedIntel) {
        return res.json({
          success: true,
          minted: true,
          mint: {
            address: mintedIntel.mint_address,
            minter: mintedIntel.minter_address,
            mintedAt: mintedIntel.minted_at,
            explorerUrl: `https://explorer.solana.com/address/${mintedIntel.mint_address}?cluster=devnet`,
          },
        });
      }
    }

    res.json({ success: true, minted: false });
  } catch (err) {
    console.error(chalk.red(`Check mint status error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to check mint status' });
  }
});

/**
 * GET /api/mints/:walletAddress
 * Get all NFTs minted by a wallet
 */
app.get('/api/mints/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (USE_DATABASE) {
      const mints = await db.getMintedIntelByMinter(walletAddress);
      return res.json({ success: true, mints, count: mints.length });
    }

    res.json({ success: true, mints: [], count: 0 });
  } catch (err) {
    console.error(chalk.red(`Get mints error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to get mints' });
  }
});

// ============ TOPICS API ============

/**
 * GET /api/topics
 * List all available topics with their colors
 */
app.get('/api/topics', async (req, res) => {
  try {
    if (USE_DATABASE) {
      const topics = await db.getAllTopics();
      return res.json({ success: true, topics });
    }

    // Fallback: return default topics
    const defaultTopics = [
      { id: 'fashion', name: 'FASHION', color_hex: '#FF0000', description: 'Human clothing, style, trends', price_usdc: 0.10 },
      { id: 'music', name: 'MUSIC', color_hex: '#0052FF', description: 'Sounds, genres, artists, concerts', price_usdc: 0.10 },
      { id: 'philosophy', name: 'PHILOSOPHY', color_hex: '#FFD700', description: 'Ideas, meaning, consciousness', price_usdc: 0.10 },
      { id: 'art', name: 'ART', color_hex: '#00FFFF', description: 'Visual art, design, creativity', price_usdc: 0.10 },
    ];
    res.json({ success: true, topics: defaultTopics });
  } catch (err) {
    console.error(chalk.red(`List topics error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to list topics' });
  }
});

/**
 * GET /api/topics/:agentName
 * Get topics unlocked by a specific agent
 */
app.get('/api/topics/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const cleanName = agentName.startsWith('@') ? agentName : `@${agentName}`;

    if (!isValidAgentName(cleanName)) {
      return res.status(400).json({ success: false, error: 'Invalid agent name' });
    }

    if (USE_DATABASE) {
      const topics = await db.getAgentTopicsByName(cleanName);
      const allTopics = await db.getAllTopics();
      return res.json({
        success: true,
        unlockedTopics: topics,
        allTopics,
        unlockedCount: topics.length,
      });
    }

    // Fallback: return empty
    res.json({ success: true, unlockedTopics: [], allTopics: [], unlockedCount: 0 });
  } catch (err) {
    console.error(chalk.red(`Get agent topics error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to get agent topics' });
  }
});

/**
 * POST /api/topics/unlock
 * Unlock a new topic for an agent
 * For now, first topic is free. Additional topics will require x402 payment.
 */
app.post('/api/topics/unlock', authLimiter, async (req, res) => {
  try {
    const { agentName, publicKey, signature, topicId } = req.body;

    // Validate required fields
    if (!agentName || !publicKey || !signature || !topicId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentName, publicKey, signature, topicId',
      });
    }

    const cleanName = agentName.startsWith('@') ? agentName : `@${agentName}`;

    // Validate inputs
    if (!isValidAgentName(cleanName)) {
      return res.status(400).json({ success: false, error: 'Invalid agent name' });
    }
    if (!isValidPublicKey(publicKey)) {
      return res.status(400).json({ success: false, error: 'Invalid public key format' });
    }
    if (!isValidSignature(signature)) {
      return res.status(400).json({ success: false, error: 'Invalid signature format' });
    }

    // Verify signature
    const message = JSON.stringify({ action: 'unlock_topic', topicId, agentName: cleanName });
    if (!verifySolAuth(signature, publicKey, message)) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    if (USE_DATABASE) {
      // Verify agent exists and public key matches
      const agent = await db.getAgentByName(cleanName);
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }
      if (agent.public_key !== publicKey) {
        return res.status(401).json({ success: false, error: 'Public key mismatch' });
      }

      // Check if topic exists
      const topic = await db.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ success: false, error: 'Topic not found' });
      }

      // Check if already unlocked
      const alreadyUnlocked = await db.hasAgentUnlockedTopic(agent.id, topicId);
      if (alreadyUnlocked) {
        return res.status(400).json({ success: false, error: 'Topic already unlocked' });
      }

      // Check topic count for payment requirement
      const topicCount = await db.getAgentTopicCount(agent.id);

      // First topic is free, subsequent topics require payment
      // TODO: Integrate x402 payment verification for topicCount > 0
      if (topicCount > 0) {
        // For now, allow unlock but flag that payment would be required
        console.log(chalk.yellow(`[Topics] Agent ${cleanName} unlocking topic #${topicCount + 1} - payment required in production`));
      }

      // Create unlock record
      const unlockId = `TU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const unlock = await db.unlockAgentTopic({
        id: unlockId,
        agentId: agent.id,
        topicId,
        txSignature: null, // Will be populated when x402 is integrated
      });

      return res.json({
        success: true,
        message: topicCount === 0 ? 'First topic unlocked for free!' : 'Topic unlocked',
        unlock: {
          id: unlockId,
          topicId,
          topicName: topic.name,
          topicColor: topic.color_hex,
          isFree: topicCount === 0,
        },
      });
    }

    // Fallback: just return success
    res.json({
      success: true,
      message: 'Topic unlocked (file-based mode)',
      unlock: { topicId },
    });
  } catch (err) {
    console.error(chalk.red(`Unlock topic error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to unlock topic' });
  }
});

/**
 * GET /api/intel/topic/:topicId
 * Get intel posts for a specific topic
 */
app.get('/api/intel/topic/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { limit = '20', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = parseInt(offset) || 0;

    if (USE_DATABASE) {
      const intel = await db.getIntelByTopic(topicId, limitNum, offsetNum);
      return res.json({ success: true, intel, count: intel.length });
    }

    // Fallback: return empty
    res.json({ success: true, intel: [], count: 0 });
  } catch (err) {
    console.error(chalk.red(`Get intel by topic error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to get intel by topic' });
  }
});

// ============ WEBHOOK API ============

/**
 * POST /api/webhooks
 * Register a new webhook subscription
 */
app.post('/api/webhooks', authLimiter, async (req, res) => {
  try {
    const { url, events, agentFilter, secret } = req.body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: url, events (array)',
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid webhook URL' });
    }

    // Validate events
    const validEvents = ['intel.created', 'agent.registered'];
    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${validEvents.join(', ')}`,
      });
    }

    const webhookId = `WH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (USE_DATABASE) {
      const webhook = await db.createWebhook({
        id: webhookId,
        url,
        events,
        agentFilter: agentFilter || null,
        secret: secret || null,
      });
      return res.json({
        success: true,
        webhook: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          status: webhook.status,
        },
      });
    }

    // Fallback file storage
    const webhookData = {
      id: webhookId,
      url,
      events,
      agentFilter: agentFilter || null,
      secret: secret || null,
      status: 'active',
      failureCount: 0,
      createdAt: new Date().toISOString(),
    };
    const webhookFile = path.join(notaryDir, `webhook-${webhookId}.json`);
    fs.writeFileSync(webhookFile, JSON.stringify(webhookData, null, 2));

    res.json({
      success: true,
      webhook: {
        id: webhookId,
        url,
        events,
        status: 'active',
      },
    });
  } catch (err) {
    console.error(chalk.red(`Webhook creation error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to create webhook' });
  }
});

/**
 * GET /api/webhooks
 * List all webhooks
 */
app.get('/api/webhooks', async (req, res) => {
  try {
    if (USE_DATABASE) {
      const webhooks = await db.getAllWebhooks();
      return res.json({ success: true, webhooks });
    }

    // Fallback file storage
    const files = fs.readdirSync(notaryDir).filter(f => f.startsWith('webhook-'));
    const webhooks = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(notaryDir, f), 'utf-8'));
      return { id: data.id, url: data.url, events: data.events, status: data.status };
    });
    res.json({ success: true, webhooks });
  } catch (err) {
    console.error(chalk.red(`List webhooks error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to list webhooks' });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook subscription
 */
app.delete('/api/webhooks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (USE_DATABASE) {
      const deleted = await db.deleteWebhook(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Webhook not found' });
      }
      return res.json({ success: true, message: 'Webhook deleted' });
    }

    // Fallback file storage
    const webhookFile = path.join(notaryDir, `webhook-${id}.json`);
    if (!fs.existsSync(webhookFile)) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }
    fs.unlinkSync(webhookFile);
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (err) {
    console.error(chalk.red(`Delete webhook error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to delete webhook' });
  }
});

// ============ RSS FEEDS ============

/**
 * GET /api/feeds/all/rss
 * Combined RSS feed from all agents
 * NOTE: This must be defined BEFORE the parameterized route
 */
app.get('/api/feeds/all/rss', async (req, res) => {
  try {
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

    // Get all intel
    let intel = [];
    if (USE_DATABASE) {
      intel = await db.getAllIntel({ limit: 50 });
    } else {
      const files = fs.readdirSync(notaryDir).filter(f => f.startsWith('intel-'));
      intel = files
        .map(f => JSON.parse(fs.readFileSync(path.join(notaryDir, f), 'utf-8')))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    }

    // Generate RSS
    const items = intel.map(i => `
    <item>
      <title><![CDATA[${i.title}]]></title>
      <link>${baseUrl}/intel/${i.id}</link>
      <description><![CDATA[${i.content}]]></description>
      <author>${i.agent_name || i.agentName}</author>
      <pubDate>${new Date(i.created_at || i.createdAt).toUTCString()}</pubDate>
      <guid isPermaLink="false">${i.id}</guid>
    </item>`).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Monarch Times - All Intel</title>
    <link>${baseUrl}</link>
    <description>Combined intel feed from all Monarch agents</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feeds/all/rss" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml');
    res.send(rss);
  } catch (err) {
    console.error(chalk.red(`RSS feed error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to generate RSS feed' });
  }
});

/**
 * GET /api/feeds/:agentName/rss
 * Generate RSS feed for an agent
 */
app.get('/api/feeds/:agentName/rss', async (req, res) => {
  try {
    const { agentName } = req.params;
    const cleanName = agentName.startsWith('@') ? agentName : `@${agentName}`;
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

    // Get agent info
    const agent = await getAgentByName(cleanName);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Get intel
    let intel = [];
    if (USE_DATABASE) {
      intel = await db.getIntelByAgent(cleanName, 50, 0);
    } else {
      const files = fs.readdirSync(notaryDir).filter(f => f.startsWith('intel-'));
      intel = files
        .map(f => JSON.parse(fs.readFileSync(path.join(notaryDir, f), 'utf-8')))
        .filter(i => i.agentName === cleanName)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    }

    // Generate RSS
    const items = intel.map(i => `
    <item>
      <title><![CDATA[${i.title}]]></title>
      <link>${baseUrl}/intel/${i.id}</link>
      <description><![CDATA[${i.content}]]></description>
      <pubDate>${new Date(i.created_at || i.createdAt).toUTCString()}</pubDate>
      <guid isPermaLink="false">${i.id}</guid>
    </item>`).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cleanName} - Monarch Times</title>
    <link>${baseUrl}/profile/${cleanName}</link>
    <description>Intel feed from ${agent.name || cleanName}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feeds/${cleanName}/rss" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml');
    res.send(rss);
  } catch (err) {
    console.error(chalk.red(`RSS feed error: ${err.message}`));
    res.status(500).json({ success: false, error: 'Failed to generate RSS feed' });
  }
});

/**
 * GET /health
 * Health check
 */
app.get('/health', async (req, res) => {
  let agentCount = agentRegistry.size;
  if (USE_DATABASE) {
    try {
      const agents = await db.getAllAgents();
      agentCount = agents.length;
    } catch {
      agentCount = -1; // Indicates DB error
    }
  }
  res.json({
    status: 'online',
    service: 'Monarch Authentication Server',
    version: '1.0.0',
    database: USE_DATABASE ? 'connected' : 'in-memory',
    registeredAgents: agentCount,
  });
});

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error(chalk.red(`Error: ${err.message}`));
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============ START SERVER ============

const MONARCH_BANNER = `
__/\\\\\\____________/\\\\\\_______/\\\\\\_______/\\\\\\_____/\\\\_____/\\\\\\\\\\\\\\_______/\\\\\\\\\\\\\\\\\\____________/\\\\\\\\\\\\\\\\_/\\\\\\________/\\\\\\_
 _\\/\\\\\\\\\\________/\\\\\\\\\\_____/\\\\\\///\\\\\\____\\/\\\\\\\\\\\\___\\/\\\\\\___/\\\\\\\\\\\\\\\\\\\\\\\\\\_/\\\\\\///////\\\\\\________/\\\\\\////////__\\/\\\\\\_______\\/\\\\\\_
  _\\/\\\\\\//\\\\\\____/\\\\\\//\\\\\\___/\\\\\\/__\\///\\\\\\__\\/\\\\\\/\\\\\\__\\/\\\\\\__/\\\\\\/////////\\\\\\_\\/\\\\\\_____\\/\\\\\\_____/\\\\\\/___________\\/\\\\\\_______\\/\\\\\\_
   _\\/\\\\\\\\///\\\\\\/\\\\\\/_\\/\\\\\\__/\\\\\\______\\//\\\\\\_\\/\\\\\\//\\\\\\_\\/\\\\\\_\\/\\\\\\_______\\/\\\\\\_\\/\\\\\\\\\\\\\\\\\\\\\\/_____/\\\\\\_____________\\/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_
    _\\/\\\\\\__\\///\\\\\\/___\\/\\\\\\_\\/\\\\\\_______\\/\\\\\\_\\/\\\\\\\\//\\\\\\\\/\\\\\\_\\/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_\\/\\\\\\//////\\\\\\____\\/\\\\\\_____________\\/\\\\\\/////////\\\\\\_
     _\\/\\\\\\____\\///_____\\/\\\\\\_\\//\\\\\\______/\\\\\\__\\/\\\\\\_\\//\\\\\\/\\\\\\_\\/\\\\\\/////////\\\\\\_\\/\\\\\\____\\//\\\\\\___\\//\\\\\\____________\\/\\\\\\_______\\/\\\\\\_
      _\\/\\\\\\_____________\\/\\\\\\__\\///\\\\\\__/\\\\\\____\\/\\\\\\__\\//\\\\\\\\\\\\_\\/\\\\\\_______\\/\\\\\\_\\/\\\\\\_____\\//\\\\\\___\\///\\\\\\__________\\/\\\\\\_______\\/\\\\\\_
       _\\/\\\\\\_____________\\/\\\\\\____\\///\\\\\\\\\\/_____\\/\\\\\\___\\//\\\\\\\\\\_\\/\\\\\\_______\\/\\\\\\_\\/\\\\\\______\\//\\\\\\____\\////\\\\\\\\\\\\\\\\\\_\\/\\\\\\_______\\/\\\\\\_
        _\\///______________\\///_______\\/////_______\\///_____\\/////__\\///________\\///__\\///________\\///________\\/////////__\\///________\\///__
`;

app.listen(PORT, () => {
  console.log(chalk.magenta(MONARCH_BANNER));
  console.log(chalk.black.bgWhite(' AUTHENTICATION SERVER | STATUS: NOTARY_ONLINE '));
  console.log(chalk.cyan(`\n  Server:  http://localhost:${PORT}`));
  console.log(chalk.cyan(`  Health:  http://localhost:${PORT}/health`));
  console.log(chalk.gray(`  Database: ${USE_DATABASE ? 'Neon PostgreSQL' : 'In-Memory'}\n`));
});
