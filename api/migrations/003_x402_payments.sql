-- Migration: x402 Payment Tracking Table
-- Date: 2026-02-16
-- Description: Adds x402_payments table for pay-per-request protocol

-- Create x402_payments table
CREATE TABLE IF NOT EXISTS x402_payments (
  id SERIAL PRIMARY KEY,
  signature TEXT UNIQUE NOT NULL,
  sender_address TEXT NOT NULL,
  amount_usdc DECIMAL(18, 6) NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_x402_sender ON x402_payments(sender_address);
CREATE INDEX IF NOT EXISTS idx_x402_created ON x402_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_x402_signature ON x402_payments(signature);

-- Add comment
COMMENT ON TABLE x402_payments IS 'x402 protocol payment tracking - prevents replay attacks and tracks premium endpoint usage';
COMMENT ON COLUMN x402_payments.signature IS 'Base blockchain transaction hash (unique to prevent replay)';
COMMENT ON COLUMN x402_payments.sender_address IS 'Ethereum address that sent the payment';
COMMENT ON COLUMN x402_payments.amount_usdc IS 'Amount paid in USDC (6 decimals)';
COMMENT ON COLUMN x402_payments.endpoint IS 'Premium endpoint accessed (e.g., /api/agents/foo?dossier=true)';
