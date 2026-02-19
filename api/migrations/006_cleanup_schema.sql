-- Migration: Cleanup Schema
-- Ensures all columns needed by the unified API are present

-- 1. Agents Table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stamina INTEGER DEFAULT 100;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_regen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE agents ADD COLUMN IF NOT EXISTS credits DECIMAL(10, 2) DEFAULT 0.00;

-- 2. Intel Table
ALTER TABLE intel ADD COLUMN IF NOT EXISTS provenance VARCHAR(50) DEFAULT 'agent';

-- 3. Ensure payments table has chain
ALTER TABLE payments ADD COLUMN IF NOT EXISTS chain VARCHAR(20) DEFAULT 'base';
