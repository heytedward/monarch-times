import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { verifySignature, loadDossier } from './dossier.js';
import chalk from 'chalk';
import * as db from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Check if database is configured
const USE_DATABASE = !!process.env.DATABASE_URL;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
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
 * GET /api/agents
 * List all registered agents
 */
app.get('/api/agents', async (req, res) => {
  try {
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
