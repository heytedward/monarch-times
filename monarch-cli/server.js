import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { verifySignature, loadDossier } from './dossier.js';
import chalk from 'chalk';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Storage for notarized intel
const notaryDir = path.join(os.homedir(), '.monarch', 'notary');
if (!fs.existsSync(notaryDir)) {
  fs.mkdirSync(notaryDir, { recursive: true });
}

// In-memory registry of verified agents (in production, use a database)
const agentRegistry = new Map();

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
function registerAgent(publicKey, agentName, agentId) {
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
function getAgentInfo(publicKey) {
  return agentRegistry.get(publicKey);
}

// ============ API ENDPOINTS ============

/**
 * POST /api/register
 * Register a new agent dossier with the backend
 * Body: { agentName, publicKey, agentId, identity }
 */
app.post('/api/register', (req, res) => {
  const { agentName, publicKey, agentId, identity } = req.body;

  if (!agentName || !publicKey || !agentId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: agentName, publicKey, agentId',
    });
  }

  // Check if already registered
  if (agentRegistry.has(publicKey)) {
    return res.status(409).json({
      success: false,
      error: 'Agent already registered',
    });
  }

  registerAgent(publicKey, agentName, agentId);

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
app.post('/api/notarize', (req, res) => {
  const { agentName, publicKey, data, signature, metadata } = req.body;

  // Validate request
  if (!agentName || !publicKey || !data || !signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: agentName, publicKey, data, signature',
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
  const agentInfo = getAgentInfo(publicKey);
  if (!agentInfo || agentInfo.status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      error: 'Agent not verified or inactive',
    });
  }

  // Create notarization record
  const notaryId = `NOT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const notarization = {
    notaryId,
    agentName,
    agentId: agentInfo.id,
    publicKey,
    data,
    signature,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
    chain: 'solana',
    status: 'NOTARIZED',
  };

  // Store notarization
  const notaryFile = path.join(notaryDir, `${notaryId}.json`);
  fs.writeFileSync(notaryFile, JSON.stringify(notarization, null, 2));

  // Update agent stats
  agentInfo.notarizations += 1;

  res.json({
    success: true,
    message: 'Intel notarized successfully',
    notary: {
      id: notaryId,
      timestamp: notarization.timestamp,
      chain: 'solana',
      status: 'NOTARIZED',
    },
  });
});

/**
 * POST /api/verify
 * Verify a dossier or notarization
 * Body: { publicKey, notaryId? }
 */
app.post('/api/verify', (req, res) => {
  const { publicKey, notaryId } = req.body;

  // Verify agent exists
  const agentInfo = getAgentInfo(publicKey);
  if (!agentInfo) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found in registry',
    });
  }

  // If checking specific notarization
  if (notaryId) {
    const notaryFile = path.join(notaryDir, `${notaryId}.json`);
    if (!fs.existsSync(notaryFile)) {
      return res.status(404).json({
        success: false,
        error: 'Notarization not found',
      });
    }
    const notarization = JSON.parse(fs.readFileSync(notaryFile, 'utf-8'));
    if (notarization.publicKey !== publicKey) {
      return res.status(403).json({
        success: false,
        error: 'Notarization does not belong to this agent',
      });
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

  // Verify agent/dossier
  res.json({
    success: true,
    verified: true,
    agent: {
      name: agentInfo.name,
      id: agentInfo.id,
      publicKey,
      status: agentInfo.status,
      notarizations: agentInfo.notarizations,
    },
  });
});

/**
 * GET /api/status/:agentName
 * Check agent status
 */
app.get('/api/status/:agentName', (req, res) => {
  const { agentName } = req.params;

  // Find agent by name
  let agentInfo = null;
  for (const [, info] of agentRegistry.entries()) {
    if (info.name === agentName) {
      agentInfo = info;
      break;
    }
  }

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
      notarizations: agentInfo.notarizations,
      registeredAt: agentInfo.registeredAt,
    },
  });
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
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Monarch Authentication Server',
    version: '1.0.0',
    registeredAgents: agentRegistry.size,
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

app.listen(PORT, () => {
  console.log(chalk.magenta.bold('\n🦋 MONARCH AUTHENTICATION SERVER'));
  console.log(chalk.black.bgWhite(' STATUS: NOTARY_ONLINE \n'));
  console.log(chalk.cyan(`Server running on http://localhost:${PORT}`));
  console.log(chalk.gray(`Health check: http://localhost:${PORT}/health\n`));
});
