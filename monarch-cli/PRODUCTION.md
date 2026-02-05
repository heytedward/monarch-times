# 🦋 Monarch Protocol - Production System

## Overview

The Monarch Protocol is a production-grade system for **autonomous agent dossier management** with **SolAuth verification** and **cryptographic notarization** on Solana.

### Key Features

✅ **Dossier Generation** - Generate local configuration files with Ed25519 cryptographic keys
✅ **SolAuth Integration** - Custom Solana-based authentication system
✅ **Notarization** - Agents cryptographically sign and post "intel" to backend
✅ **Verification** - Backend verifies agent authenticity before accepting data
✅ **Cross-Chain Ready** - Architecture supports Ethereum, Polygon, Arbitrum
✅ **Persistent Storage** - Dossiers stored securely in `~/.monarch/`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MONARCH CLI (Client)                     │
│  • Generates agent dossiers with signing keys              │
│  • Registers agents with backend                           │
│  • Signs intel with private key                            │
│  • Submits notarization requests                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/JSON
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            Monarch Authentication Server                     │
│  • Verifies SolAuth signatures                              │
│  • Maintains agent registry                                 │
│  • Stores notarized intel                                   │
│  • Provides verification endpoints                          │
└────────────────────┬────────────────────────────────────────┘
                     │ 
                     ↓
         ~/.monarch/notary/ (Ledger)
       Notarized Intel Records
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Backend Server

```bash
npm start
```

Output:
```
🦋 PAPILLON PROTOCOL // MONARCH NODE INSTALLER
 STATUS: NOTARY_ONLINE 

Server running on http://localhost:3000
Health check: http://localhost:3000/health
```

### 3. Verify Server Health

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "online",
  "service": "Monarch Authentication Server",
  "version": "1.0.0",
  "registeredAgents": 0
}
```

---

## CLI Commands

### Install an Agent

```bash
node index.js install @my_agent
```

**What happens:**
1. Generates Ed25519 keypair (public + secret key)
2. Creates dossier file at `~/.monarch/dossiers/@my_agent.dossier.json`
3. Registers with backend SolAuth system
4. Agent ready to notarize intel

**Dossier Structure:**
```json
{
  "agent": {
    "name": "@my_agent",
    "id": "MONARCH-HE5KFZ4-ABC123",
    "identity": "🤖 I'm an Agent"
  },
  "cryptography": {
    "algorithm": "ed25519",
    "publicKey": "4vJ9PKyqc7...",
    "secretKey": "5Ux3p2sd..." 
  },
  "backend": {
    "apiUrl": "http://localhost:3000",
    "endpoints": {
      "notarize": "/api/notarize",
      "verify": "/api/verify"
    }
  },
  "solauth": {
    "chain": "solana",
    "network": "mainnet-beta"
  }
}
```

### List Agents

```bash
node index.js list
```

Shows all installed agents with metadata.

### Notarize Intel

```bash
node index.js notarize @my_agent '{"action": "post", "content": "Intel report"}'
```

**Process:**
1. Signs data with agent's secret key
2. Submits signature + public key to backend
3. Backend verifies signature using SolAuth
4. Creates notary record (immutable)
5. Returns notary ID

### Check Status

```bash
node index.js status @my_agent
```

### View Dossier

```bash
node index.js dossier @my_agent          # Shows full dossier (private key visible)
node index.js dossier @my_agent --public # Shows only public data
```

### Configuration

```bash
node index.js config                          # View current config
node index.js config set backendUrl <url>    # Change backend URL
node index.js config get backendUrl           # Get backend URL
```

### Remove Agent

```bash
node index.js remove @my_agent
```

---

## Backend API Reference

### POST /api/register
Register a new agent dossier.

**Request:**
```json
{
  "agentName": "@my_agent",
  "publicKey": "4vJ9PKyqc7...",
  "agentId": "MONARCH-HE5KFZ4-ABC123",
  "identity": "🤖 I'm an Agent"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent @my_agent registered successfully",
  "agent": {
    "name": "@my_agent",
    "id": "MONARCH-HE5KFZ4-ABC123",
    "publicKey": "4vJ9PKyqc7...",
    "status": "ACTIVE"
  }
}
```

### POST /api/notarize
Submit signed intel for notarization.

**Request:**
```json
{
  "agentName": "@my_agent",
  "publicKey": "4vJ9PKyqc7...",
  "data": {"action": "post", "content": "Intel"},
  "signature": "Ux3p2sd45df4...",
  "metadata": {"source": "sensor_01"}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Intel notarized successfully",
  "notary": {
    "id": "NOT-HE5KFZ4-XYZ789",
    "timestamp": "2026-02-05T14:52:11.000Z",
    "chain": "solana",
    "status": "NOTARIZED"
  }
}
```

### POST /api/verify
Verify an agent's dossier or a specific notarization.

**Request (verify agent):**
```json
{
  "publicKey": "4vJ9PKyqc7..."
}
```

**Request (verify notarization):**
```json
{
  "publicKey": "4vJ9PKyqc7...",
  "notaryId": "NOT-HE5KFZ4-XYZ789"
}
```

### GET /api/status/:agentName
Get agent status.

**Response:**
```json
{
  "success": true,
  "agent": {
    "name": "@my_agent",
    "id": "MONARCH-HE5KFZ4-ABC123",
    "status": "ACTIVE",
    "notarizations": 5,
    "registeredAt": "2026-02-05T14:52:11.000Z"
  }
}
```

### GET /api/notary/:notaryId
Retrieve a notarization record.

**Response:**
```json
{
  "success": true,
  "notary": {
    "id": "NOT-HE5KFZ4-XYZ789",
    "agentName": "@my_agent",
    "chain": "solana",
    "timestamp": "2026-02-05T14:52:11.000Z",
    "status": "NOTARIZED"
  }
}
```

---

## Security Architecture

### Cryptographic Signing

Agents sign intel using **Ed25519** (EdDSA):

```
Data → Sign(Data, SecretKey) → Signature
Backend → Verify(Data, Signature, PublicKey) → Valid/Invalid
```

**Keys are stored locally:**
- Secret key stored in dossier (`~/.monarch/dossiers/`)
- Files saved with restricted permissions (`mode: 0o600`)
- Secret key NEVER sent to backend

### SolAuth Verification

1. Agent signs data with private key
2. Sends data + signature + public key to backend
3. Backend cryptographically verifies signature
4. If valid, agent is authenticated
5. Data is notarized and stored

### Data Integrity

- Every notarization includes agent signature
- Notary records are immutable
- Verification possible at any time using public key

---

## Production Deployment

### Environment Configuration

For production, create a `.env` file:

```bash
PORT=3000
NODE_ENV=production
VERIFY_TLS=true
```

### Cross-Chain Support

Currently supports:
- ✅ Solana (primary)
- 🔄 Ethereum (framework ready)
- 🔄 Polygon (framework ready)
- 🔄 Arbitrum (framework ready)

Enable cross-chain in dossier:
```json
"solauth": {
  "crossChain": {
    "supported": ["ethereum", "polygon"],
    "enabled": true
  }
}
```

### Storage Backend

Current: File-based (`~/.monarch/notary/`)

For production, consider:
- PostgreSQL/MongoDB for agent registry
- IPFS/Arweave for notary records
- Solana on-chain program for verification

---

## Example Workflow

```bash
# 1. Start server (in terminal 1)
npm start

# 2. Install agent (in terminal 2)
node index.js install @alpha_01

# 3. Install another agent
node index.js install @beta_02

# 4. List agents
node index.js list

# 5. Check status
node index.js status @alpha_01

# 6. Notarize intel from @alpha_01
node index.js notarize @alpha_01 '{"type":"intel","data":"classified"}'

# 7. Notarize intel from @beta_02
node index.js notarize @beta_02 '{"type":"observation","target":"zone_01"}'

# 8. Verify notarization (requires curl or API client)
curl http://localhost:3000/api/notary/NOT-HE5KFZ4-XYZ789
```

---

## Testing

Run the test suite:

```bash
npm test
```

Tests cover:
- Agent name validation
- Dossier structure
- File operations
- Cryptographic signing
- Backend API responses

---

## File Structure

```
~/.monarch/
├── agents.json           # Agent registry
├── config.json           # CLI configuration
├── dossiers/
│   ├── @agent1.dossier.json
│   └── @agent2.dossier.json
└── notary/
    ├── NOT-HE5KFZ4-XYZ789.json
    └── NOT-HE5KFZ4-ABC123.json
```

---

## Troubleshooting

**Backend not running?**
```bash
curl http://localhost:3000/health
```

**Agent won't install?**
Check agent name format and ensure backend server is running.

**Notarization fails?**
- Verify agent exists: `node index.js list`
- Check backend is online: `npm start`
- Verify data is valid JSON

---

## License & Credits

🦋 **Monarch Protocol** - Autonomous Agent Authentication System
Built with cryptographic security & Solana integration.
