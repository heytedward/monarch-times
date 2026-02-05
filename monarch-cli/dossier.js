import fs from 'fs';
import path from 'path';
import os from 'os';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const dossierDir = path.join(os.homedir(), '.monarch', 'dossiers');

// Ensure dossier directory exists
export function ensureDossierDir() {
  if (!fs.existsSync(dossierDir)) {
    fs.mkdirSync(dossierDir, { recursive: true });
  }
}

// Generate a keypair for the agent (Ed25519)
export function generateKeypair() {
  const keypair = nacl.sign.keyPair();
  return {
    publicKey: bs58.encode(keypair.publicKey),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

// Create a dossier file for an agent
export function createDossier(agentName, identity, backendUrl = process.env.SOLAUTH_API_URL || 'http://localhost:4000') {
  ensureDossierDir();

  const keypair = generateKeypair();
  const dossierPath = path.join(dossierDir, `${agentName}.dossier.json`);

  const dossier = {
    // Agent Identification
    agent: {
      name: agentName,
      id: generateAgentId(),
      identity: identity,
      version: '1.0.0',
    },
    // Cryptographic Keys
    cryptography: {
      algorithm: 'ed25519',
      publicKey: keypair.publicKey,
      secretKey: keypair.secretKey, // Stored locally - NEVER sent to server
      createdAt: new Date().toISOString(),
    },
    // Backend Configuration (SolAuth Server)
    backend: {
      apiUrl: backendUrl,
      endpoints: {
        notarize: '/api/notarize',
        verify: '/api/verify',
        status: '/api/status',
      },
      timeout: 30000,
    },
    // SolAuth Configuration
    solauth: {
      chain: 'solana',
      network: 'mainnet-beta',
      crossChain: {
        supported: ['ethereum', 'polygon', 'arbitrum'],
        enabled: false,
      },
    },
    // Security & Metadata
    security: {
      tlsVerify: true,
      pinCertificate: null, // Can be set for certificate pinning
      refreshTokenIntervalDays: 30,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: 'ACTIVE',
      environment: 'production',
    },
  };

  // Write dossier to secure location
  fs.writeFileSync(dossierPath, JSON.stringify(dossier, null, 2), { mode: 0o600 });

  return {
    path: dossierPath,
    dossier: dossier,
    publicKey: keypair.publicKey,
  };
}

// Load a dossier file
export function loadDossier(agentName) {
  const dossierPath = path.join(dossierDir, `${agentName}.dossier.json`);

  if (!fs.existsSync(dossierPath)) {
    throw new Error(`Dossier not found for agent: ${agentName}`);
  }

  const content = fs.readFileSync(dossierPath, 'utf-8');
  return JSON.parse(content);
}

// Sign data with agent's private key
export function signData(agentName, data) {
  const dossier = loadDossier(agentName);
  const secretKeyRaw = bs58.decode(dossier.cryptography.secretKey);
  const message = typeof data === 'string' ? Buffer.from(data) : Buffer.from(JSON.stringify(data));

  const signature = nacl.sign.detached(message, secretKeyRaw);
  return bs58.encode(signature);
}

// Verify signature (used by backend)
export function verifySignature(publicKeyBase58, message, signatureBase58) {
  try {
    const publicKey = bs58.decode(publicKeyBase58);
    const messageBuffer = typeof message === 'string' ? Buffer.from(message) : Buffer.from(JSON.stringify(message));
    const signature = bs58.decode(signatureBase58);

    return nacl.sign.detached.verify(messageBuffer, signature, publicKey);
  } catch (err) {
    return false;
  }
}

// Generate unique agent ID
function generateAgentId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MONARCH-${timestamp}-${random}`;
}

// List all dossiers
export function listDossiers() {
  ensureDossierDir();
  try {
    const files = fs.readdirSync(dossierDir).filter(f => f.endsWith('.dossier.json'));
    return files.map(f => f.replace('.dossier.json', ''));
  } catch {
    return [];
  }
}

// Remove a dossier
export function removeDossier(agentName) {
  const dossierPath = path.join(dossierDir, `${agentName}.dossier.json`);
  if (fs.existsSync(dossierPath)) {
    fs.unlinkSync(dossierPath);
    return true;
  }
  return false;
}

// Export dossier public data (safe to share)
export function exportPublicDossier(agentName) {
  const dossier = loadDossier(agentName);
  return {
    agent: dossier.agent,
    cryptography: {
      algorithm: dossier.cryptography.algorithm,
      publicKey: dossier.cryptography.publicKey,
      createdAt: dossier.cryptography.createdAt,
    },
    backend: dossier.backend,
    metadata: dossier.metadata,
  };
}
