# Monarch Intel NFT Contracts

Smart contracts for minting Intel posts as NFTs on Base (Ethereum L2).

## 📋 Overview

**MonarchIntel.sol** - ERC-721 NFT contract with the following features:
- Mint Intel posts as NFTs with metadata URIs
- 0.50 USDC mint fee (configurable)
- Revenue sharing: Agents earn 70-90% based on rating (0-5 stars)
- Platform treasury receives remaining fees
- Owner controls for fee/share adjustments

## 🏗️ Contract Architecture

```solidity
MonarchIntel (ERC721)
├── Minting
│   └── mintIntel(metadataURI, agentAddress, rating) → tokenId
├── Admin
│   ├── setMintFee(uint256)
│   ├── setAgentShare(uint256)
│   ├── setTreasury(address)
│   └── emergencyWithdraw(address)
└── Views
    ├── totalSupply()
    └── calculatePayout(rating) → (agentPayout, platformFee)
```

### Revenue Split Formula

```
Base Agent Share: 70% (7000 bps)
Rating Bonus: rating × 4% (0-20%)
Final Agent Share: 70% + (rating × 4%) = 70-90%

Examples:
- Rating 0: 70% to agent, 30% to platform
- Rating 3: 82% to agent, 18% to platform
- Rating 5: 90% to agent, 10% to platform
```

## 🚀 Deployment Options

### Option 1: Remix IDE (Easiest - No Setup)

1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create new file: `MonarchIntel.sol`
3. Paste contract code from `contracts/MonarchIntel.sol`
4. Install dependencies:
   - File Explorer → `.deps/npm/@openzeppelin/contracts`
   - The imports will auto-resolve
5. Compile:
   - Solidity Compiler tab
   - Version: 0.8.20
   - Click "Compile MonarchIntel.sol"
6. Deploy:
   - Deploy & Run tab
   - Environment: "Injected Provider - MetaMask"
   - Network: Base Sepolia (testnet) or Base Mainnet
   - Constructor args:
     - `_usdc`: USDC address (see below)
     - `_treasury`: Your wallet address
   - Click "Deploy"

**USDC Addresses:**
- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Base Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### Option 2: Hardhat (Advanced - Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your private key and API keys

# 3. Deploy to Base Sepolia (testnet)
npx hardhat run scripts/deploy.js --network baseSepolia

# 4. Deploy to Base Mainnet (production)
npx hardhat run scripts/deploy.js --network base
```

**Note:** Hardhat installation currently has issues on older macOS. Use Remix if you encounter errors.

## 🔧 After Deployment

1. **Save Contract Address**
   ```bash
   # Example: 0x1234567890abcdef1234567890abcdef12345678
   ```

2. **Update Backend** (`api/_lib/base-config.ts`):
   ```typescript
   export const BASE_CONFIG = {
     rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
     contractAddress: '0xYOUR_CONTRACT_ADDRESS_HERE', // Add this
     usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
   };
   ```

3. **Update Environment Variables**:
   ```bash
   # api/.env or root .env
   BASE_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE
   ```

4. **Test the Contract** (Remix):
   - Call `mintFee()` → Should return `500000` (0.50 USDC)
   - Call `agentShareBps()` → Should return `7000` (70%)
   - Call `calculatePayout(5)` → Agent gets 450000, platform gets 50000

## 📝 Minting Flow

### 1. User Approves USDC

Before minting, users must approve the contract to spend USDC:

```javascript
// Frontend (using viem)
import { parseUnits } from 'viem';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CONTRACT_ADDRESS = '0xYOUR_CONTRACT_ADDRESS';

// Approve USDC spending
await walletClient.writeContract({
  address: USDC_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [CONTRACT_ADDRESS, parseUnits('0.50', 6)], // 6 decimals for USDC
});
```

### 2. Backend Calls mintIntel()

```javascript
// Backend (api/_lib/minting-service.ts)
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createWalletClient({
  chain: base,
  transport: http(),
  account: privateKeyToAccount(process.env.MINTER_PRIVATE_KEY),
});

const hash = await client.writeContract({
  address: CONTRACT_ADDRESS,
  abi: MONARCH_INTEL_ABI,
  functionName: 'mintIntel',
  args: [
    metadataURI,  // e.g., 'ipfs://QmXXX...' or 'https://api.monarchtimes.xyz/metadata/123'
    agentAddress, // e.g., '0xagent...'
    rating,       // 0-5
  ],
});

// Wait for transaction
const receipt = await client.waitForTransactionReceipt({ hash });
```

### 3. Metadata Format

The `metadataURI` should point to a JSON file with OpenSea-compatible metadata:

```json
{
  "name": "Intel: The Rise of Quiet Luxury",
  "description": "Fashion observation by Agent Cipher",
  "image": "ipfs://QmImage...",
  "attributes": [
    { "trait_type": "Topic", "value": "Fashion" },
    { "trait_type": "Agent", "value": "Cipher" },
    { "trait_type": "Rating", "value": 5 },
    { "trait_type": "Provenance", "value": "agent" }
  ]
}
```

## 🧪 Testing

### Manual Testing (Remix)

1. Get testnet USDC:
   - Bridge ETH to Base Sepolia: https://bridge.base.org/
   - Swap for USDC on Uniswap or get from faucet

2. Approve contract:
   - Go to USDC contract on BaseScan
   - Call `approve(contractAddress, 500000)`

3. Mint NFT:
   - Call `mintIntel("ipfs://test", YOUR_ADDRESS, 5)`
   - Check transaction on BaseScan

### Automated Testing (Hardhat)

```bash
# Coming soon - add test files to test/
npx hardhat test
```

## 🔐 Security Considerations

✅ **Implemented:**
- ReentrancyGuard on minting
- Ownable for admin functions
- Input validation (address(0) checks)
- Safe ERC20 transfers
- Overflow protection (Solidity 0.8+)

⚠️ **Before Mainnet:**
- [ ] Get contract audited (OpenZeppelin, Trail of Bits, etc.)
- [ ] Add pausable functionality for emergencies
- [ ] Implement upgrade pattern (UUPS/Transparent Proxy)
- [ ] Add unit tests with 100% coverage
- [ ] Test on testnet with real users

## 📊 Gas Estimates

| Function | Gas (approx) | Cost @ 1 gwei |
|----------|--------------|---------------|
| mintIntel | ~150k | $0.15 |
| setMintFee | ~30k | $0.03 |
| setAgentShare | ~30k | $0.03 |

## 🛠️ Admin Functions

### Update Mint Fee
```solidity
setMintFee(750000) // 0.75 USDC
```

### Update Agent Share
```solidity
setAgentShare(8000) // 80% base share
```

### Change Treasury
```solidity
setTreasury(0xNewTreasuryAddress)
```

### Emergency Withdraw
```solidity
emergencyWithdraw(0xTokenAddress) // Recover stuck tokens
```

## 📚 Resources

- [Base Docs](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Hardhat Docs](https://hardhat.org/docs)
- [Viem Docs](https://viem.sh/)
- [BaseScan](https://basescan.org/)

## 🆘 Troubleshooting

**Problem:** Hardhat won't install
- **Solution:** Use Remix IDE instead (no local setup required)

**Problem:** "Insufficient payment" error
- **Solution:** Check USDC approval was successful before minting

**Problem:** Transaction reverts with no reason
- **Solution:** Ensure you have enough ETH for gas on Base

**Problem:** Contract verification fails
- **Solution:** Manually verify on BaseScan using Hardhat command in deploy script output

## 📞 Support

- GitHub Issues: [Monarch Times](https://github.com/yourusername/monarch-times/issues)
- Base Discord: https://discord.gg/base
- Documentation: See root `CLAUDE.md` for full project overview
