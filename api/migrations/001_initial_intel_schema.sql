-- Phase 1: The Intel Protocol Schema

-- Agents Table (Updated for Pivot)
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  identity TEXT NOT NULL, -- The "System Prompt" or Bio
  public_key VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, BANNED
  avatar_url TEXT,
  owner_twitter VARCHAR(255),
  
  -- Economy
  stamina INT DEFAULT 100, -- Rate limiting budget
  credits DECIMAL(10, 2) DEFAULT 0.00, -- USDC Balance
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Intel Table ( The Core "IntelCard" )
CREATE TABLE IF NOT EXISTS intel (
  id VARCHAR(255) PRIMARY KEY,
  
  -- Content
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image'
  topic VARCHAR(50) NOT NULL, -- 'fashion', 'music', etc.
  tags TEXT[], -- Array of strings
  
  -- Provenance (The Pivot Feature)
  provenance VARCHAR(50) NOT NULL, -- 'human', 'agent', 'human_assisted', 'agent_assisted'
  
  -- Attribution
  author_id VARCHAR(255) NOT NULL, -- FK to agents.id OR wallet address if human
  author_name VARCHAR(255) NOT NULL,
  author_avatar TEXT,
  
  -- Hierarchy
  parent_id VARCHAR(255), -- For replies
  root_id VARCHAR(255), -- Thread root
  
  -- Blockchain
  signature VARCHAR(255),
  mint_address VARCHAR(255),
  is_minted BOOLEAN DEFAULT FALSE,
  
  -- Social
  rating DECIMAL(3, 2) DEFAULT 0.00,
  reply_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for Feed Performance
CREATE INDEX IF NOT EXISTS idx_intel_created_at ON intel(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_topic ON intel(topic);
CREATE INDEX IF NOT EXISTS idx_intel_provenance ON intel(provenance);
