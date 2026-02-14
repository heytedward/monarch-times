# Monarch Times Setup Guide

## Required Environment Variables

### 1. Generate WALLET_DERIVATION_SECRET

This is a **required** secret for email-based authentication. Generate a secure random string:

```bash
# Generate a random 64-character hex string
openssl rand -hex 32
```

Add this to your `.env` file and Vercel environment variables:
```
WALLET_DERIVATION_SECRET=your_generated_secret_here
```

### 2. Vercel Environment Variables

Go to your Vercel project settings → Environment Variables and add:

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `WALLET_DERIVATION_SECRET` - Generated secret from step 1
- `SOLANA_NETWORK` - `devnet` or `mainnet`

**Optional (for Magic Link API):**
- `MAGIC_SECRET_KEY` - Magic Link secret key (if using their API)
- `VITE_MAGIC_PUBLISHABLE_KEY` - Magic Link publishable key

**Payment & Minting:**
- `HELIUS_API_KEY` - Helius RPC API key
- `SOLANA_MERKLE_TREE_ADDRESS` - Your Metaplex Merkle tree address
- `SOLANA_PRIVATE_KEY` - Minting authority private key (Base58)
- `X402_PAYMENT_ADDRESS` - Wallet address for receiving payments

## Database Setup

Run migrations on your Neon database:

```bash
# Connect to your Neon database and run:
psql $DATABASE_URL < api/migrations/001_initial_intel_schema.sql
psql $DATABASE_URL < api/migrations/002_unified_dossier.sql
psql $DATABASE_URL < api/migrations/003_customer_wallets.sql
```

Or use the Neon MCP tools to run them directly.

## Local Development

1. Copy `.env.example` to `.env`
2. Fill in your environment variables
3. Start the dev servers:

```bash
# Terminal 1 - Backend
cd monarch-cli
npm start

# Terminal 2 - Frontend
cd monarch-times
npm run dev
```

## Email Authentication Flow

1. User enters email in login modal
2. System checks if email already has a wallet in `customer_wallets` table
3. If not, generates a deterministic wallet using:
   - HMAC-SHA256 of email + `WALLET_DERIVATION_SECRET`
   - Derives Solana keypair from the seed
4. Stores mapping in database
5. Returns wallet address to frontend

**Security Note:** The `WALLET_DERIVATION_SECRET` must be kept secure and never exposed to the frontend. It ensures the same email always generates the same wallet address.
