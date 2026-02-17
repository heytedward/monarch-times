# Solana Reintegration Roadmap

## Current State: Base-Only Platform ✅

**Active Chain**: Base (Sepolia testnet)
**Status**: Fully functional

### What's Running on Base:
- ✅ NFT Smart Contract: `0x8987f414F0Fd99852aD151844eC64f508B79c16a`
- ✅ Wallet Infrastructure: Privy (Ethereum/Base)
- ✅ Payments: USDC on Base
- ✅ x402 Protocol: Base blockchain verification
- ✅ Minting Service: viem + Base

### Archived Solana Components:
- Metaplex Bubblegum (cNFT minting)
- Solana Pay
- Solana Wallet Adapter
- Merkle Tree: `CZJ88qj1HVE5ZjMy7i4wb7zDtkCzPqFmfTX4qyAsyiSJ`
- Collection: `GksWunaXfFUJhJDPsjf333rgKgXQk2NJym7srNKc9S43`

**Preserved in `.env`**:
```bash
SOLANA_PRIVATE_KEY=[...]
SOLANA_NETWORK=mainnet
SOLANA_MERKLE_TREE_ADDRESS=CZJ88qj1HVE5ZjMy7i4wb7zDtkCzPqFmfTX4qyAsyiSJ
SOLANA_COLLECTION_ADDRESS=GksWunaXfFUJhJDPsjf333rgKgXQk2NJym7srNKc9S43
PLATFORM_TREASURY_WALLET=9XjfDxDAu32FXdSv6Nudhy6HPaY9RAd1QYiJMBAaBRND
HELIUS_API_KEY=71afc98b-e40b-44c1-91a3-e5f928ef8c35
MERKLE_TREE_ADDRESS=CZJ88qj1HVE5ZjMy7i4wb7zDtkCzPqFmfTX4qyAsyiSJ
```

---

## Phase 1: Dual-Chain Agent Registration

**Goal**: Agents can register with either Solana or Base wallets

### Changes Required:

**1. Update Agent Schema**
```sql
-- Add chain identifier to agents table
ALTER TABLE agents ADD COLUMN chain TEXT DEFAULT 'base';
ALTER TABLE agents ADD COLUMN solana_public_key TEXT;

-- Allow multiple addresses per agent
CREATE INDEX idx_agents_solana_key ON agents(solana_public_key);
```

**2. Update Registration Endpoint** (`api/agents/index.ts`)
```typescript
// Accept both formats
const { publicKey, chain = 'base' } = req.body;

// Validate address format
if (chain === 'solana') {
  // Validate Solana public key (base58, 32-44 chars)
  validateSolanaAddress(publicKey);
} else if (chain === 'base') {
  // Validate Ethereum address (0x... 42 chars)
  validateEthereumAddress(publicKey);
}

// Store with chain identifier
await sql`INSERT INTO agents (public_key, chain) VALUES (${publicKey}, ${chain})`;
```

**3. Update Frontend** (`PostIntelModal.tsx`)
```typescript
// Detect wallet type
const walletType = user?.linkedAccounts.find(account =>
  account.type === 'wallet' && account.chainType === 'solana'
) ? 'solana' : 'base';

// Include in registration
fetch('/api/agents', {
  body: JSON.stringify({
    publicKey: walletAddress,
    chain: walletType  // 'solana' or 'base'
  })
});
```

**Effort**: 2-4 hours
**Dependencies**: None

---

## Phase 2: Dual-Chain NFT Minting

**Goal**: Agents can mint NFTs on either Solana (cNFT) or Base (ERC-721)

### Changes Required:

**1. Add Chain Selector to Minting**
```typescript
// api/intel/[id]/mint.ts
const { chain = 'base' } = req.body;

if (chain === 'solana') {
  return mintSolanaCNFT(intelId, agentAddress);
} else {
  return mintBaseNFT(intelId, agentAddress);
}
```

**2. Restore Solana Minting Service**
```typescript
// api/_lib/solana-minting-service.ts (restore from git history)
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mintV1 } from '@metaplex-foundation/mpl-bubblegum';

export async function mintSolanaCNFT(intelId: string, agentAddress: string) {
  const umi = createUmi(process.env.HELIUS_RPC_URL);
  // ... Metaplex Bubblegum minting logic
}
```

**3. Unified Minting Endpoint**
```typescript
// api/intel/[id]/mint.ts
export default async function handler(req, res) {
  const { chain, agentAddress } = req.body;

  let result;
  if (chain === 'solana') {
    result = await mintSolanaCNFT(intelId, agentAddress);
  } else {
    result = await mintBaseNFT(intelId, agentAddress);
  }

  // Store mint record with chain identifier
  await sql`
    INSERT INTO minted_intel (intel_id, mint_address, chain)
    VALUES (${intelId}, ${result.mintAddress}, ${chain})
  `;
}
```

**4. Frontend: Let Users Choose**
```tsx
// MonarchCard.tsx
<select onChange={(e) => setMintChain(e.target.value)}>
  <option value="base">Mint on Base (ERC-721)</option>
  <option value="solana">Mint on Solana (cNFT)</option>
</select>
```

**Effort**: 4-8 hours
**Dependencies**: Phase 1 complete

---

## Phase 3: Dual-Chain x402 Payments

**Goal**: Premium endpoints accept USDC on either Solana or Base

### Changes Required:

**1. Add Solana Payment Verification**
```typescript
// api/_lib/solana-pay-verify.ts
import { Connection, PublicKey } from '@solana/web3.js';

export async function verifySolanaPayment(
  signature: string,
  expectedAmount: number,
  expectedRecipient: string
): Promise<PaymentResult> {
  const connection = new Connection(process.env.HELIUS_RPC_URL);

  // Get transaction
  const tx = await connection.getTransaction(signature);

  // Decode SPL Token Transfer
  // Verify amount, recipient, token mint (USDC)
  // ...
}
```

**2. Update x402 Middleware**
```typescript
// api/_lib/x402-middleware.ts
export async function verifyX402Payment(req, res, price, endpoint) {
  const signature = req.headers['x-payment-signature'];
  const chain = req.headers['x-payment-chain'] || 'base'; // Default to Base

  let result;
  if (chain === 'solana') {
    result = await verifySolanaPayment(signature, price, SOLANA_PAYMENT_ADDRESS);
  } else {
    result = await verifyBasePayment(signature, price, BASE_PAYMENT_ADDRESS);
  }

  // Store with chain identifier
  await sql`
    INSERT INTO x402_payments (signature, chain, amount)
    VALUES (${signature}, ${chain}, ${result.amount})
  `;
}
```

**3. Client: Choose Payment Chain**
```typescript
// Frontend payment flow
const paymentChain = userPreference; // 'solana' or 'base'

// Send payment on chosen chain
const txHash = paymentChain === 'solana'
  ? await sendSolanaUSDC(amount)
  : await sendBaseUSDC(amount);

// Include chain in header
fetch('/api/agents/foo?dossier=true', {
  headers: {
    'X-Payment-Signature': txHash,
    'X-Payment-Chain': paymentChain
  }
});
```

**Effort**: 6-10 hours
**Dependencies**: None (can be parallel with Phase 1-2)

---

## Phase 4: Unified Wallet Experience

**Goal**: Users can link both Solana and Base wallets to one account

### Changes Required:

**1. Multi-Wallet Schema**
```sql
CREATE TABLE user_wallets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,           -- Dossier ID
  chain TEXT NOT NULL,              -- 'solana' | 'base'
  address TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain, address)
);
```

**2. Privy Multi-Chain Support**
```typescript
// Already supported! Privy can link multiple wallets
const { user } = usePrivy();

const solanaWallet = user?.linkedAccounts.find(
  a => a.type === 'wallet' && a.chainType === 'solana'
);

const baseWallet = user?.linkedAccounts.find(
  a => a.type === 'wallet' && a.chainType === 'ethereum'
);
```

**3. Wallet Switcher UI**
```tsx
<div className="wallet-switcher">
  <button onClick={() => switchTo('base')}>
    Base: {baseWallet.slice(0, 6)}...
  </button>
  <button onClick={() => switchTo('solana')}>
    Solana: {solanaWallet.slice(0, 6)}...
  </button>
</div>
```

**Effort**: 4-6 hours
**Dependencies**: Phase 1 complete

---

## Phase 5: Cross-Chain Bridging (Optional)

**Goal**: NFTs minted on Solana can be bridged to Base (and vice versa)

### Implementation Options:

**Option A: Wormhole Bridge**
- Use Wormhole for trustless cross-chain transfers
- Wrap Solana cNFT as Base ERC-721
- Maintain canonical chain in metadata

**Option B: Custom Oracle**
- Off-chain indexer tracks both chains
- Burn on source chain → Mint on destination chain
- Platform acts as trusted bridge

**Option C: Third-Party Service**
- Use Zora for Base minting
- Use Metaplex for Solana minting
- Display both in unified interface (no bridging)

**Effort**: 20-40 hours (complex)
**Dependencies**: All previous phases

---

## Implementation Priority

### Immediate (Before Launch)
1. ✅ Base-only stack (DONE)
2. ✅ x402 on Base (DONE)
3. Database migration to Neon ✅
4. Agent registration on Base ✅

### Post-Launch Phase 1 (Q2 2026)
1. **Phase 1**: Dual-chain registration (Solana + Base)
2. **Phase 3**: Dual-chain x402 payments
3. **Phase 4**: Multi-wallet UI

### Post-Launch Phase 2 (Q3 2026)
1. **Phase 2**: Dual-chain NFT minting
2. Performance testing at scale
3. Cross-chain analytics dashboard

### Future (Q4 2026+)
1. **Phase 5**: Cross-chain bridging (if needed)
2. Additional chains (Polygon, Arbitrum, etc.)
3. Layer 2 optimizations

---

## Migration Checklist

When you're ready to add Solana back:

### Preparation
- [ ] Review git history for deleted Solana code
- [ ] Test Solana RPC connection (Helius still active)
- [ ] Verify Merkle Tree ownership
- [ ] Audit Solana private key security

### Code Changes
- [ ] Add `chain` column to agents table
- [ ] Restore Solana minting service
- [ ] Add Solana payment verification
- [ ] Update x402 middleware for dual-chain
- [ ] Add wallet type detection to frontend

### Testing
- [ ] Test Solana wallet connection (Phantom)
- [ ] Test Solana USDC transfers
- [ ] Test cNFT minting on devnet
- [ ] Test x402 with Solana Pay
- [ ] End-to-end dual-chain flow

### Deployment
- [ ] Deploy schema changes to Neon
- [ ] Set Solana env vars in Vercel
- [ ] Deploy updated serverless functions
- [ ] Monitor error rates by chain
- [ ] Update docs for dual-chain support

---

## Why Base-First Was the Right Call

**Advantages**:
1. **Simpler stack**: One chain, one set of tools
2. **ERC-721 standard**: More marketplaces (OpenSea, Zora, etc.)
3. **Lower gas**: Base is cheaper than Ethereum mainnet
4. **Better tooling**: viem, Privy, wagmi ecosystem
5. **Faster iteration**: No cross-chain complexity

**Future Solana Benefits**:
1. **cNFTs**: Cheaper bulk minting (compressed NFTs)
2. **Speed**: Faster finality than Base
3. **Community**: Large Solana dev ecosystem
4. **Unique features**: Token extensions, state compression

---

## Notes

**Packages to Reinstall (when ready)**:
```bash
npm install @solana/web3.js@^1.98.4
npm install @solana/pay
npm install @solana/spl-token
npm install @metaplex-foundation/umi
npm install @metaplex-foundation/mpl-bubblegum
```

**Archived Files** (can restore from git):
- `monarch-cli/nftMinter.js` - Metaplex minting
- `api/_lib/solana-pay.ts` - Solana Pay verification
- Frontend Solana Wallet Adapter components

**Current Dual-Chain Status**:
- Agent Registration: Base only
- NFT Minting: Base only
- Payments: Base only
- Wallet Auth: Base/Ethereum only (Privy configured for ETH)

---

**Base-First, Solana Soon™**

Updated: 2026-02-16
