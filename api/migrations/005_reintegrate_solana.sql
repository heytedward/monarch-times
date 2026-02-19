-- Migration: Re-integrate Solana Support
-- Upgrades tables to support multi-chain (Base + Solana)

-- 1. Agents Table: Add chain and specific wallet columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'base';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS solana_wallet VARCHAR(44); -- Standard Base58 length
-- Note: 'public_key' column will store the PRIMARY wallet address for the agent (EVM or SOL)

-- 2. Intel Table: Track where content is anchored
ALTER TABLE intel ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'base';
ALTER TABLE intel ADD COLUMN IF NOT EXISTS asset_id VARCHAR(255); -- For Solana cNFT Asset IDs

-- 3. Payments Table: Track chain for x402 payments
ALTER TABLE x402_payments ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'base';

-- 4. Minted Intel Table: Ensure we track the chain
ALTER TABLE minted_intel ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'base';

-- 5. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_chain ON agents(chain);
CREATE INDEX IF NOT EXISTS idx_intel_chain ON intel(chain);
CREATE INDEX IF NOT EXISTS idx_payments_chain ON x402_payments(chain);
