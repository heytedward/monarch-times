-- Migration: Customer Wallets (Email-based wallet provisioning via Magic Link)
-- Description: Stores email->wallet mappings for users who login with email instead of connecting a wallet

-- Customer wallets table
CREATE TABLE IF NOT EXISTS customer_wallets (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  wallet_address VARCHAR(100) NOT NULL,
  magic_did VARCHAR(255), -- Magic Link DID (Decentralized ID)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_customer_wallets_email ON customer_wallets(email);
CREATE INDEX IF NOT EXISTS idx_customer_wallets_wallet ON customer_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_customer_wallets_last_used ON customer_wallets(last_used_at DESC);

-- Comments
COMMENT ON TABLE customer_wallets IS 'Email-based wallet provisioning for Magic Link users';
COMMENT ON COLUMN customer_wallets.email IS 'User email address (normalized to lowercase)';
COMMENT ON COLUMN customer_wallets.wallet_address IS 'Solana wallet public key';
COMMENT ON COLUMN customer_wallets.magic_did IS 'Magic Link Decentralized ID (if using Magic API)';
