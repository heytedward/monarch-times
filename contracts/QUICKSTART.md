# 🚀 Quick Start: Deploy Your NFT Contract

## Option A: Remix IDE (Recommended - No Setup)

**⏱️ Time: 5 minutes**

### 1. Open Remix
Go to https://remix.ethereum.org/

### 2. Create Contract File
- Left panel: File Explorer
- Click "+" to create new file: `MonarchIntel.sol`
- Copy contents from `contracts/MonarchIntel.sol` and paste

### 3. Compile
- Click "Solidity Compiler" tab (left sidebar)
- Compiler: **0.8.20**
- Click **"Compile MonarchIntel.sol"**
- Wait for green checkmark

### 4. Connect Wallet
- Click "Deploy & Run" tab
- Environment: **Injected Provider - MetaMask**
- MetaMask will popup → Connect
- Switch to **Base Sepolia** network in MetaMask

### 5. Get Testnet ETH
- Visit https://bridge.base.org/
- Bridge some Sepolia ETH to Base Sepolia (for gas)

### 6. Deploy Contract
- In Deploy section, expand constructor args:
  - `_USDC`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia USDC)
  - `_TREASURY`: `YOUR_WALLET_ADDRESS` (where fees go)
- Click **"Deploy"**
- Confirm in MetaMask
- Wait for confirmation

### 7. Copy Contract Address
- After deployment, see "Deployed Contracts" at bottom
- Click copy icon next to contract address
- **Save this address!** You'll need it for the backend.

### 8. Verify on BaseScan (Optional)
- Go to https://sepolia.basescan.org/
- Search for your contract address
- Click "Contract" → "Verify and Publish"
- Compiler: 0.8.20
- Optimization: Yes (200 runs)
- Paste contract code
- Constructor args (ABI-encoded): Use BaseScan's tool

---

## Option B: Hardhat (For Developers)

**⏱️ Time: 10 minutes**

### 1. Setup Environment
```bash
cd contracts
cp .env.example .env
```

Edit `.env`:
```bash
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
BASESCAN_API_KEY=YOUR_API_KEY
```

### 2. Install Dependencies
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

**Note:** If you get esbuild errors (macOS Big Sur), use Remix instead.

### 3. Deploy to Testnet
```bash
npm run deploy:testnet
```

### 4. Deploy to Mainnet
```bash
# ⚠️ WARNING: Uses real money!
npm run deploy:mainnet
```

---

## Next Steps After Deployment

### 1. Update Backend Configuration

Edit `api/_lib/base-config.ts`:
```typescript
export const BASE_CONFIG = {
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  contractAddress: '0xYOUR_DEPLOYED_CONTRACT_ADDRESS', // ← Add this
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};
```

### 2. Update Environment Variables

Add to root `.env`:
```bash
BASE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

### 3. Test Minting

See `README.md` section "Testing" for full details.

Quick test in Remix:
1. In Deployed Contracts section, expand your contract
2. Click `mintFee` → Should show `500000`
3. Click `totalSupply` → Should show `0`
4. Try minting (need testnet USDC first)

---

## 🆘 Troubleshooting

**"Out of gas" error**
- Add more ETH to your wallet for gas

**"Insufficient payment" error**
- You need to approve USDC first (see README.md)

**Contract won't verify**
- Constructor args must be ABI-encoded
- Use BaseScan's verification tool

**Hardhat won't install**
- Use Remix IDE instead (no local setup needed)

---

## 📋 Checklist

- [ ] Contract deployed to Base Sepolia or Mainnet
- [ ] Contract address saved
- [ ] Backend config updated (`api/_lib/base-config.ts`)
- [ ] Environment variable set (`BASE_CONTRACT_ADDRESS`)
- [ ] Contract verified on BaseScan (optional but recommended)
- [ ] Test mint successful

---

## 🎉 You're Ready!

Your NFT contract is live on Base! Users can now mint Intel posts as NFTs.

**Next:** Implement the minting flow in `api/_lib/minting-service.ts` (see main README.md)
