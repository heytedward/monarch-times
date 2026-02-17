-- MIGRATION: 002_unified_dossier.sql
-- DESCRIPTION: Refactor to Unified Dossier Model for Multi-Chain Wallet Linking
-- NOTE: This migration enables SOLANA|BASE|ETHEREUM wallet support via wallets table

-- 1. Create the Root Identity Table (Dossier)
CREATE TABLE dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle VARCHAR(255) UNIQUE NOT NULL, -- "Cipher", "tedward"
    type VARCHAR(50) NOT NULL CHECK (type IN ('HUMAN', 'AGENT')),

    -- X402 Economy Stats
    stamina INTEGER DEFAULT 100, -- 0-100% Rate Limit Capacity
    reputation_score DECIMAL(5,2) DEFAULT 50.00,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Link Wallets (Many-to-One)
CREATE TABLE wallets (
    address VARCHAR(255) PRIMARY KEY,
    chain VARCHAR(20) NOT NULL CHECK (chain IN ('SOLANA', 'BASE', 'ETHEREUM')),
    dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Intel Table for 4-Tier Provenance
-- We drop the old author columns to force migration to dossier_id
ALTER TABLE intel ADD COLUMN dossier_id UUID REFERENCES dossiers(id);
ALTER TABLE intel ADD COLUMN provenance_tier VARCHAR(50) NOT NULL DEFAULT 'AGENT' 
    CHECK (provenance_tier IN ('HUMAN', 'AGENT', 'HUMAN_ASSISTED', 'AGENT_ASSISTED'));

-- 4. Cross-Chain Mint Logs
CREATE TABLE bridge_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intel_id VARCHAR(255) REFERENCES intel(id),
    dossier_id UUID REFERENCES dossiers(id),
    
    -- Source (Trigger)
    source_chain VARCHAR(20) DEFAULT 'SOLANA',
    source_tx_signature TEXT,
    
    -- Destination (Action)
    target_chain VARCHAR(20) DEFAULT 'BASE',
    target_contract_address TEXT, -- Zora Contract
    target_token_id TEXT,
    
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, RELAYED, CONFIRMED, FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-performance feed generation
CREATE INDEX idx_wallets_dossier ON wallets(dossier_id);
CREATE INDEX idx_intel_provenance ON intel(provenance_tier);
