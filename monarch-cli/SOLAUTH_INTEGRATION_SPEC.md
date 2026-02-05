# 🦋 Monarch Protocol CLI – Technical Specification for SolAuth Integration

**Audience:** SolAuth Creator/Integration Team  
**Purpose:** Define the authentication model, API contract, and integration requirements  
**Status:** Production Ready (v1.0.0)

---

## 1. System Architecture Overview

```
┌──────────────────────┐
│   MONARCH CLI        │  (Node.js + Commander.js)
│   (index.js)         │
└──────────┬───────────┘
           │
           │ HTTP/JSON
           │
┌──────────▼──────────────────────────┐
│  MONARCH AUTHENTICATION SERVER      │
│  (server.js, Express.js)            │
│                                     │
│  • Agent Registry                   │
│  • Signature Verification (SolAuth) │
│  • Notary Ledger                    │
└──────────┬──────────────────────────┘
           │
           ▼
    ~/.monarch/
    ├── agents.json (agent metadata)
    ├── dossiers/ (keypairs & config)
    └── notary/ (immutable records)
```

**Key Principle:** The CLI is a *client* that generates cryptographic dossiers and signs data. The backend *verifies* signatures and stores notarized records. SolAuth is the *verification layer* the backend uses.

---

## 2. Agent Lifecycle

### 2.1 Installation (CLI: `monarch install @agent_name`)

**User Flow:**
```bash
node index.js install @my_agent
# → Prompts: "I'm a Human" or "I'm an Agent"
# → Generates Ed25519 keypair locally
# → Creates dossier file (~/.monarch/dossiers/@my_agent.dossier.json)
# → POSTs agent metadata to backend (/api/register)
# → Stores agent in local registry (~/.monarch/agents.json)
```

**CLI Actions:**
1. **Validate agent name:** alphanumeric + hyphens/underscores, max 50 chars, no duplicates
2. **Generate keypair:**
   ```javascript
   keypair = nacl.sign.keyPair();
   // Returns: { publicKey: Uint8Array, secretKey: Uint8Array }
   
   // Encode to Base58 (Solana standard)
   publicKey_b58 = bs58.encode(keypair.publicKey);
   secretKey_b58 = bs58.encode(keypair.secretKey);
   ```
3. **Create dossier file** (mode 0o600 for security):
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
       "apiUrl": "http://localhost:3000"
     }
   }
   ```
4. **POST to backend** `/api/register` (backend calls SolAuth to verify new agent)
5. **Store locally** in `~/.monarch/agents.json` with public metadata

**Backend Expectations for SolAuth:**
- Receive agent registration request with `{ agentName, publicKey, agentId, identity }`
- Verify public key is valid ED25519 (SolAuth job)
- Store agent in registry if valid
- Return confirmation

---

### 2.2 Notarization (CLI: `monarch notarize @agent_name <data>`)

**User Flow:**
```bash
node index.js notarize @my_agent '{"action":"post","content":"intel"}'
# → Loads dossier
# → SIGNS data with secretKey
# → POSTs signature + publicKey + data to /api/notarize
# → Backend verifies signature (SolAuth)
# → Backend stores notary record
# → Returns notary ID + timestamp
```

**Critical Cryptographic Process:**

```javascript
// CLIENT SIDE (CLI)
dossier = loadDossier('@my_agent');
data = { action: 'post', content: 'intel' };

// Convert data to bytes (deterministic JSON, no whitespace)
message = Buffer.from(JSON.stringify(data));

// Sign with secret key (NACL detached signature)
secretKeyRaw = bs58.decode(dossier.cryptography.secretKey);
signature = nacl.sign.detached(message, secretKeyRaw);
signatureB58 = bs58.encode(signature);

// Send to backend
POST /api/notarize {
  "agentName": "@my_agent",
  "publicKey": "4vJ9PKyqc7...",
  "data": { action: 'post', content: 'intel' },
  "signature": "Ux3p2sd45df4...",
  "metadata": {}
}
```

```javascript
// BACKEND SIDE (server.js)
// This is where SolAuth verification happens

publicKeyB58 = request.publicKey;  // "4vJ9PKyqc7..."
signature = request.signature;      // "Ux3p2sd45df4..."
data = request.data;

// SOLAUTH VERIFICATION (your system)
isValid = verifySolAuth(signature, publicKeyB58, data);

if (!isValid) {
  return 401 { error: 'SolAuth verification failed' };
}

// If valid, agent is authenticated
// Create notarization record
notarization = {
  notaryId: "NOT-HE5KFZ4-XYZ789",
  agentName: "@my_agent",
  publicKey: publicKeyB58,
  data: data,
  signature: signature,
  timestamp: now(),
  status: "NOTARIZED"
};

// Store permanently (~/.monarch/notary/NOT-HE5KFZ4-XYZ789.json)
// Return notary ID to client
```

**What SolAuth Needs to Verify:**
1. **Signature format:** Base58-encoded Ed25519 detached signature
2. **Message format:** JSON string (stringified data from notarize request)
3. **Public key format:** Base58-encoded Ed25519 public key
4. **Verification algorithm:** Ed25519 (NACL `sign.detached.verify()`)
5. **Return:** Boolean (true/false) - no exceptions, deterministic

---

## 3. Cryptographic Contract

### 3.1 Ed25519 Implementation

**Library:** TweetNACL.js (`tweetnacl` npm package)

**Keypair Generation:**
```javascript
const keypair = nacl.sign.keyPair();
// Public key: 32 bytes
// Secret key: 64 bytes (includes public key)
```

**Signing (Detached):**
```javascript
const message = Buffer.from(JSON.stringify(data));
const secretKey = bs58.decode(dossierSecretKeyB58);
const sig = nacl.sign.detached(message, secretKey);
// Returns 64-byte signature (no message attached)
```

**Verification (Detached):**
```javascript
const publicKey = bs58.decode(publicKeyB58);
const signature = bs58.decode(signatureB58);
const message = Buffer.from(JSON.stringify(data));
const isValid = nacl.sign.detached.verify(message, signature, publicKey);
// Returns boolean
```

**Encoding:** Base58 (Solana standard, not Base64)
- Reason: compatibility with Solana wallets & tools
- Library: `bs58` npm package

### 3.2 Key Storage & Security

**Secret Key Storage:**
- Stored **locally only** on agent machine (~/.monarch/dossiers/@agent.dossier.json)
- File permissions: `0o600` (read/write owner only)
- **Never transmitted to backend or other peers**
- Agents are responsible for backup/recovery

**Public Key Distribution:**
- Shared with backend during `/api/register`
- Stored in agent registry
- Used by backend to verify signatures
- Can be shared publicly for verification

---

## 4. Backend API Contract

### 4.1 POST /api/register
**Purpose:** Register a new agent, verify public key validity  
**Called by:** CLI during `install`

**Request:**
```json
{
  "agentName": "@my_agent",
  "publicKey": "4vJ9PKyqc7...",
  "agentId": "MONARCH-HE5KFZ4-ABC123",
  "identity": "🤖 I'm an Agent"
}
```

**Backend Processing (SolAuth Involvement):**
```
1. Validate publicKey format (valid Base58, valid Ed25519 length)
2. Check if already registered (prevent duplicates)
3. [SOLAUTH] Verify public key is well-formed (optional cryptographic check)
4. Store in agent registry
5. Respond with success
```

**Response (Success):**
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

**Response (Error):**
```json
{
  "success": false,
  "error": "Agent already registered"
}
```

---

### 4.2 POST /api/notarize
**Purpose:** Client submits signed data; backend verifies signature & stores notary record  
**Called by:** CLI during `notarize`  
**Critical: This is the main SolAuth verification point**

**Request:**
```json
{
  "agentName": "@my_agent",
  "publicKey": "4vJ9PKyqc7...",
  "data": {
    "action": "post",
    "content": "intel report"
  },
  "signature": "Ux3p2sd45df4...",
  "metadata": {
    "location": "zone_a",
    "priority": "high"
  }
}
```

**Backend Processing (SolAuth MUST Verify Here):**
```javascript
// 1. Extract components
publicKeyB58 = request.publicKey;
signature = request.signature;
data = request.data;

// 2. SOLAUTH VERIFICATION (Your System)
try {
  isValid = verifySolAuth(
    signature,        // Base58-encoded signature
    publicKeyB58,     // Base58-encoded public key
    data              // Original data object
  );
} catch (err) {
  return 401 { error: "SolAuth verification error" };
}

if (!isValid) {
  return 401 { error: "SolAuth verification failed - Invalid signature" };
}

// 3. Check agent is registered
agentInfo = agentRegistry.get(publicKeyB58);
if (!agentInfo || agentInfo.status !== 'ACTIVE') {
  return 403 { error: "Agent not verified or inactive" };
}

// 4. Create notarization record
notary = {
  notaryId: "NOT-HE5KFZ4-XYZ789",
  agentName: request.agentName,
  agentId: agentInfo.id,
  publicKey: publicKeyB58,
  data: data,
  signature: signature,
  metadata: request.metadata,
  timestamp: now(),
  chain: "solana",
  status: "NOTARIZED"
};

// 5. Store permanently
saveNotary(notary);

// 6. Update agent stats
agentInfo.notarizations += 1;
```

**Response (Success):**
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

**Response (SolAuth Failure):**
```json
{
  "success": false,
  "error": "SolAuth verification failed - Invalid signature"
}
```

---

### 4.3 POST /api/verify
**Purpose:** Verify an agent's dossier or a notarization record  
**Called by:** CLI, agents, or 3rd parties

**Request (Verify Agent):**
```json
{
  "publicKey": "4vJ9PKyqc7..."
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "agent": {
    "name": "@my_agent",
    "id": "MONARCH-HE5KFZ4-ABC123",
    "publicKey": "4vJ9PKyqc7...",
    "status": "ACTIVE",
    "notarizations": 5,
    "registeredAt": "2026-02-05T14:52:11.000Z"
  }
}
```

**Request (Verify Notarization):**
```json
{
  "publicKey": "4vJ9PKyqc7...",
  "notaryId": "NOT-HE5KFZ4-XYZ789"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "notarization": {
    "id": "NOT-HE5KFZ4-XYZ789",
    "status": "NOTARIZED",
    "timestamp": "2026-02-05T14:52:11.000Z"
  }
}
```

---

### 4.4 GET /api/status/:agentName
**Purpose:** Get agent metadata  
**Called by:** CLI during `status`

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

---

### 4.5 GET /api/notary/:notaryId
**Purpose:** Retrieve a notarization record  
**Called by:** CLI, verification requests, audits

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

## 5. SolAuth Integration Specification

### 5.1 What SolAuth Needs to Implement

**Function Signature:**
```javascript
function verifySolAuth(signatureB58, publicKeyB58, data) {
  // Input validation
  if (!signatureB58 || !publicKeyB58) {
    return false;
  }

  try {
    // Decode from Base58
    publicKey = bs58.decode(publicKeyB58);
    signature = bs58.decode(signatureB58);

    // Ensure data is deterministic JSON
    message = Buffer.from(JSON.stringify(data));

    // Verify using Ed25519
    isValid = nacl.sign.detached.verify(message, signature, publicKey);

    return isValid; // Boolean only
  } catch (err) {
    return false; // Any error = invalid
  }
}
```

**OR if you're providing a REST endpoint:**
```javascript
async function verifySolAuth(signatureB58, publicKeyB58, data) {
  const response = await fetch(`${SOLAUTH_API_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signature: signatureB58,
      publicKey: publicKeyB58,
      message: JSON.stringify(data)
    })
  });

  const result = await response.json();
  return result.verified === true;
}
```

### 5.2 Critical Assumptions

1. **Signature Format:** Base58-encoded 64-byte Ed25519 detached signature
2. **Public Key Format:** Base58-encoded 32-byte Ed25519 public key
3. **Message:** JSON stringified (raw JSON, no extra whitespace)
4. **Algorithm:** Ed25519 (must be exact, no variants)
5. **Determinism:** Same inputs always return same result
6. **Error Handling:** Exceptions should return `false`, not throw
7. **Performance:** Should verify 100s of signatures/second (not on-chain for each call)

### 5.3 Data Flow Diagram

```
CLI → Backend:
  POST /api/notarize {
    agentName: "@my_agent",
    publicKey: "4vJ9PKyqc7...",
    data: { action: "post", content: "intel" },
    signature: "Ux3p2sd45df4...",
    metadata: {}
  }

Backend → SolAuth:
  verifySolAuth(
    "Ux3p2sd45df4...",
    "4vJ9PKyqc7...",
    { action: "post", content: "intel" }
  )

SolAuth → Backend:
  true   (signature valid, agent authenticated)

Backend → Notary Ledger:
  Save notarization record
  Status: NOTARIZED

Backend → CLI:
  POST 200 {
    notary: {
      id: "NOT-HE5KFZ4-XYZ789",
      status: "NOTARIZED"
    }
  }
```

---

## 6. CLI Commands Summary

| Command | Purpose | SolAuth Involvement |
|---------|---------|-------------------|
| `install @name` | Create agent dossier, register | Verify pub key validity (optional) |
| `notarize @name <data>` | Sign & submit intel | **Verify signature** ✓ Critical |
| `list` | Show agents | None |
| `status @name` | Get agent metadata | None |
| `remove @name` | Delete local dossier | None |
| `dossier @name` | View dossier (public/private) | None |
| `config` | Manage settings | None |

---

## 7. Error Handling & Edge Cases

### 7.1 Invalid Signatures
**Scenario:** Agent signs with wrong key or data is tampered  
**SolAuth Response:** `false`  
**Backend Response:** `401 { error: "SolAuth verification failed" }`  
**CLI Behavior:** Error message, exit code 1

### 7.2 Agent Not Registered
**Scenario:** Trying to notarize with unknown public key  
**SolAuth Response:** N/A (verification might pass, but agent not in registry)  
**Backend Check:** `if (!agentRegistry.has(publicKey)) { return 403 }`  
**Backend Response:** `403 { error: "Agent not verified or inactive" }`

### 7.3 Malformed Data
**Scenario:** Signature computed on different JSON format  
**Cause:** Non-deterministic JSON (extra spaces, different key order)  
**Solution:** Both sides must use `JSON.stringify(data)` without custom replacers  
**Test:** `JSON.stringify({a:1,b:2}) === JSON.stringify({b:2,a:1})` → `false` (different order)

### 7.4 Network Failures
**Scenario:** Backend unreachable during notarize  
**CLI Behavior:** Timeout after 30s, return error, suggest retry  
**No local signature deletion** (data can be retried later)

---

## 8. Security Considerations for SolAuth

1. **No Private Key Exposure:** SolAuth only sees public keys, signatures, and data. Never ask for secret keys.
2. **Deterministic Verification:** Same signature + key + data must always return the same result.
3. **Rate Limiting:** Backend should limit verification requests per agent/IP to prevent DoS.
4. **Logging:** Log all verification attempts (including failures) for audit trail.
5. **Replay Protection:** Consider adding timestamp/nonce if needed (can be in data.metadata).
6. **Key Rotation:** If agents need to rotate keys, API should support `registerNewKey()` + `revokeOldKey()`.

---

## 9. Integration Checklist for SolAuth Creator

- [ ] Implement `verifySolAuth()` function (or REST endpoint)
- [ ] Test with TweetNACL.js Ed25519 signatures
- [ ] Verify Base58 encoding/decoding works
- [ ] Handle deterministic JSON (test different key orders)
- [ ] Test error cases (malformed input, invalid signature)
- [ ] Performance test (100+ sigs/second)
- [ ] Document your verification function signature
- [ ] Provide env vars for API key (if REST endpoint)
- [ ] Handle timeouts & retries
- [ ] Add audit logging of verification attempts

---

## 10. Questions for SolAuth Creator

1. **Verification Method:**
   - Will you provide a JS library function or REST API?
   - Do you need to reach out to a blockchain or is it local verification?

2. **Key Rotation:**
   - Can agents change their signing key after registration?
   - How should old signatures be handled?

3. **Performance:**
   - Expected latency per verification?
   - Throughput limits?

4. **Additional Features:**
   - Do you want to add timestamp/nonce validation?
   - Should we log verification attempts to a blockchain?
   - Rate limiting preferences?

5. **Solana Integration:**
   - Should we anchor verified notarizations to Solana mainnet?
   - Does your system have on-chain verification?

---

## 11. Example: Full Notarization Flow

```bash
# 1. CLI User notarizes intel
$ node index.js notarize @my_agent '{"alert":"unauthorized_access"}'

# 2. CLI loads dossier
dossier = {
  agent: { name: "@my_agent", id: "MONARCH-XYZ" },
  cryptography: {
    publicKey: "4vJ9PKyqc7...",
    secretKey: "5Ux3p2sd..." // Never leaves CLI
  }
}

# 3. CLI signs data
data = { alert: "unauthorized_access" }
signature = sign(data, secretKey)  // Uses NACL
// signature = "Ux3p2sd45df4..."

# 4. CLI sends to backend
POST /api/notarize {
  agentName: "@my_agent",
  publicKey: "4vJ9PKyqc7...",
  data: { alert: "unauthorized_access" },
  signature: "Ux3p2sd45df4...",
  metadata: {}
}

# 5. Backend receives request
verifySolAuth(
  "Ux3p2sd45df4...",
  "4vJ9PKyqc7...",
  { alert: "unauthorized_access" }
) → true

# 6. Backend creates notary record
notary = {
  notaryId: "NOT-HE5KFZ4-XYZ789",
  agentName: "@my_agent",
  publicKey: "4vJ9PKyqc7...",
  data: { alert: "unauthorized_access" },
  signature: "Ux3p2sd45df4...",
  timestamp: "2026-02-05T14:52:11Z",
  status: "NOTARIZED"
}

# 7. Backend saves & responds
Store: ~/.monarch/notary/NOT-HE5KFZ4-XYZ789.json
Response: {
  success: true,
  notary: {
    id: "NOT-HE5KFZ4-XYZ789",
    timestamp: "2026-02-05T14:52:11Z",
    status: "NOTARIZED"
  }
}

# 8. CLI shows user result
✔ Intel notarized successfully!
   Notary ID: NOT-HE5KFZ4-XYZ789
   Status: NOTARIZED
```

---

## 12. Files & Code References

| File | Purpose |
|------|---------|
| `index.js` | CLI, commands, user interaction |
| `server.js` | Backend, `/api/*` endpoints, SolAuth calls |
| `dossier.js` | Keypair generation, signing, loading dossiers |
| `test.js` | Unit tests |
| `package.json` | Dependencies: tweetnacl, bs58, express, commander |

**Key Function in dossier.js:**
```javascript
export function signData(agentName, data) {
  const dossier = loadDossier(agentName);
  const secretKeyRaw = bs58.decode(dossier.cryptography.secretKey);
  const message = Buffer.from(JSON.stringify(data));
  const signature = nacl.sign.detached(message, secretKeyRaw);
  return bs58.encode(signature);
}

export function verifySignature(publicKeyBase58, message, signatureBase58) {
  try {
    const publicKey = bs58.decode(publicKeyBase58);
    const messageBuffer = Buffer.from(JSON.stringify(message));
    const signature = bs58.decode(signatureBase58);
    return nacl.sign.detached.verify(messageBuffer, signature, publicKey);
  } catch (err) {
    return false;
  }
}
```

---

## 13. Version & Status

- **Version:** 1.0.0
- **Status:** Production Ready
- **Crypto Library:** TweetNACL.js (tweetnacl npm)
- **Encoding:** Base58
- **Algorithm:** Ed25519 (detached signature)
- **Backend:** Express.js
- **CLI Framework:** Commander.js

---

## Summary for SolAuth Creator

**What we're asking you to do:**

1. Implement a function that verifies Ed25519 signatures:
   - Input: Base58 signature, Base58 public key, raw data
   - Output: Boolean (true = valid, false = invalid)
   - Must work with deterministic JSON strings

2. Integrate into our backend at the `/api/notarize` endpoint:
   - Check signature validity before storing notary record
   - Return 401 if signature fails

3. Optionally, register agents at `/api/register`:
   - Validate public key format

**That's it.** The rest (signing, dossier management, agent lifecycle) is handled by the CLI and backend. You're just the verification authority.

---

**Ready to collaborate? Share this doc and let me know what questions the SolAuth team has.**
