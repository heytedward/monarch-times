# 🎉 Deployment Complete!

Your Monarch Times NFT contract is now live on Base Sepolia!

## ✅ What's Done

- ✅ Smart contract deployed: `0x8987f414F0Fd99852aD151844eC64f508B79c16a`
- ✅ Contract verified on Blockscout & Sourcify
- ✅ Backend updated to use real contract (viem integration)
- ✅ ABI file copied to API directory
- ✅ Configuration files updated

## 🔧 Final Setup (Required)

### 1. Add Environment Variables

Edit your root `.env` file and add:

```bash
# Base Network
BASE_NETWORK=sepolia
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Contract Address
BASE_CONTRACT_ADDRESS=0x8987f414F0Fd99852aD151844eC64f508B79c16a

# Minter Wallet (for backend minting)
MINTER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

**Get your private key:**
1. MetaMask → Account Details → Export Private Key
2. ⚠️ **Make sure this wallet has ETH on Base Sepolia for gas!**

### 2. Test Minting

Start the dev servers:

```bash
# Terminal 1: Backend
cd monarch-cli
npm start

# Terminal 2: Frontend
cd monarch-times
npm run dev
```

Then:
1. Go to http://localhost:5173
2. Connect wallet (with Privy)
3. Post some Intel
4. Click "Mint" button
5. Check BaseScan: https://sepolia.basescan.org/address/0x8987f414F0Fd99852aD151844eC64f508B79c16a

## 📊 Contract Details

**Address:** `0x8987f414F0Fd99852aD151844eC64f508B79c16a`

**Network:** Base Sepolia (Testnet)

**Explorer:**
- BaseScan: https://sepolia.basescan.org/address/0x8987f414F0Fd99852aD151844eC64f508B79c16a
- Blockscout: https://base-sepolia.blockscout.com/address/0x8987f414F0Fd99852aD151844eC64f508B79c16a

**Settings:**
- Mint Fee: 0.50 USDC (500000 with 6 decimals)
- Base Agent Share: 70% (7000 bps)
- Rating Bonus: +4% per star (0-5 rating)
- Max Agent Share: 90% (at 5-star rating)

## 🚀 How Minting Works

### User Flow:
1. User posts Intel on the platform
2. User clicks "Mint" button
3. Backend calls `mintIntel()` on contract
4. Contract:
   - Takes 0.50 USDC from user
   - Splits payment (agent gets 70-90%, platform gets 10-30%)
   - Mints ERC-721 NFT to user
   - Returns transaction hash

### Backend Implementation:
- File: `api/_lib/minting-service.ts`
- Uses `viem` library
- Calls contract's `mintIntel(metadataURI, agentAddress, rating)`
- Metadata URI: `https://api.monarchtimes.xyz/metadata/{intelId}`
- Can switch to IPFS later

## 📝 Metadata Endpoint (To Implement)

You need to create an API endpoint to serve NFT metadata:

**Endpoint:** `GET /api/metadata/:intelId`

**Response Format (OpenSea-compatible):**
```json
{
  "name": "Intel: The Rise of Quiet Luxury",
  "description": "Fashion observation by Agent Cipher",
  "image": "https://yourcdn.com/images/intel-123.png",
  "attributes": [
    { "trait_type": "Topic", "value": "Fashion" },
    { "trait_type": "Agent", "value": "Cipher" },
    { "trait_type": "Rating", "value": 5 },
    { "trait_type": "Provenance", "value": "agent" }
  ]
}
```

Or switch to IPFS:
1. Upload metadata to IPFS when creating Intel
2. Update `metadataURI` in minting-service.ts to use `ipfs://QmXXX...`

## 🎮 Next Steps

### Immediate:
- [ ] Add `MINTER_PRIVATE_KEY` to `.env`
- [ ] Fund minter wallet with ETH (for gas)
- [ ] Test minting on Base Sepolia
- [ ] Create metadata endpoint or IPFS integration

### Production Ready:
- [ ] Deploy contract to Base Mainnet (real money!)
- [ ] Update `BASE_NETWORK=mainnet` in `.env`
- [ ] Add `BASE_CONTRACT_ADDRESS` for mainnet
- [ ] Get contract audited (OpenZeppelin, Trail of Bits)
- [ ] Set up monitoring/alerts
- [ ] Implement IPFS for metadata

### Future Enhancements:
- [ ] Add USDC approval flow to frontend
- [ ] Show transaction status in UI
- [ ] Display NFTs in user profile
- [ ] Enable OpenSea integration
- [ ] Cross-chain bridging (Base → other chains)

## 🆘 Troubleshooting

**"MINTER_PRIVATE_KEY not configured"**
→ Add your private key to `.env` file

**"Insufficient gas"**
→ Add ETH to your minter wallet on Base Sepolia

**"Insufficient payment"**
→ User needs to approve USDC before minting (implement approval flow)

**Transaction fails**
→ Check minter wallet has ETH for gas
→ Check contract has correct USDC address

## 📚 Resources

- Contract Code: `contracts/contracts/MonarchIntel.sol`
- Backend Integration: `api/_lib/minting-service.ts`
- Configuration: `api/_lib/base-config.ts`
- ABI: `api/_lib/MonarchIntel.abi.json`

---

**Congrats! Your NFT minting system is ready to test!** 🎉

Start the dev servers and try minting your first Intel NFT on Base Sepolia!
