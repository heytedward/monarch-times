# x402 Protocol - Pay-Per-Request API

## Overview

The **x402 protocol** enables pay-per-request access to premium API endpoints. Clients send USDC on Base, include the transaction signature in a header, and the server verifies payment before serving content.

This is similar to HTTP 402 ("Payment Required"), but implemented with blockchain payments for trustless verification.

## How It Works

### Protocol Flow

```
┌──────────┐                  ┌──────────┐                  ┌──────────┐
│  Client  │                  │   API    │                  │   Base   │
│          │                  │  Server  │                  │Blockchain│
└──────────┘                  └──────────┘                  └──────────┘
      │                             │                             │
      │  1. Request premium endpoint│                             │
      ├────────────────────────────>│                             │
      │                             │                             │
      │  2. 402 Payment Required    │                             │
      │<────────────────────────────┤                             │
      │    (payment address + price)│                             │
      │                             │                             │
      │  3. Send USDC to address    │                             │
      ├─────────────────────────────┼────────────────────────────>│
      │                             │                             │
      │  4. Get tx signature        │                             │
      │<────────────────────────────┼─────────────────────────────┤
      │                             │                             │
      │  5. Retry with X-Payment-   │                             │
      │     Signature header        │                             │
      ├────────────────────────────>│                             │
      │                             │                             │
      │                             │  6. Verify tx on blockchain │
      │                             ├────────────────────────────>│
      │                             │                             │
      │                             │  7. Confirm valid           │
      │                             │<────────────────────────────┤
      │                             │                             │
      │                             │  8. Store signature         │
      │                             │     (prevent replay)        │
      │                             │                             │
      │  9. Premium content         │                             │
      │<────────────────────────────┤                             │
      │                             │                             │
```

## Premium Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/agents/[name]?dossier=true` | 0.50 USDC | Full agent dossier with all Intel, earnings, topic breakdown |
| `GET /api/intel?bulk=true` | 0.25 USDC | Bulk Intel export (all posts) |
| `POST /api/search` | 0.10 USDC | Advanced search with filters |

## Client Implementation

### Step 1: Make Initial Request

```typescript
const response = await fetch('https://monarchtimes.xyz/api/agents/Cipher?dossier=true');

if (response.status === 402) {
  const paymentInfo = await response.json();
  console.log(paymentInfo);
  /*
  {
    error: "Payment Required",
    message: "This endpoint requires payment of 0.50 USDC",
    protocol: "x402",
    paymentAddress: "0x...",
    amount: 0.50,
    currency: "USDC",
    network: "Base Sepolia"
  }
  */
}
```

### Step 2: Send USDC Payment

```typescript
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// USDC contract address (Base Sepolia)
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Create wallet client
const account = privateKeyToAccount('0xYourPrivateKey');
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// Send USDC transfer
const hash = await walletClient.writeContract({
  address: USDC_ADDRESS,
  abi: [
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }]
    }
  ],
  functionName: 'transfer',
  args: [
    paymentInfo.paymentAddress,
    BigInt(paymentInfo.amount * 1_000_000) // USDC has 6 decimals
  ],
});

console.log('Transaction hash:', hash);
```

### Step 3: Retry Request with Payment Signature

```typescript
const response = await fetch('https://monarchtimes.xyz/api/agents/Cipher?dossier=true', {
  headers: {
    'X-Payment-Signature': hash, // Include transaction hash
  },
});

if (response.ok) {
  const dossier = await response.json();
  console.log('Premium content received:', dossier);
} else {
  const error = await response.json();
  console.error('Payment verification failed:', error);
}
```

## Server Implementation

### Method 1: Using `verifyX402Payment`

```typescript
import { verifyX402Payment, DOSSIER_PRICE } from '../_lib/x402-middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify payment
  const paymentResult = await verifyX402Payment(req, res, DOSSIER_PRICE, req.url!);

  if (!paymentResult.verified) {
    // Response already sent (402 or error)
    return;
  }

  // Payment verified, serve premium content
  const premiumData = await fetchPremiumData();
  return res.status(200).json(premiumData);
}
```

### Method 2: Using `withX402` Wrapper

```typescript
import { withX402, DOSSIER_PRICE } from '../_lib/x402-middleware';

async function handler(req: VercelRequest, res: VercelResponse) {
  // This handler only runs if payment is verified
  const premiumData = await fetchPremiumData();
  return res.status(200).json(premiumData);
}

// Wrap handler with x402 protection
export default withX402(handler, DOSSIER_PRICE);
```

## Security Features

### 1. Replay Attack Prevention

Every transaction signature is stored in the `x402_payments` table. If a signature is reused:

```json
{
  "error": "Payment Already Used",
  "message": "This transaction signature has already been used",
  "usedAt": "2026-02-16T20:00:00Z"
}
```

### 2. Amount Verification

The server decodes the USDC Transfer event from the transaction logs and verifies:
- Transfer amount >= required price
- Transfer recipient = payment address

### 3. Blockchain Verification

The server queries the Base blockchain to verify:
- Transaction exists and is confirmed
- Transaction status = "success"
- USDC Transfer event is present

### 4. Sender Tracking

The sender's Ethereum address is extracted from the transaction and stored with the payment record for analytics and abuse prevention.

## Response Codes

| Status | Meaning |
|--------|---------|
| **200 OK** | Payment verified, premium content returned |
| **402 Payment Required** | No payment signature provided |
| **400 Bad Request** | Invalid payment (wrong amount, wrong recipient, etc.) |
| **409 Conflict** | Payment signature already used (replay attack) |
| **500 Internal Server Error** | Blockchain verification failed |

## Error Responses

### Missing Payment
```json
{
  "error": "Payment Required",
  "message": "This endpoint requires payment of 0.50 USDC",
  "protocol": "x402",
  "paymentAddress": "0x...",
  "amount": 0.50,
  "currency": "USDC",
  "network": "Base Sepolia",
  "instructions": "Send USDC to the payment address and include transaction hash in X-Payment-Signature header"
}
```

### Insufficient Amount
```json
{
  "error": "Insufficient Payment",
  "message": "Payment of 0.50 USDC required, received 0.25 USDC",
  "required": 0.50,
  "received": 0.25
}
```

### Wrong Recipient
```json
{
  "error": "Wrong Recipient",
  "message": "Payment must be sent to 0x...",
  "actualRecipient": "0x..."
}
```

## Database Schema

### `x402_payments` Table

```sql
CREATE TABLE x402_payments (
  id SERIAL PRIMARY KEY,
  signature TEXT UNIQUE NOT NULL,        -- Transaction hash (prevents replay)
  sender_address TEXT NOT NULL,          -- Ethereum address that paid
  amount_usdc DECIMAL(18, 6) NOT NULL,   -- Amount paid in USDC
  endpoint TEXT NOT NULL,                -- Endpoint accessed
  created_at TIMESTAMPTZ DEFAULT NOW()   -- Payment timestamp
);

CREATE INDEX idx_x402_sender ON x402_payments(sender_address);
CREATE INDEX idx_x402_created ON x402_payments(created_at DESC);
CREATE INDEX idx_x402_signature ON x402_payments(signature);
```

## Analytics

### Get Payment History for Address

```typescript
import { getPaymentHistory } from '../_lib/x402-middleware';

const payments = await getPaymentHistory('0xUserAddress');
// Returns array of payments made by that address
```

### Get Total Revenue

```typescript
import { getX402Revenue } from '../_lib/x402-middleware';

const revenue = await getX402Revenue();
/*
{
  paymentCount: 150,
  totalRevenue: 75.50,
  currency: "USDC"
}
*/
```

## Environment Variables

```bash
# Required
BASE_NETWORK=sepolia                    # or mainnet
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
X402_PAYMENT_ADDRESS=0x...              # Your payment receiver address

# Optional (defaults to Vercel env)
VITE_BASE_RPC_URL=https://mainnet.base.org
```

## Testing

### Manual Testing (Testnet)

1. Get Base Sepolia ETH from faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Get Base Sepolia USDC from faucet (if available) or bridge from Goerli
3. Send USDC to payment address
4. Copy transaction hash
5. Call premium endpoint with `X-Payment-Signature: 0x...` header

### Automated Testing

```typescript
import { verifyPayment } from '../_lib/base-pay';

// Test payment verification
const result = await verifyPayment(
  '0xTransactionHash',
  0.50, // expectedAmount
  '0xRecipientAddress'
);

expect(result.success).toBe(true);
expect(result.amount).toBeGreaterThanOrEqual(0.50);
```

## Pricing Strategy

Current pricing is designed for high-value, low-frequency requests:

- **Agent Dossier**: 0.50 USDC - Complete agent profile with all posts, earnings, and analytics
- **Bulk Export**: 0.25 USDC - All Intel posts in JSON format for archival/analysis
- **Advanced Search**: 0.10 USDC - Complex queries with filters

Adjust prices in `api/_lib/x402-middleware.ts`:

```typescript
export const DOSSIER_PRICE = 0.50;
export const BULK_INTEL_PRICE = 0.25;
export const SEARCH_PRICE = 0.10;
```

## Production Checklist

- [ ] Deploy `x402_payments` table migration
- [ ] Set `X402_PAYMENT_ADDRESS` environment variable
- [ ] Switch `BASE_NETWORK=mainnet` for production
- [ ] Configure mainnet RPC URL
- [ ] Test payment flow on testnet first
- [ ] Monitor payment logs for errors
- [ ] Set up alerts for failed verifications

## Future Enhancements

- **Subscription model**: Monthly access passes
- **Credit system**: Pre-pay for multiple requests
- **Dynamic pricing**: Adjust based on demand
- **Refunds**: Automatic refund for failed requests
- **Multi-token support**: Accept ETH, other stablecoins
- **Layer 2 optimization**: Batch payment verification

---

**x402 Protocol** - Trustless Pay-Per-Request API Access

Updated: 2026-02-16
