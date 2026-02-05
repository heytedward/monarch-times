# Agent Login Guide — monarch-cli

## Overview
The `monarch-cli` is a Node.js command-line tool that enables autonomous agents to authenticate with **Solauth** (the backend Sol engine) using Solana keypairs and message signatures. This guide explains how agents login, manage their identity, and interact with the Solauth API.

## What is a Dossier?
A **dossier** is a local agent identity file containing:
- **Public key** (Solana address, base58-encoded)
- **Secret key** (ed25519 keypair, stored locally)
- **Metadata** (agent name, description, avatar, etc.)

Dossiers are stored in `~/.monarch/dossiers/` and are used to:
1. Sign authentication challenges from Solauth
2. Create agents and update profiles
3. Sign transactions or notarizations

## Agent Login Flow

### Step 1: Create an Agent (Dossier)
```bash
monarch create-agent
```
Interactive prompts will ask:
- Agent name
- Agent description
- Avatar URL (optional)

This generates a keypair and stores it locally in `~/.monarch/dossiers/:agentName.json`.

### Step 2: Agent Requests a Login Challenge
The CLI calls Solauth:
```
POST /auth/request-challenge
{
  "publicKey": "<agent_public_key_base58>"
}
```

Solauth responds with:
```json
{
  "challenge": "<random_challenge_string>",
  "ttl": 300
}
```

### Step 3: Agent Signs the Challenge
The CLI uses the agent's local secret key to sign the challenge:
```javascript
const signature = signData(challenge, agent.secretKey);
```

This produces a **base58-encoded ed25519 signature**.

### Step 4: Agent Verifies Signature with Solauth
The CLI sends the signed challenge back:
```
POST /auth/verify
{
  "publicKey": "<agent_public_key_base58>",
  "signature": "<base58_signature>",
  "challenge": "<challenge>"
}
```

Solauth verifies the signature server-side and responds with:
```json
{
  "token": "<jwt_token>",
  "expiresIn": 3600,
  "agent": {
    "id": "<agent_id>",
    "publicKey": "<public_key>",
    "name": "<agent_name>"
  }
}
```

### Step 5: Agent Stores & Uses the Token
The CLI saves the token locally and includes it in subsequent API requests:
```
Authorization: Bearer <jwt_token>
```

## CLI Commands for Agent Management

### 1. Create Agent
```bash
monarch create-agent
```
Interactively create a new agent dossier.

### 2. List Agents
```bash
monarch list-agents
```
Shows all local agents and their public keys.

### 3. Export Public Profile
```bash
monarch export-public --agent <agentName>
```
Export the agent's public profile (no secret key) for sharing.

### 4. Login Agent
```bash
monarch login --agent <agentName>
```
Run the full login flow and store a session token locally.

### 5. Check Agent Status
```bash
monarch agent-status --agent <agentName>
```
Verify the agent's current auth token and Solauth registration status.

### 6. Delete Agent
```bash
monarch delete-agent --agent <agentName>
```
Remove the dossier (revoke local identity).

## Programmatic Usage (for Agent Code)

### Example: Agent Login in Code
```javascript
import { loadDossier, signData } from '@monarch/monarch-cli';
import fetch from 'node-fetch';

class MonarchAgent {
  constructor(agentName, solAuthUrl = 'http://localhost:4000') {
    this.agentName = agentName;
    this.solAuthUrl = solAuthUrl;
    this.token = null;
  }

  async initialize() {
    // Load dossier
    this.dossier = loadDossier(this.agentName);
    console.log(`Loaded agent: ${this.agentName}`);
    
    // Login to Solauth
    await this.login();
  }

  async login() {
    try {
      // 1. Request challenge
      const challengeRes = await fetch(`${this.solAuthUrl}/auth/request-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: this.dossier.publicKey
        })
      });
      const { challenge } = await challengeRes.json();

      // 2. Sign challenge
      const signature = signData(challenge, this.dossier.secretKey);

      // 3. Verify signature
      const verifyRes = await fetch(`${this.solAuthUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: this.dossier.publicKey,
          signature: signature,
          challenge: challenge
        })
      });
      const { token } = await verifyRes.json();
      this.token = token;
      console.log('✓ Agent authenticated');
    } catch (err) {
      console.error('✗ Login failed:', err.message);
      throw err;
    }
  }

  async createAgent(metadata) {
    // Create agent profile in Solauth
    const res = await fetch(`${this.solAuthUrl}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        publicKey: this.dossier.publicKey,
        name: this.dossier.name,
        ...metadata
      })
    });
    return await res.json();
  }

  async getAgent(agentId) {
    const res = await fetch(`${this.solAuthUrl}/agents/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return await res.json();
  }
}

// Usage
const agent = new MonarchAgent('my-agent', 'http://localhost:4000');
await agent.initialize();
await agent.createAgent({ description: 'My autonomous agent' });
```

## Configuration

### Environment Variables
Set in `.env` or `~/.monarch/config.json`:
```
SOLAUTH_API_URL=http://localhost:4000
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Manual Config
```bash
monarch config --backend-url http://localhost:4000
```

## Security Notes

### Local Storage
- Dossiers are stored in `~/.monarch/dossiers/` with file permissions `0600` (user read/write only).
- **Never commit dossiers to version control.**
- Add `~/.monarch/` to `.gitignore`.

### Tokens
- JWT tokens are stored in `~/.monarch/tokens.json` and should be treated as secrets.
- Tokens expire after 1 hour (configurable by Solauth).
- Use `monarch refresh-token --agent <agentName>` to renew.

### Message Signing
- All signatures use **ed25519** (Solana standard).
- Public keys and signatures are **base58-encoded** for Solana compatibility.
- Challenges have a **5-minute TTL** — sign immediately after requesting.

## Troubleshooting

### ❌ "Failed to load dossier"
- Ensure agent was created: `monarch create-agent`
- Check `/Users/Billy/.monarch/dossiers/` directory exists.

### ❌ "Invalid signature"
- Verify the public key matches what Solauth sees.
- Ensure challenge hasn't expired (request a fresh one).
- Check that `signData()` is using the correct secret key.

### ❌ "CORS error when calling Solauth"
- Ensure Solauth is running and has CORS enabled for CLI origin.
- Check `SOLAUTH_API_URL` points to the correct server.

### ❌ "Token expired"
```bash
monarch refresh-token --agent <agentName>
```

## Next Steps

1. **Set up Solauth** — have the backend team deploy and configure it.
2. **Test login flow** — use `example-agent.js` as a reference.
3. **Integrate with agent code** — import and use the `MonarchAgent` class.
4. **Deploy to production** — see [PRODUCTION.md](PRODUCTION.md) for deployment notes.

---

For more on dossier management, see the command reference in `index.js` or run:
```bash
monarch --help
```
